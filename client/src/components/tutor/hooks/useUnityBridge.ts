/**
 * 🎯 Unity Bridge Hook - Secure PostMessage Communication
 * Handles React ↔ Unity communication with handshake-based security
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface UnityBridgeHandle {
  sendAudioToAvatar: (audioBlob: Blob, emotion?: string) => Promise<void>;
  setEmotion: (emotion: string) => void;
  triggerGesture: (gesture: string) => void;
  changeAvatar: (avatarName: 'priya' | 'amit') => void;
  stopAudio: () => void;
  isReady: boolean;
  isHandshakeComplete: boolean;
}

interface UseUnityBridgeOptions {
  iframeRef: React.RefObject<HTMLIFrameElement>;
  onReady?: () => void;
  onMessage?: (message: any) => void;
  onError?: (error: string) => void;
}

export function useUnityBridge({
  iframeRef,
  onReady,
  onMessage,
  onError,
}: UseUnityBridgeOptions): UnityBridgeHandle {
  const [isReady, setIsReady] = useState(false);
  const [isHandshakeComplete, setIsHandshakeComplete] = useState(false);
  const handshakeTimeoutRef = useRef<NodeJS.Timeout>();
  const trustedOriginRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false); // Prevent duplicate handshakes

  // Send message to Unity iframe (SECURE with origin validation)
  const sendMessageToUnity = useCallback(
    (type: string, payload: any) => {
      if (!iframeRef.current?.contentWindow) {
        console.warn('[Unity Bridge] Iframe not available');
        return;
      }

      // 🔒 SECURITY: Use trusted origin or fail
      const targetOrigin = trustedOriginRef.current || window.location.origin;
      
      if (!trustedOriginRef.current && type !== 'UNITY_INIT') {
        console.warn('[Unity Bridge] No trusted origin established yet');
        return;
      }

      try {
        iframeRef.current.contentWindow.postMessage(
          { type, payload },
          targetOrigin
        );
      } catch (error) {
        console.error('[Unity Bridge] Failed to send message:', error);
        onError?.('Failed to communicate with Unity');
      }
    },
    [iframeRef, onError]
  );

  // Initialize handshake
  useEffect(() => {
    if (!iframeRef.current) return;
    if (hasInitializedRef.current) {
      console.log('[Unity Bridge] Already initialized, skipping handshake');
      return; // Prevent duplicate handshakes
    }

    // Start handshake after iframe loads
    const initHandshake = () => {
      if (hasInitializedRef.current) return; // Double-check
      hasInitializedRef.current = true;
      
      console.log('[Unity Bridge] Starting handshake...');
      sendMessageToUnity('UNITY_INIT', { timestamp: Date.now() });

      // Timeout if handshake fails (check via ref to avoid stale closure)
      handshakeTimeoutRef.current = setTimeout(() => {
        setIsHandshakeComplete((current) => {
          if (!current) {
            console.error('[Unity Bridge] Handshake timeout - Unity WebGL may be loading slowly');
            onError?.('Unity loading timeout - please wait or refresh');
          }
          return current;
        });
      }, 20000); // 20 second timeout for 97MB WebGL load
    };

    // Wait for iframe to load
    const iframe = iframeRef.current;
    if (iframe.contentWindow) {
      // Iframe already loaded, start immediately
      setTimeout(initHandshake, 500); // Give Unity more time to initialize
    } else {
      iframe.addEventListener('load', initHandshake);
      return () => iframe.removeEventListener('load', initHandshake);
    }
  }, [iframeRef, onError, sendMessageToUnity]); // Removed isHandshakeComplete from deps

  // Listen for messages from Unity
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Basic data validation
      if (!event.data || typeof event.data !== 'object') return;

      const { type, payload } = event.data;

      // 🔒 SECURITY: CRITICAL - Verify message source is our iframe
      if (!iframeRef.current?.contentWindow) {
        console.warn('[Unity Bridge] Iframe not ready');
        return;
      }

      if (event.source !== iframeRef.current.contentWindow) {
        console.warn('[Unity Bridge] Rejected message from non-iframe source');
        return;
      }

      // 🔒 SECURITY: Establish trusted origin from UNITY_INIT_ACK (first time only)
      if (type === 'UNITY_INIT_ACK') {
        if (trustedOriginRef.current) {
          console.warn('[Unity Bridge] Handshake already complete, ignoring duplicate ACK');
          return;
        }

        if (!event.origin) {
          console.error('[Unity Bridge] UNITY_INIT_ACK has no origin');
          onError?.('Invalid handshake: no origin');
          return;
        }

        trustedOriginRef.current = event.origin;
        console.log('[Unity Bridge] Trusted origin established:', event.origin);
        setIsHandshakeComplete(true);
        if (handshakeTimeoutRef.current) {
          clearTimeout(handshakeTimeoutRef.current);
        }
        return;
      }

      // 🔒 SECURITY: Reject all messages before handshake completion
      if (!trustedOriginRef.current) {
        console.warn('[Unity Bridge] Rejected message before handshake:', type);
        return;
      }

      // 🔒 SECURITY: Validate origin matches trusted origin
      if (event.origin !== trustedOriginRef.current) {
        console.warn('[Unity Bridge] Rejected message from unauthorized origin:', event.origin);
        return;
      }

      // Handle authenticated messages
      switch (type) {
        case 'UNITY_READY':
          // Unity is fully initialized
          console.log('[Unity Bridge] Unity is ready!');
          setIsReady(true);
          onReady?.();
          break;

        case 'UNITY_MESSAGE':
          // Custom message from Unity
          console.log('[Unity Bridge] Message from Unity:', payload);
          onMessage?.(payload);
          break;

        default:
          // Unknown message type (silently ignore)
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      if (handshakeTimeoutRef.current) {
        clearTimeout(handshakeTimeoutRef.current);
      }
    };
  }, [onReady, onMessage]);

  // Send audio to Unity with lip-sync
  const sendAudioToAvatar = useCallback(
    async (audioBlob: Blob, emotion?: string) => {
      if (!isReady) {
        console.warn('[Unity Bridge] Unity not ready yet');
        return;
      }

      try {
        // Convert Blob to Base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onloadend = () => {
            const base64 = reader.result?.toString().split(',')[1];
            if (base64) {
              resolve(base64);
            } else {
              reject(new Error('Failed to convert audio to base64'));
            }
          };
          reader.onerror = reject;
        });

        reader.readAsDataURL(audioBlob);
        const base64Audio = await base64Promise;

        // Send to Unity
        sendMessageToUnity('PLAY_TTS_AUDIO', {
          audioData: base64Audio,
        });

        // Set emotion if provided
        if (emotion) {
          sendMessageToUnity('SET_EMOTION', { emotion });
        }
      } catch (error) {
        console.error('[Unity Bridge] Failed to send audio:', error);
        onError?.('Failed to play audio in avatar');
      }
    },
    [isReady, sendMessageToUnity, onError]
  );

  // Set avatar emotion
  const setEmotion = useCallback(
    (emotion: string) => {
      if (!isReady) return;
      sendMessageToUnity('SET_EMOTION', { emotion });
    },
    [isReady, sendMessageToUnity]
  );

  // Trigger gesture/animation
  const triggerGesture = useCallback(
    (gesture: string) => {
      if (!isReady) return;
      sendMessageToUnity('TRIGGER_GESTURE', { gesture });
    },
    [isReady, sendMessageToUnity]
  );

  // Change avatar
  const changeAvatar = useCallback(
    (avatarName: 'priya' | 'amit') => {
      if (!isReady) return;
      sendMessageToUnity('CHANGE_AVATAR', { avatarName });
    },
    [isReady, sendMessageToUnity]
  );

  // Stop audio playback
  const stopAudio = useCallback(() => {
    if (!isReady) return;
    sendMessageToUnity('STOP_AUDIO', {});
  }, [isReady, sendMessageToUnity]);

  return {
    sendAudioToAvatar,
    setEmotion,
    triggerGesture,
    changeAvatar,
    stopAudio,
    isReady,
    isHandshakeComplete,
  };
}
