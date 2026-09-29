import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import ClipboardList from 'lucide-react-native/icons/clipboard-list';
import Leaf from 'lucide-react-native/icons/leaf';
import Plus from 'lucide-react-native/icons/plus';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { EmptyState, FilterChipRow, IconButton, PageTitle, SearchField, SegmentedControl } from '@/components';
import { EventRow } from '@/components/offers/EventRow';
import { ListingRow } from '@/components/offers/ListingRow';
import { DistanceTrailing } from '@/components/offers/RowTrailing';
import { useEvents, useListings, usePullToRefresh, useUserLocation } from '@/hooks';
import { EVENT_ICON, formatDistanceTo, listingTypes } from '@/utils';
import type { ListingType, PlantEvent, PlantListing } from '@/types';

type OffersSection = 'listings' | 'events';
type TypeFilter = ListingType | null;
type EventSortMode = 'proximos' | 'recentes';

function matchesQuery(item: { title: string; description: string | null }, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return item.title.toLowerCase().includes(normalized) || (item.description ?? '').toLowerCase().includes(normalized);
}

function sortEvents(events: PlantEvent[], mode: EventSortMode): PlantEvent[] {
  const sorted = [...events];
  if (mode === 'proximos') {
    sorted.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  } else {
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return sorted;
}

type SectionListProps = {
  bottomInset: number;
};

function ListingsList({ bottomInset }: Readonly<SectionListProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('listing');
  const { listings, refresh } = useListings();
  const userLocation = useUserLocation();
  const [filter, setFilter] = useState<TypeFilter>(null);
  const [query, setQuery] = useState('');
  const { isRefreshing, handleRefresh } = usePullToRefresh(refresh);

  const filterOptions: { value: TypeFilter; label: string }[] = [
    { value: null, label: t('filterAll') },
    ...listingTypes().map(({ value, label }) => ({ value, label })),
  ];

  const filteredListings = useMemo(
    () =>
      listings
        .filter((listing) => (filter ? listing.listingType === filter : true))
        .filter((listing) => matchesQuery(listing, query)),
    [listings, filter, query]
  );

  const renderListing = ({ item }: { item: PlantListing }) => (
    <ListingRow
      listing={item}
      subtitle={item.ownerName ?? undefined}
      trailing={<DistanceTrailing distanceLabel={formatDistanceTo(userLocation, item.latitude, item.longitude)} />}
      onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}
    />
  );

  return (
    <>
      <SearchField value={query} onChangeText={setQuery} placeholder={t('offersSearchPlaceholder')} />

      <FlatList
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset }]}
        data={filteredListings}
        keyExtractor={(listing) => listing.id}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
        }
        ListHeaderComponent={
          <FilterChipRow options={filterOptions} value={filter} onChange={setFilter} style={styles.filterRow} />
        }
        ListEmptyComponent={<EmptyState icon={Leaf} message={t('noListingsFound')} style={styles.empty} />}
        renderItem={renderListing}
      />
    </>
  );
}

function EventsList({ bottomInset }: Readonly<SectionListProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('event');
  const { events, refresh } = useEvents();
  const userLocation = useUserLocation();
  const [sortMode, setSortMode] = useState<EventSortMode>('proximos');
  const [query, setQuery] = useState('');
  const { isRefreshing, handleRefresh } = usePullToRefresh(refresh);

  const sortOptions: { value: EventSortMode; label: string }[] = [
    { value: 'proximos', label: t('sortNearest') },
    { value: 'recentes', label: t('sortRecent') },
  ];

  const sortedEvents = useMemo(
    () => sortEvents(events.filter((event) => matchesQuery(event, query)), sortMode),
    [events, sortMode, query]
  );

  const renderEvent = ({ item }: { item: PlantEvent }) => (
    <EventRow
      event={item}
      trailing={<DistanceTrailing distanceLabel={formatDistanceTo(userLocation, item.latitude, item.longitude)} />}
      onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } })}
    />
  );

  return (
    <>
      <SearchField value={query} onChangeText={setQuery} placeholder={t('eventsSearchPlaceholder')} />

      <FlatList
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset }]}
        data={sortedEvents}
        keyExtractor={(event) => event.id}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
        }
        ListHeaderComponent={
          <FilterChipRow options={sortOptions} value={sortMode} onChange={setSortMode} style={styles.filterRow} />
        }
        ListEmptyComponent={<EmptyState icon={EVENT_ICON} message={t('noEventsNearby')} style={styles.empty} />}
        renderItem={renderEvent}
      />
    </>
  );
}

export default function OffersScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation(['listing', 'event']);
  const [section, setSection] = useState<OffersSection>('listings');
  const isListings = section === 'listings';

  const sectionOptions: { value: OffersSection; label: string }[] = [
    { value: 'listings', label: t('listing:offersTabTitle') },
    { value: 'events', label: t('event:eventsListTitle') },
  ];

  const bottomInset = insets.bottom + Metrics.spacing.xl + 64;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Metrics.spacing.lg }]}>
        <View style={styles.titleRow}>
          <PageTitle size="headline" style={styles.title}>{isListings ? t('listing:offersTabTitle') : t('event:eventsListTitle')}</PageTitle>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('listing:myOffersTitle')}
            style={({ pressed }) => [styles.mineButton, pressed && styles.mineButtonPressed]}
            onPress={() => router.push('/my-offers')}
            hitSlop={8}
          >
            <ClipboardList size={Metrics.chip.md.iconSize} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
            <Text style={styles.mineButtonText}>{t('listing:myOffersButton')}</Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>{isListings ? t('listing:offersTabSubtitle') : t('event:eventsTabSubtitle')}</Text>
      </View>

      <SegmentedControl options={sectionOptions} value={section} onChange={setSection} style={styles.segmented} />

      {isListings ? <ListingsList bottomInset={bottomInset} /> : <EventsList bottomInset={bottomInset} />}

      <IconButton
        accessibilityLabel={isListings ? t('common:a11yCreateListing') : t('common:a11yCreateEvent')}
        size={Metrics.size.xl}
        backgroundColor={colors.primary}
        elevated
        style={[styles.createButton, { bottom: insets.bottom + Metrics.spacing.lg }]}
        onPress={() => router.push(isListings ? '/listing/new' : '/event/new')}
      >
        <Plus size={Metrics.icon.normal} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
      </IconButton>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      ...Metrics.layout.centeredContent,
      paddingHorizontal: Metrics.spacing.lg,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: Metrics.spacing.md,
    },
    title: {
      flex: 1,
      ...Typography.headline,
      color: colors.foreground,
    },
    mineButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.chip.md.gap,
      paddingVertical: Metrics.chip.md.paddingVertical,
      paddingHorizontal: Metrics.chip.md.paddingHorizontal,
      borderRadius: Metrics.radius.full,
      backgroundColor: `${colors.leaf}14`,
    },
    mineButtonPressed: {
      opacity: 0.7,
    },
    mineButtonText: {
      ...Typography.label,
      color: colors.leaf,
    },
    subtitle: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.xs,
    },
    segmented: {
      ...Metrics.layout.centeredContent,
      marginHorizontal: Metrics.spacing.lg,
      marginTop: Metrics.spacing.md,
    },
    list: {
      flex: 1,
    },
    listContent: {
      ...Metrics.layout.centeredContent,
      padding: Metrics.spacing.lg,
    },
    filterRow: {
      marginBottom: Metrics.spacing.md,
    },
    empty: {
      marginTop: Metrics.spacing.xl,
    },
    createButton: {
      position: 'absolute',
      right: Metrics.spacing.lg,
    },
  });
