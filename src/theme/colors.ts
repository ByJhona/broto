export const Palette = {
  terracota: '#B7644A',
  argila: '#E7B18E',
  salvia: '#8EA786',
  verdeProfundo: '#455F40',
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
};

export type ThemeColors = {
  background: string;
  foreground: string;
  card: string;
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  leaf: string;
  leafForeground: string;
  muted: string;
  mutedForeground: string;
  destructive: string;
  border: string;
  tabIconDefault: string;
  tabIconSelected: string;
  white: string;
  black: string;
};

export const LightTheme = {
  background: '#FAF5EB',
  foreground: '#202D20',
  card: '#FFFDF9',
  primary: Palette.terracota,
  primaryForeground: '#FCFAF4',
  secondary: Palette.argila,
  secondaryForeground: '#4F2A1D',
  accent: Palette.salvia,
  accentForeground: '#172918',
  leaf: Palette.verdeProfundo,
  leafForeground: '#FCFAF4',
  muted: '#F1ECE0',
  mutedForeground: '#626757',
  destructive: '#D03D37',
  border: '#E5DCCD',

  tabIconDefault: '#8E8E93',
  tabIconSelected: Palette.verdeProfundo,

  white: Palette.white,
  black: Palette.black,
} satisfies ThemeColors;

export const DarkTheme = {
  background: '#0F140F',
  foreground: '#F7F4EC',
  card: '#1B221B',
  primary: '#E9946E',
  primaryForeground: '#21100A',
  secondary: '#452E20',
  secondaryForeground: '#F7EBDC',
  accent: '#8EB087',
  accentForeground: '#EDF2E7',
  leaf: '#7BA77C',
  leafForeground: '#071308',
  muted: '#262D26',
  mutedForeground: '#BCBDB1',
  destructive: '#EA6F64',
  border: 'rgba(255,255,255,0.16)',

  tabIconDefault: '#5F6368',
  tabIconSelected: '#8EB087',

  white: Palette.white,
  black: Palette.black,
} satisfies ThemeColors;

export const Overlays = {
  scrimLight: 'rgba(0,0,0,0.35)',
  scrimMedium: 'rgba(0,0,0,0.45)',
  scrim: 'rgba(0,0,0,0.5)',
  scrimStrong: 'rgba(0,0,0,0.9)',
  whiteTint: 'rgba(255,255,255,0.2)',
};
