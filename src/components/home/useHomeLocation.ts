import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';

export type Coordinates = { latitude: number; longitude: number };

function toCoordinates(position: Location.LocationObject): Coordinates {
  return { latitude: position.coords.latitude, longitude: position.coords.longitude };
}

async function getLastKnownLocation(): Promise<Coordinates | null> {
  const { status } = await Location.getForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const position = await Location.getLastKnownPositionAsync();
  return position ? toCoordinates(position) : null;
}

async function getCurrentLocation(): Promise<Coordinates | null> {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') return null;
  const position = await Location.getCurrentPositionAsync({});
  return toCoordinates(position);
}

export function useHomeLocation(isPlacing: boolean) {
  const lastKnownLocationQuery = useQuery({
    queryKey: ['device-last-known-location'],
    queryFn: getLastKnownLocation,
  });

  const currentLocationQuery = useQuery({
    queryKey: ['device-location', isPlacing],
    queryFn: getCurrentLocation,
  });

  return {
    lastKnownLocation: lastKnownLocationQuery.data ?? null,
    currentLocation: currentLocationQuery.data ?? null,
    refreshCurrentLocation: currentLocationQuery.refetch,
  };
}
