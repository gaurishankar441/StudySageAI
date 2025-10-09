/**
 * 🎭 Unity Avatar Context - Lightweight Preload Strategy
 * Preloads Unity WebGL bundle in background using link preload
 */

import { createContext, useContext, useRef, useState, useEffect, ReactNode } from 'react';
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

  // Preload Unity WebGL files in background
  useEffect(() => {
    console.log('[Unity Context] 🚀 Preloading Unity WebGL bundle...');
    
    const preloadLinks = [
      { href: '/unity-avatar/Build/unity-avatar.loader.js', as: 'script' },
      { href: '/unity-avatar/Build/unity-avatar.framework.js.gz', as: 'fetch' },
      { href: '/unity-avatar/Build/unity-avatar.data.gz', as: 'fetch' },
      { href: '/unity-avatar/Build/unity-avatar.wasm.gz', as: 'fetch' },
    ];

    const linkElements: HTMLLinkElement[] = [];

    preloadLinks.forEach(({ href, as }) => {
      const link = document.createElement('link');
      link.rel = 'preload';
      link.href = href;
      link.as = as;
      link.crossOrigin = 'anonymous';
      document.head.appendChild(link);
      linkElements.push(link);
      console.log(`[Unity Context] 📥 Preloading: ${href}`);
    });

    return () => {
      // Cleanup preload links
      linkElements.forEach(link => {
        if (link.parentNode) {
          link.parentNode.removeChild(link);
        }
      });
    };
  }, []);

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
