import { useCallback } from 'react';
import { useRouter } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { i18n } from '@/i18n';
import {
  applyPostUpdateEverywhere,
  boostContent,
  BOOST_DURATION_HOURS,
  deletePost,
  InsufficientCreditsError,
  refetchPostFeeds,
  removePostEverywhere,
  toggleLike,
} from '@/services';
import type { CommunityPost } from '@/types';
import { Alert, Toast } from '@/utils';
import { useAuth } from './useAuth';
import { useCreditCosts } from './useCreditCosts';

export function usePostActions(posts: CommunityPost[]) {
  const router = useRouter();
  const { user } = useAuth();
  const creditCosts = useCreditCosts();
  const queryClient = useQueryClient();

  const handleToggleLike = useCallback(
    async (postId: string) => {
      if (!user?.id) return;
      const post = posts.find((p) => p.id === postId);
      if (!post) return;

      applyPostUpdateEverywhere(queryClient, postId, (p) => ({
        ...p,
        liked: !p.liked,
        likeCount: p.likeCount + (p.liked ? -1 : 1),
      }));

      try {
        await toggleLike(postId, user.id, post.liked);
      } catch {
        applyPostUpdateEverywhere(queryClient, postId, () => post);
      }
    },
    [user, queryClient, posts]
  );

  const handleDeletePost = useCallback(
    async (postId: string) => {
      removePostEverywhere(queryClient, postId);
      try {
        await deletePost(postId);
      } catch {
        refetchPostFeeds(queryClient);
        Toast.error(i18n.t('community:deletePostError'));
      }
    },
    [queryClient]
  );

  const handleBoostPost = useCallback(
    async (postId: string) => {
      try {
        const boostedUntil = await boostContent('post', postId);
        applyPostUpdateEverywhere(queryClient, postId, (post) => ({ ...post, boostedUntil }));
        queryClient.invalidateQueries({ queryKey: ['featured-posts'] });
        Toast.success(i18n.t('community:boostSuccess', { hours: BOOST_DURATION_HOURS }));
      } catch (err) {
        if (err instanceof InsufficientCreditsError) {
          Alert.alert(i18n.t('community:insufficientCreditsTitle'), i18n.t('community:boostCreditsMessage', { cost: creditCosts.boost_content }), [
            { text: i18n.t('common:notNow'), style: 'cancel' },
            { text: i18n.t('common:seePlans'), onPress: () => router.push('/profile/plans') },
          ]);
        } else {
          Toast.error(i18n.t('community:boostError'));
        }
      }
    },
    [queryClient, router, creditCosts]
  );

  return { handleToggleLike, handleDeletePost, handleBoostPost };
}
