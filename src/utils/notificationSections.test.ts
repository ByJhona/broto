import { groupNotificationsBySection } from './notificationSections';
import type { Notification } from '@/types';

function notification(id: string, createdAt: string): Notification {
  return {
    id,
    type: 'like',
    actorId: null,
    actorName: null,
    actorAvatarUrl: null,
    postId: null,
    listingId: null,
    plantId: null,
    plantName: null,
    previewPhotoUrl: null,
    title: null,
    message: null,
    createdAt,
  };
}

describe('groupNotificationsBySection', () => {
  const now = new Date(2026, 8, 29, 15, 0);

  it('splits notifications into today, this week and earlier keeping their order', () => {
    const sections = groupNotificationsBySection(
      [
        notification('a', new Date(2026, 8, 29, 9, 0).toISOString()),
        notification('b', new Date(2026, 8, 28, 22, 0).toISOString()),
        notification('c', new Date(2026, 8, 24, 10, 0).toISOString()),
        notification('d', new Date(2026, 8, 10, 10, 0).toISOString()),
      ],
      now
    );

    expect(sections.map((section) => [section.key, section.notifications.map((item) => item.id)])).toEqual([
      ['today', ['a']],
      ['thisWeek', ['b', 'c']],
      ['earlier', ['d']],
    ]);
  });

  it('omits empty sections', () => {
    const sections = groupNotificationsBySection([notification('a', new Date(2026, 8, 1).toISOString())], now);

    expect(sections.map((section) => section.key)).toEqual(['earlier']);
  });
});
