import { useColors } from './ThemeProvider';

export function useThemedStackScreenOptions() {
  const colors = useColors();
  return {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.foreground,
    headerShadowVisible: false,
  };
}
