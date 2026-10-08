import { useState } from 'react';
import { toggleListItem } from '@/utils';

export function useMultiSelect() {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const startSelecting = () => setIsSelecting(true);

  const stopSelecting = () => {
    setIsSelecting(false);
    setSelectedIds([]);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => toggleListItem(current, id));
  };

  return { isSelecting, selectedIds, startSelecting, stopSelecting, toggleSelected };
}
