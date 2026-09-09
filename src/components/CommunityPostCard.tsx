import { memo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Image } from 'expo-image';
import Heart from 'lucide-react-native/icons/heart';
import HelpCircle from 'lucide-react-native/icons/circle-question-mark';
import Lightbulb from 'lucide-react-native/icons/lightbulb';
import MessageCircle from 'lucide-react-native/icons/message-circle';
import MoreVertical from 'lucide-react-native/icons/ellipsis-vertical';
import Send from 'lucide-react-native/icons/send';
import Trash2 from 'lucide-react-native/icons/trash-2';
import Trophy from 'lucide-react-native/icons/trophy';
import { Colors, Metrics } from '@/theme';
import type { CommunityComment, CommunityPost, CommunityPostType } from '@/types';
import { confirm } from '@/utils';
import { Avatar } from './Avatar';

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

function PostMenu({ isOpen, onToggle, onDelete }: PostMenuProps) {
  return (
    <View>
      <Pressable style={styles.menuButton} onPress={onToggle} hitSlop={8}>
        <MoreVertical size={18} color={Colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
      </Pressable>
      {isOpen ? (
        <View style={styles.menu}>
          <Pressable style={styles.menuItem} onPress={onDelete}>
            <Trash2 size={14} color={Colors.destructive} strokeWidth={Metrics.icon.strokeWidth} />
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

function CommentRow({ comment, isOwnComment, isMenuOpen, onToggleMenu, onDelete }: CommentRowProps) {
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
            <MoreVertical size={16} color={Colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
          </Pressable>
          {isMenuOpen ? (
            <View style={styles.menu}>
              <Pressable style={styles.menuItem} onPress={onDelete}>
                <Trash2 size={14} color={Colors.destructive} strokeWidth={Metrics.icon.strokeWidth} />
                <Text style={styles.menuItemText}>Excluir</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

type CommunityPostCardProps = {
  post: CommunityPost;
  currentUserId?: string | null;
  onToggleLike: (postId: string) => void;
  onAddComment: (postId: string, text: string) => Promise<void>;
  onPressAuthor?: (authorId: string) => void;
  onDelete?: (postId: string) => void;
  onDeleteComment?: (commentId: string) => void;
};

export const CommunityPostCard = memo(function CommunityPostCard({
  post,
  currentUserId,
  onToggleLike,
  onAddComment,
  onPressAuthor,
  onDelete,
  onDeleteComment,
}: CommunityPostCardProps) {
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

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Pressable
          style={styles.headerAuthor}
          onPress={() => onPressAuthor?.(post.authorId)}
          disabled={!onPressAuthor}
        >
          <Avatar name={post.authorName} url={post.authorAvatarUrl} size={44} />
          <View style={styles.headerText}>
            <Text style={styles.authorName}>{post.authorName}</Text>
            <Text style={styles.meta}>
              {post.authorUsername ? `@${post.authorUsername} · ` : ''}
              {post.createdAt}
            </Text>
          </View>
        </Pressable>
        {TypeIcon ? (
          <View style={styles.typeBadge}>
            <TypeIcon size={14} color={Colors.foreground} strokeWidth={Metrics.icon.strokeWidth} />
          </View>
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

      <View style={styles.footer}>
        <Pressable style={styles.footerButton} onPress={() => onToggleLike(post.id)}>
          <Heart
            size={Metrics.icon.normal}
            color={post.liked ? Colors.primary : Colors.mutedForeground}
            fill={post.liked ? Colors.primary : 'none'}
            strokeWidth={Metrics.icon.strokeWidth}
          />
          <Text style={[styles.footerText, post.liked && styles.footerTextActive]}>{post.likeCount}</Text>
        </Pressable>

        <Pressable style={styles.footerButton} onPress={() => setIsCommentsOpen((open) => !open)}>
          <MessageCircle size={Metrics.icon.normal} color={Colors.mutedForeground} strokeWidth={Metrics.icon.strokeWidth} />
          <Text style={styles.footerText}>{post.comments.length} recados</Text>
        </Pressable>
      </View>

      {isCommentsOpen ? (
        <View style={styles.comments}>
          {post.comments.map((comment) => (
            <CommentRow
              key={comment.id}
              comment={comment}
              isOwnComment={!!currentUserId && currentUserId === comment.authorId}
              isMenuOpen={openCommentMenuId === comment.id}
              onToggleMenu={() => setOpenCommentMenuId((current) => (current === comment.id ? null : comment.id))}
              onDelete={() => handleDeleteComment(comment.id)}
            />
          ))}

          <View style={styles.commentInputRow}>
            <TextInput
              style={[styles.commentInput, isSendingComment && styles.commentInputDisabled]}
              value={draft}
              onChangeText={setDraft}
              placeholder="Deixe um recadinho..."
              placeholderTextColor={Colors.mutedForeground}
              onSubmitEditing={handleSendComment}
              editable={!isSendingComment}
            />
            <Pressable
              style={[styles.commentSend, (isSendingComment || !draft.trim()) && styles.commentSendDisabled]}
              onPress={handleSendComment}
              disabled={isSendingComment || !draft.trim()}
            >
              {isSendingComment ? (
                <ActivityIndicator size="small" color={Colors.primaryForeground} />
              ) : (
                <Send size={Metrics.icon.small} color={Colors.primaryForeground} strokeWidth={Metrics.icon.strokeWidth} />
              )}
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  card: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: Metrics.radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Metrics.spacing.md,
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.sm,
  },
  headerText: {
    flex: 1,
  },
  authorName: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.foreground,
  },
  meta: {
    fontSize: 12,
    color: Colors.mutedForeground,
    marginTop: 1,
  },
  typeBadge: {
    width: 28,
    height: 28,
    borderRadius: Metrics.radius.full,
    backgroundColor: Colors.muted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuButton: {
    padding: 4,
  },
  menu: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: 4,
    backgroundColor: Colors.white,
    borderRadius: Metrics.radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 4,
    minWidth: 140,
    zIndex: 10,
    elevation: 10,
    shadowColor: Colors.black,
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
    color: Colors.destructive,
  },
  photo: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: Metrics.radius.md,
    backgroundColor: Colors.muted,
  },
  caption: {
    fontSize: 14,
    color: Colors.foreground,
    marginTop: Metrics.spacing.md,
    lineHeight: 20,
  },
  captionNoPhoto: {
    marginTop: 0,
  },
  footer: {
    flexDirection: 'row',
    gap: Metrics.spacing.lg,
    marginTop: Metrics.spacing.md,
    paddingTop: Metrics.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Metrics.spacing.xs,
  },
  footerText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.mutedForeground,
  },
  footerTextActive: {
    color: Colors.primary,
  },
  comments: {
    marginTop: Metrics.spacing.md,
    paddingTop: Metrics.spacing.md,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: Metrics.spacing.sm,
  },
  comment: {
    flexDirection: 'row',
    gap: Metrics.spacing.sm,
    backgroundColor: Colors.background,
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
    color: Colors.foreground,
  },
  commentTime: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.mutedForeground,
  },
  commentText: {
    fontSize: 13,
    color: Colors.foreground,
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
    borderColor: Colors.border,
    borderRadius: Metrics.radius.full,
    paddingHorizontal: Metrics.spacing.md,
    paddingVertical: Metrics.spacing.sm,
    fontSize: 13,
    color: Colors.foreground,
    backgroundColor: Colors.white,
  },
  commentInputDisabled: {
    opacity: 0.5,
  },
  commentSend: {
    width: 36,
    height: 36,
    borderRadius: Metrics.radius.full,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  commentSendDisabled: {
    opacity: 0.5,
  },
});
