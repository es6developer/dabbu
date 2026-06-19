import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../store/AuthContext';
import { useTheme } from '../theme';
import { CoupleOverviewScreen } from '../screens/couple/CoupleOverviewScreen';
import { CoupleSplashScreen } from '../screens/couple/CoupleSplashScreen';

export function CoupleSpaceRouter() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const navigation = useNavigation<any>();

  if (user?.isCouple) {
    return <CoupleOverviewScreen navigation={navigation} />;
  }

  return <CoupleSplashScreen />;
}
