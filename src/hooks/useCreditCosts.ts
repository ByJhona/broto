import { useQuery } from '@tanstack/react-query';
import { CATALOG_STALE_TIME, CREDIT_COSTS_QUERY_KEY, DEFAULT_CREDIT_COSTS, getCreditCosts, type CreditCosts } from '@/services';

export function useCreditCosts(): CreditCosts {
  const { data } = useQuery({
    queryKey: CREDIT_COSTS_QUERY_KEY,
    queryFn: getCreditCosts,
    staleTime: CATALOG_STALE_TIME,
  });

  return data ?? DEFAULT_CREDIT_COSTS;
}
