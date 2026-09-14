import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Leaf from 'lucide-react-native/icons/leaf';
import Plus from 'lucide-react-native/icons/plus';
import Search from 'lucide-react-native/icons/search';
import X from 'lucide-react-native/icons/x';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { DistancePill, EmptyState, FilterChipRow, IconButton, ListRow, SegmentedControl } from '@/components';
import { useEvents, useListings, useUserLocation } from '@/hooks';
import {
  EVENT_COLOR,
  EVENT_ICON,
  formatDistanceTo,
  formatEventDateTime,
  listingTypeLabel,
  LISTING_TYPE_COLORS,
  LISTING_TYPE_ICONS,
  listingTypes,
} from '@/utils';
import type { ListingType, PlantEvent, PlantListing } from '@/types';

type OffersSection = 'listings' | 'events';
type TypeFilter = ListingType | null;
type EventSortMode = 'proximos' | 'recentes';

function matchesQuery(listing: PlantListing, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return listing.title.toLowerCase().includes(normalized) || (listing.description ?? '').toLowerCase().includes(normalized);
}

function matchesEventQuery(event: PlantEvent, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return event.title.toLowerCase().includes(normalized) || (event.description ?? '').toLowerCase().includes(normalized);
}

type RowTrailingProps = {
  distanceLabel: string | null;
  colors: ThemeColors;
};

function RowTrailing({ distanceLabel, colors }: Readonly<RowTrailingProps>) {
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.trailingColumn}>
      {distanceLabel ? <DistancePill label={distanceLabel} /> : null}
      <ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
    </View>
  );
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

type SearchBarProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
};

function SearchBar({ value, onChangeText, placeholder }: Readonly<SearchBarProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);

  return (
    <View style={styles.searchBar}>
      <Search size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      <TextInput
        style={styles.searchInput}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.mutedForeground}
        autoCapitalize="none"
        autoCorrect={false}
      />
      {value.length > 0 ? (
        <Pressable onPress={() => onChangeText('')} hitSlop={8}>
          <X size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
        </Pressable>
      ) : null}
    </View>
  );
}

function ListingsList({ bottomInset }: Readonly<SectionListProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('listing');
  const { listings } = useListings();
  const userLocation = useUserLocation();
  const [filter, setFilter] = useState<TypeFilter>(null);
  const [query, setQuery] = useState('');

  const filterOptions: { value: TypeFilter; label: string }[] = [
    { value: null, label: t('filterAll') },
    ...listingTypes().map(({ value, label }) => ({ value, label })),
  ];

  const filteredListings = useMemo(
    () =>
      listings.filter((listing) => (filter ? listing.listingType === filter : true)).filter((listing) => matchesQuery(listing, query)),
    [listings, filter, query]
  );

  return (
    <>
      <SearchBar value={query} onChangeText={setQuery} placeholder={t('offersSearchPlaceholder')} />

      <FlatList
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset }]}
        data={filteredListings}
        keyExtractor={(listing) => listing.id}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={<FilterChipRow options={filterOptions} value={filter} onChange={setFilter} style={styles.filterRow} />}
        ListEmptyComponent={<EmptyState icon={Leaf} message={t('noListingsFound')} style={styles.empty} />}
        renderItem={({ item }) => {
          const Icon = LISTING_TYPE_ICONS[item.listingType];
          const color = LISTING_TYPE_COLORS[item.listingType];
          const label = listingTypeLabel(item.listingType);
          const coverPhotoUrl = item.photoUrls[0] ?? null;
          const distanceLabel = formatDistanceTo(userLocation, item.latitude, item.longitude);

          return (
            <ListRow
              variant="card"
              style={styles.row}
              leading={
                coverPhotoUrl ? (
                  <Image source={{ uri: coverPhotoUrl }} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: color }]}>
                    <Icon size={20} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
                  </View>
                )
              }
              title={item.title}
              titleTrailing={
                <View style={[styles.typeBadge, { backgroundColor: color }]}>
                  <Icon size={11} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
                  <Text style={styles.typeBadgeText}>{label}</Text>
                </View>
              }
              subtitle={item.ownerName ?? undefined}
              trailing={<RowTrailing distanceLabel={distanceLabel} colors={colors} />}
              onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}
            />
          );
        }}
      />
    </>
  );
}

