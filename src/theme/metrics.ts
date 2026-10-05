const icon = {
  stroke: {
    regular: 1.5,
    bold: 2,
    heavy: 2.5,
  },
  xs: 12,
  small: 16,
  normal: 24,
  large: 32,
  xl: 42,
} as const;

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const Metrics = {
  icon,
  spacing,
  hitSlop: spacing.sm,
  zIndex: {
    raised: 1,
    top: 2,
  },
  fontSize: {
    caption: 12,
    small: 14,
    body: 16,
    title: 20,
    headline: 24,
    display: 28,
    hero: 64,
  },
  lineHeight: {
    caption: 16,
    small: 20,
    body: 24,
    title: 28,
    headline: 32,
    display: 36,
    hero: 72,
  },
  borderWidth: {
    sm: 1,
    md: 1.5,
    lg: 2,
    xl: 3,
    xxl: 4,
  },
  radius: {
    sm: 4,
    md: 8,
    lg: 16,
    xl: 32,
    full: 9999,
  },
  size: {
    dot: 8,
    xs: 24,
    sm: 32,
    md: 40,
    lg: 48,
    xl: 56,
    xxl: 72,
    hero: 96,
  },
  aspect: {
    portrait: 4 / 5,
    landscape: 4 / 3,
    hero: 20 / 21,
  },
  media: {
    sm: 144,
    md: 192,
    lg: 240,
  },
  chip: {
    md: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md, gap: spacing.sm, iconSize: icon.small },
    sm: { paddingVertical: spacing.xs, paddingHorizontal: spacing.sm, gap: spacing.xs, iconSize: icon.xs },
  },
  layout: {
    contentMaxWidth: 640,
    dialogMaxWidth: 360,
    heroMaxHeight: 460,
    chatBoxMaxHeight: 320,
    centeredContent: {
      width: '100%',
      maxWidth: 640,
      alignSelf: 'center',
    },
  },
} as const;
