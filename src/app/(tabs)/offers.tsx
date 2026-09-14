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
import { EmptyState, FilterChipRow, IconButton, ListRow } from '@/components';
import { useListings, useUserLocation } from '@/hooks';
import { formatDistanceTo, listingTypeLabel, LISTING_TYPE_COLORS, LISTING_TYPE_ICONS, listingTypes } from '@/utils';
import type { ListingType, PlantListing } from '@/types';

type TypeFilter = ListingType | null;

function matchesQuery(listing: PlantListing, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return listing.title.toLowerCase().includes(normalized) || (listing.description ?? '').toLowerCase().includes(normalized);
}

export default function OffersScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
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
      listings
        .filter((listing) => (filter ? listing.listingType === filter : true))
        .filter((listing) => matchesQuery(listing, query)),
    [listings, filter, query]
  );

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Metrics.spacing.lg }]}>
        <Text style={styles.title}>{t('offersTabTitle')}</Text>
        <Text style={styles.subtitle}>{t('offersTabSubtitle')}</Text>
      </View>

      <View style={styles.searchBar}>
        <Search size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
        <TextInput
          style={styles.searchInput}
          value={query}
          onChangeText={setQuery}
          placeholder={t('offersSearchPlaceholder')}
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <X size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
          </Pressable>
        ) : null}
      </View>

      <FlatList
        style={styles.list}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Metrics.spacing.xl + 64 }]}
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
          const subtitle = [item.ownerName, distanceLabel].filter(Boolean).join(' · ') || undefined;

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
              subtitle={subtitle}
              trailing={<ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />}
              onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}
            />
          );
        }}
      />

      <IconButton
        size={52}
        backgroundColor={colors.primary}
        elevated
        style={[styles.createButton, { bottom: insets.bottom + Metrics.spacing.lg }]}
        onPress={() => router.push('/listing/new')}
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
  });
