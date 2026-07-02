import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { spacing, borderRadius, shadows } from '../../theme/design';
import { useLensStore, LensMode } from '../../store/lensStore';
import { api, getAccessToken } from '../../services/api';

type Step = 'lens' | 'setup';

const LENS_OPTIONS: { id: LensMode; icon: any; title: string; desc: string; userType: string }[] = [
  {
    id: 'PERSONAL',
    icon: 'user',
    title: 'Personal',
    desc: 'Your own finances, savings & investments.',
    userType: 'single',
  },
  {
    id: 'PARTNERED',
    icon: 'heart',
    title: 'Couple',
    desc: 'Shared expenses, goals & budgets together.',
    userType: 'couple',
  },
  {
    id: 'FAMILY',
    icon: 'team',
    title: 'Family',
    desc: 'Family budgets, allowances & shared goals.',
    userType: 'family',
  },
  {
    id: 'FULL',
    icon: 'earth',
    title: 'All Access',
    desc: 'Personal, couple, family & group — everything.',
    userType: 'friends',
  },
];

const RISK_LEVELS = ['Low', 'Medium', 'High'];
const SPLIT_OPTIONS = ['50/50', 'Proportional', 'Custom'];
const RESPONSIBILITIES = ['Bills', 'Groceries', 'Rent', 'Savings', 'Kids', 'Other'];

function PillInput({
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  onSubmitEditing,
  returnKeyType,
  inputRef,
  colors,
}: {
  icon?: string;
  placeholder: string;
  value: string;
  onChangeText: (t: string) => void;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'numeric';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  onSubmitEditing?: () => void;
  returnKeyType?: 'next' | 'done';
  inputRef?: React.RefObject<TextInput>;
  colors: any;
}) {
  const [focused, setFocused] = useState(false);
  const labelAnim = useRef(new Animated.Value(value ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(labelAnim, {
      toValue: focused || value.length > 0 ? 1 : 0,
      useNativeDriver: false,
      friction: 10,
      tension: 80,
    }).start();
  }, [focused, value]);

  const labelTop = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [18, -8],
  });
  const labelFontSize = labelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 12],
  });

  return (
    <View style={{ position: 'relative', height: 58, marginBottom: 20 }}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.bg.secondary,
          borderRadius: borderRadius['3xl'],
          borderWidth: 1.5,
          borderColor: focused ? colors.accent.primary : colors.border.default,
          paddingHorizontal: spacing.xl,
          height: 58,
          ...shadows.sm,
        }}
      >
        {icon && (
          <AntDesign
            name={icon as any}
            size={18}
            color={focused ? colors.accent.primary : colors.text.tertiary}
          />
        )}
        <TextInput
          ref={inputRef}
          style={{
            flex: 1,
            fontSize: 16,
            fontWeight: '500',
            color: colors.text.primary,
            paddingTop: 8,
            marginLeft: icon ? 12 : 0,
          }}
          value={value}
          onChangeText={onChangeText}
          placeholder=""
          placeholderTextColor={colors.text.tertiary}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize || 'none'}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onSubmitEditing={onSubmitEditing}
          returnKeyType={returnKeyType}
        />
      </View>
      <Animated.View
        style={{
          position: 'absolute',
          left: icon ? 50 : 16,
          top: labelTop,
          paddingHorizontal: 4,
          backgroundColor: colors.bg.secondary,
          zIndex: 1,
        }}
        pointerEvents="none"
      >
        <Animated.Text
          style={{
            fontSize: labelFontSize,
            fontWeight: '600',
            color: focused ? colors.accent.primary : colors.text.tertiary,
          }}
        >
          {placeholder}
        </Animated.Text>
      </Animated.View>
    </View>
  );
}

