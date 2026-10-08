import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, useWindowDimensions, View, type LayoutChangeEvent } from 'react-native';
import MapView, { PROVIDER_GOOGLE, type MapPressEvent, type Region } from 'react-native-maps';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Search from 'lucide-react-native/icons/search';
import { Metrics, Motion, useAppTheme, useColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import { CreateChoiceSheet, FilterChipRow, HomeHeader, type FilterChipOption } from '@/components';
import { MapActionButtons } from '@/components/home/MapActionButtons';
import { filterMapItems, isEventsOnly, MAP_FILTER_EVENTS, type MapFilter } from '@/components/home/mapFilter';
import { ClusterMarker } from '@/components/home/ClusterMarker';
import { buildClusterIndex, visibleMapItems, type MapCluster } from '@/components/home/mapClusters';
import { MapPinMarker } from '@/components/home/MapPinMarker';
import { isSamePin, mapPins, pinAppearance, type SelectedPin } from '@/components/home/mapPins';
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
import { EVENT_COLOR, EVENT_ICON, listingTypes, Toast, toggleListItem } from '@/utils';

const MAP_STYLE = [
  { featureType: 'poi.business', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.medical', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.school', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.place_of_worship', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.sports_complex', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.government', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.attraction', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
];

const INITIAL_CENTER = { latitude: -23.5505, longitude: -46.6333 };

const INITIAL_REGION: Region = {
  ...INITIAL_CENTER,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const LOCATED_ZOOM = 15;

function nearbyPeekLabel(count: number, isNearUser: boolean, t: (key: string, options?: Record<string, unknown>) => string): string {
  if (count === 0) return t('searchMapPrompt');
  return t(isNearUser ? 'nearbyYou' : 'nearbyArea', { count });
}

function nearbySheetTitle(filters: MapFilter[], isNearUser: boolean, t: (key: string) => string): string {
  if (isEventsOnly(filters)) return t('upcomingEventsTitle');
  return isNearUser ? t('nearbyYouTitle') : t('nearbyAreaTitle');
}

function mapFilterOptions(t: (key: string) => string): FilterChipOption<MapFilter>[] {
  return [
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
  const { listings: allListings, refresh: refreshListings } = useListings();
  const { events: allEvents, refresh: refreshEvents } = useEvents();
  const [mapFilters, setMapFilters] = useState<MapFilter[]>([]);
  const [headerHeight, setHeaderHeight] = useState(0);
  const { listings, events } = useMemo(
    () => filterMapItems(allListings, allEvents, mapFilters),
    [allListings, allEvents, mapFilters]
  );
  const [region, setRegion] = useState<Region>(INITIAL_REGION);
  const mapCenter = useMemo(() => ({ latitude: region.latitude, longitude: region.longitude }), [region]);
  const { width: mapWidth } = useWindowDimensions();
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const [isCreateChoiceOpen, setIsCreateChoiceOpen] = useState(false);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const mapRef = useRef<MapView>(null);
  const isPlacing = resolvePlacingKind(params) !== null;
  const { lastKnownLocation, currentLocation, refreshCurrentLocation } = useHomeLocation(isPlacing);
  const { isPublishing, confirmPlacing } = usePlacementPublishing(params, mapCenter);
  const nearby = useNearbySheet({ listings, events, userLocation: currentLocation ?? lastKnownLocation, mapCenter, filters: mapFilters });

  useEffect(() => {
    if (!isMapLoaded || !lastKnownLocation) return;
    mapRef.current?.setCamera({ center: lastKnownLocation, zoom: LOCATED_ZOOM });
  }, [isMapLoaded, lastKnownLocation]);

  useEffect(() => {
    if (!isMapLoaded || !currentLocation) return;
    mapRef.current?.animateCamera({ center: currentLocation, zoom: LOCATED_ZOOM }, { duration: Motion.slow });
  }, [isMapLoaded, currentLocation]);

  useFocusEffect(
    useCallback(() => {
      return () => setSelectedPin(null);
    }, [])
  );

  const clusterIndex = useMemo(() => buildClusterIndex(isPlacing ? [] : mapPins(listings, events)), [isPlacing, listings, events]);
  const mapItems = useMemo(() => visibleMapItems(clusterIndex, region, mapWidth), [clusterIndex, region, mapWidth]);
  const isSelectedHidden = !!selectedPin && !mapItems.pins.some((pin) => isSamePin(selectedPin, pin));
  const visiblePins = selectedPin && isSelectedHidden ? [...mapItems.pins, selectedPin] : mapItems.pins;

  const handleClusterPress = useCallback(
    (cluster: MapCluster) => {
      const zoom = clusterIndex.getClusterExpansionZoom(cluster.id);
      mapRef.current?.animateCamera({ center: cluster.coordinate, zoom }, { duration: Motion.slow });
    },
    [clusterIndex]
  );

  const handleSelectPin = useCallback((pin: SelectedPin) => {
    setSelectedPin(pin);
    mapRef.current?.animateCamera({ center: pinAppearance(pin).coordinate }, { duration: Motion.slow });
  }, []);

  const handleMapPress = (event: MapPressEvent) => {
    if (event.nativeEvent.action !== 'marker-press') setSelectedPin(null);
  };

  const handleChangeFilter = (filter: MapFilter) => {
    setSelectedPin(null);
    setMapFilters((current) => toggleListItem(current, filter));
  };

  const handleSelectNearby = (pin: SelectedPin) => {
    nearby.close();
    mapRef.current?.setCamera({ center: pinAppearance(pin).coordinate, zoom: LOCATED_ZOOM });
    setSelectedPin(pin);
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
      <MapView
        key={scheme}
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={StyleSheet.absoluteFill}
        initialRegion={region}
        customMapStyle={MAP_STYLE}
        userInterfaceStyle={scheme}
        showsUserLocation={!!currentLocation}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        moveOnMarkerPress={false}
        onMapReady={() => setIsMapLoaded(true)}
        onPress={handleMapPress}
        onRegionChangeComplete={setRegion}
      >
        {mapItems.clusters.map((cluster) => (
          <ClusterMarker key={`cluster-${cluster.id}`} cluster={cluster} onPress={handleClusterPress} />
        ))}
        {visiblePins.map((pin) => (
          <MapPinMarker key={pinAppearance(pin).key} pin={pin} isSelected={isSamePin(selectedPin, pin)} onSelect={handleSelectPin} />
        ))}
      </MapView>

      {isMapLoaded ? null : <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background }]} />}

      {selectedPin ? (
        <SelectedPinCallout
          key={pinAppearance(selectedPin).key}
          pin={selectedPin}
          userLocation={currentLocation}
          onClose={() => setSelectedPin(null)}
        />
      ) : null}

      {isPlacing ? (
        <PlacingOverlay
          params={params}
          isPublishing={isPublishing}
          onConfirm={confirmPlacing}
          onCancel={() => router.replace('/(tabs)')}
        />
      ) : (
        <>
          <HomeHeader onLayout={handleHeaderLayout} onRefresh={() => Promise.all([refreshListings(), refreshEvents()])} />
          <View style={[styles.mapFilters, { top: headerHeight + Metrics.spacing.sm }]}>
            <FilterChipRow
              floating
              options={mapFilterOptions(t)}
              selected={mapFilters}
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
        title={nearbySheetTitle(mapFilters, nearby.isNearUser, t)}
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
