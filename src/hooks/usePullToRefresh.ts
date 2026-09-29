import { useState } from 'react';

export function usePullToRefresh(refresh: () => Promise<unknown>) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refresh();
    setIsRefreshing(false);
  };

  return { isRefreshing, handleRefresh };
}
