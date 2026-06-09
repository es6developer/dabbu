import React, { ReactNode } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, spacing } from '../../theme';
import { PageContainer } from './PageContainer';
import { KeyboardAvoidingContainer } from './KeyboardAvoidingContainer';

type IconName = keyof typeof Ionicons.glyphMap;

interface PremiumFormScreenProps {
  title: string;
  subtitle: string;
  icon: IconName;
  children: ReactNode;
  accent?: [string, string];
  footer?: ReactNode;
  closeIcon?: IconName;
  onClose?: () => void;
  contentStyle?: ViewStyle;
  hideClose?: boolean;
}

export function PremiumFormScreen({
  title,
  subtitle,
  icon,
  children,
  accent,
  footer,
  closeIcon = 'close',
  onClose,
  contentStyle,
  hideClose,
}: PremiumFormScreenProps) {
  const navigation = useNavigation<any>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const gradient = accent || [colors.accent.primary, colors.accent.secondary];

  return (
    <PageContainer noPadding>
      <KeyboardAvoidingContainer>
        <View style={StyleSheet.absoluteFill} />
        <View
          style={[
            styles.content,
            { paddingBottom: Math.max(72, insets.bottom + 60) },
            contentStyle,
          ]}
        >
          {!hideClose && (
            <View style={[styles.navbar, { borderBottomColor: colors.border.subtle }]}>
              <TouchableOpacity
                onPress={onClose || (() => navigation.goBack())}
                style={[
                  styles.navBackBtn,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.07)' : 'rgba(10,10,15,0.05)' },
                ]}
                activeOpacity={0.75}
              >
                <Ionicons name="chevron-back" size={20} color={colors.text.primary} />
              </TouchableOpacity>
              <Text style={[styles.navTitle, { color: colors.text.primary }]} numberOfLines={1}>
                {title}
              </Text>
              <View style={{ width: 36 }} />
            </View>
          )}

          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={[styles.heroIcon, { backgroundColor: `${colors.accent.primary}30` }]}>
                <Ionicons name={icon} size={24} color={colors.text.primary} />
              </View>
              <View style={[styles.heroPill, { backgroundColor: `${colors.accent.primary}20` }]}>
                <Text style={[styles.heroPillText, { color: colors.accent.primary }]}>Dabbu</Text>
              </View>
            </View>
            <Text style={[styles.heroTitle, { color: colors.text.primary }]}>{title}</Text>
            <Text style={[styles.heroSubtitle, { color: colors.text.secondary }]}>{subtitle}</Text>
          </View>

          <View
            style={[
              styles.formPanel,
              {
                backgroundColor: colors.bg.card,
                borderColor: colors.border.default,
              },
            ]}
          >
            {children}
          </View>
          {footer}
        </View>
      </KeyboardAvoidingContainer>
    </PageContainer>
  );
}

interface PremiumInputProps extends TextInputProps {
  label: string;
  icon?: IconName;
  right?: ReactNode;
  multiline?: boolean;
  required?: boolean;
}

export function PremiumInput({
  label,
  icon,
  right,
  style,
  multiline,
  required,
  ...props
}: PremiumInputProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.label, { color: colors.text.tertiary }]}>
        {label}
        {required && <Text style={{ color: '#FF6B6B', marginLeft: 4 }}> *</Text>}
      </Text>
      <View
        style={[
          styles.inputShell,
          multiline && styles.inputShellMultiline,
          { backgroundColor: colors.bg.card, borderColor: '#ac99d7' },
        ]}
      >
        {icon ? (
          <Ionicons name={icon} size={18} color={colors.text.tertiary} style={styles.inputIcon} />
        ) : null}
        <TextInput
          style={[
            styles.input,
            multiline && styles.inputMultiline,
            { color: colors.text.primary },
            style,
          ]}
          placeholderTextColor={colors.text.tertiary}
          multiline={multiline}
          textAlignVertical={multiline ? 'top' : undefined}
          {...props}
        />
        {right}
      </View>
    </View>
  );
}

interface PremiumAmountInputProps extends TextInputProps {
  label: string;
  symbol?: string;
  required?: boolean;
}

