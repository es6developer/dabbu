import { SetMetadata } from '@nestjs/common';

export const PREMIUM_FEATURE_KEY = 'PREMIUM_FEATURE';

export const RequiresPremium = (featureKey?: string) =>
  SetMetadata(PREMIUM_FEATURE_KEY, featureKey || 'premium_access');
