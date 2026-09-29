import { Pressable, View } from 'react-native';
import MoreVertical from 'lucide-react-native/icons/ellipsis-vertical';
import { Metrics, useColors, useThemedStyles } from '@/theme';
import { useTranslation } from '@/i18n';
import type { CommunityPost } from '@/types';
import { isBoostActive } from '@/services';
import { COMMUNITY_POST_TYPE_ICONS, communityPostTypeColor, communityPostTypeLabel } from '@/utils';
import { Avatar } from '../Avatar';
import { FeaturedBadge } from '../FeaturedBadge';
import { InfoChip } from '../InfoChip';
import { ListRow } from '../ListRow';
import { makeStyles } from './styles';

function postMetaText(post: CommunityPost): string {
  return post.authorUsername ? `@${post.authorUsername} · ${post.createdAt}` : post.createdAt;
}

type PostHeaderProps = {
  post: CommunityPost;
  onOpenActions: () => void;
  onPressAuthor?: (authorId: string) => void;
};

export function PostHeader({ post, onOpenActions, onPressAuthor }: Readonly<PostHeaderProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const { t } = useTranslation('common');

  return (
    <View style={styles.header}>
      <ListRow
        style={styles.headerAuthor}
        leading={<Avatar name={post.authorName} url={post.authorAvatarUrl} size={Metrics.size.md} />}
        title={post.authorName}
        subtitle={postMetaText(post)}
        onPress={onPressAuthor ? () => onPressAuthor(post.authorId) : undefined}
      />
      {isBoostActive(post.boostedUntil) ? <FeaturedBadge compact /> : null}
      {post.postType ? (
        <InfoChip
          size="sm"
          icon={COMMUNITY_POST_TYPE_ICONS[post.postType]}
          value={communityPostTypeLabel(post.postType)}
          tintColor={communityPostTypeColor(post.postType, colors)}
        />
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('a11yMoreOptions')}
        style={styles.menuButton}
        onPress={onOpenActions}
        hitSlop={Metrics.spacing.sm}
      >
        <MoreVertical size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      </Pressable>
    </View>
  );
}