export function PremiumAmountInput({
  label,
  symbol = '₹',
  style,
  required,
  ...props
}: PremiumAmountInputProps) {
  const { colors } = useTheme();

  return (
    <View style={styles.fieldBlock}>
      <Text style={[styles.label, { color: colors.text.tertiary }]}>
        {label}
        {required && <Text style={{ color: '#FF6B6B' }}> *</Text>}
      </Text>
      <View
        style={[
          styles.amountShell,
          { backgroundColor: colors.bg.card, borderColor: '#ac99d7' },
        ]}
      >
        <Text style={[styles.amountSymbol, { color: colors.text.primary }]}>{symbol}</Text>
        <TextInput
          style={[styles.amountInput, { color: colors.text.primary }, style]}
          placeholderTextColor={colors.text.tertiary}
          keyboardType="decimal-pad"
          {...props}
        />
      </View>
    </View>
  );
}

interface PremiumChipProps {
  label: string;
  selected?: boolean;
  icon?: IconName;
  onPress: () => void;
}

export function PremiumChip({ label, selected, icon, onPress }: PremiumChipProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.75}
      style={[
        styles.chip,
        { backgroundColor: colors.bg.card, borderColor: '#ac99d7' },
        selected && {
          backgroundColor: `${colors.accent.primary}1F`,
          borderColor: colors.accent.primary,
        },
      ]}
    >
      {icon ? (
        <Ionicons
          name={icon}
          size={14}
          color={selected ? colors.accent.primary : colors.text.tertiary}
        />
      ) : null}
      <Text
        style={[
          styles.chipText,
          { color: colors.text.secondary },
          selected && { color: colors.accent.primary, fontWeight: '700' },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export function PremiumError({ message }: { message?: string }) {
  const { colors } = useTheme();
  if (!message) {
    return null;
  }

  return (
    <View style={[styles.errorBox, { backgroundColor: colors.status.errorLight }]}>
      <Ionicons name="alert-circle" size={16} color={colors.status.error} />
      <Text style={[styles.errorText, { color: colors.status.error }]}>{message}</Text>
    </View>
  );
}

interface PremiumActionButtonProps {
  title: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
  style?: ViewStyle;
}

export function PremiumActionButton({
  title,
  onPress,
  loading,
  disabled,
  icon = 'arrow-forward',
  style,
}: PremiumActionButtonProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.78}
      style={[
        styles.actionButton,
        { backgroundColor: colors.accent.primary },
        (disabled || loading) && { opacity: 0.65 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <>
          <Text style={styles.actionText}>{title}</Text>
          <Ionicons name={icon} size={18} color="#FFFFFF" />
        </>
      )}
    </TouchableOpacity>
  );
}

export const premiumFormStyles = StyleSheet.create({
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  splitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
});

const styles = StyleSheet.create({
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: 72,
  },
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  navBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitle: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
  },
  hero: {
    borderRadius: 24,
    padding: 22,
    marginBottom: 16,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 28,
  },
  heroIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPill: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  heroPillText: {
    fontSize: 11,
    fontWeight: '800',
  },
  heroTitle: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '800',
    marginBottom: 7,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
  },
  formPanel: {
    borderRadius: 22,
    borderWidth: 1,
    padding: 16,
  },
  fieldBlock: {
    marginBottom: 15,
  },
  label: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  inputShell: {
    minHeight: 54,
    borderRadius: 15,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputShellMultiline: {
    minHeight: 104,
    alignItems: 'flex-start',
    paddingTop: 13,
  },
  inputIcon: {
    marginRight: 10,
    marginTop: 1,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 13,
  },
  inputMultiline: {
    minHeight: 82,
    paddingTop: 0,
  },
  amountShell: {
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  amountSymbol: {
    fontSize: 30,
    fontWeight: '800',
    marginRight: 10,
  },
  amountInput: {
    flex: 1,
    fontSize: 30,
    fontWeight: '800',
    paddingVertical: 16,
  },
  chip: {
    minHeight: 38,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 14,
    marginBottom: 15,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    flex: 1,
    fontWeight: '600',
  },
  actionButton: {
    minHeight: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  actionText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
  },
});
