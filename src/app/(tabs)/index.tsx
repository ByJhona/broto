import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { GoogleMaps } from 'expo-maps';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Search from 'lucide-react-native/icons/search';
import { Metrics, useAppTheme, useColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { CreateChoiceSheet, FilterChipRow, HomeHeader, type FilterChipOption } from '@/components';
import { MapActionButtons } from '@/components/home/MapActionButtons';
import { filterMapItems, MAP_FILTER_ALL, MAP_FILTER_EVENTS, type MapFilter } from '@/components/home/mapFilter';
import {
  allPinIconsLoaded,
  buildMarkers,
  findPinForMarker,
  useMapPinIcons,
  type SelectedPin,
} from '@/components/home/mapPins';
import { resolvePlacingKind, type PlacingParams } from '@/components/home/placement';
import { NearbyPeek } from '@/components/home/NearbyPeek';
import { NearbySheet } from '@/components/home/NearbySheet';
import { PlacingOverlay } from '@/components/home/PlacingOverlay';
import { SelectedPinCallout } from '@/components/home/SelectedPinCallout';
import { makeStyles } from '@/components/home/styles';
import { useHomeLocation } from '@/components/home/useHomeLocation';
import { useNearbySheet } from '@/components/home/useNearbySheet';
import { usePlacementPublishing } from '@/components/home/usePlacementPublishing';
import { useEvents, useListings } from '@/hooks';
import type { ListingType } from '@/types';
import { EVENT_COLOR, EVENT_ICON, listingTypes, Toast } from '@/utils';

const MAP_STYLE_JSON = JSON.stringify([
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
]);

const INITIAL_CAMERA = {
  coordinates: { latitude: -23.5505, longitude: -46.6333 },
  zoom: 12,
};

const LOCATED_ZOOM = 15;

function nearbyPeekLabel(count: number, isNearUser: boolean, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (count === 0) return t('searchMapPrompt');
  return t(isNearUser ? 'nearbyYou' : 'nearbyArea', { count });
}

function nearbySheetTitle(filter: MapFilter, isNearUser: boolean, t: (key: string) => string): string {
  if (filter === MAP_FILTER_EVENTS) return t('upcomingEventsTitle');
  return isNearUser ? t('nearbyYouTitle') : t('nearbyAreaTitle');
}

function mapFilterOptions(t: (key: string) => string): FilterChipOption<MapFilter>[] {
  return [
    { value: MAP_FILTER_ALL, label: t('filterAll') },
    ...listingTypes().map(({ value, label, icon, color }) => ({ value, label, icon, color })),
    { value: MAP_FILTER_EVENTS, label: t('filterEvents'), icon: EVENT_ICON, color: EVENT_COLOR },
  ];
}

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { scheme } = useAppTheme();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('home');
  const params = useLocalSearchParams<PlacingParams>();
  const { listings: allListings } = useListings();
  const { events: allEvents } = useEvents();
  const [mapFilter, setMapFilter] = useState<MapFilter>(MAP_FILTER_ALL);
  const [headerHeight, setHeaderHeight] = useState(0);
  const { listings, events } = useMemo(
    () => filterMapItems(allListings, allEvents, mapFilter),
    [allListings, allEvents, mapFilter]
  );
  const [mapCenter, setMapCenter] = useState(INITIAL_CAMERA.coordinates);
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const [isCreateChoiceOpen, setIsCreateChoiceOpen] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapRef = useRef<GoogleMaps.MapView>(null);
  const pinIcons = useMapPinIcons();
  const iconsReady = allPinIconsLoaded(pinIcons);
  const isPlacing = resolvePlacingKind(params) !== null;
  const { lastKnownLocation, currentLocation, refreshCurrentLocation } = useHomeLocation(isPlacing);
  const { isPublishing, confirmPlacing } = usePlacementPublishing(params, mapCenter);
  const nearby = useNearbySheet({ listings, events, userLocation: currentLocation ?? lastKnownLocation, mapCenter, filter: mapFilter });

  useEffect(() => {
    if (!isMapLoaded || !lastKnownLocation) return;
    mapRef.current?.setCameraPosition({ coordinates: lastKnownLocation, zoom: LOCATED_ZOOM });
  }, [isMapLoaded, lastKnownLocation]);

  useEffect(() => {
    if (!isMapLoaded || !currentLocation) return;
    mapRef.current?.setCameraPosition({ coordinates: currentLocation, zoom: LOCATED_ZOOM, duration: 500 });
  }, [isMapLoaded, currentLocation]);

  useFocusEffect(
    useCallback(() => {
      return () => setSelectedPin(null);
    }, [])
  );

  const markers = useMemo<GoogleMaps.Marker[]>(
    () => (isPlacing || !iconsReady ? [] : buildMarkers(listings, events, pinIcons, selectedPin)),
    [isPlacing, iconsReady, listings, events, pinIcons, selectedPin]
  );

  const handleMarkerClick = (marker: GoogleMaps.Marker) => {
    const pin = findPinForMarker(marker.id, listings, events);
    if (pin) setSelectedPin(pin);
  };

  const handleCameraMove = (event: { coordinates: { latitude?: number; longitude?: number } }) => {
    const { latitude, longitude } = event.coordinates;
    if (latitude != null && longitude != null) setMapCenter({ latitude, longitude });
  };

  const handleChangeFilter = (filter: MapFilter) => {
    setSelectedPin(null);
    setMapFilter(filter);
  };

  const handleSelectNearby = (pin: SelectedPin) => {
    nearby.close();
    setSelectedPin(pin);
    const coordinates = pin.kind === 'listing' ? pin.listing : pin.event;
    mapRef.current?.setCameraPosition({
      coordinates: { latitude: coordinates.latitude, longitude: coordinates.longitude },
      zoom: LOCATED_ZOOM,
      duration: 500,
    });
  };

  const handleHeaderLayout = (event: LayoutChangeEvent) => setHeaderHeight(event.nativeEvent.layout.height);

  const handleLocateMe = async () => {
    const result = await refreshCurrentLocation();
    if (!result.data) Toast.error(t('locationPermissionDenied'));
  };

  const handleCreateListing = (listingType: ListingType) => {
    setIsCreateChoiceOpen(false);
    router.push({ pathname: '/listing/new', params: { type: listingType } });
  };

  const handleCreateEvent = () => {
    setIsCreateChoiceOpen(false);
    router.push('/event/new');
  };

  return (
    <View style={styles.container}>
      <GoogleMaps.View
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        cameraPosition={INITIAL_CAMERA}
        markers={markers}
        properties={{ isMyLocationEnabled: !!currentLocation, mapStyleOptions: { json: MAP_STYLE_JSON } }}
        uiSettings={{ myLocationButtonEnabled: false, zoomControlsEnabled: false }}
        colorScheme={scheme === 'dark' ? GoogleMaps.MapColorScheme.DARK : GoogleMaps.MapColorScheme.LIGHT}
        onMapLoaded={() => setIsMapLoaded(true)}
        onMapClick={() => setSelectedPin(null)}
        onMarkerClick={handleMarkerClick}
        onCameraMove={handleCameraMove}
      />

      {isMapLoaded ? null : <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />}

      {selectedPin ? <SelectedPinCallout pin={selectedPin} userLocation={currentLocation} /> : null}

      {isPlacing ? (
        <PlacingOverlay
          params={params}
          isPublishing={isPublishing}
          onConfirm={confirmPlacing}
          onCancel={() => router.replace('/(tabs)')}
        />
      ) : (
        <>
          <HomeHeader onLayout={handleHeaderLayout} />
          <View style={[styles.mapFilters, { top: headerHeight + Metrics.spacing.sm }]}>
            <FilterChipRow
              floating
              options={mapFilterOptions(t)}
              value={mapFilter}
              onChange={handleChangeFilter}
              style={styles.mapFiltersRow}
            />
          </View>
          {selectedPin ? null : (
            <NearbyPeek
              label={nearbyPeekLabel(nearby.nearbyCount, nearby.isNearUser, t)}
              icon={nearby.nearbyCount > 0 ? undefined : Search}
              onOpen={nearby.open}
              style={{ bottom: insets.bottom + Metrics.spacing.lg }}
            />
          )}
          <MapActionButtons visible={!selectedPin} onCreate={() => setIsCreateChoiceOpen(true)} onLocate={handleLocateMe} />
        </>
      )}

      <NearbySheet
        visible={nearby.isOpen}
        title={nearbySheetTitle(mapFilter, nearby.isNearUser, t)}
        items={nearby.items}
        query={nearby.query}
        onChangeQuery={nearby.setQuery}
        hiddenCount={nearby.hiddenCount}
        onShowAll={nearby.showAll}
        onSelect={handleSelectNearby}
        onClose={nearby.close}
      />

      <CreateChoiceSheet
        visible={isCreateChoiceOpen}
        onCreateListing={handleCreateListing}
        onCreateEvent={handleCreateEvent}
        onClose={() => setIsCreateChoiceOpen(false)}
      />
    </View>
  );
}
