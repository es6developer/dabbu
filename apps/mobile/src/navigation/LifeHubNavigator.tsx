import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AntDesign } from '@expo/vector-icons';
import { useTheme } from '../theme';
import { useNavigation } from '@react-navigation/native';
import { iosTransitionOptions } from './animations';
import { HousePlannerScreen } from '../screens/lifehub/HousePlannerScreen';
import { BabyPlannerScreen } from '../screens/lifehub/BabyPlannerScreen';
import { RetirementPlannerScreen } from '../screens/lifehub/RetirementPlannerScreen';
import { InvestmentPlannerScreen } from '../screens/lifehub/InvestmentPlannerScreen';
import { CarPlannerScreen } from '../screens/lifehub/CarPlannerScreen';
import { EducationPlannerScreen } from '../screens/lifehub/EducationPlannerScreen';
import { VacationPlannerScreen } from '../screens/lifehub/VacationPlannerScreen';
import { WeddingPlannerScreen } from '../screens/lifehub/WeddingPlannerScreen';
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen';
import { CoupleReportsScreen } from '../screens/couple/CoupleReportsScreen';
import FamilyReportsScreen from '../screens/family/FamilyReportsScreen';
import { PersonalReportScreen } from '../screens/reports/PersonalReportScreen';
import { PartneredReportScreen } from '../screens/reports/PartneredReportScreen';
import { FullReportScreen } from '../screens/reports/FullReportScreen';

const Stack = createNativeStackNavigator();

const PLANNERS = [
  {
    name: 'House',
    icon: 'home',
    color: '#6366F1',
    description: 'Buy your dream home',
    screen: 'HousePlanner',
  },
  {
    name: 'Baby',
    icon: 'smileo',
    color: '#EC4899',
    description: 'Plan for your little one',
    screen: 'BabyPlanner',
  },
  {
    name: 'Retirement',
    icon: 'clockcircleo',
    color: '#F59E0B',
    description: 'Secure your future',
    screen: 'RetirementPlanner',
  },
  {
    name: 'Investment',
    icon: 'barschart',
    color: '#10B981',
    description: 'Grow your wealth',
    screen: 'InvestmentPlanner',
  },
  {
    name: 'Car',
    icon: 'car',
    color: '#3B82F6',
    description: 'Get your dream car',
    screen: 'CarPlanner',
  },
  {
    name: 'Education',
    icon: 'book',
    color: '#8B5CF6',
    description: 'Fund learning',
    screen: 'EducationPlanner',
  },
  {
    name: 'Vacation',
    icon: 'enviromento',
    color: '#14B8A6',
    description: 'Plan your getaway',
    screen: 'VacationPlanner',
  },
  {
    name: 'Wedding',
    icon: 'heart',
    color: '#F43F5E',
    description: 'Plan your big day',
    screen: 'WeddingPlanner',
  },
];

function LifeHubScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const colors = theme.colors;

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.bg.primary }]}>
      <Text style={[styles.title, { color: colors.text.primary }]}>LifeHub</Text>
      <Text style={[styles.subtitle, { color: colors.text.secondary }]}>
        Plan your life milestones
      </Text>
      <View style={styles.grid}>
        {PLANNERS.map((planner) => (
          <TouchableOpacity
            key={planner.screen}
            style={[styles.card, { backgroundColor: colors.bg.secondary }]}
            activeOpacity={0.7}
            onPress={() => navigation.navigate(planner.screen)}
          >
            <View style={[styles.iconWrap, { backgroundColor: planner.color + '20' }]}>
              <AntDesign name={planner.icon as any} size={28} color={planner.color} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text.primary }]}>{planner.name}</Text>
            <Text style={[styles.cardDesc, { color: colors.text.tertiary }]}>
              {planner.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </ScrollView>
  );
}

export function LifeHubNavigator() {
  const theme = useTheme();
  return (
    <Stack.Navigator screenOptions={iosTransitionOptions(theme)}>
      <Stack.Screen name="LifeHubHome" component={LifeHubScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="HousePlanner"
        component={HousePlannerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="BabyPlanner"
        component={BabyPlannerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="RetirementPlanner"
        component={RetirementPlannerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="InvestmentPlanner"
        component={InvestmentPlannerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CarPlanner"
        component={CarPlannerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="EducationPlanner"
        component={EducationPlannerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VacationPlanner"
        component={VacationPlannerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="WeddingPlanner"
        component={WeddingPlannerScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen name="Analytics" component={AnalyticsScreen} options={{ headerShown: false }} />
      <Stack.Screen
        name="CoupleReports"
        component={CoupleReportsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FamilyReports"
        component={FamilyReportsScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PersonalReports"
        component={PersonalReportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="PartneredReports"
        component={PartneredReportScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="FullReports"
        component={FullReportScreen}
        options={{ headerShown: false }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60, paddingHorizontal: 16 },
  title: { fontSize: 32, fontWeight: '700', marginBottom: 4 },
  subtitle: { fontSize: 15, marginBottom: 24 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { width: '48%', borderRadius: 16, padding: 20, marginBottom: 16, alignItems: 'center' },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
  cardDesc: { fontSize: 12, textAlign: 'center', lineHeight: 16 },
});
