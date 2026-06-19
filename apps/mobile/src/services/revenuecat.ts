import { Platform } from 'react-native';
import { REVENUECAT_CONFIG } from '../config/revenuecat';

let Purchases: any = null;
try {
  Purchases = require('react-native-purchases').default;
} catch {
  // SDK not linked – all SDK calls will gracefully no-op
}

type Entitlement = 'premium' | 'family';

interface RevenueCatProduct {
  identifier: string;
  price: number;
  currency: string;
  title: string;
  description: string;
}

function hasEntitlement(customerInfo: any, entitlement: string): boolean {
  return customerInfo?.entitlements?.active?.[entitlement] !== undefined;
}

async function getOfferings(): Promise<any[]> {
  if (!Purchases) return [];
  const offerings = await Purchases.getOfferings();
  const packages: any[] = [];
  if (offerings.current?.availablePackages) {
    packages.push(...offerings.current.availablePackages);
  }
  if (offerings.all?.family?.availablePackages) {
    packages.push(...offerings.all.family.availablePackages);
  }
  return packages;
}

function packageToProduct(pkg: any): RevenueCatProduct {
  const product = pkg.product;
  return {
    identifier: pkg.identifier,
    price: product?.price ?? 0,
    currency: product?.currency_code ?? 'USD',
    title: product?.title ?? pkg.identifier,
    description: product?.description ?? '',
  };
}

export const revenueCat = {
  configured: false,

  configure: () => {
    if (!Purchases) {
      revenueCat.configured = false;
      return;
    }
    const apiKey =
      Platform.OS === 'ios'
        ? REVENUECAT_CONFIG.apiKeys.ios
        : REVENUECAT_CONFIG.apiKeys.android;
    if (!apiKey) {
      revenueCat.configured = false;
      return;
    }
    Purchases.configure({ apiKey });
    revenueCat.configured = true;
  },

  getProducts: async (): Promise<RevenueCatProduct[]> => {
    try {
      const packages = await getOfferings();
      if (packages.length > 0) {
        const mapped = packages.map(packageToProduct);
        const seen = new Set<string>();
        return mapped.filter(p => {
          if (seen.has(p.identifier)) return false;
          seen.add(p.identifier);
          return true;
        });
      }
    } catch {
      // fall through to static config
    }

    const config = REVENUECAT_CONFIG.products;
    const base = [
      {
        identifier: config.monthly.identifier,
        price: config.monthly.price,
        currency: 'INR',
        title: 'Dabbu Premium Monthly',
        description: 'AI Coach, Wealth Forecast, House Planner, Retirement Planner, OCR, Exports',
      },
      {
        identifier: config.yearly.identifier,
        price: config.yearly.price,
        currency: 'INR',
        title: 'Dabbu Premium Yearly',
        description: 'All Premium features at 2 months free',
      },
    ];
    if (Platform.OS === 'ios') {
      base.push({
        identifier: config.family_monthly.identifier,
        price: config.family_monthly.price,
        currency: 'INR',
        title: 'Dabbu Family Monthly',
        description: 'Everything in Premium + Family Forecasting + Member Management',
      });
    }
    return base;
  },

  purchase: async (identifier: string): Promise<boolean> => {
    if (!Purchases) return false;
    try {
      const packages = await getOfferings();
      const pkg = packages.find(p => p.identifier === identifier);
      if (!pkg) return false;
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      return hasEntitlement(customerInfo, REVENUECAT_CONFIG.entitlements.premium);
    } catch {
      return false;
    }
  },

  restore: async (): Promise<boolean> => {
    if (!Purchases) return false;
    try {
      const { customerInfo } = await Purchases.restorePurchases();
      return hasEntitlement(customerInfo, REVENUECAT_CONFIG.entitlements.premium);
    } catch {
      return false;
    }
  },

  checkEntitlement: async (entitlement: Entitlement = 'premium'): Promise<boolean> => {
    if (!Purchases) return false;
    try {
      const { customerInfo } = await Purchases.getCustomerInfo();
      return hasEntitlement(customerInfo, entitlement);
    } catch {
      return false;
    }
  },
};
