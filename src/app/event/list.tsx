import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { EmptyState, FilterChipRow, ListRow } from '@/components';
import { useEvents, useUserLocation } from '@/hooks';
import { EVENT_COLOR, EVENT_ICON, formatDistanceTo, formatEventDateTime } from '@/utils';
import type { PlantEvent } from '@/types';

type SortMode = 'proximos' | 'recentes';

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: 'proximos', label: 'Mais próximos' },
  { value: 'recentes', label: 'Mais recentes' },
];

function sortEvents(events: PlantEvent[], mode: SortMode): PlantEvent[] {
  const sorted = [...events];
  if (mode === 'proximos') {
    sorted.sort((a, b) => new Date(a.eventDate).getTime() - new Date(b.eventDate).getTime());
  } else {
    sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }
  return sorted;
}

export default function EventListScreen() {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const { events } = useEvents();
  const userLocation = useUserLocation();
  const [sortMode, setSortMode] = useState<SortMode>('proximos');
  const EventIcon = EVENT_ICON;

  const sortedEvents = useMemo(() => sortEvents(events, sortMode), [events, sortMode]);

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Metrics.spacing.lg }]}
      data={sortedEvents}
      keyExtractor={(event) => event.id}
      ListHeaderComponent={<FilterChipRow options={SORT_OPTIONS} value={sortMode} onChange={setSortMode} style={styles.filterRow} />}
      ListEmptyComponent={<EmptyState icon={EVENT_ICON} message="Nenhum evento por perto ainda." style={styles.empty} />}
      renderItem={({ item }) => {
        const attendeesLabel = item.attendeeCount === 1 ? '1 confirmado' : `${item.attendeeCount} confirmados`;
        const distanceLabel = formatDistanceTo(userLocation, item.latitude, item.longitude);
        const subtitle = [formatEventDateTime(item.eventDate), attendeesLabel, distanceLabel].filter(Boolean).join(' · ');
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
            trailing={<ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />}
            onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } })}
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
    empty: {
      marginTop: Metrics.spacing.xl,
    },
  });
