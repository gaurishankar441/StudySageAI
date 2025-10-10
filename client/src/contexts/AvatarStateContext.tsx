import { createContext, useContext, ReactNode } from 'react';
import { useAvatarState, type AvatarState, type StateTransitionLog } from '@/hooks/useAvatarState';

interface AvatarStateContextValue {
  state: AvatarState;
  transition: (newState: AvatarState) => boolean;
  canAcceptTTS: boolean;
  history: StateTransitionLog[];
  reset: () => void;
}

const AvatarStateContext = createContext<AvatarStateContextValue | null>(null);

export function AvatarStateProvider({ children }: { children: ReactNode }) {
  const avatarState = useAvatarState();

  return (
    <AvatarStateContext.Provider value={avatarState}>
      {children}
    </AvatarStateContext.Provider>
  );
}

export function useAvatarStateContext() {
  const context = useContext(AvatarStateContext);
  if (!context) {
    throw new Error('useAvatarStateContext must be used within AvatarStateProvider');
  }
  return context;
}
