import type { Notification } from '@/types';

export const NOTIFICATION_SECTION = {
  TODAY: 'today',
  THIS_WEEK: 'thisWeek',
  EARLIER: 'earlier',
} as const;

export type NotificationSectionKey = (typeof NOTIFICATION_SECTION)[keyof typeof NOTIFICATION_SECTION];

export type NotificationSection = {
  key: NotificationSectionKey;
  notifications: Notification[];
};

const WEEK_IN_DAYS = 7;
const SECTION_ORDER: NotificationSectionKey[] = [
  NOTIFICATION_SECTION.TODAY,
  NOTIFICATION_SECTION.THIS_WEEK,
  NOTIFICATION_SECTION.EARLIER,
];

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function sectionFor(createdAt: string, today: Date): NotificationSectionKey {
  const day = startOfDay(new Date(createdAt));
  const daysAgo = Math.round((today.getTime() - day.getTime()) / (24 * 60 * 60 * 1000));
  if (daysAgo <= 0) return NOTIFICATION_SECTION.TODAY;
  if (daysAgo < WEEK_IN_DAYS) return NOTIFICATION_SECTION.THIS_WEEK;
  return NOTIFICATION_SECTION.EARLIER;
}

export function groupNotificationsBySection(notifications: Notification[], now: Date = new Date()): NotificationSection[] {
  const today = startOfDay(now);
  const buckets = new Map<NotificationSectionKey, Notification[]>();
  for (const notification of notifications) {
    const key = sectionFor(notification.createdAt, today);
    buckets.set(key, [...(buckets.get(key) ?? []), notification]);
  }
  return SECTION_ORDER.flatMap((key) => {
    const items = buckets.get(key);
    return items ? [{ key, notifications: items }] : [];
  });
}
