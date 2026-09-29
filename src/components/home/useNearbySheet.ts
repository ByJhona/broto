import { useCallback, useMemo, useState } from 'react';
import type { PlantEvent, PlantListing } from '@/types';
import { nearbyPins } from './nearbyPins';
import type { Coordinates } from './useHomeLocation';

export function useNearbySheet(
  listings: PlantListing[],
  events: PlantEvent[],
  userLocation: Coordinates | null,
  mapCenter: Coordinates
) {
  const [isOpen, setIsOpen] = useState(false);
  const origin = userLocation ?? mapCenter;
  const items = useMemo(() => nearbyPins(listings, events, origin), [listings, events, origin]);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  return { items, isOpen, open, close, isNearUser: !!userLocation };
}
