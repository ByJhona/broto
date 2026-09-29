import { EVENT_COLOR, LISTING_TYPE_COLORS } from '@/utils';
import { parsePhotoList, resolveDraftColor, resolvePlacingKind } from './placement';

describe('resolvePlacingKind', () => {
  it('detects listing and event placement from the route params', () => {
    expect(resolvePlacingKind({ placingListing: '1' })).toBe('listing');
    expect(resolvePlacingKind({ placingEvent: '1' })).toBe('event');
    expect(resolvePlacingKind({})).toBeNull();
  });
});

describe('parsePhotoList', () => {
  it('parses a JSON array of photo urls', () => {
    expect(parsePhotoList('["a.jpg","b.jpg"]')).toEqual(['a.jpg', 'b.jpg']);
  });

  it('returns an empty list for missing, invalid or non-array values', () => {
    expect(parsePhotoList(undefined)).toEqual([]);
    expect(parsePhotoList('not json')).toEqual([]);
    expect(parsePhotoList('{"a":1}')).toEqual([]);
  });
});

describe('resolveDraftColor', () => {
  it('uses the event color, then the listing type color, then the fallback', () => {
    expect(resolveDraftColor('event', 'sale', '#000')).toBe(EVENT_COLOR);
    expect(resolveDraftColor('listing', 'sale', '#000')).toBe(LISTING_TYPE_COLORS.sale);
    expect(resolveDraftColor('listing', undefined, '#000')).toBe('#000');
  });
});
