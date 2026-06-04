import React, { useEffect, useCallback, useState } from 'react';
import { StatusBar, LogBox, Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import Toast from 'react-native-toast-message';
import { NavigationContainer, NavigationContainerRef, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { ThemeProvider, useTheme } from './src/theme/ThemeProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider } from './src/store/AuthContext';
import { LockProvider } from './src/store/LockContext';
import { loadFeatures } from './src/config/features';
import { addNotificationResponseListener } from './src/services/notifications';
import { useDeepLinks } from './src/hooks/useDeepLinks';

SplashScreen.preventAutoHideAsync();
LogBox.ignoreLogs(['Reanimated', 'ViewPropTypes']);

function ThemedStatusBar() {
  const { isDark, colors } = useTheme();
  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor={colors.bg.primary}
      translucent
    />
  );
}

function ThemedNavigationContainer({ children, navigationRef, linking }: { children: React.ReactNode; navigationRef: React.RefObject<NavigationContainerRef<any>>; linking?: any }) {
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
    const sub = addNotificationResponseListener((response) => {
      const data = response.notification?.request?.content?.data;
      if (data?.groupId) {
        setTimeout(() => {
          navigationRef.current?.navigate('Shared', {
            screen: 'SharedGroupDetail',
            params: { groupId: data.groupId },
          });
        }, 500);
      }
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    async function prepare(): Promise<void> {
      try {
        await Font.loadAsync({
          'Inter-Regular': require('./src/assets/fonts/Inter-Regular.ttf'),
          'Inter-Medium': require('./src/assets/fonts/Inter-Medium.ttf'),
          'Inter-SemiBold': require('./src/assets/fonts/Inter-SemiBold.ttf'),
          'Inter-Bold': require('./src/assets/fonts/Inter-Bold.ttf'),
        });
        loadFeatures();
      } catch (e) {
        console.warn('Font loading error:', e);
      } finally {
        setAppIsReady(true);
      }
    }
    void prepare();
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      await SplashScreen.hideAsync();
    }
  }, [appIsReady]);

  if (!appIsReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }} onLayout={onLayoutRootView}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <LockProvider>
              <ThemedNavigationContainer navigationRef={navigationRef} linking={linking}>
                <ThemedStatusBar />
                <RootNavigator />
              </ThemedNavigationContainer>
              <Toast />
            </LockProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
