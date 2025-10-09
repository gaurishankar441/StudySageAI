/**
 * 🎭 Unity Avatar Context - Avatar State Management
 * Provides shared avatar state and ref across components
 * Note: Actual iframe rendering happens in TutorSession for visibility
 */

import { createContext, useContext, useRef, useState, ReactNode } from 'react';
import type { UnityAvatarHandle } from '@/components/tutor/UnityAvatar';

interface UnityAvatarContextValue {
  avatarRef: React.RefObject<UnityAvatarHandle>;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  setIsReady: (ready: boolean) => void;
  setIsLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

const UnityAvatarContext = createContext<UnityAvatarContextValue | null>(null);

interface UnityAvatarProviderProps {
  children: ReactNode;
}

export function UnityAvatarProvider({ children }: UnityAvatarProviderProps) {
  const avatarRef = useRef<UnityAvatarHandle>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <UnityAvatarContext.Provider 
      value={{ 
        avatarRef, 
        isReady, 
        isLoading, 
        error, 
        setIsReady, 
        setIsLoading, 
        setError 
      }}
    >
      {children}
    </UnityAvatarContext.Provider>
  );
}

export function useUnityAvatar() {
  const context = useContext(UnityAvatarContext);
  if (!context) {
    throw new Error('useUnityAvatar must be used within UnityAvatarProvider');
  }
  return context;
}
