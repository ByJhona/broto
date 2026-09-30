import { createClient } from 'jsr:@supabase/supabase-js@2';
import { recordPushTickets, sendExpoPushNotifications, type ExpoPushMessage } from '../_shared/expoPush.ts';
import { resolveLocale, type Locale } from '../_shared/locale.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET');

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const REMINDER_TIMEZONE = 'America/Sao_Paulo';

const REMINDER_KIND = {
  DUE: 'due',
  OVERDUE: 'overdue',
} as const;

type ReminderKind = (typeof REMINDER_KIND)[keyof typeof REMINDER_KIND];

const CARE_REMINDER_COPY: Record<Locale, { plantPrefix: (name: string) => string; genericBody: string; overdueBody: string }> = {
  pt: {
    plantPrefix: (name) => `Planta: ${name}`,
    genericBody: 'Hora de cuidar da sua planta.',
    overdueBody: 'Ficou pendente. Ainda dá tempo de cuidar.',
  },
  en: {
    plantPrefix: (name) => `Plant: ${name}`,
    genericBody: 'Time to care for your plant.',
    overdueBody: 'Still pending. There is still time to take care of it.',
  },
};

const CARE_TASK_COLUMNS =
  'id, user_id, plant_id, title, plant_name, plant_photo_url, start_date, recurrence_days, reminder_hour, reminder_minute, last_completed_occurrence, last_reminded_occurrence';

type CareTaskRow = {
  id: string;
  user_id: string;
  plant_id: string | null;
  title: string;
  plant_name: string | null;
  plant_photo_url: string | null;
  start_date: string;
  recurrence_days: number | null;
  reminder_hour: number;
  reminder_minute: number;
  last_completed_occurrence: string | null;
  last_reminded_occurrence: string | null;
};

type DueReminder = {
  task: CareTaskRow;
  kind: ReminderKind;
  occurrence: string;
};

