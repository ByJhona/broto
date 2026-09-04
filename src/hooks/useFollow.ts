import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { followUser, unfollowUser, isFollowing, getFollowCounts } from '@/services';
import type { FollowCounts } from '@/types';
import { useAuth } from './useAuth';

async function fetchFollowState(currentUserId: string | null, targetUserId: string) {
  const [followState, followCounts] = await Promise.all([
    currentUserId ? isFollowing(currentUserId, targetUserId) : Promise.resolve(false),
    getFollowCounts(targetUserId),
  ]);
  return { following: followState, counts: followCounts };
}

export function useFollow(targetUserId: string | null) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ['follow', user?.id, targetUserId] as const;

  const { data, refetch } = useQuery({
    queryKey,
    queryFn: () => fetchFollowState(user?.id ?? null, targetUserId!),
    enabled: !!targetUserId,
  });

  const following = data?.following ?? false;
  const counts = data?.counts ?? { followers: 0, following: 0 };

  const { mutate: triggerToggle } = useMutation({
    mutationFn: async () => {
      if (!user?.id || !targetUserId) return;
      if (following) {
        await unfollowUser(user.id, targetUserId);
      } else {
        await followUser(user.id, targetUserId);
      }
    },
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey });
      const previous = queryClient.getQueryData<{ following: boolean; counts: FollowCounts }>(queryKey);
      const next = !following;
      queryClient.setQueryData(queryKey, {
        following: next,
        counts: { ...counts, followers: counts.followers + (next ? 1 : -1) },
      });
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) queryClient.setQueryData(queryKey, context.previous);
    },
  });

  const toggle = () => triggerToggle();

  return { following, counts, toggle, refresh: refetch };
}
