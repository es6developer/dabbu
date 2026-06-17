import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { palette } from './colors';
import { typography } from './typography';
import { spacing, borderRadius, iconSizes } from './spacing';
import { useAuth } from '../store/AuthContext';

const THEME_MODE_KEY = '@dabbu_theme_mode';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Theme {
  dark: boolean;
  colors: typeof palette.dark;
  typography: typeof typography;
  spacing: typeof spacing;
  borderRadius: typeof borderRadius;
  iconSizes: typeof iconSizes;
  isDark: boolean;
  mode: ThemeMode;
}

const darkTheme: Theme = {
  dark: true,
  colors: palette.dark,
  typography,
  spacing,
  borderRadius,
  iconSizes,
  isDark: true,
  mode: 'dark',
};

const lightTheme: Theme = {
  dark: false,
  colors: palette.light as unknown as typeof palette.dark,
  typography,
  spacing,
  borderRadius,
  iconSizes,
  isDark: false,
  mode: 'light',
};

interface ThemeContextValue {
  theme: Theme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => Promise<void>;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: darkTheme,
  themeMode: 'dark',
  setThemeMode: async () => {},
  isDark: true,
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const deviceScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [loaded, setLoaded] = useState(false);
  let coupleUser: { isCouple?: boolean; isCoupleMode?: boolean } | null = null;
  try {
    const { user } = useAuth();
    coupleUser = user;
  } catch {
    coupleUser = null;
  }
  const isCoupleMode = !!(coupleUser?.isCouple && coupleUser?.isCoupleMode);

  useEffect(() => {
    AsyncStorage.getItem(THEME_MODE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setThemeModeState(stored);
      }
      setLoaded(true);
    });
  }, []);

  const setThemeMode = async (mode: ThemeMode) => {
    setThemeModeState(mode);
    await AsyncStorage.setItem(THEME_MODE_KEY, mode);
  };

  const isDark = themeMode === 'system' ? deviceScheme === 'dark' : themeMode === 'dark';
  const baseTheme = isDark ? darkTheme : lightTheme;
  const theme = isCoupleMode
    ? {
        ...baseTheme,
        colors: (isDark
          ? palette.coupleDark
          : palette.coupleLight) as unknown as typeof palette.dark,
      }
    : baseTheme;

  useEffect(() => {
    if (themeMode === 'system') {
      Appearance.setColorScheme(null);
    } else {
      Appearance.setColorScheme(isDark ? 'dark' : 'light');
    }
  }, [isDark, themeMode]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}

export function useTheme(): Theme {
  return useContext(ThemeContext).theme;
}

export function useIsDark(): boolean {
  return useContext(ThemeContext).isDark;
}

export { darkTheme, lightTheme };
