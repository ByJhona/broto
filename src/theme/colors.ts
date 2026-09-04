export const Palette = {
  terracota: '#c4654a',
  argila: '#e8a87c',
  salvia: '#87a878',
  verdeProfundo: '#4a6741',
  white: '#ffffff',
  black: '#000000',
  transparent: 'transparent',
};

export const LightTheme = {
  background: '#F8F9F5',
  foreground: '#233026',
  primary: Palette.terracota,
  primaryForeground: '#F5F2F0',
  secondary: Palette.argila,
  secondaryForeground: '#402012',
  accent: Palette.salvia,
  accentForeground: '#1A291A',
  leaf: Palette.verdeProfundo,
  leafForeground: '#F5F5F5',
  muted: '#EAECE6',
  mutedForeground: '#60695E',
  destructive: '#B03A2E',
  border: '#D8DCD3',

  tabIconDefault: '#8E8E93',
  tabIconSelected: Palette.verdeProfundo,

  white: Palette.white,
  black: Palette.black,
};

export const DarkTheme = {
  background: '#151C17',
  foreground: '#EBEDE8',
  primary: '#DB7C61',
  primaryForeground: '#260B05',
  secondary: '#5A311D',
  secondaryForeground: '#E5CBBF',
  accent: '#769468',
  accentForeground: '#111C12',
  leaf: '#5D8053',
  leafForeground: '#EAEBE8',
  muted: '#202922',
  mutedForeground: '#8E998B',
  destructive: '#CF4F42',
  border: '#29332B',

  tabIconDefault: '#5F6368',
  tabIconSelected: Palette.salvia,

  white: Palette.white,
  black: Palette.black,
};

export const Colors = LightTheme;

export const Overlays = {
  scrimLight: 'rgba(0,0,0,0.35)',
  scrimMedium: 'rgba(0,0,0,0.45)',
  scrim: 'rgba(0,0,0,0.5)',
  scrimStrong: 'rgba(0,0,0,0.9)',
  whiteTint: 'rgba(255,255,255,0.2)',
};
