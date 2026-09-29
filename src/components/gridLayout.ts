import { useWindowDimensions } from 'react-native';
import { Metrics } from '@/theme';

export const GRID_COLUMNS = 2;
export const GRID_GAP = Metrics.spacing.md;
export const GRID_PADDING = Metrics.spacing.lg;
export const CAROUSEL_CARD_WIDTH = Metrics.media.sm;

export function useColumnWidth(columns: number, gap: number, horizontalPadding: number = GRID_PADDING): number {
  const { width } = useWindowDimensions();
  const contentWidth = Math.min(width, Metrics.layout.contentMaxWidth) - horizontalPadding * 2;
  return Math.floor((contentWidth - gap * (columns - 1)) / columns);
}

export function useGridCardWidth(horizontalPadding: number = GRID_PADDING): number {
  return useColumnWidth(GRID_COLUMNS, GRID_GAP, horizontalPadding);
}

export function chunkIntoRows<T>(items: T[], columns: number): T[][] {
  const rows: T[][] = [];
  for (let index = 0; index < items.length; index += columns) {
    rows.push(items.slice(index, index + columns));
  }
  return rows;
}
