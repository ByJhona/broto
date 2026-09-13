import { memo, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import ChevronRight from 'lucide-react-native/icons/chevron-right';
import Heart from 'lucide-react-native/icons/heart';
import HelpCircle from 'lucide-react-native/icons/circle-question-mark';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import MoreVertical from 'lucide-react-native/icons/ellipsis-vertical';
import Send from 'lucide-react-native/icons/send';
import Trash2 from 'lucide-react-native/icons/trash-2';
import Trophy from 'lucide-react-native/icons/trophy';
import { Metrics, useColors, type ThemeColors } from '@/theme';
import type { CommunityComment, CommunityPost, CommunityPostEventSummary, CommunityPostListingSummary, CommunityPostType } from '@/types';
import {
  confirm,
  EVENT_COLOR,
  EVENT_ICON,
  formatEventDateTime,
  LISTING_TYPE_COLORS,
  LISTING_TYPE_ICONS,
  LISTING_TYPE_LABELS,
} from '@/utils';
import { Avatar } from './Avatar';
import { Card } from './Card';
import { IconBadge } from './IconBadge';
import { ListRow } from './ListRow';

const TYPE_ICONS: Partial<Record<CommunityPostType, typeof Trophy>> = {
  conquista: Trophy,
  duvida: HelpCircle,
  dica: Lightbulb,
};

type PostMenuProps = {
  isOpen: boolean;
  onToggle: () => void;
  onDelete: () => void;
};

function PostMenu({ isOpen, onToggle, onDelete }: Readonly<PostMenuProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View>
      <Pressable style={styles.menuButton} onPress={onToggle} hitSlop={8}>
        <MoreVertical size={18} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      </Pressable>
      {isOpen ? (
        <View style={styles.menu}>
          <Pressable style={styles.menuItem} onPress={onDelete}>
            <Trash2 size={14} color={colors.destructive} strokeWidth={Metrics.icon.strokeWidth} />
            <Text style={styles.menuItemText}>Excluir</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

type CommentRowProps = {
  comment: CommunityComment;
  isOwnComment: boolean;
  isMenuOpen: boolean;
  onToggleMenu: () => void;
  onDelete: () => void;
};

function CommentRow({ comment, isOwnComment, isMenuOpen, onToggleMenu, onDelete }: Readonly<CommentRowProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.comment}>
      <Avatar name={comment.authorName} url={comment.authorAvatarUrl} size={32} />
      <View style={styles.commentBody}>
        <Text style={styles.commentAuthor}>
          {comment.authorName} <Text style={styles.commentTime}>· {comment.createdAt}</Text>
        </Text>
        <Text style={styles.commentText}>{comment.text}</Text>
      </View>
      {isOwnComment ? (
        <View>
          <Pressable style={styles.commentMenuButton} onPress={onToggleMenu} hitSlop={8}>
            <MoreVertical size={16} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
          </Pressable>
          {isMenuOpen ? (
            <View style={styles.menu}>
              <Pressable style={styles.menuItem} onPress={onDelete}>
                <Trash2 size={14} color={colors.destructive} strokeWidth={Metrics.icon.strokeWidth} />
                <Text style={styles.menuItemText}>Excluir</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

type PostListingPreviewProps = {
  listing: CommunityPostListingSummary;
  onPress?: () => void;
};

function PostListingPreview({ listing, onPress }: Readonly<PostListingPreviewProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const Icon = LISTING_TYPE_ICONS[listing.listingType];
  const color = LISTING_TYPE_COLORS[listing.listingType];
  const label = LISTING_TYPE_LABELS[listing.listingType];

  return (
    <Pressable style={styles.listingPreview} onPress={onPress}>
      {listing.photoUrl ? (
        <Image source={{ uri: listing.photoUrl }} style={styles.listingPreviewPhoto} contentFit="cover" />
      ) : (
        <View style={[styles.listingPreviewPhoto, styles.listingPreviewPhotoPlaceholder]}>
          <Icon size={20} color={color} strokeWidth={Metrics.icon.strokeWidth} />
        </View>
      )}

      <View style={styles.listingPreviewInfo}>
        <Text style={styles.listingPreviewTitle} numberOfLines={1}>
          {listing.title}
        </Text>
        <View style={[styles.listingPreviewBadge, { backgroundColor: color }]}>
          <Icon size={11} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
          <Text style={styles.listingPreviewBadgeText}>{label}</Text>
        </View>
      </View>

      <ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
    </Pressable>
  );
}

type PostEventPreviewProps = {
  event: CommunityPostEventSummary;
  onPress?: () => void;
};

function PostEventPreview({ event, onPress }: Readonly<PostEventPreviewProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const Icon = EVENT_ICON;

  return (
    <Pressable style={styles.listingPreview} onPress={onPress}>
      {event.photoUrl ? (
        <Image source={{ uri: event.photoUrl }} style={styles.listingPreviewPhoto} contentFit="cover" />
      ) : (
        <View style={[styles.listingPreviewPhoto, styles.listingPreviewPhotoPlaceholder]}>
          <Icon size={20} color={EVENT_COLOR} strokeWidth={Metrics.icon.strokeWidth} />
        </View>
      )}

      <View style={styles.listingPreviewInfo}>
        <Text style={styles.listingPreviewTitle} numberOfLines={1}>
          {event.title}
        </Text>
        <View style={[styles.listingPreviewBadge, { backgroundColor: EVENT_COLOR }]}>
          <Icon size={11} color={colors.white} strokeWidth={Metrics.icon.strokeWidth} />
          <Text style={styles.listingPreviewBadgeText}>{formatEventDateTime(event.eventDate)}</Text>
        </View>
      </View>

      <ChevronRight size={Metrics.icon.small} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
    </Pressable>
  );
}

type PostFooterProps = {
  liked: boolean;
  likeCount: number;
  commentCount: number;
  onToggleLike: () => void;
  onToggleComments: () => void;
};

function PostFooter({ liked, likeCount, commentCount, onToggleLike, onToggleComments }: Readonly<PostFooterProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.footer}>
      <Pressable style={styles.footerButton} onPress={onToggleLike}>
        <Heart
          size={Metrics.icon.normal}
          color={liked ? colors.primary : colors.mutedForeground}
          fill={liked ? colors.primary : 'none'}
          strokeWidth={Metrics.icon.strokeWidth}
        />
        <Text style={[styles.footerText, liked && styles.footerTextActive]}>{likeCount}</Text>
      </Pressable>

      <Pressable style={styles.footerButton} onPress={onToggleComments}>
        <MessageCircle size={Metrics.icon.normal} color={colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
        <Text style={styles.footerText}>{commentCount} recados</Text>
      </Pressable>
    </View>
  );
}

type PostCommentsProps = {
  comments: CommunityComment[];
  currentUserId?: string | null;
  openMenuId: string | null;
  onToggleMenu: (commentId: string) => void;
  onDeleteComment: (commentId: string) => void;
  draft: string;
  onChangeDraft: (text: string) => void;
  onSend: () => void;
  isSending: boolean;
};

function PostComments({
  comments,
  currentUserId,
  openMenuId,
  onToggleMenu,
  onDeleteComment,
  draft,
  onChangeDraft,
  onSend,
  isSending,
}: Readonly<PostCommentsProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  return (
    <View style={styles.comments}>
      {comments.map((comment) => (
        <CommentRow
          key={comment.id}
          comment={comment}
          isOwnComment={!!currentUserId && currentUserId === comment.authorId}
          isMenuOpen={openMenuId === comment.id}
          onToggleMenu={() => onToggleMenu(comment.id)}
          onDelete={() => onDeleteComment(comment.id)}
        />
      ))}

      <View style={styles.commentInputRow}>
        <TextInput
          style={[styles.commentInput, isSending && styles.commentInputDisabled]}
          value={draft}
          onChangeText={onChangeDraft}
          placeholder="Deixe um recadinho..."
          placeholderTextColor={colors.mutedForeground}
          onSubmitEditing={onSend}
          editable={!isSending}
        />
        <Pressable
          style={[styles.commentSend, (isSending || !draft.trim()) && styles.commentSendDisabled]}
          onPress={onSend}
          disabled={isSending || !draft.trim()}
        >
          {isSending ? (
            <ActivityIndicator size="small" color={colors.primaryForeground} />
          ) : (
            <Send size={Metrics.icon.small} color={colors.primaryForeground} strokeWidth={Metrics.icon.strokeWidth} />
          )}
        </Pressable>
      </View>
    </View>
  );
}

type CommunityPostCardProps = {
  post: CommunityPost;
  currentUserId?: string | null;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, text: string) => Promise<void>;
  onPressAuthor?: (authorId: string) => void;
  onPressListing?: (listingId: string) => void;
  onPressEvent?: (eventId: string) => void;
  onDelete?: (postId: string) => void;
  onDeleteComment?: (commentId: string) => void;
};

export const CommunityPostCard = memo(function CommunityPostCard({
  post,
  currentUserId,
  onToggleLike,
  onAddComment,
  onPressAuthor,
  onPressListing,
  onPressEvent,
  onDelete,
  onDeleteComment,
}: Readonly<CommunityPostCardProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [openCommentMenuId, setOpenCommentMenuId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [isSendingComment, setIsSendingComment] = useState(false);
  const isOwnPost = !!currentUserId && currentUserId === post.authorId;

  const handleSendComment = async () => {
    const text = draft.trim();
    if (!text || isSendingComment) return;
    setIsSendingComment(true);
    try {
      await onAddComment(post.id, text);
      setDraft('');
    } finally {
      setIsSendingComment(false);
    }
  };

  const handleDelete = async () => {
    setIsMenuOpen(false);
    const confirmed = await confirm(
      'Excluir publicação',
      'Tem certeza que quer excluir essa publicação? Essa ação não pode ser desfeita.',
      { confirmLabel: 'Excluir', destructive: true }
    );
    if (confirmed) onDelete?.(post.id);
  };

  const handleDeleteComment = async (commentId: string) => {
    setOpenCommentMenuId(null);
    const confirmed = await confirm(
      'Excluir recado',
      'Tem certeza que quer excluir esse recado? Essa ação não pode ser desfeita.',
      { confirmLabel: 'Excluir', destructive: true }
    );
    if (confirmed) onDeleteComment?.(commentId);
  };

  const TypeIcon = post.postType ? TYPE_ICONS[post.postType] : null;
  const meta = post.authorUsername ? `@${post.authorUsername} · ${post.createdAt}` : post.createdAt;
  const listingSummary = post.listingSummary;
  const eventSummary = post.eventSummary;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <ListRow
          style={styles.headerAuthor}
          leading={<Avatar name={post.authorName} url={post.authorAvatarUrl} size={44} />}
          title={post.authorName}
          subtitle={meta}
          onPress={onPressAuthor ? () => onPressAuthor(post.authorId) : undefined}
        />
        {TypeIcon ? (
          <IconBadge size={28}>
            <TypeIcon size={14} color={colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
          </IconBadge>
        ) : null}
        {isOwnPost && (
          <PostMenu isOpen={isMenuOpen} onToggle={() => setIsMenuOpen((open) => !open)} onDelete={handleDelete} />
        )}
      </View>

      {post.imageUrl ? (
        <Image
          source={{ uri: post.imageUrl }}
          style={styles.photo}
          contentFit="cover"
          recyclingKey={post.id}
          cachePolicy="memory-disk"
        />
      ) : null}

      <Text style={[styles.caption, !post.imageUrl && styles.captionNoPhoto]}>{post.caption}</Text>

      {listingSummary ? <PostListingPreview listing={listingSummary} onPress={() => onPressListing?.(listingSummary.id)} /> : null}
      {eventSummary ? <PostEventPreview event={eventSummary} onPress={() => onPressEvent?.(eventSummary.id)} /> : null}

      <PostFooter
        liked={post.liked}
        likeCount={post.likeCount}
        commentCount={post.comments.length}
        onToggleLike={() => onToggleLike(post.id)}
        onToggleComments={() => setIsCommentsOpen((open) => !open)}
      />

      {isCommentsOpen ? (
        <PostComments
          comments={post.comments}
          currentUserId={currentUserId}
          openMenuId={openCommentMenuId}
          onToggleMenu={(commentId) => setOpenCommentMenuId((current) => (current === commentId ? null : commentId))}
          onDeleteComment={handleDeleteComment}
          draft={draft}
          onChangeDraft={setDraft}
          onSend={handleSendComment}
          isSending={isSendingComment}
        />
      ) : null}
    </Card>
  );
});

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
  card: {
    width: '100%',
    marginBottom: Metrics.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.md,
  },
  headerAuthor: {
    flex: 1,
  },
  menuButton: {
    padding: 4,
  },
  menu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    backgroundColor: colors.card,
    borderRadius: Metrics.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    minWidth: 140,
    zIndex: 10,
    elevation: 10,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.xs,
    paddingVertical: Metrics.spacing.sm,
    paddingHorizontal: Metrics.spacing.md,
  },
  menuItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.destructive,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Metrics.radius.md,
    backgroundColor: colors.muted,
  },
  caption: {
    fontSize: 14,
    color: colors.foreground,
    marginTop: Metrics.spacing.md,
    lineHeight: 20,
  },
  captionNoPhoto: {
    marginTop: 0,
  },
  listingPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    marginTop: Metrics.spacing.sm,
    backgroundColor: colors.background,
    borderRadius: Metrics.radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: Metrics.spacing.sm,
  },
  listingPreviewPhoto: {
    width: 48,
    height: 48,
    borderRadius: Metrics.radius.md,
    backgroundColor: colors.muted,
  },
  listingPreviewPhotoPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingPreviewInfo: {
    flex: 1,
    gap: 4,
  },
  listingPreviewTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.foreground,
  },
  listingPreviewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    borderRadius: Metrics.radius.full,
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  listingPreviewBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
  },
  footer: {
    flexDirection: 'row',
    gap: Metrics.spacing.lg,
    marginTop: Metrics.spacing.md,
    paddingTop: Metrics.spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.xs,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.mutedForeground,
  },
  footerTextActive: {
    color: colors.primary,
  },
  comments: {
    marginTop: Metrics.spacing.md,
    paddingTop: Metrics.spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: Metrics.spacing.sm,
  },
  comment: {
    flexDirection: 'row',
    gap: Metrics.spacing.sm,
    backgroundColor: colors.background,
    borderRadius: Metrics.radius.md,
    padding: Metrics.spacing.sm,
  },
  commentBody: {
    flex: 1,
  },
  commentMenuButton: {
    padding: 4,
  },
  commentAuthor: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.foreground,
  },
  commentTime: {
    fontSize: 11,
    fontWeight: '400',
    color: colors.mutedForeground,
  },
  commentText: {
    fontSize: 13,
    color: colors.foreground,
    marginTop: 2,
  },
  commentInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    marginTop: Metrics.spacing.xs,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: Metrics.radius.full,
    paddingHorizontal: Metrics.spacing.md,
    paddingVertical: Metrics.spacing.sm,
    fontSize: 13,
    color: colors.foreground,
    backgroundColor: colors.card,
  },
  commentInputDisabled: {
    opacity: 0.5,
  },
  commentSend: {
    width: 36,
    height: 36,
    borderRadius: Metrics.radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSendDisabled: {
    opacity: 0.5,
  },
  });
