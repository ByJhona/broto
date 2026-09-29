import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { Metrics, useColors, type ThemeColors, useThemedStyles } from '@/theme';
import type { PixelArt } from '@/types';

const ART_SCALE = 0.78;
const BADGE_GOLD = '#D4AF37';

type PixelBadgeProps = {
  pixelArt: PixelArt;
  size?: number;
  locked?: boolean;
};

type PixelRect = {
  key: string;
  x: number;
  y: number;
  color: string;
};

function buildPixelRects(pixelArt: PixelArt, lockedColor: string | null): PixelRect[] {
  const { size, palette, pixels } = pixelArt;
  const rects: PixelRect[] = [];

  for (let i = 0; i < pixels.length; i++) {
    const color = lockedColor ?? palette[pixels[i]];
    if (pixels[i] === 0 || !color) continue;
    rects.push({ key: String(i), x: i % size, y: Math.floor(i / size), color });
  }

  return rects;
}

export function PixelBadge({ pixelArt, size = Metrics.size.hero, locked = false }: Readonly<PixelBadgeProps>) {
  const colors = useColors();
  const styles = useThemedStyles(makeStyles);
  const rects = useMemo(() => buildPixelRects(pixelArt, locked ? colors.mutedForeground : null), [pixelArt, locked, colors.mutedForeground]);
  const artSize = size * ART_SCALE;
  const borderWidth = Math.max(2, Math.round(size * 0.04));

  return (
    <View
      style={[
        styles.frame,
        { width: size, height: size, borderRadius: size / 2, borderWidth },
        locked && styles.frameLocked,
      ]}
    >
      <Svg width={artSize} height={artSize} viewBox={`0 0 ${pixelArt.size} ${pixelArt.size}`}>
        {rects.map((rect) => (
          <Rect key={rect.key} x={rect.x} y={rect.y} width={1} height={1} fill={rect.color} />
        ))}
      </Svg>
    </View>
  );
}

const makeStyles = (colors: ThemeColors) =>
  StyleSheet.create({
    frame: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.card,
      borderColor: BADGE_GOLD,
      overflow: 'hidden',
    },
    frameLocked: {
      borderColor: colors.border,
      opacity: 0.5,
    },
  });
