import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';

const LOCATION_STALE_TIME = 5 * 60 * 1000;

export function useUserLocation() {
  const { data } = useQuery({
    queryKey: ['user-location'],
    queryFn: async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const position = await Location.getCurrentPositionAsync({});
      return { latitude: position.coords.latitude, longitude: position.coords.longitude };
    },
    staleTime: LOCATION_STALE_TIME,
  });

  return data ?? null;
}
