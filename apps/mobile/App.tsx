import React, { useEffect, useCallback, useState } from 'react';
import { StatusBar, LogBox, Appearance } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import Toast from 'react-native-toast-message';
import { NavigationContainer } from '@react-navigation/native';
import { ThemeProvider } from './src/theme/ThemeProvider';
import { RootNavigator } from './src/navigation/RootNavigator';
import { AuthProvider } from './src/store/AuthContext';
import { LockProvider } from './src/store/LockContext';
import { loadFeatures } from './src/config/features';

SplashScreen.preventAutoHideAsync();
LogBox.ignoreLogs(['Reanimated', 'ViewPropTypes']);

export default function App(): React.ReactElement | null {
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    async function prepare(): Promise<void> {
      try {
        await Font.loadAsync({
          'Inter-Regular': require('./src/assets/fonts/Inter-Regular.ttf'),
          'Inter-Medium': require('./src/assets/fonts/Inter-Medium.ttf'),
          'Inter-SemiBold': require('./src/assets/fonts/Inter-SemiBold.ttf'),
          'Inter-Bold': require('./src/assets/fonts/Inter-Bold.ttf'),
        });
        await loadFeatures();
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
              <NavigationContainer>
                <StatusBar
                  barStyle="light-content"
                  backgroundColor="transparent"
                  translucent
                />
                <RootNavigator />
              </NavigationContainer>
              <Toast />
            </LockProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
