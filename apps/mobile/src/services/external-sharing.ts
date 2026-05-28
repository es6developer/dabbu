import { api } from './api';

export interface CreateInviteLinkOptions {
  groupId: string;
  expiresInDays?: number;
  maxUses?: number;
}

export interface InviteData {
  token: string;
  groupId: string;
  groupName: string;
  groupType: 'trip' | 'couple' | 'shared' | 'family';
  memberCount: number;
  createdBy: string;
  expiresAt: string;
  isValid: boolean;
}

export interface BannerData {
  id: string;
  title: string;
  description: string;
  ctaText: string;
  ctaAction: 'install_app' | 'sign_up_free' | 'start_trial' | 'dismiss';
  priority: number;
  bannerType: 'sticky' | 'inline' | 'modal' | 'slide_in';
  gradient: [string, string];
}

export interface ConversionEvent {
  eventType: 'banner_shown' | 'banner_dismissed' | 'banner_clicked' | 'install_redirect' | 'trial_started' | 'sign_up';
  bannerId?: string;
  source?: string;
  tempUserId?: string;
}

export interface PremiumTrialResult {
  success: boolean;
  trialEndsAt: string;
  message: string;
}

export interface ReferralData {
  code: string;
  url: string;
  rewardAmount: number;
  currency: string;
}

export interface ConversionEvaluation {
  shouldShow: boolean;
  triggerType?: 'settlement_threshold' | 'multi_use' | 'locked_feature' | 'trial_expiring' | 'referral_eligible';
  data?: Record<string, any>;
}

export async function createAnonymousSession(deviceId: string): Promise<{ tempUserId: string; tempToken: string }> {
  return api.post('/external-sharing/anonymous-session', { deviceId });
}

export async function googleLogin(idToken: string): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> {
  return api.post('/external-sharing/auth/google', { idToken });
}

export async function requestEmailOtp(email: string): Promise<{ success: boolean }> {
  return api.post('/external-sharing/auth/email-otp', { email });
}

export async function verifyEmailOtp(email: string, otp: string): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> {
  return api.post('/external-sharing/auth/email-verify', { email, otp });
}

export async function requestPhoneOtp(phone: string): Promise<{ success: boolean }> {
  return api.post('/external-sharing/auth/phone-otp', { phone });
}

export async function verifyPhoneOtp(phone: string, otp: string): Promise<{ user: any; tokens: { accessToken: string; refreshToken: string } }> {
  return api.post('/external-sharing/auth/phone-verify', { phone, otp });
}

export async function refreshTempSession(): Promise<{ tempToken: string }> {
  return api.post('/external-sharing/auth/refresh-temp');
}

export async function createInviteLink(groupId: string, options?: Partial<CreateInviteLinkOptions>): Promise<{ inviteUrl: string; token: string }> {
  return api.post(`/external-sharing/groups/${groupId}/invite`, options);
}

export async function resolveInvite(token: string): Promise<InviteData> {
  return api.get(`/external-sharing/invite/${token}`);
}

export async function joinGroupViaInvite(token: string): Promise<{ groupId: string; success: boolean }> {
  return api.post(`/external-sharing/invite/${token}/join`);
}

export async function evaluateConversion(tempUserId: string): Promise<ConversionEvaluation> {
  return api.get(`/external-sharing/conversion/evaluate?tempUserId=${tempUserId}`);
}

export async function getActiveBanners(tempUserId: string): Promise<BannerData[]> {
  return api.get(`/external-sharing/conversion/banners?tempUserId=${tempUserId}`);
}

export async function logOnboardingEvent(event: ConversionEvent): Promise<{ success: boolean }> {
  return api.post('/external-sharing/conversion/onboarding', event);
}

export async function startPremiumTrial(tempUserId: string, trialType: string): Promise<PremiumTrialResult> {
  return api.post('/external-sharing/conversion/trial', { tempUserId, trialType });
}

export async function createReferralLink(): Promise<ReferralData> {
  return api.post('/external-sharing/referral/create');
}

export async function claimReferral(code: string): Promise<{ success: boolean; rewardAmount: number }> {
  return api.post('/external-sharing/referral/claim', { code });
}

export async function trackInstallRedirect(source: string): Promise<{ success: boolean }> {
  return api.post('/external-sharing/install/redirect', { source });
}

export async function confirmInstallation(): Promise<{ success: boolean }> {
  return api.post('/external-sharing/install/confirm');
}
