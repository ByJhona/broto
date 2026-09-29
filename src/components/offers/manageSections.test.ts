import type { PlantEvent, PlantListing } from '@/types';
import { groupEventsByStatus, groupListingsByStatus, isEventClosed } from './manageSections';

const listing = (id: string, status: PlantListing['status']) => ({ id, status }) as PlantListing;
const event = (id: string, eventDate: string, status: PlantEvent['status'] = 'active') =>
  ({ id, eventDate, status }) as PlantEvent;

const NOW = new Date('2026-09-28T12:00:00Z');

describe('groupListingsByStatus', () => {
  it('puts available listings first and completed or cancelled ones after', () => {
    const sections = groupListingsByStatus([
      listing('done', 'completed'),
      listing('open', 'available'),
      listing('gone', 'cancelled'),
    ]);

    expect(sections.map((section) => section.key)).toEqual(['open', 'closed']);
    expect(sections[0].data.map((item) => item.id)).toEqual(['open']);
    expect(sections[1].data.map((item) => item.id)).toEqual(['done', 'gone']);
  });

  it('omits empty sections', () => {
    expect(groupListingsByStatus([listing('open', 'available')]).map((section) => section.key)).toEqual(['open']);
    expect(groupListingsByStatus([])).toEqual([]);
  });
});

describe('isEventClosed', () => {
  it('treats cancelled and past events as closed', () => {
    expect(isEventClosed(event('a', '2026-10-01T10:00:00Z', 'cancelled'), NOW)).toBe(true);
    expect(isEventClosed(event('b', '2026-09-20T10:00:00Z'), NOW)).toBe(true);
    expect(isEventClosed(event('c', '2026-10-01T10:00:00Z'), NOW)).toBe(false);
  });
});

describe('groupEventsByStatus', () => {
  it('orders upcoming events by nearest date and closed events by most recent', () => {
    const sections = groupEventsByStatus(
      [
        event('later', '2026-10-20T10:00:00Z'),
        event('old', '2026-08-01T10:00:00Z'),
        event('soon', '2026-10-01T10:00:00Z'),
        event('recent', '2026-09-20T10:00:00Z'),
      ],
      NOW
    );

    expect(sections[0].data.map((item) => item.id)).toEqual(['soon', 'later']);
    expect(sections[1].data.map((item) => item.id)).toEqual(['recent', 'old']);
  });
});
