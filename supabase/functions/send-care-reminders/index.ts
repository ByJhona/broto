import { createClient } from 'jsr:@supabase/supabase-js@2';
import { sendExpoPushNotifications, type ExpoPushMessage } from '../_shared/expoPush.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const CRON_SECRET = Deno.env.get('CRON_SECRET');

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const REMINDER_TIMEZONE = 'America/Sao_Paulo';

type CareTaskRow = {
  id: string;
  user_id: string;
  title: string;
  plant_name: string | null;
  start_date: string;
  recurrence_days: number | null;
  last_completed_occurrence: string | null;
};

function brazilNow(): { hour: number; date: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: REMINDER_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  const hour = Number(get('hour')) % 24;
  const date = `${get('year')}-${get('month')}-${get('day')}`;
  return { hour, date };
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

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  if (!CRON_SECRET || req.headers.get('Authorization') !== `Bearer ${CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { hour, date } = brazilNow();

  const { data: candidateTasks, error: tasksError } = await supabaseAdmin
    .from('care_tasks')
    .select('id, user_id, title, plant_name, start_date, recurrence_days, last_completed_occurrence')
    .lte('reminder_hour', hour)
    .or(`last_reminded_occurrence.is.null,last_reminded_occurrence.neq.${date}`);

  if (tasksError) {
    console.error('Erro buscando care_tasks:', tasksError);
    return new Response('Erro buscando tarefas', { status: 500 });
  }

  const dueTasks = ((candidateTasks ?? []) as CareTaskRow[]).filter((task) => {
    const dueDate = currentOccurrenceDate(task, date);
    return dueDate === date && task.last_completed_occurrence !== dueDate;
  });

  if (dueTasks.length === 0) {
    return new Response(JSON.stringify({ remindedTasks: 0, notifiedUsers: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const tasksByUser = new Map<string, CareTaskRow[]>();
  for (const task of dueTasks) {
    const existing = tasksByUser.get(task.user_id) ?? [];
    existing.push(task);
    tasksByUser.set(task.user_id, existing);
  }

  const { data: pushTokenRows } = await supabaseAdmin
    .from('push_tokens')
    .select('user_id, token')
    .in('user_id', Array.from(tasksByUser.keys()));

  const tokensByUser = new Map<string, string[]>();
  for (const row of (pushTokenRows ?? []) as { user_id: string; token: string }[]) {
    const existing = tokensByUser.get(row.user_id) ?? [];
    existing.push(row.token);
    tokensByUser.set(row.user_id, existing);
  }

  const queuedPushes = new Map<string, { userId: string; careTaskIds: string[] }>();
  const messages: ExpoPushMessage[] = [];

  for (const [userId, tasks] of tasksByUser) {
    const tokens = tokensByUser.get(userId) ?? [];
    if (tokens.length === 0) continue;

    const title = tasks.length === 1 ? tasks[0].title : `${tasks.length} lembretes de cuidado`;
    const body =
      tasks.length === 1
        ? tasks[0].plant_name
          ? `Planta: ${tasks[0].plant_name}`
          : 'Hora de cuidar da sua planta.'
        : tasks.map((task) => task.title).join(', ');

    const careTaskIds = tasks.map((task) => task.id);
    for (const token of tokens) {
      queuedPushes.set(token, { userId, careTaskIds });
      messages.push({
        to: token,
        title,
        body,
        data: { careTaskIds },
        channelId: 'reminders',
        ...(careTaskIds.length === 1 ? { categoryId: 'care-task' } : null),
      });
    }
  }

  const { deliveredTokens, staleTokens } = await sendExpoPushNotifications(messages);

  const deliveredTaskIds = new Set<string>();
  const notifiedUserIds = new Set<string>();
  for (const token of deliveredTokens) {
    const queued = queuedPushes.get(token);
    if (!queued) continue;
    queued.careTaskIds.forEach((taskId) => deliveredTaskIds.add(taskId));
    notifiedUserIds.add(queued.userId);
  }

  if (staleTokens.length > 0) {
    await supabaseAdmin.from('push_tokens').delete().in('token', staleTokens);
  }

  if (deliveredTaskIds.size > 0) {
    await supabaseAdmin
      .from('care_tasks')
      .update({ last_reminded_occurrence: date })
      .in('id', Array.from(deliveredTaskIds));
  }

  return new Response(JSON.stringify({ remindedTasks: deliveredTaskIds.size, notifiedUsers: notifiedUserIds.size }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
