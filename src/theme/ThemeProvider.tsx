import { createContext, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { useColorScheme as useSystemColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DarkTheme, LightTheme, type ThemeColors } from './colors';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ResolvedScheme = 'light' | 'dark';

const THEME_PREFERENCE_KEY = 'broto:theme-preference';

type ThemeContextValue = {
  colors: ThemeColors;
  scheme: ResolvedScheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function isThemePreference(value: string | null): value is ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system';
}

function resolveScheme(preference: ThemePreference, systemScheme: 'light' | 'dark' | 'unspecified' | null | undefined): ResolvedScheme {
  if (preference !== 'system') return preference;
  return systemScheme === 'dark' ? 'dark' : 'light';
}

export function ThemeProvider({ children }: Readonly<PropsWithChildren>) {
  const systemScheme = useSystemColorScheme();
  const [preference, setPreference] = useState<ThemePreference>('system');

  useEffect(() => {
    AsyncStorage.getItem(THEME_PREFERENCE_KEY).then((stored) => {
      if (isThemePreference(stored)) setPreference(stored);
    });
  }, []);

  const persistPreference = (next: ThemePreference) => {
    setPreference(next);
    AsyncStorage.setItem(THEME_PREFERENCE_KEY, next);
  };

  const scheme = resolveScheme(preference, systemScheme);
  const colors = scheme === 'dark' ? DarkTheme : LightTheme;

  const value = useMemo(
    () => ({ colors, scheme, preference, setPreference: persistPreference }),
    [colors, scheme, preference]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useAppTheme must be used within a ThemeProvider');
  return context;
}

export function useColors(): ThemeColors {
  return useAppTheme().colors;
}
