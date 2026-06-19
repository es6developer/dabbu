import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { CoupleDashboardScreen } from '../screens/dashboard/CoupleDashboardScreen';

export function CoupleSpaceRouter() {
  const navigation = useNavigation<any>();
  return <CoupleDashboardScreen navigation={navigation} />;
}
