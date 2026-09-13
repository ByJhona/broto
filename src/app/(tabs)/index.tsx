import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type MarkerPressEvent } from 'react-native-maps';
import * as Location from 'expo-location';
import { useQuery } from '@tanstack/react-query';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import LocateFixed from 'lucide-react-native/icons/locate-fixed';
import Plus from 'lucide-react-native/icons/plus';
import X from 'lucide-react-native/icons/x';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import {
  CreateChoiceSheet,
  EventCallout,
  HomeHeader,
  IconButton,
  ListingCallout,
  ListingMarkerPin,
  SubmitButton,
} from '@/components';
import { useAuth, useEvents, useListings } from '@/hooks';
import { createPost } from '@/services';
import {
  EVENT_COLOR,
  EVENT_ICON,
  formatDistanceTo,
  LISTING_SHARE_VERB,
  LISTING_TYPE_COLORS,
  LISTING_TYPE_ICONS,
  Toast,
} from '@/utils';
import type { ListingType, PlantEvent, PlantListing } from '@/types';

type SelectedPin = { kind: 'listing'; listing: PlantListing } | { kind: 'event'; event: PlantEvent };

const INITIAL_REGION = {
  latitude: -23.5505,
  longitude: -46.6333,
  latitudeDelta: 0.1,
  longitudeDelta: 0.1,
};

const LOCATED_REGION_DELTA = 0.01;

type PlacingParams = {
  placingListing?: string;
  placingEvent?: string;
  listingType?: ListingType;
  plantId?: string;
  title?: string;
  description?: string;
  eventDate?: string;
  photoUrls?: string;
  photoUris?: string;
  shareToCommunity?: string;
};

