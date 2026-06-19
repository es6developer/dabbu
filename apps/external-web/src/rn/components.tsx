import React, { useState, useRef, useCallback, useMemo } from 'react';
import {
  View as RNView,
  Text as RNText,
  ScrollView as RNScrollView,
  TouchableOpacity as RNTouchableOpacity,
  TextInput as RNTextInput,
  Animated,
  StyleSheet,
  ViewStyle,
  TextStyle,
  TextProps,
  TextInputProps,
  TouchableOpacityProps,
  ScrollViewProps,
  findNodeHandle,
  UIManager,
} from 'react-native';
import { typography, spacing, radii } from './theme';

const SPRING_CONFIG = { tension: 180, friction: 12, useNativeDriver: true };
const PRESS_SCALE = 0.96;

function usePressAnimation() {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = useCallback(() => {
    Animated.spring(scale, { toValue: PRESS_SCALE, ...SPRING_CONFIG }).start();
  }, [scale]);
  const onPressOut = useCallback(() => {
    Animated.spring(scale, { toValue: 1, ...SPRING_CONFIG }).start();
  }, [scale]);
  return { scale, onPressIn, onPressOut };
}

export function SafeView({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return (
    <RNView style={[{ backgroundColor: 'var(--dabbu-bg)' as any }, styles.safe, style]}>
      {children}
    </RNView>
  );
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
      ? ('var(--dabbu-surface)' as any)
      : variant === 'accent'
        ? ('var(--dabbu-accent-muted, rgba(139, 92, 246, 0.10))' as any)
        : ('var(--dabbu-surface)' as any);
  const borderColor = 'var(--dabbu-border)' as any;
  return (
    <Animated.View
      style={[{ backgroundColor: bg, borderColor }, styles.card, style]}
    >
      {children}
    </Animated.View>
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
  return (
    <RNText style={[{ color: 'var(--dabbu-accent)' as any, fontWeight: '700' }, style]}>
      {children}
    </RNText>
  );
}

export function PrimaryButton({ children, style, ...props }: TouchableOpacityProps) {
  const { scale, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <RNTouchableOpacity activeOpacity={0.9} onPressIn={onPressIn} onPressOut={onPressOut} style={[styles.primaryBtn, style]} {...props}>
        <RNText style={styles.primaryBtnText}>{children}</RNText>
      </RNTouchableOpacity>
    </Animated.View>
  );
}

export function SecondaryButton({ children, style, ...props }: TouchableOpacityProps) {
  const { scale, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <RNTouchableOpacity activeOpacity={0.9} onPressIn={onPressIn} onPressOut={onPressOut} style={[styles.secondaryBtn, style]} {...props}>
        <RNText style={styles.secondaryBtnText}>{children}</RNText>
      </RNTouchableOpacity>
    </Animated.View>
  );
}

export function GhostButton({ children, style, ...props }: TouchableOpacityProps) {
  const { scale, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <RNTouchableOpacity activeOpacity={0.8} onPressIn={onPressIn} onPressOut={onPressOut} style={[styles.ghostBtn, style]} {...props}>
        <RNText style={styles.ghostBtnText}>{children}</RNText>
      </RNTouchableOpacity>
    </Animated.View>
  );
}

export function Chip({
  children,
  active = false,
  ...props
}: TouchableOpacityProps & { active?: boolean }) {
  const { scale, onPressIn, onPressOut } = usePressAnimation();
  return (
    <Animated.View style={[{ transform: [{ scale }] }]}>
      <RNTouchableOpacity
        activeOpacity={0.85}
        onPressIn={onPressIn}
        onPressOut={onPressOut}
        style={[styles.chip, active && styles.chipActive]}
        {...props}
      >
        <RNText style={[styles.chipText, active && styles.chipTextActive]}>{children}</RNText>
      </RNTouchableOpacity>
    </Animated.View>
  );
}

export function Divider({ style }: { style?: ViewStyle }) {
  return <RNView style={[styles.divider, style]} />;
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  style,
}: {
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  style?: ViewStyle;
}) {
  const [open, setOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const containerRef = useRef<any>(null);
  const selected = options.find((o) => o.value === value);

  const handlePress = () => {
    if (open) {
      setOpen(false);
      return;
    }
    const node = findNodeHandle(containerRef.current);
    if (node) {
      UIManager.measureInWindow(node, (x: number, y: number, w: number, h: number) => {
        setDropdownPos({ top: y + h + 6, left: x, width: w });
      });
    }
    setOpen(true);
  };

  return (
    <>
      <RNView
        ref={containerRef}
        collapsable={false}
        style={[{ position: 'relative', zIndex: open ? 9999 : 1 }, style as any]}
      >
        <RNTouchableOpacity
          activeOpacity={0.7}
          onPress={handlePress}
          style={[styles.selectTrigger as any, open && styles.selectTriggerActive]}
        >
          <RNText style={[styles.selectText, !selected && styles.selectPlaceholder]}>
            {selected ? selected.label : placeholder || 'Select...'}
          </RNText>
          <RNText style={styles.selectArrow}>{open ? '▲' : '▼'}</RNText>
        </RNTouchableOpacity>
        {open && (
          <RNView style={[styles.selectDropdown, { position: 'absolute', zIndex: 99999 } as any]}>
            {options.map((opt) => (
              <RNTouchableOpacity
                key={opt.value}
                activeOpacity={0.7}
                onPress={() => {
                  onValueChange(opt.value);
                  setOpen(false);
                }}
                style={[styles.selectOption, opt.value === value && styles.selectOptionActive]}
              >
                <RNText
                  style={[
                    styles.selectOptionText,
                    opt.value === value && styles.selectOptionTextActive,
                  ]}
                >
                  {opt.label}
                </RNText>
                {opt.value === value && <RNText style={styles.selectCheck}>✓</RNText>}
              </RNTouchableOpacity>
            ))}
          </RNView>
        )}
      </RNView>
      {open && (
        <RNTouchableOpacity
          style={[styles.selectOverlay, { zIndex: 9998 } as any]}
          onPress={() => setOpen(false)}
          activeOpacity={1}
        />
      )}
    </>
  );
}

export function AmountInput({
  value,
  onChangeText,
  placeholder = '0',
  autoFocus,
  style,
}: {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  style?: ViewStyle;
}) {
  return (
    <RNView style={[styles.amountInputWrap, style as any]}>
      <RNText style={styles.amountCurrency}>₹</RNText>
      <RNTextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="var(--dabbu-text-muted, #64748B)"
        keyboardType="numeric"
        autoFocus={autoFocus}
        style={styles.amountInputField}
      />
    </RNView>
  );
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
  RNTextInput as TextInput,
  StyleSheet,
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: 'var(--dabbu-bg)' as any,
  },
  container: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  page: {
    flex: 1,
    backgroundColor: 'var(--dabbu-bg)' as any,
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
    backgroundColor: 'var(--dabbu-accent)' as any,
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
    borderColor: 'var(--dabbu-border)' as any,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  secondaryBtnText: {
    color: 'var(--dabbu-text)' as any,
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
    color: 'var(--dabbu-accent)' as any,
    fontSize: 14,
    fontWeight: '600',
  },
  chip: {
    borderRadius: radii.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'var(--dabbu-surface)' as any,
    borderWidth: 1,
    borderColor: 'var(--dabbu-border)' as any,
  },
  chipActive: {
    backgroundColor: 'var(--dabbu-accent-muted, rgba(139, 92, 246, 0.10))' as any,
    borderColor: 'var(--dabbu-accent)' as any,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'var(--dabbu-text-secondary)' as any,
  },
  chipTextActive: {
    color: 'var(--dabbu-accent)' as any,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'var(--dabbu-border)' as any,
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
    backgroundColor: 'var(--dabbu-green, #10B981)' as any,
    borderWidth: 2,
    borderColor: 'var(--dabbu-bg)' as any,
    position: 'absolute',
  },
  selectTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'var(--dabbu-border)' as any,
    backgroundColor: 'var(--dabbu-surface)' as any,
    paddingHorizontal: spacing.lg,
  },
  selectTriggerActive: {
    borderColor: 'var(--dabbu-accent)' as any,
    borderWidth: 2,
  } as any,
  selectText: {
    fontSize: 15,
    color: 'var(--dabbu-text)' as any,
    fontWeight: '500',
  },
  selectPlaceholder: {
    color: 'var(--dabbu-text-muted)' as any,
  },
  selectArrow: {
    fontSize: 10,
    color: 'var(--dabbu-text-muted)' as any,
    marginLeft: spacing.sm,
  },
  selectDropdown: {
    position: 'absolute',
    top: 54,
    left: 0,
    right: 0,
    backgroundColor: 'var(--dabbu-surface)' as any,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: 'var(--dabbu-border)' as any,
    zIndex: 200,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    maxHeight: 240,
  },
  selectOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'var(--dabbu-border)' as any,
  },
  selectOptionActive: {
    backgroundColor: 'rgba(139, 92, 246, 0.08)' as any,
  },
  selectOptionText: {
    fontSize: 14,
    color: 'var(--dabbu-text)' as any,
  },
  selectOptionTextActive: {
    color: 'var(--dabbu-accent)' as any,
    fontWeight: '600',
  },
  selectCheck: {
    fontSize: 14,
    color: 'var(--dabbu-accent)' as any,
    fontWeight: '700',
  },
  selectOverlay: {
    position: 'fixed' as any,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 99,
    backgroundColor: 'transparent',
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amountCurrency: {
    fontSize: 24,
    color: 'var(--dabbu-text-muted)' as any,
    marginRight: 4,
  },
  amountInputField: {
    fontSize: 48,
    fontWeight: '800',
    color: 'var(--dabbu-text)' as any,
    textAlign: 'center',
    minWidth: 160,
  } as any,
});
