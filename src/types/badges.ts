export type PixelArt = {
  size: number;
  palette: (string | null)[];
  pixels: number[];
};

export type Badge = {
  id: string;
  batchId: string;
  name: string;
  description: string;
  pixelArt: PixelArt;
};

export type BadgeBatch = {
  id: string;
  name: string;
  description: string;
  badges: Badge[];
};

export type UserBadge = {
  badgeId: string;
  grantedAt: string;
};

export type EarnedBadge = Badge & {
  grantedAt: string;
};