function brazilNow(): { hour: number; minute: number; date: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: REMINDER_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const hour = Number(get('hour')) % 24;
  const minute = Number(get('minute'));
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  return { hour, minute, date };
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  const fromDate = new Date(`${from}T00:00:00Z`);
  const toDate = new Date(`${to}T00:00:00Z`);
  return Math.round((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
}

function currentOccurrenceDate(task: CareTaskRow, todayDate: string): string {
  if (!task.recurrence_days) return task.start_date;

  const elapsedDays = daysBetween(task.start_date, todayDate);
  if (elapsedDays <= 0) return task.start_date;

  const cyclesPassed = Math.floor(elapsedDays / task.recurrence_days);
  return addDays(task.start_date, cyclesPassed * task.recurrence_days);
}

function isReminderTimeReached(task: CareTaskRow, currentHour: number, currentMinute: number): boolean {
  if (task.reminder_hour < currentHour) return true;
  return task.reminder_hour === currentHour && task.reminder_minute <= currentMinute;
}

function reminderKind(task: CareTaskRow, occurrence: string, todayDate: string): ReminderKind | null {
  if (task.last_completed_occurrence === occurrence || occurrence > todayDate) return null;
  if (occurrence === todayDate) return REMINDER_KIND.DUE;
  const alreadyFollowedUp = task.last_reminded_occurrence !== null && task.last_reminded_occurrence > occurrence;
  return alreadyFollowedUp ? null : REMINDER_KIND.OVERDUE;
}

function toDueReminder(task: CareTaskRow, todayDate: string): DueReminder | null {
  const occurrence = currentOccurrenceDate(task, todayDate);
  const kind = reminderKind(task, occurrence, todayDate);
  return kind ? { task, kind, occurrence } : null;
}

function buildReminderCopy({ task, kind }: DueReminder, locale: Locale): { title: string; message: string } {
  const copy = CARE_REMINDER_COPY[locale];
  if (kind === REMINDER_KIND.OVERDUE) return { title: task.title, message: copy.overdueBody };
  return {
    title: task.title,
    message: task.plant_name ? copy.plantPrefix(task.plant_name) : copy.genericBody,
  };
}

function buildMessage(reminder: DueReminder, token: string, locale: Locale): ExpoPushMessage {
  const { task, occurrence } = reminder;
  const { title, message: body } = buildReminderCopy(reminder, locale);

  return {
    id: `${task.id}:${token}`,
    to: token,
    title,
    body,
    data: { careTaskId: task.id, occurrence },
    channelId: 'reminders',
    priority: 'high',
    categoryId: 'care-task',
    ...(task.plant_photo_url ? { richContent: { image: task.plant_photo_url } } : null),
  };
}

function jsonResponse(remindedTasks: number, notifiedUsers: number): Response {
  return new Response(JSON.stringify({ remindedTasks, notifiedUsers }), {
    headers: { 'Content-Type': 'application/json' },
  });
}

async function claimReminders(reminders: DueReminder[], date: string): Promise<DueReminder[]> {
  if (reminders.length === 0) return [];

  const { data, error } = await supabaseAdmin
    .from('care_tasks')
    .update({ last_reminded_occurrence: date })
    .in('id', reminders.map(({ task }) => task.id))
    .or(`last_reminded_occurrence.is.null,last_reminded_occurrence.lt.${date}`)
    .select('id');

  if (error) {
    console.error('Erro reservando lembretes:', error);
    return [];
  }

  const claimedIds = new Set(((data ?? []) as { id: string }[]).map((row) => row.id));
  return reminders.filter(({ task }) => claimedIds.has(task.id));
}

async function releaseClaims(reminders: DueReminder[], date: string): Promise<void> {
  const idsByPrevious = new Map<string | null, string[]>();
  for (const { task } of reminders) {
    const ids = idsByPrevious.get(task.last_reminded_occurrence) ?? [];
    ids.push(task.id);
    idsByPrevious.set(task.last_reminded_occurrence, ids);
  }

  await Promise.all(
    Array.from(idsByPrevious, ([previous, ids]) =>
      supabaseAdmin.from('care_tasks').update({ last_reminded_occurrence: previous }).in('id', ids).eq('last_reminded_occurrence', date)
    )
  );
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!CRON_SECRET || req.headers.get('Authorization') !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { hour, minute, date } = brazilNow();

  const { data: candidateTasks, error: tasksError } = await supabaseAdmin
    .from('care_tasks')
    .select(CARE_TASK_COLUMNS)
    .is('deleted_at', null)
    .lte('reminder_hour', hour)
    .or(`last_reminded_occurrence.is.null,last_reminded_occurrence.lt.${date}`);

  if (tasksError) {
    console.error('Erro buscando care_tasks:', tasksError);
    return new Response('Erro buscando tarefas', { status: 500 });
  }

  const dueReminders = ((candidateTasks ?? []) as CareTaskRow[])
    .filter((task) => isReminderTimeReached(task, hour, minute))
    .map((task) => toDueReminder(task, date))
    .filter((reminder): reminder is DueReminder => reminder !== null);

  const reminders = await claimReminders(dueReminders, date);
  if (reminders.length === 0) return jsonResponse(0, 0);

  const userIds = Array.from(new Set(reminders.map(({ task }) => task.user_id)));

  const [{ data: pushTokenRows }, { data: profileRows }] = await Promise.all([
    supabaseAdmin.from('push_tokens').select('user_id, token').in('user_id', userIds),
    supabaseAdmin.from('profiles').select('id, locale').in('id', userIds),
  ]);

  const tokensByUser = new Map<string, string[]>();
  for (const row of (pushTokenRows ?? []) as { user_id: string; token: string }[]) {
    const existing = tokensByUser.get(row.user_id) ?? [];
    existing.push(row.token);
    tokensByUser.set(row.user_id, existing);
  }

  const localeByUser = new Map<string, Locale>();
  for (const row of (profileRows ?? []) as { id: string; locale: string | null }[]) {
    localeByUser.set(row.id, resolveLocale(row.locale));
  }

  const reminderByTaskId = new Map(reminders.map((reminder) => [reminder.task.id, reminder]));
  const messages: ExpoPushMessage[] = [];
  const taskIdByMessageId = new Map<string, string>();
  const sentReminders: DueReminder[] = [];

  for (const reminder of reminders) {
    const tokens = tokensByUser.get(reminder.task.user_id) ?? [];
    if (tokens.length === 0) continue;

    sentReminders.push(reminder);
    const locale = localeByUser.get(reminder.task.user_id) ?? 'pt';
    for (const token of tokens) {
      const message = buildMessage(reminder, token, locale);
      taskIdByMessageId.set(message.id, reminder.task.id);
      messages.push(message);
    }
  }

  if (messages.length === 0) return jsonResponse(0, 0);

  const { deliveredIds, staleTokens, tickets } = await sendExpoPushNotifications(messages);

  const deliveredTaskIds = new Set<string>();
  for (const messageId of deliveredIds) {
    const taskId = taskIdByMessageId.get(messageId);
    if (taskId) deliveredTaskIds.add(taskId);
  }

  if (staleTokens.length > 0) {
    await supabaseAdmin.from('push_tokens').delete().in('token', staleTokens);
  }

  await recordPushTickets(supabaseAdmin, tickets);

  const failedReminders = sentReminders.filter(({ task }) => !deliveredTaskIds.has(task.id));
  if (failedReminders.length > 0) await releaseClaims(failedReminders, date);

  if (deliveredTaskIds.size > 0) {
    const notificationRows = Array.from(deliveredTaskIds).map((taskId) => {
      const reminder = reminderByTaskId.get(taskId)!;
      const locale = localeByUser.get(reminder.task.user_id) ?? 'pt';
      const { title, message } = buildReminderCopy(reminder, locale);

      return {
        user_id: reminder.task.user_id,
        type: 'care_reminder',
        title,
        message,
        plant_id: reminder.task.plant_id,
      };
    });

    const { error: notificationsError } = await supabaseAdmin.from('notifications').insert(notificationRows);
    if (notificationsError) {
      console.error('Erro salvando histórico de lembretes:', notificationsError);
    }
  }

  const notifiedUserIds = new Set(Array.from(deliveredTaskIds).map((taskId) => reminderByTaskId.get(taskId)!.task.user_id));
  return jsonResponse(deliveredTaskIds.size, notifiedUserIds.size);
});
