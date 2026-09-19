import { createClient } from 'jsr:@supabase/supabase-js@2';
import { recordPushTickets, sendExpoPushNotifications, type ExpoPushMessage } from '../_shared/expoPush.ts';
import { resolveLocale, type Locale } from '../_shared/locale.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET');

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const REMINDER_TIMEZONE = 'America/Sao_Paulo';

const CARE_REMINDER_COPY: Record<Locale, { plantPrefix: (name: string) => string; genericBody: string }> = {
  pt: {
    plantPrefix: (name) => `Planta: ${name}`,
    genericBody: 'Hora de cuidar da sua planta.',
  },
  en: {
    plantPrefix: (name) => `Plant: ${name}`,
    genericBody: 'Time to care for your plant.',
  },
};

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

function buildReminderCopy(task: CareTaskRow, locale: Locale): { title: string; message: string } {
  const copy = CARE_REMINDER_COPY[locale];
  return {
    title: task.title,
    message: task.plant_name ? copy.plantPrefix(task.plant_name) : copy.genericBody,
  };
}

function buildMessage(task: CareTaskRow, token: string, locale: Locale): ExpoPushMessage {
  const { title, message: body } = buildReminderCopy(task, locale);

  return {
    id: `${task.id}:${token}`,
    to: token,
    title,
    body,
    data: { careTaskId: task.id },
    channelId: 'reminders',
    priority: 'high',
    categoryId: 'care-task',
    ...(task.plant_photo_url ? { richContent: { image: task.plant_photo_url } } : null),
  };
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
    .select('id, user_id, plant_id, title, plant_name, plant_photo_url, start_date, recurrence_days, reminder_hour, reminder_minute, last_completed_occurrence')
    .lte('reminder_hour', hour)
    .or(`last_reminded_occurrence.is.null,last_reminded_occurrence.neq.${date}`);

  if (tasksError) {
    console.error('Erro buscando care_tasks:', tasksError);
    return new Response('Erro buscando tarefas', { status: 500 });
  }

  const dueTasks = ((candidateTasks ?? []) as CareTaskRow[]).filter((task) => {
    if (!isReminderTimeReached(task, hour, minute)) return false;
    const dueDate = currentOccurrenceDate(task, date);
    return dueDate === date && task.last_completed_occurrence !== dueDate;
  });

  if (dueTasks.length === 0) {
    return new Response(JSON.stringify({ remindedTasks: 0, notifiedUsers: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const userIds = Array.from(new Set(dueTasks.map((task) => task.user_id)));

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

  const taskById = new Map(dueTasks.map((task) => [task.id, task]));
  const messages: ExpoPushMessage[] = [];
  const taskIdByMessageId = new Map<string, string>();

  for (const task of dueTasks) {
    const tokens = tokensByUser.get(task.user_id) ?? [];
    if (tokens.length === 0) continue;

    const locale = localeByUser.get(task.user_id) ?? 'pt';
    for (const token of tokens) {
      const message = buildMessage(task, token, locale);
      taskIdByMessageId.set(message.id, task.id);
      messages.push(message);
    }
  }

  if (messages.length === 0) {
    return new Response(JSON.stringify({ remindedTasks: 0, notifiedUsers: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

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

  if (deliveredTaskIds.size > 0) {
    const notificationRows = Array.from(deliveredTaskIds).map((taskId) => {
      const task = taskById.get(taskId)!;
      const locale = localeByUser.get(task.user_id) ?? 'pt';
      const { title, message } = buildReminderCopy(task, locale);

      return {
        user_id: task.user_id,
        type: 'care_reminder',
        title,
        message,
        plant_id: task.plant_id,
      };
    });

    const { error: notificationsError } = await supabaseAdmin.from('notifications').insert(notificationRows);
    if (notificationsError) {
      console.error('Erro salvando histórico de lembretes:', notificationsError);
    }

    await supabaseAdmin
      .from('care_tasks')
      .update({ last_reminded_occurrence: date })
      .in('id', Array.from(deliveredTaskIds));
  }

  const notifiedUserIds = new Set(Array.from(deliveredTaskIds).map((taskId) => taskById.get(taskId)!.user_id));

  return new Response(JSON.stringify({ remindedTasks: deliveredTaskIds.size, notifiedUsers: notifiedUserIds.size }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
