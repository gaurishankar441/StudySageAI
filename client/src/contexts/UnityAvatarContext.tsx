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
        setIsVisible 
      }}
    >
      {/* 🎭 Global Persistent Unity Avatar - Lives forever, visibility controlled */}
      <div 
        className={`fixed bottom-0 left-0 md:left-auto md:top-0 md:right-0 h-[40vh] md:h-screen w-full md:w-96 bg-white dark:bg-gray-900 border-t md:border-t-0 md:border-l border-border shadow-2xl z-50 transition-all duration-300 ${
          isVisible 
            ? 'translate-y-0 md:translate-x-0' 
            : 'translate-y-full md:translate-y-0 md:translate-x-full pointer-events-none'
        }`}
        data-testid="global-avatar-panel"
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-border bg-gradient-to-r from-purple-50 to-blue-50 dark:from-gray-800 dark:to-gray-900">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <span className="text-2xl">🎭</span>
              AI Tutor Avatar
            </h3>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
              {isReady ? (
                <>
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                  Ready with lip-sync
                </>
              ) : isLoading ? (
                <>
                  <span className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></span>
                  Loading... (background)
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                  Initializing...
                </>
              )}
            </p>
          </div>

          {/* Unity Avatar - Persistent render */}
          <div className="flex-1">
            <UnityAvatar
              ref={avatarRef}
              className="w-full h-full"
              defaultAvatar="priya"
              onReady={handleReady}
              onError={handleError}
            />
          </div>

          {/* Footer Info */}
          <div className="p-3 border-t border-border bg-gray-50 dark:bg-gray-800">
            <p className="text-xs text-muted-foreground text-center">
              3D Avatar with real-time lip-sync • Stays loaded across pages ⚡
            </p>
          </div>
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
