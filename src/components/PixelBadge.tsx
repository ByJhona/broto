import { useMemo } from 'react';
import Svg, { Rect } from 'react-native-svg';
import type { PixelArt } from '@/types';

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
  const rects = useMemo(() => buildPixelRects(pixelArt), [pixelArt]);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${pixelArt.size} ${pixelArt.size}`}>
      {rects.map((rect) => (
        <Rect key={rect.key} x={rect.x} y={rect.y} width={1} height={1} fill={rect.color} />
      ))}
    </Svg>
  );
}