function EventsList({ bottomInset }: Readonly<SectionListProps>) {
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation('event');
  const { events } = useEvents();
  const userLocation = useUserLocation();
  const [sortMode, setSortMode] = useState<EventSortMode>('proximos');
  const [query, setQuery] = useState('');
  const EventIcon = EVENT_ICON;

  const sortOptions: { value: EventSortMode; label: string }[] = [
    { value: 'proximos', label: t('sortNearest') },
    { value: 'recentes', label: t('sortRecent') },
  ];

  const sortedEvents = useMemo(
    () => sortEvents(events.filter((event) => matchesEventQuery(event, query)), sortMode),
    [events, sortMode, query]
  );

  return (
    <>
      <SearchBar value={query} onChangeText={setQuery} placeholder={t('eventsSearchPlaceholder')} />

      <FlatList
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: bottomInset }]}
        data={sortedEvents}
        keyExtractor={(event) => event.id}
        ListHeaderComponent={<FilterChipRow options={sortOptions} value={sortMode} onChange={setSortMode} style={styles.filterRow} />}
        ListEmptyComponent={<EmptyState icon={EVENT_ICON} message={t('noEventsNearby')} style={styles.empty} />}
        renderItem={({ item }) => {
          const attendeesLabel = t('attendeesShort', { count: item.attendeeCount });
          const distanceLabel = formatDistanceTo(userLocation, item.latitude, item.longitude);
          const subtitle = [formatEventDateTime(item.eventDate), attendeesLabel].filter(Boolean).join(' · ');
          return (
            <ListRow
              variant="card"
              style={styles.row}
              leading={
                item.photoUrl ? (
                  <Image source={{ uri: item.photoUrl }} style={styles.thumb} contentFit="cover" />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder]}>
                    <EventIcon size={20} color={EVENT_COLOR} strokeWidth={Metrics.icon.strokeWidth} />
                  </View>
                )
              }
              title={item.title}
              subtitle={subtitle}
              trailing={<RowTrailing distanceLabel={distanceLabel} colors={colors} />}
              onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } })}
            />
          );
        }}
      />
    </>
  );
}

export default function OffersScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { t } = useTranslation(['listing', 'event']);
  const [section, setSection] = useState<OffersSection>('listings');

  const sectionOptions: { value: OffersSection; label: string }[] = [
    { value: 'listings', label: t('listing:offersTabTitle') },
    { value: 'events', label: t('event:eventsListTitle') },
  ];

  const bottomInset = insets.bottom + Metrics.spacing.xl + 64;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Metrics.spacing.lg }]}>
        <Text style={styles.title}>{section === 'listings' ? t('listing:offersTabTitle') : t('event:eventsListTitle')}</Text>
        <Text style={styles.subtitle}>{section === 'listings' ? t('listing:offersTabSubtitle') : t('event:eventsTabSubtitle')}</Text>
      </View>

      <SegmentedControl options={sectionOptions} value={section} onChange={setSection} style={styles.segmented} />

      {section === 'listings' ? <ListingsList bottomInset={bottomInset} /> : <EventsList bottomInset={bottomInset} />}

      <IconButton
        size={52}
        backgroundColor={colors.primary}
        elevated
        style={[styles.createButton, { bottom: insets.bottom + Metrics.spacing.lg }]}
        onPress={() => router.push(section === 'listings' ? '/listing/new' : '/event/new')}
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
    title: {
      fontSize: 24,
      fontWeight: 'bold',
      color: colors.foreground,
    },
    subtitle: {
      fontSize: 14,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.xs,
    },
    segmented: {
      ...Metrics.layout.centeredContent,
      marginHorizontal: Metrics.spacing.lg,
      marginTop: Metrics.spacing.md,
    },
    searchBar: {
      ...Metrics.layout.centeredContent,
      flexDirection: 'row',
      alignItems: 'center',
      gap: Metrics.spacing.sm,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: Metrics.radius.full,
      paddingHorizontal: Metrics.spacing.md,
      marginHorizontal: Metrics.spacing.lg,
      marginTop: Metrics.spacing.md,
    },
    searchInput: {
      flex: 1,
      paddingVertical: Metrics.spacing.sm,
      fontSize: 15,
      color: colors.foreground,
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
    row: {
      marginBottom: Metrics.spacing.sm,
    },
    thumb: {
      width: 56,
      height: 56,
      borderRadius: Metrics.radius.md,
      backgroundColor: colors.muted,
    },
    thumbPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    typeBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      borderRadius: Metrics.radius.full,
      paddingVertical: 2,
      paddingHorizontal: 6,
    },
    typeBadgeText: {
      fontSize: 10,
      fontWeight: '700',
      color: colors.white,
    },
    empty: {
      marginTop: Metrics.spacing.xl,
    },
    createButton: {
      position: 'absolute',
      right: Metrics.spacing.lg,
    },
    trailingColumn: {
      alignItems: 'flex-end',
      gap: 4,
    },
  });
