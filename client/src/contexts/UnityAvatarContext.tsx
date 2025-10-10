/**
 * 🎭 Unity Avatar Context - Global Persistent Avatar
 * Renders Unity avatar once globally, keeps it alive across routes for instant access
 */

import { createContext, useContext, useRef, useState, ReactNode } from 'react';
import UnityAvatar, { UnityAvatarHandle } from '@/components/tutor/UnityAvatar';

interface UnityAvatarContextValue {
  avatarRef: React.RefObject<UnityAvatarHandle>;
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
  isVisible: boolean;
  isAudioUnlocked: boolean;
  setIsVisible: (visible: boolean) => void;
}

const UnityAvatarContext = createContext<UnityAvatarContextValue | null>(null);

interface UnityAvatarProviderProps {
  children: ReactNode;
}

export function UnityAvatarProvider({ children }: UnityAvatarProviderProps) {
  const avatarRef = useRef<UnityAvatarHandle>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);

  const handleReady = () => {
    console.log('[Unity Context] ✅ Avatar ready globally!');
    setIsReady(true);
    setIsLoading(false);
  };

  const handleError = (errorMsg: string) => {
    console.error('[Unity Context] ❌ Avatar error:', errorMsg);
    setError(errorMsg);
    setIsLoading(false);
  };

  return (
    <UnityAvatarContext.Provider 
      value={{ 
        avatarRef, 
        isReady, 
        isLoading, 
        error, 
        isVisible, 
        isAudioUnlocked,
        setIsVisible 
      }}
    >
      {/* 🎭 Global Unity Avatar - Visible for WebGL init, hidden via transform/opacity */}
      <div 
        id="global-unity-container" 
        className="fixed inset-0 pointer-events-none"
        style={{ 
          opacity: 0.01,
          transform: 'scale(0.01)',
          zIndex: -9999,
          visibility: 'visible'
        }}
        data-testid="global-avatar-unity-container"
      >
        <div 
          id="global-unity-instance"
          className="w-full h-full"
        >
          <UnityAvatar
            ref={avatarRef}
            className="w-full h-full"
            defaultAvatar="priya"
            onReady={handleReady}
            onError={handleError}
            onAudioUnlocked={() => {
              console.log('[Unity Context] 🔊 Audio unlocked!');
              setIsAudioUnlocked(true);
            }}
          />
        </div>
      </div>
      
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
