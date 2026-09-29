import { buildChatRows } from './chatRows';
import type { ChatTimelineItem } from '@/utils/chatTimeline';

function message(id: string, senderId: string, createdAt: string): ChatTimelineItem {
  return {
    kind: 'message',
    delivery: null,
    message: { id, senderId, recipientId: 'other', body: id, photoUrl: null, createdAt },
  };
}

describe('buildChatRows', () => {
  it('adds a day divider before the first item of each day', () => {
    const rows = buildChatRows(
      [message('a', 'me', '2026-09-01T10:00:00'), message('b', 'me', '2026-09-02T10:00:00')],
      'me'
    );

    expect(rows.map((row) => row.kind)).toEqual(['day', 'message', 'day', 'message']);
  });

  it('groups close messages from the same sender', () => {
    const rows = buildChatRows(
      [
        message('a', 'me', '2026-09-01T10:00:00'),
        message('b', 'me', '2026-09-01T10:01:00'),
        message('c', 'other', '2026-09-01T10:02:00'),
      ],
      'me'
    );

    const groups = rows.flatMap((row) => (row.kind === 'message' ? [[row.isMine, row.startsGroup, row.endsGroup]] : []));
    expect(groups).toEqual([
      [true, true, false],
      [true, false, true],
      [false, true, true],
    ]);
  });

  it('starts a new group after a long pause', () => {
    const rows = buildChatRows(
      [message('a', 'me', '2026-09-01T10:00:00'), message('b', 'me', '2026-09-01T11:00:00')],
      'me'
    );

    const starts = rows.flatMap((row) => (row.kind === 'message' ? [row.startsGroup] : []));
    expect(starts).toEqual([true, true]);
  });
});
