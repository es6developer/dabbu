import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../theme';
import { iosTransitionOptions } from './animations';
import { PartnerScreen } from '../screens/couple/PartnerScreen';

const Stack = createNativeStackNavigator();

export function PartnerNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <Stack.Screen name="PartnerHome" component={PartnerScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  );
}
