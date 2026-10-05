import type { Region } from 'react-native-maps';
import type { PlantListing } from '@/types';
import type { SelectedPin } from './mapPins';
import { buildClusterIndex, regionBounds, regionZoom, visibleMapItems } from './mapClusters';

function pin(id: string, latitude: number, longitude: number): SelectedPin {
  return { kind: 'listing', listing: { id, listingType: 'donation', latitude, longitude, photoUrls: [] } as unknown as PlantListing };
}

const MAP_WIDTH = 400;
const pins = [pin('a', -15.79, -47.88), pin('b', -15.7901, -47.8801), pin('c', -16.68, -49.26)];

function regionAt(latitude: number, longitude: number, delta: number): Region {
  return { latitude, longitude, latitudeDelta: delta, longitudeDelta: delta };
}

describe('regionZoom', () => {
  it('grows as the visible longitude span shrinks', () => {
    expect(regionZoom(regionAt(0, 0, 0.01), MAP_WIDTH)).toBeGreaterThan(regionZoom(regionAt(0, 0, 1), MAP_WIDTH));
  });
});

describe('regionBounds', () => {
  it('covers the region with a margin', () => {
    const [west, south, east, north] = regionBounds(regionAt(0, 0, 2));

    expect(west).toBeLessThan(-1);
    expect(south).toBeLessThan(-1);
    expect(east).toBeGreaterThan(1);
    expect(north).toBeGreaterThan(1);
  });
});

describe('visibleMapItems', () => {
  const index = buildClusterIndex(pins);

  it('groups nearby pins into a cluster when zoomed out', () => {
    const items = visibleMapItems(index, regionAt(-15.79, -47.88, 1), MAP_WIDTH);

    expect(items.clusters).toEqual([expect.objectContaining({ count: 2 })]);
    expect(items.pins).toEqual([]);
  });

  it('shows individual pins when zoomed in', () => {
    const items = visibleMapItems(index, regionAt(-15.79, -47.88, 0.0005), MAP_WIDTH);

    expect(items.clusters).toEqual([]);
    expect(items.pins.map((item) => (item.kind === 'listing' ? item.listing.id : ''))).toEqual(['a', 'b']);
  });

  it('skips pins outside the visible area', () => {
    const items = visibleMapItems(index, regionAt(-16.68, -49.26, 0.01), MAP_WIDTH);

    expect(items.pins).toHaveLength(1);
  });
});
