import type { ChatMessage, MessageDelivery, Proposal } from '@/types';

export type ChatTimelineItem =
  | { kind: 'message'; message: ChatMessage; delivery: MessageDelivery | null }
  | { kind: 'proposal'; proposal: Proposal };

export function timelineItemCreatedAt(item: ChatTimelineItem): string {
  return item.kind === 'message' ? item.message.createdAt : (item.proposal.respondedAt ?? item.proposal.createdAt);
}
