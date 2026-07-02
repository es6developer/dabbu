import { api } from './api';

export interface Product {
  identifier: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  period: 'monthly' | 'yearly' | null;
}

export interface PurchaseResult {
  productId: string;
  transactionId: string;
  receipt: string;
}

export interface PurchaseAdapter {
  initialize(): Promise<void>;
  getProducts(identifiers: string[]): Promise<Product[]>;
  purchase(productId: string): Promise<PurchaseResult>;
  restorePurchases(): Promise<PurchaseResult[]>;
  getCurrentEntitlements(): Promise<string[]>;
}

export class RestPurchaseAdapter implements PurchaseAdapter {
  async initialize(): Promise<void> {
    // No-op for REST adapter
  }

  async getProducts(identifiers: string[]): Promise<Product[]> {
    const plans = await api.get<any[]>('/premium/plans');
    if (!Array.isArray(plans)) return [];
    const products: Product[] = plans
      .filter((p) => identifiers.includes(p.code))
      .map((p) => ({
        identifier: p.code,
        title: p.name,
        description: p.tagline || '',
        price: p.monthlyPrice || p.yearlyPrice || 0,
        currency: 'INR',
        period: p.code.includes('YEARLY') ? 'yearly' : p.code.includes('MONTHLY') ? 'monthly' : null,
      }));
    return products;
  }

  async purchase(productId: string): Promise<PurchaseResult> {
    const result = await api.post<any>('/premium/subscribe', { planCode: productId });
    return {
      productId,
      transactionId: result?.transactionId || `txn_${Date.now()}`,
      receipt: result?.receipt || '',
    };
  }

  async restorePurchases(): Promise<PurchaseResult[]> {
    const result = await api.post<any>('/premium/restore');
    return result?.transactions || [];
  }

  async getCurrentEntitlements(): Promise<string[]> {
    const data = await api.get<any>('/premium/entitlements');
    return data?.grantedFeatures || [];
  }
}

export function createPurchaseAdapter(): PurchaseAdapter {
  return new RestPurchaseAdapter();
}

export const purchases = createPurchaseAdapter();
