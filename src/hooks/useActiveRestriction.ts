import { useQuery } from '@tanstack/react-query';
import { useTranslation } from '@/i18n';
import { getMyActiveRestriction, MY_RESTRICTION_QUERY_KEY } from '@/services';
import { formatShortDate } from '@/utils';
import { useAuth } from './useAuth';

const RESTRICTION_STALE_TIME = 60_000;

export function useActiveRestriction(): string | null {
  const { user } = useAuth();
  const { t } = useTranslation('moderation');
  const { data } = useQuery({
    queryKey: [...MY_RESTRICTION_QUERY_KEY, user?.id],
    queryFn: () => getMyActiveRestriction(user!.id),
    enabled: !!user?.id,
    staleTime: RESTRICTION_STALE_TIME,
  });

  if (!data) return null;
  return data.ends_at ? t('restrictedUntil', { date: formatShortDate(data.ends_at) }) : t('restrictedIndefinitely');
}
