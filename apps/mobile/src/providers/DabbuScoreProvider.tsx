import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import {
  useDabbuScoreStore,
  DabbuLevel,
  DabbuComponent,
  DabbuHistoryEntry,
  DabbuImprovement,
} from '../store/dabbuScoreStore';
import { useAuth } from '../store/AuthContext';

interface DabbuScoreContextType {
  score: number | null;
  level: DabbuLevel | null;
  monthlyChange: number | null;
  components: DabbuComponent[];
  history: DabbuHistoryEntry[];
  improvements: DabbuImprovement[];
  loading: boolean;
  fetchScore: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  fetchImprovements: () => Promise<void>;
  recalculate: () => Promise<void>;
}

const DabbuScoreContext = createContext<DabbuScoreContextType>({
  score: null,
  level: null,
  monthlyChange: null,
  components: [],
  history: [],
  improvements: [],
  loading: false,
  fetchScore: async () => {},
  fetchHistory: async () => {},
  fetchImprovements: async () => {},
  recalculate: async () => {},
});

export function DabbuScoreProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const {
    score,
    level,
    monthlyChange,
    components,
    history,
    improvements,
    loading,
    fetchScore,
    fetchHistory,
    fetchImprovements,
    recalculate,
  } = useDabbuScoreStore();

  useEffect(() => {
    if (accessToken) {
      fetchScore();
    }
  }, [accessToken]);

  return (
    <DabbuScoreContext.Provider
      value={{
        score,
        level,
        monthlyChange,
        components,
        history,
        improvements,
        loading,
        fetchScore,
        fetchHistory,
        fetchImprovements,
        recalculate,
      }}
    >
      {children}
    </DabbuScoreContext.Provider>
  );
}

export function useDabbuScore() {
  return useContext(DabbuScoreContext);
}
