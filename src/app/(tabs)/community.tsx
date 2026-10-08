import { useCallback, useRef, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  RefreshControl,
  ActivityIndicator,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ArrowUp from 'lucide-react-native/icons/arrow-up';
import Leaf from 'lucide-react-native/icons/leaf';
import Search from 'lucide-react-native/icons/search';
import Users from 'lucide-react-native/icons/users';
import { useRouter } from 'expo-router';
import { Metrics, useColors, type ThemeColors, useThemedStyles, Typography } from '@/theme';
import { useTranslation } from '@/i18n';
import {
  CommunityComposerPrompt,
  CommunityFeedEmptyState,
  CommunityPostCard,
  FilterChipRow,
  type FilterChipOption,
  FloatingCreateButton,
  FloatingPill,
  IconButton,
  PageTitle,
  PostCardSkeleton,
} from '@/components';
import {
  COMMUNITY_POST_TYPE,
  FOLLOWING_FEED_FILTER,
  OFFER_FEED_FILTER,
  type CommunityFeedFilter,
  type CommunityPost,
  type CommunityPostType,
} from '@/types';
import { useCommunityFeed } from '@/hooks';
import { communityPostTypeColor, communityPostTypes } from '@/utils';

const SKELETON_POSTS = [0, 1, 2];

const FEED_FILTER_LABEL_KEYS: Record<CommunityPostType, string> = {
  [COMMUNITY_POST_TYPE.CONQUISTA]: 'feedFilterAchievements',
  [COMMUNITY_POST_TYPE.DUVIDA]: 'feedFilterQuestions',
  [COMMUNITY_POST_TYPE.DICA]: 'feedFilterTips',
};

function feedFilterOptions(t: (key: string) => string, colors: ThemeColors): FilterChipOption<CommunityFeedFilter>[] {
  return [
    { value: FOLLOWING_FEED_FILTER, label: t('feedFilterFollowing'), icon: Users, color: colors.foreground },
    { value: OFFER_FEED_FILTER, label: t('feedFilterOffers'), icon: Leaf, color: colors.accent },
    ...communityPostTypes().map(({ value, icon }) => ({
      value,
      label: t(FEED_FILTER_LABEL_KEYS[value]),
      icon,
      color: communityPostTypeColor(value, colors),
    })),
  ];
}

type Styles = ReturnType<typeof makeStyles>;

type CommunityFeedHeaderProps = {
  feed: ReturnType<typeof useCommunityFeed>;
  colors: ThemeColors;
  styles: Styles;
  onSearch: () => void;
  onCreatePost: () => void;
  onComposerLayout: (event: LayoutChangeEvent) => void;
};

function CommunityFeedHeader({ feed, colors, styles, onSearch, onCreatePost, onComposerLayout }: Readonly<CommunityFeedHeaderProps>) {
  const { t } = useTranslation('community');
  return (
    <View>
      <View style={styles.header}>
        <View style={styles.headerTextBox}>
          <PageTitle size="headline">{t('title')}</PageTitle>
          <Text style={styles.subtitle}>{t('subtitle')}</Text>
        </View>
        <IconButton accessibilityLabel={t('common:search')} style={styles.searchButton} onPress={onSearch}>
          <Search size={Metrics.icon.normal} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
        </IconButton>
      </View>

      <View onLayout={onComposerLayout} style={styles.composer}>
        <CommunityComposerPrompt onPress={onCreatePost} />
      </View>

      <View style={styles.filtersRow}>
        <FilterChipRow
          floating
          options={feedFilterOptions(t, colors)}
          selected={feed.filters}
          onChange={feed.toggleFilter}
          style={styles.filtersContent}
        />
      </View>
    </View>
  );
}

function PostSkeletonList() {
  return (
    <View>
      {SKELETON_POSTS.map((item) => (
        <PostCardSkeleton key={`post-skeleton-${item}`} />
      ))}
    </View>
  );
}

type NewPostsBannerProps = {
  count: number;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

function NewPostsBanner({ count, onPress, style }: Readonly<NewPostsBannerProps>) {
  const { t } = useTranslation('community');
  if (count === 0) return null;

  return <FloatingPill label={t('newPostsBanner', { count })} icon={ArrowUp} onPress={onPress} style={style} />;
}

function useComposerScrolledAway(contentTopInset: number) {
  const [composerBottom, setComposerBottom] = useState<number | null>(null);
  const [isScrolledAway, setIsScrolledAway] = useState(false);

  const handleComposerLayout = (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    setComposerBottom(contentTopInset + y + height);
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (composerBottom === null) return;
    const scrolledAway = event.nativeEvent.contentOffset.y > composerBottom;
    if (scrolledAway !== isScrolledAway) setIsScrolledAway(scrolledAway);
  };

  return { isScrolledAway, handleComposerLayout, handleScroll };
}

export default function CommunityScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('community');
  const feed = useCommunityFeed();
  const listRef = useRef<FlatList>(null);
  const contentTopInset = insets.top + Metrics.spacing.lg;
  const composer = useComposerScrolledAway(contentTopInset);

  const handleShowNewPosts = () => {
    feed.handleShowNewPosts();
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  };

  const openSearch = () => router.push('/search');
  const openNewPost = () => router.push({ pathname: '/post/new', params: feed.filters.length === 1 ? { type: feed.filters[0] } : {} });

  const renderItem = useCallback(
    ({ item }: { item: CommunityPost }) => (
      <CommunityPostCard
        post={item}
        currentUserId={feed.user?.id}
        onToggleLike={feed.handleToggleLike}
        onDelete={feed.handleDeletePost}
        onBoost={feed.handleBoostPost}
        onPressAuthor={feed.handlePressAuthor}
        onPressListing={feed.handlePressListing}
        onPressEvent={feed.handlePressEvent}
      />
    ),
    [feed]
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={listRef}
        style={styles.container}
        contentContainerStyle={[styles.content, { paddingTop: contentTopInset }]}
        showsVerticalScrollIndicator={false}
        onScroll={composer.handleScroll}
        scrollEventThrottle={16}
        data={feed.posts}
        keyExtractor={(post) => post.id}
        renderItem={renderItem}
        onEndReached={feed.handleLoadMore}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl refreshing={feed.refreshing} onRefresh={feed.handleRefresh} tintColor={colors.leaf} colors={[colors.leaf]} />
        }
        ListHeaderComponent={
          <CommunityFeedHeader
            feed={feed}
            colors={colors}
            styles={styles}
            onSearch={openSearch}
            onCreatePost={openNewPost}
            onComposerLayout={composer.handleComposerLayout}
          />
        }
        ListEmptyComponent={
          feed.isInitialLoading ? (
            <PostSkeletonList />
          ) : (
            <CommunityFeedEmptyState
              filters={feed.filters}
              followsNobody={feed.followsNobody}
              onCreatePost={openNewPost}
              onFindPeople={openSearch}
            />
          )
        }
        ListFooterComponent={feed.postsQuery.isFetchingNextPage ? <ActivityIndicator style={styles.loader} color={colors.leaf} /> : null}
      />
      <NewPostsBanner count={feed.newPostsCount} onPress={handleShowNewPosts} style={{ top: insets.top + Metrics.spacing.sm }} />
      <FloatingCreateButton
        visible={composer.isScrolledAway}
        accessibilityLabel={t('createPostAction')}
        onPress={openNewPost}
        style={{ bottom: insets.bottom + Metrics.spacing.lg }}
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
    subtitle: {
      ...Typography.bodySmall,
      color: colors.mutedForeground,
      marginTop: Metrics.spacing.xs,
    },
    searchButton: {
      borderWidth: Metrics.borderWidth.sm,
      borderColor: colors.border,
    },
    composer: {
      marginBottom: Metrics.spacing.md,
    },
    filtersRow: {
      marginHorizontal: -Metrics.spacing.lg,
      marginBottom: Metrics.spacing.md,
    },
    filtersContent: {
      paddingHorizontal: Metrics.spacing.lg,
      paddingVertical: Metrics.spacing.xs,
    },
    loader: {
      marginVertical: Metrics.spacing.lg,
    },
  });
