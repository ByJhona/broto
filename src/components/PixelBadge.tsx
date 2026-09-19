import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { useColors, type ThemeColors } from '@/theme';
import type { PixelArt } from '@/types';

const ART_SCALE = 0.78;
const BADGE_GOLD = '#D4AF37';

type PixelBadgeProps = {
  pixelArt: PixelArt;
  size?: number;
};

type PixelRect = {
  key: string;
  x: number;
  y: number;
  color: string;
};

function buildPixelRects(pixelArt: PixelArt): PixelRect[] {
  const { size, palette, pixels } = pixelArt;
  const rects: PixelRect[] = [];

  for (let i = 0; i < pixels.length; i++) {
    const color = palette[pixels[i]];
    if (!color) continue;
    rects.push({ key: String(i), x: i % size, y: Math.floor(i / size), color });
  }

  return rects;
}

export function PixelBadge({ pixelArt, size = 96 }: Readonly<PixelBadgeProps>) {
  const colors = useColors();
  const styles = useMemo(() => makeStyles(colors), [colors]);
  const rects = useMemo(() => buildPixelRects(pixelArt), [pixelArt]);
  const artSize = size * ART_SCALE;
  const borderWidth = Math.max(2, Math.round(size * 0.04));

  return (
    <View style={[styles.frame, { width: size, height: size, borderRadius: size / 2, borderWidth }]}>
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
  });
