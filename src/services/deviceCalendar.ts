import * as Calendar from 'expo-calendar';
import type { CareTask } from '@/types';

const APP_CALENDAR_TITLE = 'Bulbo';
const APP_CALENDAR_COLOR = '#455F40';
const EVENT_DURATION_MINUTES = 30;

let cachedCalendarId: string | null = null;

async function findExistingCalendar(): Promise<Calendar.ExpoCalendar | undefined> {
  const calendars = await Calendar.getCalendars(Calendar.EntityTypes.EVENT);
  return calendars.find((calendar) => calendar.title === APP_CALENDAR_TITLE);
}

async function createAppCalendar(): Promise<Calendar.ExpoCalendar> {
  return Calendar.createCalendar({
    title: APP_CALENDAR_TITLE,
    color: APP_CALENDAR_COLOR,
    entityType: Calendar.EntityTypes.EVENT,
    source: { isLocalAccount: true, name: APP_CALENDAR_TITLE, type: Calendar.SourceType.LOCAL },
    ownerAccount: APP_CALENDAR_TITLE,
    accessLevel: Calendar.CalendarAccessLevel.OWNER,
    isSynced: true,
    isVisible: true,
  });
}

async function ensureAppCalendar(): Promise<string | null> {
  if (cachedCalendarId) return cachedCalendarId;

  const permission = await Calendar.requestCalendarPermissions();
  if (permission.status !== 'granted') return null;

  const existing = await findExistingCalendar();
  if (existing && !existing.isVisible) await existing.delete();

  const calendar = existing?.isVisible ? existing : await createAppCalendar();

  cachedCalendarId = calendar.id;
  return calendar.id;
}

function taskStartDate(task: CareTask): Date {
  const [year, month, day] = task.dueDate.split('-').map(Number);
  return new Date(year, month - 1, day, task.reminderHour, task.reminderMinute);
}

function taskRecurrenceRule(task: CareTask): Calendar.RecurrenceRule | null {
  if (!task.recurrenceDays) return null;
  return { frequency: Calendar.Frequency.DAILY, interval: task.recurrenceDays };
}

export async function syncTaskToDeviceCalendar(task: CareTask): Promise<string | null> {
  try {
    const calendarId = await ensureAppCalendar();
    if (!calendarId) return null;

    const calendarInstance = await Calendar.ExpoCalendar.get(calendarId);
    const startDate = taskStartDate(task);
    const endDate = new Date(startDate.getTime() + EVENT_DURATION_MINUTES * 60_000);

    const event = await calendarInstance.createEvent({
      title: task.title,
      notes: task.notes ?? undefined,
      startDate,
      endDate,
      recurrenceRule: taskRecurrenceRule(task),
      alarms: [{ relativeOffset: 0 }],
    });

    return event.id;
  } catch {
    return null;
  }
}

export async function removeTaskFromDeviceCalendar(deviceEventId: string): Promise<void> {
  try {
    const event = await Calendar.ExpoCalendarEvent.get(deviceEventId);
    await event.delete();
  } catch {
    // The event or its calendar may already be gone (permission revoked, calendar deleted); nothing to do.
  }
}
