import { useState } from 'react';

export function useMultiSelect() {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const startSelecting = () => setIsSelecting(true);

  const stopSelecting = () => {
    setIsSelecting(false);
    setSelectedIds([]);
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  };

  return { isSelecting, selectedIds, startSelecting, stopSelecting, toggleSelected };
}
