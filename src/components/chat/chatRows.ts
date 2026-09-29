import { timelineItemCreatedAt, type ChatTimelineItem } from '@/utils/chatTimeline';
import type { ChatMessage, MessageDelivery, Proposal } from '@/types';

const GROUP_WINDOW_MS = 5 * 60 * 1000;

export type ChatRow =
  | { kind: 'day'; key: string; date: Date }
  | {
      kind: 'message';
      key: string;
      message: ChatMessage;
      delivery: MessageDelivery | null;
      isMine: boolean;
      startsGroup: boolean;
      endsGroup: boolean;
    }
  | { kind: 'proposal'; key: string; proposal: Proposal; isMine: boolean };

function itemDate(item: ChatTimelineItem): Date {
  return new Date(timelineItemCreatedAt(item));
}

function isSameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString();
}

function continuesGroup(previous: ChatTimelineItem | undefined, item: ChatTimelineItem | undefined): boolean {
  if (previous?.kind !== 'message' || item?.kind !== 'message') return false;
  if (previous.message.senderId !== item.message.senderId) return false;
  const previousDate = itemDate(previous);
  const date = itemDate(item);
  return isSameDay(previousDate, date) && date.getTime() - previousDate.getTime() < GROUP_WINDOW_MS;
}

function toRow(
  item: ChatTimelineItem,
  previous: ChatTimelineItem | undefined,
  next: ChatTimelineItem | undefined,
  currentUserId: string | null
): ChatRow {
  if (item.kind === 'proposal') {
    return { kind: 'proposal', key: `proposal-${item.proposal.id}`, proposal: item.proposal, isMine: item.proposal.senderId === currentUserId };
  }
  return {
    kind: 'message',
    key: `message-${item.message.id}`,
    message: item.message,
    delivery: item.delivery,
    isMine: item.message.senderId === currentUserId,
    startsGroup: !continuesGroup(previous, item),
    endsGroup: !continuesGroup(item, next),
  };
}

export function buildChatRows(timeline: ChatTimelineItem[], currentUserId: string | null): ChatRow[] {
  return timeline.flatMap((item, index) => {
    const previous = timeline[index - 1];
    const date = itemDate(item);
    const row = toRow(item, previous, timeline[index + 1], currentUserId);
    if (previous && isSameDay(itemDate(previous), date)) return [row];
    return [{ kind: 'day', key: `day-${date.toDateString()}`, date }, row];
  });
}
