import { StyleSheet, View } from 'react-native';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import ClipboardList from 'lucide-react-native/icons/clipboard-list';
import { Metrics, useColors } from '@/theme';
import { useTranslation } from '@/i18n';
import type { EarnedBadge, FollowCounts, UserProfile, XpProgress } from '@/types';
import { IconBadge } from '../IconBadge';
import { ListRow } from '../ListRow';
import { SegmentedControl } from '../SegmentedControl';
import { ProfileActions } from './ProfileActions';
import { ProfileBadgesRow } from './ProfileBadgesRow';
import { ProfileIdentity } from './ProfileIdentity';
import { ProfileStats } from './ProfileStats';
import { PROFILE_TAB, type ProfileTab } from './profileTabs';

type ProfileHeaderProps = {
  name: string;
  profile: UserProfile | null;
  isOwnProfile: boolean;
  following: boolean;
  counts: FollowCounts;
  xp: XpProgress;
  badges: EarnedBadge[];
  tab: ProfileTab;
  onChangeTab: (tab: ProfileTab) => void;
  onToggleFollow: () => void;
  onPressMessage: () => void;
  onEditProfile: () => void;
  onManage?: () => void;
};

export function ProfileHeader({
  name,
  profile,
  isOwnProfile,
  following,
  counts,
  xp,
  badges,
  tab,
  onChangeTab,
  onToggleFollow,
  onPressMessage,
  onEditProfile,
  onManage,
}: Readonly<ProfileHeaderProps>) {
  const colors = useColors();
  const { t } = useTranslation('profile');
  const tabOptions = [
    { value: PROFILE_TAB.POSTS, label: t('postsTab') },
    { value: PROFILE_TAB.LISTINGS, label: t('listings') },
    { value: PROFILE_TAB.EVENTS, label: t('events') },
  ];

  return (
    <View style={styles.header}>
      <ProfileIdentity name={name} profile={profile} />
      <ProfileStats counts={counts} xp={xp} />
      <ProfileActions
        isOwnProfile={isOwnProfile}
        following={following}
        onToggleFollow={onToggleFollow}
        onPressMessage={onPressMessage}
        onEditProfile={onEditProfile}
      />
      <ProfileBadgesRow badges={badges} isOwnProfile={isOwnProfile} />
      <SegmentedControl options={tabOptions} value={tab} onChange={onChangeTab} />
      {onManage ? (
        <ListRow
          variant="card"
          leading={
            <IconBadge backgroundColor={`${colors.leaf}1F`}>
              <ClipboardList size={Metrics.icon.small} color={colors.leaf} strokeWidth={Metrics.icon.stroke.regular} />
            </IconBadge>
          }
          title={t('manageOffersTitle')}
          subtitle={t('manageOffersSubtitle')}
          trailing={<ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.stroke.regular} />}
          onPress={onManage}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: Metrics.spacing.lg,
    marginBottom: Metrics.spacing.md,
  },
});
