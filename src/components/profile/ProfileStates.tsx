import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import Gift from 'lucide-react-native/icons/gift';
import Sprout from 'lucide-react-native/icons/sprout';
import { Metrics } from '@/theme';
import { useTranslation } from '@/i18n';
import { EVENT_ICON } from '@/utils';
import { EmptyState } from '../EmptyState';
import { PostCardSkeleton } from '../communityPost/PostCardSkeleton';
import { GRID_GAP, useGridCardWidth } from '../gridLayout';
import { SkeletonBlock } from '../Skeleton';
import { PROFILE_TAB, type ProfileTab } from './profileTabs';

const EMPTY_COPY: Record<ProfileTab, { icon: LucideIcon; title: string; own: string; other: string }> = {
  [PROFILE_TAB.POSTS]: { icon: Sprout, title: 'noPostsYet', own: 'emptyPostsOwn', other: 'emptyPostsOther' },
  [PROFILE_TAB.LISTINGS]: { icon: Gift, title: 'noListingsYet', own: 'emptyListingsOwn', other: 'emptyListingsOther' },
  [PROFILE_TAB.EVENTS]: { icon: EVENT_ICON, title: 'noEventsYet', own: 'emptyEventsOwn', other: 'emptyEventsOther' },
};

const SKELETON_TILES = ['a', 'b', 'c', 'd'];

type ProfileTabEmptyProps = {
  tab: ProfileTab;
  isOwnProfile: boolean;
  name: string;
};

export function ProfileTabEmpty({ tab, isOwnProfile, name }: Readonly<ProfileTabEmptyProps>) {
  const { t } = useTranslation('profile');
  const copy = EMPTY_COPY[tab];
  return (
    <EmptyState
      icon={copy.icon}
      title={t(copy.title)}
      message={isOwnProfile ? t(copy.own) : t(copy.other, { name })}
      style={styles.empty}
    />
  );
}

export function ProfileGridSkeleton({ tab }: Readonly<{ tab: ProfileTab }>) {
  const cardWidth = useGridCardWidth();
  if (tab === PROFILE_TAB.POSTS) return <PostCardSkeleton />;
  return (
    <View style={styles.grid}>
      {SKELETON_TILES.map((key) => (
        <SkeletonBlock key={key} width={cardWidth} height={cardWidth} radius={Metrics.radius.lg} />
      ))}
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={styles.profile}>
      <View style={styles.identity}>
        <SkeletonBlock width={Metrics.size.hero} height={Metrics.size.hero} radius={Metrics.radius.full} />
        <SkeletonBlock width="50%" height={Metrics.fontSize.headline} />
        <SkeletonBlock width="30%" />
      </View>
      <SkeletonBlock height={Metrics.size.hero} radius={Metrics.radius.lg} />
      <PostCardSkeleton />
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    marginTop: Metrics.spacing.lg,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
  },
  profile: {
    gap: Metrics.spacing.md,
  },
  identity: {
    alignItems: 'center',
    gap: Metrics.spacing.md,
  },
});
