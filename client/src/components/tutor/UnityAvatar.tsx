/**
 * 🎯 Unity 3D Avatar Component with uLipSync
 * Optional avatar panel for AI Tutor - can be toggled on/off
 */

import { forwardRef, useRef, useImperativeHandle, useState, useEffect } from 'react';
import { Loader2, AlertCircle, User } from 'lucide-react';
import { useUnityBridge, UnityBridgeHandle } from './hooks/useUnityBridge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// 🔍 WebGL detection utility
function detectWebGLSupport(): { supported: boolean; message?: string } {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    
    if (!gl) {
      return {
        supported: false,
        message: 'WebGL is not supported on this device/browser'
      };
    }

    return { supported: true };
  } catch (error) {
    console.error('[WebGL] Detection failed:', error);
    return {
      supported: false,
      message: 'Error detecting WebGL support'
    };
  }
}

export interface UnityAvatarHandle extends UnityBridgeHandle {
  // Re-export all bridge methods
}

interface UnityAvatarProps {
  className?: string;
  defaultAvatar?: 'priya' | 'amit';
  onReady?: () => void;
  onMessage?: (message: any) => void;
  onError?: (error: string) => void;
}

const UnityAvatar = forwardRef<UnityAvatarHandle, UnityAvatarProps>(
  ({ className = '', defaultAvatar = 'priya', onReady, onMessage, onError }, ref) => {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [webGLSupported, setWebGLSupported] = useState(true);

    // Check WebGL support on mount
    useEffect(() => {
      const detection = detectWebGLSupport();
      setWebGLSupported(detection.supported);
      
      if (!detection.supported) {
        setLoadError(detection.message || 'WebGL not supported');
        setIsLoading(false);
        onError?.(detection.message || 'WebGL not supported');
      }
    }, [onError]);

    // Use Unity bridge hook
    const unityBridge = useUnityBridge({
      iframeRef,
      onReady: () => {
        setIsLoading(false);
        console.log('[Unity Avatar] Avatar ready!');
        onReady?.();
      },
      onMessage: (msg) => {
        console.log('[Unity Avatar] Message from Unity:', msg);
        onMessage?.(msg);
      },
      onError: (error) => {
        console.error('[Unity Avatar] Error:', error);
        setLoadError(error);
        setIsLoading(false);
        onError?.(error);
      },
    });

    // Expose methods to parent via ref
    useImperativeHandle(ref, () => unityBridge, [unityBridge]);

    // Handle iframe error
    const handleIframeError = () => {
      setLoadError('Failed to load Unity Avatar');
      setIsLoading(false);
    };

    // Retry loading
    const handleRetry = () => {
      setLoadError(null);
      setIsLoading(true);
      if (iframeRef.current) {
        iframeRef.current.src = iframeRef.current.src; // Reload iframe
      }
    };

    return (
      <div className={`relative h-full ${className}`} data-testid="unity-avatar-container">
        {/* Loading State */}
        {isLoading && !loadError && (
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center z-10">
            <Card className="p-6 text-center max-w-xs mx-4">
              <Loader2 
                className="w-12 h-12 animate-spin text-purple-600 dark:text-purple-400 mb-3 mx-auto" 
                data-testid="avatar-loading-spinner"
              />
              <p className="text-sm text-gray-600 dark:text-gray-300 font-medium">
                Loading AI Tutor Avatar...
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {unityBridge.isHandshakeComplete ? 'Initializing...' : 'Connecting...'}
              </p>
            </Card>
          </div>
        )}

        {/* Error State */}
        {loadError && (
          <div className="absolute inset-0 bg-gradient-to-br from-red-50 to-orange-50 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center z-10">
            <Card className="p-6 text-center max-w-sm mx-4">
              <AlertCircle className="w-12 h-12 text-red-500 mb-3 mx-auto" />
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
                {webGLSupported ? 'Avatar Load Failed' : 'WebGL Not Supported'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {loadError}
                {!webGLSupported && (
                  <span className="block mt-2 text-xs opacity-80">
                    Please use a modern browser like Chrome, Firefox, or Edge to view the 3D avatar.
                  </span>
                )}
              </p>
              <div className="flex gap-2 justify-center">
                {webGLSupported && (
                  <Button 
                    onClick={handleRetry}
                    variant="outline"
                    size="sm"
                    data-testid="button-retry-avatar"
                  >
                    Retry
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-3">
                Don't worry - chat functionality still works!
              </p>
            </Card>
          </div>
        )}

        {/* Unity WebGL iframe */}
        <iframe
          ref={iframeRef}
          src="/unity-avatar/index.html"
          className="w-full h-full border-0"
          style={{
            display: 'block',
            minHeight: '400px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          }}
          title="AI Tutor Avatar"
          allow="autoplay"
          onError={handleIframeError}
          sandbox="allow-scripts allow-same-origin"
          data-testid="unity-iframe"
        />

        {/* Ready Indicator (bottom-right corner) */}
        {unityBridge.isReady && !loadError && (
          <div 
            className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-1.5 bg-green-500/90 dark:bg-green-600/90 text-white rounded-full text-xs font-medium backdrop-blur-sm"
            data-testid="avatar-ready-indicator"
          >
            <User className="w-3 h-3" />
            <span>Avatar Ready</span>
          </div>
        )}
      </div>
    );
  }
);

UnityAvatar.displayName = 'UnityAvatar';

export default UnityAvatar;
