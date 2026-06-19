import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { useSpaceStore, Space } from '../store/spaceStore';
import { useAuth } from '../store/AuthContext';

interface ActiveSpaceContextType {
  activeSpace: Space | null;
  spaces: Space[];
  setActiveSpaceById: (spaceId: string) => void;
  loading: boolean;
}

const ActiveSpaceContext = createContext<ActiveSpaceContextType>({
  activeSpace: null,
  spaces: [],
  setActiveSpaceById: () => {},
  loading: false,
});

export function ActiveSpaceProvider({ children }: { children: ReactNode }) {
  const { accessToken } = useAuth();
  const {
    spaces,
    activeSpaceId,
    activeSpace,
    loading,
    fetchSpaces,
    setActiveSpace,
  } = useSpaceStore();

  useEffect(() => {
    if (accessToken) {
      fetchSpaces(accessToken);
    }
  }, [accessToken]);

  const currentActiveSpace = activeSpaceId
    ? spaces.find((s) => s.id === activeSpaceId) || null
    : spaces[0] || null;

  return (
    <ActiveSpaceContext.Provider
      value={{
        activeSpace: currentActiveSpace,
        spaces,
        setActiveSpaceById: setActiveSpace,
        loading,
      }}
    >
      {children}
    </ActiveSpaceContext.Provider>
  );
}

export function useActiveSpace() {
  return useContext(ActiveSpaceContext);
}

export function getActiveSpaceId(): string | null {
  try {
    const state = useSpaceStore.getState();
    return state.activeSpaceId || state.spaces[0]?.id || null;
  } catch {
    return null;
  }
}
