import type { CommunityPost, PlantEvent, PlantListing } from '@/types';
import { chunkIntoRows } from '../gridLayout';

export const PROFILE_TAB = {
  POSTS: 'posts',
  LISTINGS: 'listings',
  EVENTS: 'events',
} as const;

export type ProfileTab = (typeof PROFILE_TAB)[keyof typeof PROFILE_TAB];

export const CARD_GRID_COLUMNS = 2;

export type ProfileGridRow =
  | { kind: typeof PROFILE_TAB.POSTS; key: string; post: CommunityPost }
  | { kind: typeof PROFILE_TAB.LISTINGS; key: string; listings: PlantListing[] }
  | { kind: typeof PROFILE_TAB.EVENTS; key: string; events: PlantEvent[] };

type ProfileTabContent = {
  posts: CommunityPost[];
  listings: PlantListing[];
  events: PlantEvent[];
};

export function buildProfileRows(tab: ProfileTab, content: ProfileTabContent): ProfileGridRow[] {
  if (tab === PROFILE_TAB.POSTS) {
    return content.posts.map((post) => ({ kind: tab, key: `post-${post.id}`, post }));
  }
  if (tab === PROFILE_TAB.LISTINGS) {
    return chunkIntoRows(content.listings, CARD_GRID_COLUMNS).map((listings) => ({
      kind: tab,
      key: `listings-${listings[0].id}`,
      listings,
    }));
  }
  return chunkIntoRows(content.events, CARD_GRID_COLUMNS).map((events) => ({ kind: tab, key: `events-${events[0].id}`, events }));
}
