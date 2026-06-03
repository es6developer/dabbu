import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

const slides = [
  {
    icon: 'people' as const,
    title: 'Family Finance',
    desc: 'Track shared expenses, goals, and budgets with your family — all in one place.',
  },
  {
    icon: 'trending-down' as const,
    title: 'Shared Subscriptions',
    desc: 'Know exactly where your money goes each month. No more surprise charges.',
  },
  {
    icon: 'wallet' as const,
    title: 'Money Together',
    desc: 'Plan shared goals, split expenses, and build wealth together with the people who matter.',
  },
];

export function OnboardingScreen() {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const flatRef = useRef<FlatList>(null);

  async function markSeen() {
    await AsyncStorage.setItem('hasSeenOnboarding', 'true');
  }

  return (
    <LinearGradient
      colors={isDark ? [colors.bg.secondary, colors.bg.primary] : ['#f8f4f0', colors.bg.primary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={[styles.container, { paddingTop: insets.top + 8 }]}
    >
      <TouchableOpacity
        style={styles.skip}
        onPress={() => {
          markSeen();
          navigation.replace('Login');
        }}
      >
        <Text style={[styles.skipText, { color: colors.text.tertiary }]}>Skip</Text>
      </TouchableOpacity>

      <FlatList
        ref={flatRef}
        data={slides}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={styles.slide}>
            <View style={[styles.iconWrap, { backgroundColor: `${colors.accent.primary}15` }]}>
              <Ionicons name={item.icon} size={44} color={colors.accent.primary} />
            </View>
            <Text style={[styles.title, { color: colors.text.primary }]}>{item.title}</Text>
            <Text style={[styles.desc, { color: colors.text.secondary }]}>{item.desc}</Text>
          </View>
        )}
        keyExtractor={(_, i) => String(i)}
      />

      <View style={[styles.footer, { backgroundColor: colors.bg.primary }]}>
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                { backgroundColor: colors.text.tertiary },
                i === index && { width: 24, backgroundColor: colors.accent.primary },
              ]}
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.button, { backgroundColor: colors.accent.primary }]}
          onPress={async () => {
            if (index < slides.length - 1) {
              flatRef.current?.scrollToOffset({ offset: width * (index + 1), animated: true });
            } else {
              await markSeen();
              navigation.replace('Login');
            }
          }}
        >
          <Text style={styles.buttonText}>
            {index === slides.length - 1 ? 'Get Started' : 'Next'}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>

        {index < slides.length - 1 && (
          <TouchableOpacity
            style={styles.skipLater}
            onPress={async () => {
              await markSeen();
              navigation.replace('Login');
            }}
          >
            <Text style={[styles.skipLaterText, { color: colors.text.tertiary }]}>Get started</Text>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  skip: { alignSelf: 'flex-end', paddingHorizontal: 24, paddingVertical: 8 },
  skipText: { fontSize: 15 },
  slide: { width, alignItems: 'center', paddingHorizontal: 40, paddingTop: 80 },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  desc: { fontSize: 15, textAlign: 'center', lineHeight: 22, paddingHorizontal: 20 },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 48,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
  dots: { flexDirection: 'row', justifyContent: 'center', marginBottom: 28 },
  dot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
  button: {
    flexDirection: 'row',
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  skipLater: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  skipLaterText: { fontSize: 14 },
});