function parsePhotoList(value: string | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

type PlacingKind = 'listing' | 'event' | null;

function resolvePlacingKind(params: PlacingParams): PlacingKind {
  if (params.placingListing === '1') return 'listing';
  if (params.placingEvent === '1') return 'event';
  return null;
}

function resolveDraftColor(placingKind: PlacingKind, listingType: ListingType | undefined, defaultColor: string): string {
  if (placingKind === 'event') return EVENT_COLOR;
  if (listingType) return LISTING_TYPE_COLORS[listingType];
  return defaultColor;
}

function resolveDraftIcon(placingKind: PlacingKind, listingType: ListingType | undefined) {
  if (placingKind === 'event') return EVENT_ICON;
  if (listingType) return LISTING_TYPE_ICONS[listingType];
  return undefined;
}

const prefetchedPhotoUrls = new Set<string>();

function useDownloadedPhotoUrl(photoUrl: string | null): string | null {
  const [, forceRender] = useState(0);

  useEffect(() => {
    if (!photoUrl || prefetchedPhotoUrls.has(photoUrl)) return;
    Image.prefetch(photoUrl)
      .then(() => {
        prefetchedPhotoUrls.add(photoUrl);
        forceRender((n) => n + 1);
      })
      .catch(() => {});
  }, [photoUrl]);

  return photoUrl && prefetchedPhotoUrls.has(photoUrl) ? photoUrl : null;
}

type ListingMarkerProps = {
  listing: PlantListing;
  isHighlighted: boolean;
  onPress: (event: MarkerPressEvent) => void;
};

function ListingMarker({ listing, isHighlighted, onPress }: Readonly<ListingMarkerProps>) {
  const Icon = LISTING_TYPE_ICONS[listing.listingType];
  const color = LISTING_TYPE_COLORS[listing.listingType];
  const photoUrl = useDownloadedPhotoUrl(listing.photoUrls[0] ?? null);

  return (
    <Marker
      coordinate={{ latitude: listing.latitude, longitude: listing.longitude }}
      onPress={onPress}
      zIndex={isHighlighted ? 1 : 0}
    >
      <ListingMarkerPin photoUrl={photoUrl} color={color} icon={Icon} highlighted={isHighlighted} />
    </Marker>
  );
}

type EventMarkerProps = {
  event: PlantEvent;
  isHighlighted: boolean;
  onPress: (event: MarkerPressEvent) => void;
};

function EventMarker({ event, isHighlighted, onPress }: Readonly<EventMarkerProps>) {
  const photoUrl = useDownloadedPhotoUrl(event.photoUrl);

  return (
    <Marker coordinate={{ latitude: event.latitude, longitude: event.longitude }} onPress={onPress} zIndex={isHighlighted ? 1 : 0}>
      <ListingMarkerPin photoUrl={photoUrl} color={EVENT_COLOR} icon={EVENT_ICON} highlighted={isHighlighted} />
    </Marker>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const params = useLocalSearchParams<PlacingParams>();
  const { user } = useAuth();
  const { listings, addListing } = useListings();
  const { events, addEvent } = useEvents();
  const [isHeaderExpanded, setIsHeaderExpanded] = useState(true);
  const [mapCenter, setMapCenter] = useState(INITIAL_REGION);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedPin, setSelectedPin] = useState<SelectedPin | null>(null);
  const [isCreateChoiceOpen, setIsCreateChoiceOpen] = useState(false);
  const mapRef = useRef<MapView>(null);

  const placingKind = resolvePlacingKind(params);
  const isPlacing = placingKind !== null;
  const draftPhotoUrls = parsePhotoList(params.photoUrls);
  const draftPhotoUris = parsePhotoList(params.photoUris);
  const draftCoverPhotoUrl = draftPhotoUrls[0] ?? draftPhotoUris[0] ?? null;

  const locationQuery = useQuery({
    queryKey: ['device-location', isPlacing],
    queryFn: async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;
      const position = await Location.getCurrentPositionAsync({});
      return { latitude: position.coords.latitude, longitude: position.coords.longitude };
    },
  });

  useEffect(() => {
    if (!locationQuery.data) return;
    mapRef.current?.animateToRegion(
      {
        latitude: locationQuery.data.latitude,
        longitude: locationQuery.data.longitude,
        latitudeDelta: LOCATED_REGION_DELTA,
        longitudeDelta: LOCATED_REGION_DELTA,
      },
      500
    );
  }, [locationQuery.data]);

  useFocusEffect(
    useCallback(() => {
      return () => setSelectedPin(null);
    }, [])
  );

  const handleSelectListing = (event: MarkerPressEvent, listing: PlantListing) => {
    event.stopPropagation();
    setSelectedPin({ kind: 'listing', listing });
  };

  const handleSelectEvent = (event: MarkerPressEvent, plantEvent: PlantEvent) => {
    event.stopPropagation();
    setSelectedPin({ kind: 'event', event: plantEvent });
  };

  const handleLocateMe = async () => {
    const result = await locationQuery.refetch();
    if (!result.data) Toast.error('Permita o acesso à localização pra ver plantas perto de você.');
  };

  const handleCreateListing = () => {
    setIsCreateChoiceOpen(false);
    router.push('/listing/new');
  };

  const handleCreateEvent = () => {
    setIsCreateChoiceOpen(false);
    router.push('/event/new');
  };

  const handleCancelPlacing = () => {
    router.replace('/(tabs)');
  };

  const handleConfirmEventPlacing = async () => {
    if (!params.title || !params.eventDate) return;

    setIsPublishing(true);
    try {
      const newEvent = await addEvent({
        title: params.title,
        description: params.description || null,
        eventDate: params.eventDate,
        photoUri: draftPhotoUris[0] ?? null,
        latitude: mapCenter.latitude,
        longitude: mapCenter.longitude,
      });

      if (params.shareToCommunity === '1' && user) {
        const caption = `Marquei um evento: "${params.title}"!`;
        try {
          await createPost(user.id, caption, null, null, newEvent.photoUrl, null, newEvent.id);
        } catch {
          Toast.error('Evento publicado, mas não deu pra compartilhar na Comunidade.');
        }
      }

      Toast.success('Evento publicado no mapa!');
      router.replace('/(tabs)');
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : 'Não foi possível publicar o evento.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleConfirmListingPlacing = async () => {
    if (!params.listingType || !params.title) return;

    setIsPublishing(true);
    try {
      const newListing = await addListing({
        listingType: params.listingType,
        plantId: params.plantId || null,
        title: params.title,
        description: params.description || null,
        photoUrls: draftPhotoUrls,
        photoUris: draftPhotoUris,
        latitude: mapCenter.latitude,
        longitude: mapCenter.longitude,
      });

      if (params.shareToCommunity === '1' && user) {
        const caption = `${LISTING_SHARE_VERB[params.listingType]} "${params.title}"!`;
        try {
          await createPost(user.id, caption, null, null, newListing.photoUrls[0] ?? null, newListing.id);
        } catch {
          Toast.error('Oferta publicada, mas não deu pra compartilhar na Comunidade.');
        }
      }

      Toast.success('Oferta publicada no mapa!');
      router.replace('/(tabs)');
    } catch (err) {
      Toast.error(err instanceof Error ? err.message : 'Não foi possível publicar a oferta.');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleConfirmPlacing = () => (placingKind === 'event' ? handleConfirmEventPlacing() : handleConfirmListingPlacing());

  const draftColor = resolveDraftColor(placingKind, params.listingType, colors.primary);
  const draftIcon = resolveDraftIcon(placingKind, params.listingType);

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={INITIAL_REGION}
        showsUserLocation={!!locationQuery.data}
        showsMyLocationButton={false}
        onPress={() => setSelectedPin(null)}
        onRegionChangeStart={(_region, details) => {
          if (details?.isGesture) {
            setIsHeaderExpanded(false);
            setSelectedPin(null);
          }
        }}
        onRegionChangeComplete={(region) => setMapCenter(region)}
      >
        {!isPlacing &&
          listings.map((listing) => (
            <ListingMarker
              key={`listing-${listing.id}`}
              listing={listing}
              isHighlighted={selectedPin?.kind === 'listing' && selectedPin.listing.id === listing.id}
              onPress={(event) => handleSelectListing(event, listing)}
            />
          ))}

        {!isPlacing &&
          events.map((event) => (
            <EventMarker
              key={`event-${event.id}`}
              event={event}
              isHighlighted={selectedPin?.kind === 'event' && selectedPin.event.id === event.id}
              onPress={(pressEvent) => handleSelectEvent(pressEvent, event)}
            />
          ))}
      </MapView>

      {selectedPin ? (
        <View style={[styles.infoCard, { bottom: insets.bottom + Metrics.spacing.sm }]}>
          {selectedPin.kind === 'listing' ? (
            <ListingCallout
              listing={selectedPin.listing}
              distanceLabel={formatDistanceTo(locationQuery.data, selectedPin.listing.latitude, selectedPin.listing.longitude)}
              onPress={() => router.push({ pathname: '/listing/[id]', params: { id: selectedPin.listing.id } })}
            />
          ) : (
            <EventCallout
              event={selectedPin.event}
              distanceLabel={formatDistanceTo(locationQuery.data, selectedPin.event.latitude, selectedPin.event.longitude)}
              onPress={() => router.push({ pathname: '/event/[id]', params: { id: selectedPin.event.id } })}
            />
          )}
        </View>
      ) : null}

      {isPlacing ? (
        <>
          <View pointerEvents="none" style={styles.placingPin}>
            {draftIcon && <ListingMarkerPin photoUrl={draftCoverPhotoUrl} color={draftColor} icon={draftIcon} size={48} />}
          </View>

          <View style={[styles.placingPanel, { bottom: insets.bottom + Metrics.spacing.lg }]}>
            <Text style={styles.placingText}>
              {placingKind === 'event'
                ? 'Posicione o mapa até o pino ficar no local do evento'
                : 'Posicione o mapa até o pino ficar no local de retirada'}
            </Text>
            <SubmitButton
              label={placingKind === 'event' ? 'Publicar evento aqui' : 'Publicar oferta aqui'}
              onPress={handleConfirmPlacing}
              loading={isPublishing}
            />
          </View>

          <IconButton
            size={40}
            elevated
            style={[styles.cancelButton, { top: insets.top + Metrics.spacing.sm }]}
            onPress={handleCancelPlacing}
          >
            <X size={Metrics.icon.normal} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
          </IconButton>
        </>
      ) : (
        <>
          <HomeHeader expanded={isHeaderExpanded} onExpand={() => setIsHeaderExpanded(true)} />

          {!selectedPin ? (
            <>
              <IconButton
                size={52}
                backgroundColor={colors.primary}
                elevated
                style={[styles.createButton, { bottom: insets.bottom + Metrics.spacing.lg + 60 }]}
                onPress={() => setIsCreateChoiceOpen(true)}
              >
                <Plus size={Metrics.icon.normal} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
              </IconButton>

              <IconButton
                size={52}
                elevated
                style={[styles.locateButton, { bottom: insets.bottom + Metrics.spacing.lg }]}
                onPress={handleLocateMe}
              >
                <LocateFixed size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
              </IconButton>
            </>
          ) : null}
        </>
      )}

      <CreateChoiceSheet
        visible={isCreateChoiceOpen}
        onCreateListing={handleCreateListing}
        onCreateEvent={handleCreateEvent}
        onClose={() => setIsCreateChoiceOpen(false)}
      />
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    locateButton: {
      position: 'absolute',
      right: Metrics.spacing.lg,
    },
    createButton: {
      position: 'absolute',
      right: Metrics.spacing.lg,
    },
    infoCard: {
      position: 'absolute',
      left: Metrics.spacing.lg,
      right: Metrics.spacing.lg,
    },
    placingPin: {
      position: 'absolute',
      top: '50%',
      left: '50%',
      marginLeft: -24,
      marginTop: -55,
    },
    placingPanel: {
      position: 'absolute',
      left: Metrics.spacing.lg,
      right: Metrics.spacing.lg,
      backgroundColor: colors.card,
      borderRadius: Metrics.radius.lg,
      padding: Metrics.spacing.md,
      elevation: 4,
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
    },
    placingText: {
      fontSize: 13,
      color: colors.mutedForeground,
      textAlign: 'center',
      marginBottom: Metrics.spacing.xs,
    },
    cancelButton: {
      position: 'absolute',
      right: Metrics.spacing.lg,
    },
  });
