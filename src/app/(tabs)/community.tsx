import { useCallback, useMemo } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Search from 'lucide-react-native/icons/search';
import { useRouter } from 'expo-router';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import { useTranslation } from '@/i18n';
import { CommunityComposer, CommunityPostCard, IconButton, SectionTitle, SegmentedControl, type SegmentedControlOption } from '@/components';
import { COMMUNITY_POST_TYPE, OFFER_FEED_FILTER, type CommunityFeedFilter, type CommunityPost } from '@/types';
import { useCommunityFeed, type FeedScope } from '@/hooks';

function getFeedFilters(t: (key: string) => string): { value: CommunityFeedFilter | null; label: string }[] {
  return [
    { value: null, label: t('feedFilterAll') },
    { value: OFFER_FEED_FILTER, label: t('feedFilterOffers') },
    { value: COMMUNITY_POST_TYPE.CONQUISTA, label: t('feedFilterAchievements') },
    { value: COMMUNITY_POST_TYPE.DUVIDA, label: t('feedFilterQuestions') },
    { value: COMMUNITY_POST_TYPE.DICA, label: t('feedFilterTips') },
  ];
}

function getScopeOptions(t: (key: string) => string): SegmentedControlOption<FeedScope>[] {
  return [
    { value: 'todos', label: t('scopeAll') },
    { value: 'seguindo', label: t('scopeFollowing') },
  ];
}

type Styles = ReturnType<typeof makeStyles>;

type CommunityFilterChipsProps = {
  filter: CommunityFeedFilter | null;
  onChange: (filter: CommunityFeedFilter | null) => void;
  styles: Styles;
};

function CommunityFilterChips({ filter, onChange, styles }: Readonly<CommunityFilterChipsProps>) {
  const { t } = useTranslation('community');
  const feedFilters = getFeedFilters(t);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterChipRow}>
      {feedFilters.map((item) => (
        <Pressable
          key={item.label}
          style={[styles.filterChip, filter === item.value && styles.filterChipActive]}
          onPress={() => onChange(item.value)}
        >
          <Text style={[styles.filterChipText, filter === item.value && styles.filterChipTextActive]}>{item.label}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

type CommunityFeedHeaderProps = {
  feed: ReturnType<typeof useCommunityFeed>;
  colors: ThemeColors;
  styles: Styles;
  onSearch: () => void;
};

function CommunityFeedHeader({ feed, colors, styles, onSearch }: Readonly<CommunityFeedHeaderProps>) {
  const { t } = useTranslation('community');
  const scopeOptions = getScopeOptions(t);
  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerTextBox}>
          <Text style={styles.title}>{t('title')}</Text>
          <Text style={styles.subtitle}>{t('subtitle')}</Text>
        </View>
        <IconButton style={styles.searchButton} onPress={onSearch}>
          <Search size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.strokeWidth} />
        </IconButton>
      </View>

      <CommunityComposer onPost={feed.handleCreatePost} />

      <SegmentedControl options={scopeOptions} value={feed.scope} onChange={feed.setScope} style={styles.scopeControl} />

      <View style={styles.filtersRow}>
        <CommunityFilterChips filter={feed.filter} onChange={feed.setFilter} styles={styles} />
      </View>

      <SectionTitle style={styles.postsSectionTitle}>{t('postsSectionTitle')}</SectionTitle>

      {feed.isInitialLoading ? <ActivityIndicator style={styles.loader} color={colors.leaf} /> : null}
    </View>
  );
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const feed = useCommunityFeed();

  const renderItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <CommunityPostCard
        post={item}
        currentUserId={feed.user?.id}
        onToggleLike={feed.handleToggleLike}
        onAddComment={feed.handleAddComment}
        onDelete={feed.handleDeletePost}
        onDeleteComment={feed.handleDeleteComment}
        onPressAuthor={feed.handlePressAuthor}
        onPressListing={feed.handlePressListing}
        onPressEvent={feed.handlePressEvent}
      />
    ),
    [feed]
  );

  return (
    <FlatList
      style={styles.container}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + Metrics.spacing.lg }]}
      showsVerticalScrollIndicator={false}
      data={feed.posts}
      keyExtractor={(post) => post.id}
      renderItem={renderItem}
      onEndReached={feed.handleLoadMore}
      onEndReachedThreshold={0.5}
      refreshControl={
        <RefreshControl refreshing={feed.refreshing} onRefresh={feed.handleRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
      }
      ListHeaderComponent={<CommunityFeedHeader feed={feed} colors={colors} styles={styles} onSearch={() => router.push('/search')} />}
      ListFooterComponent={feed.postsQuery.isFetchingNextPage ? <ActivityIndicator style={styles.loader} color={colors.leaf} /> : null}
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
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.lg,
  },
  headerTextBox: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.foreground,
  },
  searchButton: {
    borderWidth: 1,
    borderColor: colors.border,
  },
  postsSectionTitle: {
    marginBottom: Metrics.spacing.md,
  },
  scopeControl: {
    marginBottom: Metrics.spacing.md,
  },
  filtersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.xs,
    marginBottom: Metrics.spacing.lg,
  },
  filterChipRow: {
    flexDirection: 'row',
    gap: 6,
  },
  filterChip: {
    backgroundColor: colors.muted,
    borderRadius: Metrics.radius.full,
    paddingVertical: 5,
    paddingHorizontal: Metrics.spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.leafForeground,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  filterChipTextActive: {
    color: colors.leaf,
  },
  subtitle: {
    fontSize: 14,
    color: colors.mutedForeground,
    marginTop: Metrics.spacing.xs,
  },
  loader: {
    marginVertical: Metrics.spacing.lg,
  },
  });
