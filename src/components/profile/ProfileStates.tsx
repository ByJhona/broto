import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import Gift from 'lucide-react-native/icons/gift';
import Sprout from 'lucide-react-native/icons/sprout';
import { Metrics } from '@/theme';
import { useTranslation } from '@/i18n';
import { EVENT_ICON } from '@/utils';
import { EmptyState } from '../EmptyState';
import { useColumnWidth } from '../gridLayout';
import { SkeletonBlock } from '../Skeleton';
import { POST_GRID_COLUMNS, PROFILE_TAB, type ProfileTab } from './profileTabs';

const EMPTY_COPY: Record<ProfileTab, { icon: LucideIcon; title: string; own: string; other: string }> = {
  [PROFILE_TAB.POSTS]: { icon: Sprout, title: 'noPostsYet', own: 'emptyPostsOwn', other: 'emptyPostsOther' },
  [PROFILE_TAB.LISTINGS]: { icon: Gift, title: 'noListingsYet', own: 'emptyListingsOwn', other: 'emptyListingsOther' },
  [PROFILE_TAB.EVENTS]: { icon: EVENT_ICON, title: 'noEventsYet', own: 'emptyEventsOwn', other: 'emptyEventsOther' },
};

const SKELETON_TILES = ['a', 'b', 'c', 'd', 'e', 'f'];

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

export function ProfileGridSkeleton() {
  const tileSize = useColumnWidth(POST_GRID_COLUMNS, Metrics.spacing.xs);
  return (
    <View style={styles.grid}>
      {SKELETON_TILES.map((key) => (
        <SkeletonBlock key={key} width={tileSize} height={tileSize} radius={Metrics.radius.md} />
      ))}
    </View>
  );
}

export function ProfileSkeleton() {
  return (
    <View style={styles.profile}>
      <SkeletonBlock width={Metrics.size.hero} height={Metrics.size.hero} radius={Metrics.radius.full} />
      <SkeletonBlock width="50%" height={Metrics.fontSize.headline} />
      <SkeletonBlock width="30%" />
      <SkeletonBlock height={Metrics.size.hero} radius={Metrics.radius.lg} />
      <ProfileGridSkeleton />
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
    gap: Metrics.spacing.xs,
  },
  profile: {
    alignItems: 'center',
    gap: Metrics.spacing.md,
  },
});
