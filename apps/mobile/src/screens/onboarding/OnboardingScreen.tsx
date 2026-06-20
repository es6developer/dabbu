import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AntDesign } from '@expo/vector-icons';
import { PADDING, borderRadius, shadows } from '../../theme/design';
import { useAuth } from '../../store/AuthContext';
import { useLensStore, LensMode } from '../../store/lensStore';
import { api, getAccessToken } from '../../services/api';

type Step = 'lens' | 'setup';

const LENS_OPTIONS: { id: LensMode; icon: any; title: string; desc: string; userType: string }[] = [
  {
    id: 'PERSONAL',
    icon: 'user',
    title: 'Personal Finance',
    desc: 'Manage your personal finances, savings, and investments.',
    userType: 'single',
  },
  {
    id: 'PARTNERED',
    icon: 'heart',
    title: 'Couple Finance',
    desc: 'Track finances together, split expenses, and share goals.',
    userType: 'couple',
  },
  {
    id: 'FAMILY',
    icon: 'team',
    title: 'Family Finance',
    desc: 'Manage family budgets, allowances, and shared goals.',
    userType: 'family',
  },
  {
    id: 'FULL',
    icon: 'earth',
    title: 'All (Recommended)',
    desc: 'Access all features — personal, couple, family, and group.',
    userType: 'friends',
  },
];

const RISK_LEVELS = ['Low', 'Medium', 'High'];
const SPLIT_OPTIONS = ['50/50', 'Proportional', 'Custom'];
const RESPONSIBILITIES = ['Bills', 'Groceries', 'Rent', 'Savings', 'Kids', 'Other'];

