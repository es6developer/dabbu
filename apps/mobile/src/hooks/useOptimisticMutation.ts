import { useCallback, useRef, useState } from 'react';
import { api } from '../services/api';

interface OptimisticConfig<TData, TVariables> {
  mutation: (variables: TVariables) => Promise<TData>;
  optimisticUpdate: (variables: TVariables) => TData;
  onSuccess?: (data: TData, variables: TVariables) => void;
  onError?: (error: Error, variables: TVariables) => void;
}

export function useOptimisticMutation<TData, TVariables = any>(
  config: OptimisticConfig<TData, TVariables>,
) {
  const [state, setState] = useState<{
    data: TData | null;
    loading: boolean;
    error: string | null;
  }>({ data: null, loading: false, error: null });
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mutate = useCallback(
    async (variables: TVariables) => {
      setState({ data: config.optimisticUpdate(variables), loading: true, error: null });

      try {
        const result = await config.mutation(variables);
        setState({ data: result, loading: false, error: null });
        config.onSuccess?.(result, variables);
        return result;
      } catch (err: any) {
        setState({ data: null, loading: false, error: err.message || 'Request failed' });
        config.onError?.(err, variables);
        throw err;
      }
    },
    [config],
  );

  const reset = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setState({ data: null, loading: false, error: null });
  }, []);

  return { ...state, mutate, reset };
}

export function useOptimisticExpenseCreate() {
  return useOptimisticMutation({
    mutation: async (variables: { amount: number; category: string; notes?: string; date?: string }) => {
      return api.post('/transactions', variables);
    },
    optimisticUpdate: (variables) => ({
      id: `optimistic-${Date.now()}`,
      amount: variables.amount,
      category: variables.category,
      notes: variables.notes || '',
      date: variables.date || new Date().toISOString(),
      createdAt: new Date().toISOString(),
      isOptimistic: true,
    }) as any,
    onSuccess: () => {
      // Invalidate relevant cache entries
      api.get('/transactions/recent?limit=10', undefined, 5000).catch(() => {});
      api.get('/transactions/stats', undefined, 5000).catch(() => {});
    },
  });
}
