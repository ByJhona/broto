import { Fonts } from './fonts';
import { useColors } from './ThemeProvider';

export function useThemedStackScreenOptions() {
  const colors = useColors();
  return {
    headerStyle: { backgroundColor: colors.background },
    headerTintColor: colors.foreground,
    headerTitleStyle: { fontFamily: Fonts.display },
    headerShadowVisible: false,
  };
}
