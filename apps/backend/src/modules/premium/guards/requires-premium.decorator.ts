import { SetMetadata } from '@nestjs/common';

export const REQUIRES_PREMIUM_KEY = 'requires_premium';
export const RequiresPremium = (featureKey: string) =>
  SetMetadata(REQUIRES_PREMIUM_KEY, featureKey);