export function OnboardingScreen({ route }: any) {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, guestLogin } = useAuth();

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
  const [partnerPhone, setPartnerPhone] = useState('');
  const [householdMembers, setHouseholdMembers] = useState(2);
  const [householdIncome, setHouseholdIncome] = useState('');
  const [responsibilities, setResponsibilities] = useState<string[]>([]);

  const toggleResponsibility = (r: string) => {
    setResponsibilities((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const selectedOption = LENS_OPTIONS.find((o) => o.id === selectedLens);

  useEffect(() => {
    const refCode = route?.params?.referralCode;
    if (refCode) {
      AsyncStorage.setItem('referralCode', refCode);
    }
  }, [route?.params?.referralCode]);

  async function finishOnboarding(lens: LensMode, ut: string) {
    setSubmitting(true);
    try {
      await AsyncStorage.setItem('userType', ut);
      await AsyncStorage.setItem('hasSeenOnboarding', 'true');
      useLensStore.getState().setLens(lens);
      if (!isAuthenticated) {
        await guestLogin();
      }
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
    } catch {
      // navigation handled by RootNavigator
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

  const inputStyle = {
    backgroundColor: colors.bg.card,
    borderRadius: borderRadius.xl,
    borderWidth: 1,
    borderColor: colors.border.subtle,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontWeight: '500' as const,
    color: colors.text.primary,
  };

  const labelStyle = {
    fontSize: 14,
    fontWeight: '600' as const,
    color: colors.text.secondary,
    marginBottom: 8,
  };

  function renderHeader(showBack: boolean) {
    return (
      <View
        style={{
          paddingTop: insets.top + 12,
          flexDirection: 'row',
          justifyContent: 'space-between',
          paddingHorizontal: PADDING,
        }}
      >
        {showBack ? (
          <TouchableOpacity onPress={() => setStep('lens')} style={{ paddingVertical: 8 }}>
            <AntDesign name="arrowleft" size={22} color={colors.text.primary} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
        <TouchableOpacity onPress={handleSkip} style={{ paddingVertical: 8 }}>
          <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text.tertiary }}>Skip</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'setup') {
    return (
      <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
        {renderHeader(true)}
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={{ paddingHorizontal: PADDING, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text
              style={{
                fontSize: 28,
                fontWeight: '800',
                color: colors.text.primary,
                marginBottom: 8,
                letterSpacing: -0.5,
              }}
            >
              Quick Setup
            </Text>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '500',
                color: colors.text.tertiary,
                marginBottom: 28,
                lineHeight: 22,
              }}
            >
              {selectedOption?.title}
            </Text>

            {/* PERSONAL / FULL fields — progressive setup */}
            {(selectedLens === 'PERSONAL' || selectedLens === 'FULL') && (
              <>
                <Text style={labelStyle}>Income Source</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. Salary, Freelance"
                  placeholderTextColor={colors.text.tertiary}
                  value={incomeSource}
                  onChangeText={setIncomeSource}
                />
                <Text style={[labelStyle, { marginTop: 16 }]}>Monthly Savings Goal</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. 50000"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                  value={savingsGoal}
                  onChangeText={setSavingsGoal}
                />
                <Text style={[labelStyle, { marginTop: 16 }]}>Risk Level</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {RISK_LEVELS.map((r) => (
                    <TouchableOpacity
                      key={r}
                      onPress={() => setRiskLevel(r)}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: borderRadius.lg,
                        backgroundColor: riskLevel === r ? colors.accent.primary : colors.bg.card,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: riskLevel === r ? colors.accent.primary : colors.border.subtle,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: riskLevel === r ? '#FFF' : colors.text.primary,
                        }}
                      >
                        {r}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {selectedLens === 'FULL' && (
                  <>
                    <View
                      style={{
                        height: 1,
                        backgroundColor: colors.border.subtle,
                        marginVertical: 24,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: colors.text.primary,
                        marginBottom: 4,
                      }}
                    >
                      Relationship Details
                    </Text>
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color: colors.text.tertiary,
                        marginBottom: 16,
                        lineHeight: 18,
                      }}
                    >
                      Optional — set up partner and family features now
                    </Text>
                    <Text style={[labelStyle, { marginTop: 8 }]}>Marital Status</Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                      {['Single', 'Married', 'Engaged', 'Dating', 'Living Together', 'Other'].map(
                        (s) => {
                          const sel = maritalStatus === s;
                          return (
                            <TouchableOpacity
                              key={s}
                              onPress={() => setMaritalStatus(s)}
                              style={{
                                paddingHorizontal: 10,
                                paddingVertical: 10,
                                borderRadius: borderRadius.lg,
                                backgroundColor: sel ? colors.accent.primary : colors.bg.card,
                                borderWidth: 1,
                                borderColor: sel ? colors.accent.primary : colors.border.subtle,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: '600',
                                  color: sel ? '#FFF' : colors.text.primary,
                                  textAlign: 'center',
                                }}
                              >
                                {s}
                              </Text>
                            </TouchableOpacity>
                          );
                        },
                      )}
                    </View>

                    <Text style={[labelStyle, { marginTop: 16 }]}>Partner Email / Phone</Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="partner@email.com or phone"
                      placeholderTextColor={colors.text.tertiary}
                      value={partnerEmail}
                      onChangeText={setPartnerEmail}
                    />
                    <Text style={[labelStyle, { marginTop: 16 }]}>Shared Goal</Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="e.g. Save for a house"
                      placeholderTextColor={colors.text.tertiary}
                      value={sharedGoal}
                      onChangeText={setSharedGoal}
                    />
                    <Text style={[labelStyle, { marginTop: 16 }]}>Expense Split</Text>
                    <View style={{ flexDirection: 'row', gap: 10 }}>
                      {SPLIT_OPTIONS.map((s) => (
                        <TouchableOpacity
                          key={s}
                          onPress={() => setSplitPref(s)}
                          style={{
                            flex: 1,
                            paddingVertical: 12,
                            borderRadius: borderRadius.lg,
                            backgroundColor:
                              splitPref === s ? colors.accent.primary : colors.bg.card,
                            alignItems: 'center',
                            borderWidth: 1,
                            borderColor:
                              splitPref === s ? colors.accent.primary : colors.border.subtle,
                          }}
                        >
                          <Text
                            style={{
                              fontSize: 13,
                              fontWeight: '600',
                              color: splitPref === s ? '#FFF' : colors.text.primary,
                            }}
                          >
                            {s}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <View
                      style={{
                        height: 1,
                        backgroundColor: colors.border.subtle,
                        marginVertical: 24,
                      }}
                    />
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: '700',
                        color: colors.text.primary,
                        marginBottom: 12,
                      }}
                    >
                      Family Setup
                    </Text>
                    <Text style={labelStyle}>Household Members</Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: colors.bg.card,
                        borderRadius: borderRadius.xl,
                        borderWidth: 1,
                        borderColor: colors.border.subtle,
                        paddingVertical: 12,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => setHouseholdMembers(Math.max(1, householdMembers - 1))}
                        style={{ paddingHorizontal: 24, paddingVertical: 8 }}
                      >
                        <AntDesign name="minus" size={20} color={colors.text.primary} />
                      </TouchableOpacity>
                      <Text
                        style={{
                          fontSize: 24,
                          fontWeight: '700',
                          color: colors.text.primary,
                          marginHorizontal: 20,
                          minWidth: 40,
                          textAlign: 'center',
                        }}
                      >
                        {householdMembers}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setHouseholdMembers(householdMembers + 1)}
                        style={{ paddingHorizontal: 24, paddingVertical: 8 }}
                      >
                        <AntDesign name="plus" size={20} color={colors.text.primary} />
                      </TouchableOpacity>
                    </View>
                    <Text style={[labelStyle, { marginTop: 20 }]}>Household Income</Text>
                    <TextInput
                      style={inputStyle}
                      placeholder="e.g. 150000"
                      placeholderTextColor={colors.text.tertiary}
                      keyboardType="numeric"
                      value={householdIncome}
                      onChangeText={setHouseholdIncome}
                    />
                  </>
                )}
              </>
            )}

            {/* PARTNERED fields */}
            {selectedLens === 'PARTNERED' && (
              <>
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: colors.text.primary,
                    marginBottom: 4,
                  }}
                >
                  Relationship Details
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '500',
                    color: colors.text.tertiary,
                    marginBottom: 16,
                    lineHeight: 18,
                  }}
                >
                  Tell us about your relationship so we can tailor the couple experience
                </Text>
                <Text style={[labelStyle, { marginTop: 8 }]}>Marital Status</Text>
                <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
                  {['Married', 'Engaged', 'Dating', 'Living Together', 'Other'].map((s) => {
                    const sel = maritalStatus === s;
                    return (
                      <TouchableOpacity
                        key={s}
                        onPress={() => setMaritalStatus(s)}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 10,
                          borderRadius: borderRadius.lg,
                          flex: 1,
                          backgroundColor: sel ? colors.accent.primary : colors.bg.card,
                          borderWidth: 1,
                          borderColor: sel ? colors.accent.primary : colors.border.subtle,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '600',
                            color: sel ? '#FFF' : colors.text.primary,
                            textAlign: 'center',
                          }}
                        >
                          {s}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <Text style={[labelStyle, { marginTop: 16 }]}>Partner Email / Phone</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="partner@email.com or phone number"
                  placeholderTextColor={colors.text.tertiary}
                  value={partnerEmail}
                  onChangeText={setPartnerEmail}
                />
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '500',
                    color: colors.text.tertiary,
                    marginTop: 4,
                    lineHeight: 16,
                  }}
                >
                  We'll send them an invite to connect on Dabbu
                </Text>
                <Text style={[labelStyle, { marginTop: 16 }]}>Shared Goal</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. Save for a house"
                  placeholderTextColor={colors.text.tertiary}
                  value={sharedGoal}
                  onChangeText={setSharedGoal}
                />
                <Text style={[labelStyle, { marginTop: 16 }]}>Expense Split Preference</Text>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {SPLIT_OPTIONS.map((s) => (
                    <TouchableOpacity
                      key={s}
                      onPress={() => setSplitPref(s)}
                      style={{
                        flex: 1,
                        paddingVertical: 12,
                        borderRadius: borderRadius.lg,
                        backgroundColor: splitPref === s ? colors.accent.primary : colors.bg.card,
                        alignItems: 'center',
                        borderWidth: 1,
                        borderColor: splitPref === s ? colors.accent.primary : colors.border.subtle,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: '600',
                          color: splitPref === s ? '#FFF' : colors.text.primary,
                        }}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            {/* FAMILY fields */}
            {selectedLens === 'FAMILY' && (
              <>
                <Text style={labelStyle}>Household Members</Text>
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: colors.bg.card,
                    borderRadius: borderRadius.xl,
                    borderWidth: 1,
                    borderColor: colors.border.subtle,
                    paddingVertical: 12,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setHouseholdMembers(Math.max(1, householdMembers - 1))}
                    style={{ paddingHorizontal: 24, paddingVertical: 8 }}
                  >
                    <AntDesign name="minus" size={20} color={colors.text.primary} />
                  </TouchableOpacity>
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: '700',
                      color: colors.text.primary,
                      marginHorizontal: 20,
                      minWidth: 40,
                      textAlign: 'center',
                    }}
                  >
                    {householdMembers}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setHouseholdMembers(householdMembers + 1)}
                    style={{ paddingHorizontal: 24, paddingVertical: 8 }}
                  >
                    <AntDesign name="plus" size={20} color={colors.text.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={[labelStyle, { marginTop: 20 }]}>Household Income</Text>
                <TextInput
                  style={inputStyle}
                  placeholder="e.g. 150000"
                  placeholderTextColor={colors.text.tertiary}
                  keyboardType="numeric"
                  value={householdIncome}
                  onChangeText={setHouseholdIncome}
                />
                <Text style={[labelStyle, { marginTop: 20 }]}>Responsibilities Split</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {RESPONSIBILITIES.map((r) => {
                    const selected = responsibilities.includes(r);
                    return (
                      <TouchableOpacity
                        key={r}
                        onPress={() => toggleResponsibility(r)}
                        style={{
                          paddingHorizontal: 16,
                          paddingVertical: 10,
                          borderRadius: borderRadius.lg,
                          backgroundColor: selected ? colors.accent.primary : colors.bg.card,
                          borderWidth: 1,
                          borderColor: selected ? colors.accent.primary : colors.border.subtle,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '600',
                            color: selected ? '#FFF' : colors.text.primary,
                          }}
                        >
                          {r}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        <View
          style={{
            paddingHorizontal: PADDING,
            paddingBottom: insets.bottom + 24,
            backgroundColor: colors.bg.primary,
            borderTopLeftRadius: borderRadius.xl,
            borderTopRightRadius: borderRadius.xl,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleFinish}
            disabled={submitting}
            style={{
              backgroundColor: colors.accent.primary,
              paddingVertical: 16,
              borderRadius: borderRadius.xl,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: submitting ? 0.6 : 1,
              ...shadows.md,
              shadowColor: colors.accent.primary,
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 17, fontWeight: '700' }}>
              {submitting ? 'Setting up...' : 'Get Started'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Step 1: Lens Choice
  return (
    <View style={[s.root, { backgroundColor: colors.bg.primary }]}>
      {renderHeader(false)}
      <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: PADDING }}>
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
            fontSize: 15,
            fontWeight: '500',
            color: colors.text.tertiary,
            textAlign: 'center',
            marginBottom: 32,
            lineHeight: 22,
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
                style={{ width: '50%', paddingHorizontal: 6, marginBottom: 12 }}
              >
                <View
                  style={{
                    backgroundColor: isSelected ? colors.accent.primary + '15' : colors.bg.card,
                    borderRadius: borderRadius['2xl'],
                    padding: 16,
                    borderWidth: 2,
                    borderColor: isSelected ? colors.accent.primary : colors.border.subtle,
                    minHeight: 170,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 24,
                      backgroundColor: isSelected
                        ? colors.accent.primary + '25'
                        : colors.border.subtle + '60',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: 12,
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
                      fontSize: 15,
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
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
      <View style={{ paddingHorizontal: PADDING, paddingBottom: insets.bottom + 24 }}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleContinueToSetup}
          disabled={!selectedLens}
          style={{
            backgroundColor: selectedLens ? colors.accent.primary : colors.border.subtle,
            paddingVertical: 16,
            borderRadius: borderRadius.xl,
            alignItems: 'center',
            justifyContent: 'center',
            opacity: selectedLens ? 1 : 0.5,
            ...shadows.md,
            shadowColor: colors.accent.primary,
          }}
        >
          <Text
            style={{
              color: selectedLens ? '#FFF' : colors.text.tertiary,
              fontSize: 17,
              fontWeight: '700',
            }}
          >
            Continue
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
});
