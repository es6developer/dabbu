import './src/global.css';
import React, { useEffect, useCallback, useState } from 'react';
import { StatusBar, LogBox, Appearance, View, UIManager, Platform } from 'react-native';
import * as Font from 'expo-font';
import * as NavigationBar from 'expo-navigation-bar';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import {
  NavigationContainer,
  NavigationContainerRef,
  DefaultTheme,
  DarkTheme,
} from '@react-navigation/native';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { ApiProgressBar } from './src/components/ui/ApiProgressBar';
import { AuthProvider } from './src/store/AuthContext';
import { PremiumProvider } from './src/store/PremiumContext';
import { PreferencesProvider } from './src/store/PreferencesContext';
import { LockProvider } from './src/store/LockContext';
import { FavoritesProvider } from './src/store/FavoritesContext';
import { OfflineProvider } from './src/store/OfflineContext';
import { ToastProvider } from './src/store/ToastContext';
import { AlertProvider } from './src/components/ui/CustomAlert';
import { OfflineBanner } from './src/components/ui/OfflineBanner';
import { loadFeatures } from './src/config/features';
import { useDeepLinks } from './src/hooks/useDeepLinks';
import { useNotifications } from './src/hooks/useNotifications';
import { warmupBackend } from './src/services/api';

SplashScreen.preventAutoHideAsync();
LogBox.ignoreLogs(['Reanimated', 'ViewPropTypes']);

function NotificationInitializer() {
  useNotifications();
  return null;
}

function ThemedStatusBar() {
  const { isDark, colors } = useTheme();
  React.useEffect(() => {
    if (Platform.OS === 'android') {
      NavigationBar.setBackgroundColorAsync(colors.bg.primary);
      NavigationBar.setButtonStyleAsync(isDark ? 'light' : 'dark');
    }
  }, [isDark, colors]);
  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor={colors.bg.primary}
      translucent
    />
  );
}

function ThemedNavigationContainer({
  children,
  navigationRef,
  linking,
}: {
  children: React.ReactNode;
  navigationRef: React.RefObject<NavigationContainerRef<any>>;
  linking?: any;
}) {
  const { isDark, colors } = useTheme();
  const navTheme = React.useMemo(() => {
    const base = isDark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark: isDark,
      colors: {
        ...base.colors,
        background: colors.bg.primary,
        card: colors.bg.secondary,
        text: colors.text.primary,
        border: colors.border.default,
        primary: colors.accent.primary,
      },
    };
  }, [isDark, colors]);
  return (
    <NavigationContainer ref={navigationRef} theme={navTheme} linking={linking}>
      {children}
    </NavigationContainer>
  );
}

export default function App(): React.ReactElement | null {
  const [appIsReady, setAppIsReady] = useState(false);
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const navigationRef = React.useRef<NavigationContainerRef<any>>(null);

  useDeepLinks();

  const linking = {
    prefixes: ['dabbu://', 'https://dabbu.app'],
    config: {
      screens: {
        Dashboard: {
          screens: {
            GoalsList: 'goals',
            GoalDetail: 'goals/:goalId',
          },
        },
        Shared: {
          screens: {
            SharedGroupDetail: 'shared/:groupId',
            Settlement: 'shared/:groupId/settle',
          },
        },
        Accounts: {
          screens: {
            GroupExpenses: 'shared/:groupId/expenses',
          },
        },
      },
    },
  };

  useEffect(() => {
    async function prepare(): Promise<void> {
      try {
        loadFeatures();
        warmupBackend();
        const fontName = Platform.OS === 'android' ? null : null;
        const inter = await import('@expo-google-fonts/inter');
        await Font.loadAsync({
          'Inter-Regular': inter.Inter_400Regular,
          'Inter-Medium': inter.Inter_500Medium,
          'Inter-SemiBold': inter.Inter_600SemiBold,
          'Inter-Bold': inter.Inter_700Bold,
        });
        setFontsLoaded(true);
      } catch (e) {
        console.warn('Load error:', e);
        setFontsLoaded(true);
      } finally {
        setAppIsReady(true);
      }
    }
    void prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady && fontsLoaded) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady, fontsLoaded]);

  if (!appIsReady || !fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
          <AuthProvider>
            <PremiumProvider>
            <ThemeProvider>
            <PreferencesProvider>
              <LockProvider>
                <FavoritesProvider>
                  <OfflineProvider>
                    <ThemedNavigationContainer navigationRef={navigationRef} linking={linking}>
                      <ThemedStatusBar />
                      <NotificationInitializer />
                      <View style={{ flex: 1 }}>
                        <ToastProvider>
                          <AlertProvider>
                            <RootNavigator />
                          </AlertProvider>
                        </ToastProvider>
                        <OfflineBanner />
                        <ApiProgressBar />
                      </View>
                    </ThemedNavigationContainer>
                  </OfflineProvider>
                </FavoritesProvider>
              </LockProvider>
            </PreferencesProvider>
          </ThemeProvider>
            </PremiumProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
