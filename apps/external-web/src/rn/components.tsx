import React from 'react';
import {
  View as RNView,
  Text as RNText,
  ScrollView as RNScrollView,
  TouchableOpacity as RNTouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextProps,
  TouchableOpacityProps,
  ScrollViewProps,
} from 'react-native';
import { palette, typography, spacing, radii } from './theme';

export function SafeView({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <RNView style={[styles.safe, style]}>{children}</RNView>;
}

export function MobileContainer({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  return <RNView style={[styles.container, style]}>{children}</RNView>;
}

export function MobilePage({ children, ...props }: ScrollViewProps) {
  return (
    <RNScrollView
      {...props}
      style={[styles.page, props.style as ViewStyle]}
      contentContainerStyle={[styles.pageContent, props.contentContainerStyle]}
    >
      {children}
    </RNScrollView>
  );
}

export function Card({
  children,
  style,
  variant = 'default',
}: {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'elevated' | 'accent';
}) {
  const bg =
    variant === 'elevated'
      ? palette.elevated
      : variant === 'accent'
        ? palette.brandLight
        : palette.card;
  const borderColor = variant === 'accent' ? palette.brandLine : palette.border;
  return (
    <RNView style={[styles.card, { backgroundColor: bg, borderColor }, style]}>{children}</RNView>
  );
}

export function H1({ children, style }: TextProps) {
  return <RNText style={[typography.h1, style]}>{children}</RNText>;
}
export function H2({ children, style }: TextProps) {
  return <RNText style={[typography.h2, style]}>{children}</RNText>;
}
export function H3({ children, style }: TextProps) {
  return <RNText style={[typography.h3, style]}>{children}</RNText>;
}
export function Body({ children, style }: TextProps) {
  return <RNText style={[typography.body, style]}>{children}</RNText>;
}
export function Caption({ children, style }: TextProps) {
  return <RNText style={[typography.caption, style]}>{children}</RNText>;
}
export function Label({ children, style }: TextProps) {
  return <RNText style={[typography.label, style]}>{children}</RNText>;
}
export function Amount({ children, style }: TextProps) {
  return <RNText style={[typography.amount, style]}>{children}</RNText>;
}

export function AccentText({ children, style }: TextProps) {
  return <RNText style={[{ color: palette.brand, fontWeight: '700' }, style]}>{children}</RNText>;
}

export function PrimaryButton({ children, style, ...props }: TouchableOpacityProps) {
  return (
    <RNTouchableOpacity activeOpacity={0.85} style={[styles.primaryBtn, style]} {...props}>
      <RNText style={styles.primaryBtnText}>{children}</RNText>
    </RNTouchableOpacity>
  );
}

export function SecondaryButton({ children, style, ...props }: TouchableOpacityProps) {
  return (
    <RNTouchableOpacity activeOpacity={0.85} style={[styles.secondaryBtn, style]} {...props}>
      <RNText style={styles.secondaryBtnText}>{children}</RNText>
    </RNTouchableOpacity>
  );
}

export function GhostButton({ children, style, ...props }: TouchableOpacityProps) {
  return (
    <RNTouchableOpacity activeOpacity={0.7} style={[styles.ghostBtn, style]} {...props}>
      <RNText style={styles.ghostBtnText}>{children}</RNText>
    </RNTouchableOpacity>
  );
}

export function Chip({
  children,
  active = false,
  ...props
}: TouchableOpacityProps & { active?: boolean }) {
  return (
    <RNTouchableOpacity
      activeOpacity={0.7}
      style={[styles.chip, active && styles.chipActive]}
      {...props}
    >
      <RNText style={[styles.chipText, active && styles.chipTextActive]}>{children}</RNText>
    </RNTouchableOpacity>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <RNView style={[styles.divider, style]} />;
}

export function Spacer({ size = 'md' }: { size?: keyof typeof spacing }) {
  return <RNView style={{ height: spacing[size] }} />;
}

export function Row({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <RNView style={[styles.row, style]}>{children}</RNView>;
}

export function Avatar({
  initials,
  size = 40,
  online,
}: {
  initials: string;
  size?: number;
  online?: boolean;
}) {
  const colors = ['#8B5CF6', '#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#14B8A6'];
  const colorIndex = initials.charCodeAt(0) % colors.length;
  return (
    <RNView
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors[colorIndex],
        },
      ]}
    >
      <RNText style={[styles.avatarText, { fontSize: size * 0.4 }]}>
        {initials.slice(0, 2).toUpperCase()}
      </RNText>
      {online && <RNView style={[styles.onlineDot, { right: size * 0.05, bottom: size * 0.05 }]} />}
    </RNView>
  );
}

export {
  RNView as View,
  RNText as Text,
  RNScrollView as ScrollView,
  RNTouchableOpacity as TouchableOpacity,
  StyleSheet,
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  container: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  page: {
    flex: 1,
    backgroundColor: palette.bg,
  },
  pageContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  card: {
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  primaryBtn: {
    backgroundColor: palette.brand,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: 'transparent',
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: palette.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryBtnText: {
    color: palette.text,
    fontSize: 16,
    fontWeight: '600',
  },
  ghostBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtnText: {
    color: palette.brand,
    fontSize: 14,
    fontWeight: '600',
  },
  chip: {
    borderRadius: radii.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    backgroundColor: palette.surface,
    borderWidth: 1,
    borderColor: palette.border,
  },
  chipActive: {
    backgroundColor: palette.brandLight,
    borderColor: palette.brand,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: palette.textSecondary,
  },
  chipTextActive: {
    color: palette.brand,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: palette.border,
    marginVertical: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: palette.success,
    borderWidth: 2,
    borderColor: palette.bg,
    position: 'absolute',
  },
});
