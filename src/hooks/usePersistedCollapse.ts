import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function usePersistedCollapse(storageKey: string) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(storageKey).then((stored) => {
      if (stored === '1') setIsCollapsed(true);
    });
  }, [storageKey]);

  const toggleCollapsed = () => {
    setIsCollapsed((current) => {
      const next = !current;
      AsyncStorage.setItem(storageKey, next ? '1' : '0');
      return next;
    });
  };

  return { isCollapsed, toggleCollapsed };
}
