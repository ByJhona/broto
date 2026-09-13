import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { EmptyState, FilterChipRow, ListRow } from '@/components';
import { useListings, useUserLocation } from '@/hooks';
import { formatDistanceTo, LISTING_TYPE_COLORS, LISTING_TYPE_ICONS, LISTING_TYPE_LABELS, LISTING_TYPES } from '@/utils';
import type { ListingType } from '@/types';

type TypeFilter = ListingType | null;

const FILTER_OPTIONS: { value: TypeFilter; label: string }[] = [
  { value: null, label: 'Tudo' },
  ...LISTING_TYPES.map(({ value, label }) => ({ value, label })),
];

export default function ListingListScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { listings } = useListings();
  const userLocation = useUserLocation();
  const [filter, setFilter] = useState<TypeFilter>(null);

  const filteredListings = useMemo(
    () => (filter ? listings.filter((listing) => listing.listingType === filter) : listings),
    [listings, filter]
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Metrics.spacing.lg }]}
      data={filteredListings}
      keyExtractor={(listing) => listing.id}
      ListHeaderComponent={<FilterChipRow options={FILTER_OPTIONS} value={filter} onChange={setFilter} style={styles.filterRow} />}
      ListEmptyComponent={<EmptyState icon={Leaf} message="Nenhuma oferta encontrada." style={styles.empty} />}
      renderItem={({ item }) => {
        const Icon = LISTING_TYPE_ICONS[item.listingType];
        const color = LISTING_TYPE_COLORS[item.listingType];
        const label = LISTING_TYPE_LABELS[item.listingType];
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
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
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
  });
