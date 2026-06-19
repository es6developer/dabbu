import { useState, useEffect, useCallback } from 'react';
import { revenueCat as rc } from '../services/revenuecat';

interface RevenueCatHook {
  isPremium: boolean;
  products: any[];
  loading: boolean;
  purchase: (identifier: string) => Promise<boolean>;
  restore: () => Promise<boolean>;
  checkStatus: () => Promise<void>;
}

export function useRevenueCat(): RevenueCatHook {
  const [isPremium, setIsPremium] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      const entitled = await rc.checkEntitlement('premium');
      setIsPremium(entitled);
    } catch {
      setIsPremium(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      rc.configure();
      await checkStatus();
      const prods = await rc.getProducts();
      setProducts(prods);
      setLoading(false);
    }
    init();
  }, [checkStatus]);

  const purchase = useCallback(async (identifier: string) => {
    const result = await rc.purchase(identifier);
    if (result) {
      setIsPremium(true);
    }
    return result;
  }, []);

  const restore = useCallback(async () => {
    const result = await rc.restore();
    if (result) {
      setIsPremium(true);
    }
    return result;
  }, []);

  return { isPremium, products, loading, purchase, restore, checkStatus };
}
