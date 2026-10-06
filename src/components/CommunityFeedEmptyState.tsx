import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import Leaf from 'lucide-react-native/icons/leaf';
import MessageSquare from 'lucide-react-native/icons/message-square';
import UserPlus from 'lucide-react-native/icons/user-plus';
import Users from 'lucide-react-native/icons/users';
import { Metrics } from '@/theme';
import { useTranslation } from '@/i18n';
import { FOLLOWING_FEED_FILTER, OFFER_FEED_FILTER, type CommunityFeedFilter } from '@/types';
import { EmptyState, type EmptyStateAction } from './EmptyState';

type EmptyVariant = {
  icon: LucideIcon;
  titleKey: string;
  messageKey: string;
  action?: 'createPost' | 'findPeople';
};

function emptyVariant(filter: CommunityFeedFilter | null, followsNobody: boolean): EmptyVariant {
  if (followsNobody) {
    return { icon: UserPlus, titleKey: 'emptyFollowingTitle', messageKey: 'emptyFollowingMessage', action: 'findPeople' };
  }
  if (filter === FOLLOWING_FEED_FILTER) {
    return { icon: Users, titleKey: 'emptyFollowedPostsTitle', messageKey: 'emptyFollowedPostsMessage' };
  }
  if (filter === OFFER_FEED_FILTER) {
    return { icon: Leaf, titleKey: 'emptyOffersTitle', messageKey: 'emptyOffersMessage' };
  }
  return { icon: MessageSquare, titleKey: 'emptyFeedTitle', messageKey: 'emptyFeedMessage', action: 'createPost' };
}

type CommunityFeedEmptyStateProps = {
  filter: CommunityFeedFilter | null;
  followsNobody: boolean;
  onCreatePost: () => void;
  onFindPeople: () => void;
};

export function CommunityFeedEmptyState({
  filter,
  followsNobody,
  onCreatePost,
  onFindPeople,
}: Readonly<CommunityFeedEmptyStateProps>) {
  const { t } = useTranslation('community');
  const variant = emptyVariant(filter, followsNobody);

  const emptyAction = (action: typeof variant.action): EmptyStateAction | undefined => {
    if (action === 'createPost') return { label: t('createPostAction'), onPress: onCreatePost };
    if (action === 'findPeople') return { label: t('findPeopleAction'), onPress: onFindPeople };
    return undefined;
  };

  return (
    <View style={styles.container}>
      <EmptyState icon={variant.icon} title={t(variant.titleKey)} message={t(variant.messageKey)} action={emptyAction(variant.action)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Metrics.spacing.md,
    paddingHorizontal: Metrics.spacing.md,
    paddingVertical: Metrics.spacing.lg,
  },
});
