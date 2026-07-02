import React, { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, ViewStyle, ScrollView } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../theme';
import { PageContainer } from '../ui/PageContainer';

type IconName = string;

interface FormScreenProps {
  title: string;
  subtitle?: string;
  icon?: IconName;
  children: ReactNode;
  accent?: [string, string];
  footer?: ReactNode;
  onClose?: () => void;
  contentStyle?: ViewStyle;
  hideClose?: boolean;
  hideHero?: boolean;
}

export function FormScreen({
  title,
  subtitle,
  icon,
  children,
  accent,
  footer,
  onClose,
  contentStyle,
  hideClose,
  hideHero,
}: FormScreenProps) {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  const grad1 = accent ? accent[0] : colors.accent.primary;

  return (
    <PageContainer noPadding>
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {!hideClose && (
          <View style={[styles.navbar, { borderBottomColor: colors.border.subtle, paddingHorizontal: 20 }]}>
            <TouchableOpacity
              onPress={onClose || (() => navigation.goBack())}
              style={[
                styles.navBackBtn,
                { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(10,10,15,0.05)' },
              ]}
              activeOpacity={0.75}
            >
              <AntDesign name="left" size={20} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={[styles.navTitle, { color: colors.text.primary }]} numberOfLines={1}>
              {title}
            </Text>
            <View style={{ width: 36 }} />
          </View>
        )}

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: footer ? 160 : Math.max(32, insets.bottom + 32) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {hideHero ? null : (
            <View
              style={[
                styles.hero,
                {
                  backgroundColor: `${grad1}10`,
                  borderColor: `${grad1}20`,
                },
              ]}
            >
              <View style={styles.heroTop}>
                {icon ? (
                  <View style={[styles.heroIcon, { backgroundColor: `${grad1}20` }]}>
                    <AntDesign name={icon as any} size={22} color={colors.text.primary} />
                  </View>
                ) : <View />}
                <View style={[styles.heroPill, { backgroundColor: `${grad1}15` }]}>
                  <Text style={[styles.heroPillText, { color: grad1 }]}>Dabbu</Text>
                </View>
              </View>
              <Text style={[styles.heroTitle, { color: colors.text.primary }]}>{title}</Text>
              {subtitle && (
                <Text style={[styles.heroSubtitle, { color: colors.text.secondary }]}>
                  {subtitle}
                </Text>
              )}
            </View>
          )}

          {children}
        </ScrollView>

        {footer && (
          <View
            style={[
              styles.footerSticky,
              {
                backgroundColor: colors.bg.primary,
                borderTopColor: colors.border.subtle,
                paddingBottom: Math.max(12, insets.bottom + 12),
              },
            ]}
          >
            {footer}
          </View>
        )}
      </View>
    </PageContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  hero: {
    borderRadius: 26,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1.5,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroIcon: {
    width: 40,
    height: 40,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 22,
    lineHeight: 26,
    fontWeight: '800',
    marginBottom: 2,
  },
  heroSubtitle: {
    fontSize: 15,
    lineHeight: 18,
    fontWeight: '500',
  },
  footerSticky: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 6,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
