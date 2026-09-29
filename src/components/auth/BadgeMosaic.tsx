import { StyleSheet, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Metrics } from '@/theme';
import { getBadgeCatalog } from '@/services';
import type { Badge } from '@/types';
import { PixelBadge } from '../PixelBadge';

const BADGES_PER_ROW = 4;
const CATALOG_STALE_TIME = 60 * 60_000;

function mosaicRows(badges: Badge[]): Badge[][] {
  const picked = badges.slice(0, BADGES_PER_ROW * 2);
  return [picked.slice(0, BADGES_PER_ROW), picked.slice(BADGES_PER_ROW)].filter((row) => row.length > 0);
}

export function BadgeMosaic() {
  const { data: batches = [] } = useQuery({
    queryKey: ['badge-catalog'],
    queryFn: getBadgeCatalog,
    staleTime: CATALOG_STALE_TIME,
  });
  const rows = mosaicRows(batches.flatMap((batch) => batch.badges));

  if (rows.length === 0) return null;

  return (
    <View style={styles.mosaic} accessible={false} importantForAccessibility="no-hide-descendants">
      {rows.map((row, rowIndex) => (
        <View key={row[0].id} style={[styles.row, rowIndex % 2 === 1 && styles.rowOffset]}>
          {row.map((badge) => (
            <PixelBadge key={badge.id} pixelArt={badge.pixelArt} size={Metrics.size.xl} />
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  mosaic: {
    alignItems: 'center',
    gap: Metrics.spacing.sm,
    marginBottom: Metrics.spacing.lg,
  },
  row: {
    flexDirection: 'row',
    gap: Metrics.spacing.sm,
  },
  rowOffset: {
    marginLeft: Metrics.size.xl,
  },
});
