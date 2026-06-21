import './src/global.css';
import React, { useEffect, useCallback, useState } from 'react';
import { StatusBar, LogBox, Appearance, View, UIManager, Platform } from 'react-native';
import * as Font from 'expo-font';
import * as NavigationBar from 'expo-navigation-bar';
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
import { LensProvider } from './src/providers/LensProvider';
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

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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

function AppInner(): React.ReactElement | null {
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
        const interFonts = {
          'Inter-Regular': require('@expo-google-fonts/inter/400Regular/Inter_400Regular.ttf'),
          'Inter-Medium': require('@expo-google-fonts/inter/500Medium/Inter_500Medium.ttf'),
          'Inter-SemiBold': require('@expo-google-fonts/inter/600SemiBold/Inter_600SemiBold.ttf'),
          'Inter-Bold': require('@expo-google-fonts/inter/700Bold/Inter_700Bold.ttf'),
        };
        await Font.loadAsync(interFonts);
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
          <ToastProvider>
          <AuthProvider>
            <PremiumProvider>
            <ThemeProvider>
            <LensProvider>
            <PreferencesProvider>
              <LockProvider>
                <FavoritesProvider>
                  <OfflineProvider>
                    <ThemedNavigationContainer navigationRef={navigationRef} linking={linking}>
                      <ThemedStatusBar />
                      <NotificationInitializer />
                      <View style={{ flex: 1 }}>
                          <AlertProvider>
                            <RootNavigator />
                          </AlertProvider>
                        <OfflineBanner />
                        <ApiProgressBar />
                      </View>
                    </ThemedNavigationContainer>
                    </OfflineProvider>
                  </FavoritesProvider>
                </LockProvider>
              </PreferencesProvider>
            </LensProvider>
            </ThemeProvider>
            </PremiumProvider>
          </AuthProvider>
        </ToastProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

export default AppInner;