function ChipSelector({
  options,
  selected,
  onSelect,
  colors,
}: {
  options: string[];
  selected: string;
  onSelect: (v: string) => void;
  colors: any;
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
      {options.map((o) => {
        const sel = selected === o;
        return (
          <TouchableOpacity
            key={o}
            onPress={() => onSelect(o)}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 10,
              borderRadius: 28,
              backgroundColor: sel ? colors.accent.primary : colors.bg.tertiary,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: sel ? '#FFF' : colors.text.secondary,
              }}
            >
              {o}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function MultiChipSelector({
  options,
  selected,
  onToggle,
  colors,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
  colors: any;
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
      {options.map((o) => {
        const sel = selected.includes(o);
        return (
          <TouchableOpacity
            key={o}
            onPress={() => onToggle(o)}
            style={{
              paddingHorizontal: 24,
              paddingVertical: 10,
              borderRadius: 28,
              backgroundColor: sel ? colors.accent.primary : colors.bg.tertiary,
            }}
          >
            <Text
              style={{
                fontSize: 16,
                fontWeight: '600',
                color: sel ? '#FFF' : colors.text.secondary,
              }}
            >
              {o}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function Stepper({
  value,
  min,
  onChange,
  colors,
}: {
  value: number;
  min: number;
  onChange: (v: number) => void;
  colors: any;
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: colors.bg.secondary,
        borderRadius: borderRadius['2xl'],
        borderWidth: 1.5,
        borderColor: colors.border.subtle,
        paddingVertical: 8,
        marginBottom: 20,
        ...shadows.sm,
      }}
    >
      <TouchableOpacity
        onPress={() => onChange(Math.max(min, value - 1))}
        style={{ paddingHorizontal: 28, paddingVertical: 10 }}
      >
        <AntDesign name="minus" size={20} color={colors.text.primary} />
      </TouchableOpacity>
      <Text
        style={{
          fontSize: 26,
          fontWeight: '700',
          color: colors.text.primary,
          marginHorizontal: 28,
          minWidth: 40,
          textAlign: 'center',
        }}
      >
        {value}
      </Text>
      <TouchableOpacity
        onPress={() => onChange(value + 1)}
        style={{ paddingHorizontal: 28, paddingVertical: 10 }}
      >
        <AntDesign name="plus" size={20} color={colors.text.primary} />
      </TouchableOpacity>
    </View>
  );
}

function SectionDivider({ colors }: { colors: any }) {
  return <View style={{ height: 1, backgroundColor: colors.border.subtle, marginVertical: 24 }} />;
}

function SectionTitle({
  title,
  subtitle,
  colors,
}: {
  title: string;
  subtitle?: string;
  colors: any;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text
        style={{ fontSize: 16, fontWeight: '700', color: colors.text.primary, letterSpacing: -0.2 }}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          style={{
            fontSize: 16,
            fontWeight: '500',
            color: colors.text.tertiary,
            marginTop: 2,
            lineHeight: 18,
          }}
        >
          {subtitle}
        </Text>
      ) : null}
    </View>
  );
}

export function OnboardingScreen({ route, onComplete }: any) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<Step>('lens');
  const [selectedLens, setSelectedLens] = useState<LensMode>('FULL');
  const [submitting, setSubmitting] = useState(false);

  const [incomeSource, setIncomeSource] = useState('');
  const [savingsGoal, setSavingsGoal] = useState('');
  const [riskLevel, setRiskLevel] = useState('Medium');
  const [partnerEmail, setPartnerEmail] = useState('');
  const [sharedGoal, setSharedGoal] = useState('');
  const [splitPref, setSplitPref] = useState('50/50');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [householdMembers, setHouseholdMembers] = useState(2);
  const [householdIncome, setHouseholdIncome] = useState('');
  const [responsibilities, setResponsibilities] = useState<string[]>([]);

  const lensFadeAnim = useRef(new Animated.Value(0)).current;
  const setupFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const refCode = route?.params?.referralCode;
    if (refCode) {
      AsyncStorage.setItem('referralCode', refCode);
    }
  }, [route?.params?.referralCode]);

  useEffect(() => {
    Animated.timing(lensFadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }).start();
  }, []);

  useEffect(() => {
    if (step === 'setup') {
      setupFadeAnim.setValue(0);
      Animated.timing(setupFadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }
  }, [step]);

  const toggleResponsibility = (r: string) => {
    setResponsibilities((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const selectedOption = LENS_OPTIONS.find((o) => o.id === selectedLens);

  async function finishOnboarding(lens: LensMode, ut: string) {
    setSubmitting(true);
    try {
      await AsyncStorage.setItem('userType', ut);
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      useLensStore.getState().setLens(lens);
      const token = getAccessToken();
      if (token) {
        const profileData: any = { userType: ut, activeLens: lens };
        if (maritalStatus) {
          profileData.maritalStatus = maritalStatus;
        }
        if (partnerEmail) {
          profileData.partnerContact = partnerEmail;
        }
        if (sharedGoal) {
          profileData.sharedGoal = sharedGoal;
        }
        if (splitPref) {
          profileData.splitPreference = splitPref;
        }
        if (savingsGoal) {
          profileData.monthlySavingsGoal = savingsGoal;
        }
        if (incomeSource) {
          profileData.incomeSource = incomeSource;
        }
        if (riskLevel) {
          profileData.riskLevel = riskLevel;
        }
        if (householdIncome) {
          profileData.householdIncome = householdIncome;
        }
        if (responsibilities.length) {
          profileData.responsibilities = responsibilities;
        }
        api.patch('/users/profile', profileData).catch(() => {});
      }
      onComplete?.();
    } catch {
      // error handled silently
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSkip() {
    await finishOnboarding('FULL', 'friends');
  }

  async function handleContinueToSetup() {
    if (!selectedLens) {
      return;
    }
    setStep('setup');
  }

  async function handleFinish() {
    if (!selectedLens || !selectedOption) {
      return;
    }
    await finishOnboarding(selectedLens, selectedOption.userType);
  }

  const lensHasPersonal = selectedLens === 'PERSONAL' || selectedLens === 'FULL';
  const lensHasPartnered = selectedLens === 'PARTNERED' || selectedLens === 'FULL';
  const lensHasFamily = selectedLens === 'FAMILY' || selectedLens === 'FULL';

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg.primary }}>
      {/* Header */}
      <View
        style={{
          paddingTop: insets.top + 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingHorizontal: spacing.xl,
          paddingBottom: 8,
        }}
      >
        {step === 'setup' ? (
          <TouchableOpacity
            onPress={() => setStep('lens')}
            style={{
              width: 40,
              height: 40,
              borderRadius: 28,
              backgroundColor: colors.bg.secondary,
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1.5,
              borderColor: colors.border.subtle,
            }}
          >
            <AntDesign name="arrowleft" size={20} color={colors.text.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        {/* Step indicators */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 8,
              backgroundColor: step === 'lens' ? colors.accent.primary : colors.border.subtle,
            }}
          />
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 8,
              backgroundColor: step === 'setup' ? colors.accent.primary : colors.border.subtle,
            }}
          />
        </View>
        <TouchableOpacity onPress={handleSkip} style={{ paddingVertical: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: colors.text.tertiary }}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Lens Selection Step */}
      {step === 'lens' && (
        <Animated.View style={{ flex: 1, opacity: lensFadeAnim }}>
          <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.xl }}>
            <Text
              style={{
                fontSize: 28,
                fontWeight: '800',
                color: colors.text.primary,
                textAlign: 'center',
                marginBottom: 8,
                letterSpacing: -0.5,
              }}
            >
              How will you use Dabbu?
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontWeight: '500',
                color: colors.text.tertiary,
                textAlign: 'center',
                marginBottom: 36,
                lineHeight: 24,
              }}
            >
              Choose your lens so we can tailor the experience for you
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -6 }}>
              {LENS_OPTIONS.map((opt) => {
                const isSelected = selectedLens === opt.id;
                return (
                  <TouchableOpacity
                    key={opt.id}
                    activeOpacity={0.8}
                    onPress={() => setSelectedLens(opt.id)}
                    style={{ width: '50%', paddingHorizontal: 6, marginBottom: 14 }}
                  >
                    <View
                      style={{
                        backgroundColor: isSelected
                          ? colors.accent.primary + '12'
                          : colors.bg.secondary,
                        borderRadius: borderRadius['2xl'],
                        padding: 22,
                        borderWidth: 2,
                        borderColor: isSelected ? colors.accent.primary : colors.border.subtle,
                        minHeight: 170,
                        alignItems: 'center',
                        justifyContent: 'center',
                        ...(isSelected ? shadows.md : {}),
                      }}
                    >
                      <View
                        style={{
                          width: 48,
                          height: 52,
                          borderRadius: 32,
                          backgroundColor: isSelected
                            ? colors.accent.primary + '20'
                            : colors.border.subtle + '60',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginBottom: 14,
                        }}
                      >
                        <AntDesign
                          name={opt.icon}
                          size={24}
                          color={isSelected ? colors.accent.primary : colors.text.tertiary}
                        />
                      </View>
                      <Text
                        style={{
                          fontSize: 16,
                          fontWeight: '700',
                          color: colors.text.primary,
                          textAlign: 'center',
                          marginBottom: 4,
                        }}
                      >
                        {opt.title}
                      </Text>
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: '500',
                          color: colors.text.tertiary,
                          textAlign: 'center',
                          lineHeight: 16,
                        }}
                      >
                        {opt.desc}
                      </Text>
                      {isSelected && (
                        <View
                          style={{
                            position: 'absolute',
                            top: 8,
                            right: 8,
                            width: 22,
                            height: 22,
                            borderRadius: 24,
                            backgroundColor: colors.accent.primary,
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <AntDesign name="check" size={14} color={colors.text.inverse} />
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <View style={{ paddingHorizontal: spacing.xl, paddingBottom: insets.bottom + 24 }}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={handleContinueToSetup}
              disabled={!selectedLens}
            >
              <LinearGradient
                colors={[colors.accent.primary, colors.accent.hover]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 20,
                  borderRadius: borderRadius['2xl'],
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: selectedLens ? 1 : 0.4,
                  ...shadows.md,
                }}
              >
                <Text style={{ color: colors.text.inverse, fontSize: 19, fontWeight: '700' }}>
                  Continue
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Setup Step */}
      {step === 'setup' && (
        <Animated.View style={{ flex: 1, opacity: setupFadeAnim }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: 36 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '800',
                  color: colors.text.primary,
                  marginBottom: 4,
                  letterSpacing: -0.5,
                }}
              >
                Quick Setup
              </Text>
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '500',
                  color: colors.text.tertiary,
                  marginBottom: 28,
                  lineHeight: 24,
                }}
              >
                {selectedOption?.title}
              </Text>

              {/* PERSONAL / FULL: Finance Basics */}
              {lensHasPersonal && (
                <>
                  <SectionTitle
                    title="Finance Basics"
                    subtitle="Set your preferences"
                    colors={colors}
                  />
                  <PillInput
                    icon="wallet"
                    placeholder="Income Source"
                    value={incomeSource}
                    onChangeText={setIncomeSource}
                    colors={colors}
                  />
                  <PillInput
                    icon="save"
                    placeholder="Monthly Savings Goal"
                    value={savingsGoal}
                    onChangeText={setSavingsGoal}
                    keyboardType="numeric"
                    colors={colors}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.text.secondary,
                      marginBottom: 8,
                    }}
                  >
                    Risk Level
                  </Text>
                  <ChipSelector
                    options={RISK_LEVELS}
                    selected={riskLevel}
                    onSelect={setRiskLevel}
                    colors={colors}
                  />
                </>
              )}

              {/* PARTNERED / FULL: Relationship */}
              {lensHasPartnered && (
                <>
                  {lensHasPersonal && <SectionDivider colors={colors} />}
                  <SectionTitle
                    title="Relationship"
                    subtitle="Set up partner sharing"
                    colors={colors}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.text.secondary,
                      marginBottom: 8,
                    }}
                  >
                    Status
                  </Text>
                  <ChipSelector
                    options={['Single', 'Married', 'Engaged', 'Dating', 'Living Together', 'Other']}
                    selected={maritalStatus}
                    onSelect={setMaritalStatus}
                    colors={colors}
                  />
                  <PillInput
                    icon="mail"
                    placeholder="Partner email or phone"
                    value={partnerEmail}
                    onChangeText={setPartnerEmail}
                    keyboardType="email-address"
                    colors={colors}
                  />
                  <PillInput
                    icon="flag"
                    placeholder="Shared goal (e.g. Save for a house)"
                    value={sharedGoal}
                    onChangeText={setSharedGoal}
                    colors={colors}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.text.secondary,
                      marginBottom: 8,
                    }}
                  >
                    Expense Split
                  </Text>
                  <ChipSelector
                    options={SPLIT_OPTIONS}
                    selected={splitPref}
                    onSelect={setSplitPref}
                    colors={colors}
                  />
                </>
              )}

              {/* FAMILY / FULL: Household */}
              {lensHasFamily && (
                <>
                  {(lensHasPersonal || lensHasPartnered) && <SectionDivider colors={colors} />}
                  <SectionTitle
                    title="Household"
                    subtitle="Set up family sharing"
                    colors={colors}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.text.secondary,
                      marginBottom: 8,
                    }}
                  >
                    Members
                  </Text>
                  <Stepper
                    value={householdMembers}
                    min={1}
                    onChange={setHouseholdMembers}
                    colors={colors}
                  />
                  <PillInput
                    icon="wallet"
                    placeholder="Monthly household income"
                    value={householdIncome}
                    onChangeText={setHouseholdIncome}
                    keyboardType="numeric"
                    colors={colors}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: '600',
                      color: colors.text.secondary,
                      marginBottom: 8,
                    }}
                  >
                    Responsibilities
                  </Text>
                  <MultiChipSelector
                    options={RESPONSIBILITIES}
                    selected={responsibilities}
                    onToggle={toggleResponsibility}
                    colors={colors}
                  />
                </>
              )}
            </ScrollView>
          </KeyboardAvoidingView>

          <View
            style={{
              paddingHorizontal: spacing.xl,
              paddingBottom: insets.bottom + 24,
              paddingTop: 8,
            }}
          >
            <TouchableOpacity activeOpacity={0.9} onPress={handleFinish} disabled={submitting}>
              <LinearGradient
                colors={[colors.accent.primary, colors.accent.hover]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{
                  paddingVertical: 20,
                  borderRadius: borderRadius['2xl'],
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: submitting ? 0.6 : 1,
                  ...shadows.md,
                }}
              >
                <Text style={{ color: colors.text.inverse, fontSize: 19, fontWeight: '700' }}>
                  {submitting ? 'Setting up...' : 'Get Started'}
                </Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
