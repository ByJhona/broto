import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { useAuth } from '@/hooks';
import { getUncelebratedBadges, markBadgesCelebrated, UNCELEBRATED_BADGES_QUERY_KEY } from '@/services';
import type { Badge } from '@/types';
import { NewBadgeModal } from './NewBadgeModal';

export function BadgeCelebrationHost() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const queryKey = [UNCELEBRATED_BADGES_QUERY_KEY, user?.id];

  const { data: badges = [] } = useQuery({
    queryKey,
    queryFn: () => getUncelebratedBadges(user!.id),
    enabled: !!user?.id,
    staleTime: 0,
  });

  const badge = badges[0] ?? null;

  useEffect(() => {
    if (badge) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [badge]);

  const dismiss = () => {
    if (!badge) return;
    queryClient.setQueryData<Badge[]>(queryKey, (current = []) => current.filter((item) => item.id !== badge.id));
    markBadgesCelebrated([badge.id]);
  };

  const handleClaim = () => {
    dismiss();
    router.push('/profile/badges');
  };

  return <NewBadgeModal badge={badge} onClaim={handleClaim} onClose={dismiss} />;
}
