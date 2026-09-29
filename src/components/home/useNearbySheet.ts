import { useCallback, useMemo, useState } from 'react';
import type { PlantEvent, PlantListing } from '@/types';
import { MAP_FILTER_EVENTS, type MapFilter } from './mapFilter';
import { limitToRadius, pinsByDistance, searchPins, sortByEventDate, type NearbyPin } from './nearbyPins';
import type { Coordinates } from './useHomeLocation';

type NearbySheetSources = {
  listings: PlantListing[];
  events: PlantEvent[];
  userLocation: Coordinates | null;
  mapCenter: Coordinates;
  filter: MapFilter;
};

function visiblePins(allPins: NearbyPin[], nearby: NearbyPin[], query: string, showAll: boolean): NearbyPin[] {
  if (query) return searchPins(allPins, query);
  return showAll ? allPins : nearby;
}

export function useNearbySheet({ listings, events, userLocation, mapCenter, filter }: NearbySheetSources) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [showAll, setShowAll] = useState(false);
  const origin = userLocation ?? mapCenter;
  const allPins = useMemo(() => pinsByDistance(listings, events, origin), [listings, events, origin]);
  const nearby = useMemo(() => limitToRadius(allPins), [allPins]);
  const trimmedQuery = query.trim();
  const pins = visiblePins(allPins, nearby, trimmedQuery, showAll);
  const items = filter === MAP_FILTER_EVENTS ? sortByEventDate(pins) : pins;
  const hiddenCount = trimmedQuery || showAll ? 0 : allPins.length - nearby.length;

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => {
    setIsOpen(false);
    setQuery('');
    setShowAll(false);
  }, []);

  return {
    items,
    nearbyCount: nearby.length,
    hiddenCount,
    query,
    setQuery,
    showAll: () => setShowAll(true),
    isOpen,
    open,
    close,
    isNearUser: !!userLocation,
  };
}
