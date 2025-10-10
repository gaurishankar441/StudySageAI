/**
 * 🎯 Unity Bridge Hook - Secure PostMessage Communication
 * Handles React ↔ Unity communication with handshake-based security
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface UnityBridgeHandle {
  sendAudioToAvatar: (audioBlob: Blob, emotion?: string) => Promise<void>;
  sendAudioWithPhonemesToAvatar: (audioBase64: string, phonemes: Array<{time: number; blendshape: string; weight: number}>, messageId?: string) => void;
  setEmotion: (emotion: string) => void;
  triggerGesture: (gesture: string) => void;
  changeAvatar: (avatarName: 'priya' | 'amit') => void;
  stopAudio: () => void;
  isReady: boolean;
  isHandshakeComplete: boolean;
  isAudioUnlocked: boolean;
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
  const [isAudioUnlocked, setIsAudioUnlocked] = useState(false);
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

    // Start handshake after iframe loads
    const initHandshake = () => {
      if (hasInitializedRef.current) {
        console.log('[Unity Bridge] Already initialized, skipping handshake');
        return; // Prevent duplicate handshakes
      }
      
      console.log('[Unity Bridge] Starting handshake...');
      sendMessageToUnity('UNITY_INIT', { timestamp: Date.now() });

      // Timeout if handshake fails (check via ref to avoid stale closure)
      handshakeTimeoutRef.current = setTimeout(() => {
        if (!hasInitializedRef.current) {
          console.error('[Unity Bridge] Handshake timeout - Unity WebGL may be loading slowly');
          onError?.('Unity loading timeout - please wait or refresh');
        }
      }, 20000); // 20 second timeout for 97MB WebGL load
    };

    // Wait for iframe to load
    const iframe = iframeRef.current;
    if (iframe.contentWindow) {
      // Iframe already loaded - wait for Unity loader to attach message listener
      setTimeout(initHandshake, 500); // 500ms needed for Unity WebGL loader initialization
    } else {
      iframe.addEventListener('load', () => {
        // Wait after iframe loads for Unity script to initialize
        setTimeout(initHandshake, 500);
      });
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
        hasInitializedRef.current = true; // Mark as initialized ONLY after successful handshake
        console.log('[Unity Bridge] Trusted origin established:', event.origin);
        console.log('[Unity Bridge] Handshake complete ✅');
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

        case 'AUDIO_UNLOCKED':
          // Audio context unlocked in iframe
          console.log('[Unity Bridge] Audio unlocked successfully ✅');
          setIsAudioUnlocked(true);
          break;

        case 'UNITY_MESSAGE':
          // Custom message from Unity
          console.log('[Unity Bridge] Message from Unity:', payload);
          onMessage?.(payload);
          break;
        
        case 'UNITY_LOG':
          // Forward Unity iframe console logs to parent console
          if (payload?.level === 'log') console.log('[Unity]', ...payload.args);
          else if (payload?.level === 'warn') console.warn('[Unity]', ...payload.args);
          else if (payload?.level === 'error') console.error('[Unity]', ...payload.args);
          break;
        
        case 'AUDIO_UNLOCK_REQUEST':
          // Unity requests audio unlock
          console.log('[Unity Bridge] ⚠️ Audio unlock requested by Unity');
          break;
        
        case 'AUDIO_STARTED':
          // Audio playback started in Unity
          console.log('[Unity Bridge] ✅ Audio playback started:', payload?.id);
          break;
        
        case 'AUDIO_FAILED':
          // Audio playback failed in Unity
          console.error('[Unity Bridge] ❌ Audio playback failed:', payload?.error);
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

        console.log('[Unity Bridge] 🎵 Converted audio to base64 - Length:', base64Audio?.length || 0, 'Blob size:', audioBlob.size);
        
        // Send to Unity
        sendMessageToUnity('PLAY_TTS_AUDIO', {
          audioData: base64Audio,
        });
        
        console.log('[Unity Bridge] ✅ Audio sent to Unity iframe');

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

  // 🎯 NEW: Send audio with phoneme sequence for Unity lip-sync
  const sendAudioWithPhonemesToAvatar = useCallback(
    (audioBase64: string, phonemes: Array<{time: number; blendshape: string; weight: number}>, messageId?: string) => {
      if (!isReady) {
        console.warn('[Unity Bridge] Unity not ready for phoneme playback');
        return;
      }

      console.log('[Unity Bridge] 🎵 Sending audio + phonemes to Unity - Phonemes:', phonemes.length);
      
      // Send PLAY_TTS_WITH_PHONEMES message
      sendMessageToUnity('PLAY_TTS_WITH_PHONEMES', {
        audioData: audioBase64,
        phonemes,
        id: messageId || `tts-phoneme-${Date.now()}`,
      });
      
      console.log('[Unity Bridge] ✅ Audio + phonemes sent to Unity iframe');
    },
    [isReady, sendMessageToUnity]
  );

  return {
    sendAudioToAvatar,
    sendAudioWithPhonemesToAvatar,
    setEmotion,
    triggerGesture,
    changeAvatar,
    stopAudio,
    isReady,
    isHandshakeComplete,
    isAudioUnlocked,
  };
}
