import { useState } from 'react';
import { ActivityIndicator, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Leaf from 'lucide-react-native/icons/leaf';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import { EmptyState, FloatingScreenControls, ScreenHeader, SegmentedControl, useScreenTopInset } from '@/components';
import { EventRow } from '@/components/offers/EventRow';
import { ListingRow } from '@/components/offers/ListingRow';
import { groupEventsByStatus, groupListingsByStatus, isEventClosed } from '@/components/offers/manageSections';
import { StatusTrailing } from '@/components/offers/RowTrailing';
import { useAuth, usePullToRefresh } from '@/hooks';
import { getEventsByUserId, getListingsByUserId } from '@/services';
import { EVENT_STATUS, type PlantEvent } from '@/types';
import { EVENT_ICON, listingStatusLabel } from '@/utils';

type ManageTab = 'listings' | 'events';
type Translate = (key: string) => string;
type Styles = ReturnType<typeof makeStyles>;

function eventStatusLabel(event: PlantEvent, now: Date, t: Translate): string | undefined {
  if (event.status === EVENT_STATUS.CANCELLED) return t('statusCancelled');
  return isEventClosed(event, now) ? t('statusEnded') : undefined;
}

type ListStateProps = {
  isLoading: boolean;
  emptyIcon: typeof Leaf;
  emptyMessage: string;
  styles: Styles;
};

function ListEmptyState({ isLoading, emptyIcon, emptyMessage, styles }: Readonly<ListStateProps>) {
  const colors = useColors();
  if (isLoading) return <ActivityIndicator style={styles.loader} color={colors.leaf} />;
  return <EmptyState icon={emptyIcon} message={emptyMessage} style={styles.empty} />;
}

function MyListings({ styles }: Readonly<{ styles: Styles }>) {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('listing');
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['plant-listings', 'mine', user?.id],
    queryFn: () => getListingsByUserId(user!.id),
    enabled: !!user,
  });
  const { isRefreshing, handleRefresh } = usePullToRefresh(query.refetch);
  const sections = groupListingsByStatus(query.data ?? []).map((section) => ({
    ...section,
    title: section.key === 'open' ? t('manageOpenListings') : t('manageClosedListings'),
  }));

  return (
    <SectionList
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Metrics.spacing.xl }]}
      sections={sections}
      keyExtractor={(listing) => listing.id}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
      }
      renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
      renderItem={({ item }) => (
        <ListingRow
          listing={item}
          trailing={<StatusTrailing statusLabel={listingStatusLabel(item.status)} />}
          onPress={() => router.push({ pathname: '/listing/[id]', params: { id: item.id } })}
        />
      )}
      ListEmptyComponent={
        <ListEmptyState isLoading={query.isLoading} emptyIcon={Leaf} emptyMessage={t('noOwnListingsFound')} styles={styles} />
      }
    />
  );
}

function MyEvents({ styles }: Readonly<{ styles: Styles }>) {
  const router = useRouter();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation('event');
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['events', 'by-user', user?.id, user?.id],
    queryFn: () => getEventsByUserId(user!.id, user!.id),
    enabled: !!user,
  });
  const { isRefreshing, handleRefresh } = usePullToRefresh(query.refetch);
  const now = new Date();
  const sections = groupEventsByStatus(query.data ?? [], now).map((section) => ({
    ...section,
    title: section.key === 'open' ? t('manageOpenEvents') : t('manageClosedEvents'),
  }));

  return (
    <SectionList
      style={styles.list}
      contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + Metrics.spacing.xl }]}
      sections={sections}
      keyExtractor={(event) => event.id}
      stickySectionHeadersEnabled={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
      }
      renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
      renderItem={({ item }) => (
        <EventRow
          event={item}
          trailing={<StatusTrailing statusLabel={eventStatusLabel(item, now, t)} />}
          onPress={() => router.push({ pathname: '/event/[id]', params: { id: item.id } })}
        />
      )}
      ListEmptyComponent={
        <ListEmptyState isLoading={query.isLoading} emptyIcon={EVENT_ICON} emptyMessage={t('noOwnEventsFound')} styles={styles} />
      }
    />
  );
}

export default function MyOffersScreen() {
  const styles = useThemedStyles(makeStyles);
  const topInset = useScreenTopInset();
  const { t } = useTranslation(['listing', 'event']);
  const params = useLocalSearchParams<{ tab?: string }>();
  const [tab, setTab] = useState<ManageTab>(params.tab === 'events' ? 'events' : 'listings');

  const tabOptions: { value: ManageTab; label: string }[] = [
    { value: 'listings', label: t('listing:offersTabTitle') },
    { value: 'events', label: t('event:eventsListTitle') },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: topInset }]}>
        <ScreenHeader title={t('listing:myOffersTitle')} subtitle={t('listing:myOffersSubtitle')} />
        <SegmentedControl options={tabOptions} value={tab} onChange={setTab} />
      </View>
      {tab === 'listings' ? <MyListings styles={styles} /> : <MyEvents styles={styles} />}
      <FloatingScreenControls />
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
    list: {
      flex: 1,
    },
    listContent: {
      ...Metrics.layout.centeredContent,
      padding: Metrics.spacing.lg,
    },
    sectionTitle: {
      ...Typography.title,
      color: colors.foreground,
      marginTop: Metrics.spacing.md,
      marginBottom: Metrics.spacing.sm,
    },
    loader: {
      marginTop: Metrics.spacing.xl,
    },
    empty: {
      marginTop: Metrics.spacing.xl,
    },
  });
