import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './use-toast';
import pako from 'pako';

// WebSocket message types
type WSMessageType = 
  | 'AUDIO_CHUNK' 
  | 'TRANSCRIPTION' 
  | 'TTS_CHUNK' 
  | 'TTS_START' 
  | 'TTS_END'
  | 'TTS_SKIP'       // PHASE 1: Skip failed TTS chunk
  | 'INTERRUPT' 
  | 'SESSION_STATE' 
  | 'ERROR' 
  | 'PING' 
  | 'PONG';

interface WSMessage {
  type: WSMessageType;
  data?: any;
  error?: string;
}

interface VoiceState {
  isConnected: boolean;
  isRecording: boolean;
  isProcessing: boolean;
  isSpeaking: boolean;
  transcription: string;
  detectedLanguage?: 'hi' | 'en' | string;
  sessionState?: any;
}

interface UseVoiceTutorOptions {
  chatId: string;
  onTranscription?: (text: string) => void;
  onTTSStart?: () => void;
  onTTSEnd?: () => void;
  onError?: (error: string) => void;
  onLanguageChange?: (language: 'hi' | 'en') => void;
}

export function useVoiceTutor({ 
  chatId, 
  onTranscription,
  onTTSStart,
  onTTSEnd,
  onError,
  onLanguageChange
}: UseVoiceTutorOptions) {
  const [state, setState] = useState<VoiceState>({
    isConnected: false,
    isRecording: false,
    isProcessing: false,
    isSpeaking: false,
    transcription: '',
  });

  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<AudioBuffer[]>([]);
  const isPlayingRef = useRef(false);
  const currentAudioSourceRef = useRef<AudioBufferSourceNode | null>(null); // 🔥 Track current playing source
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const { toast } = useToast();

  // 🚀 PHASE 1: Sequence-based TTS queue for out-of-order handling
  const ttsSequenceQueueRef = useRef<Map<number, AudioBuffer>>(new Map());
  const nextExpectedSequenceRef = useRef(0);
  const skippedSequencesRef = useRef<Set<number>>(new Set());

  // Get WebSocket URL
  const getWsUrl = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/tutor/voice?chatId=${chatId}`;
  }, [chatId]);

  // Send WebSocket message
  const sendMessage = useCallback((type: WSMessageType, data?: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type, data }));
    }
  }, []);

  // Handle audio playback queue
  const playNextAudio = useCallback(async () => {
    if (isPlayingRef.current || audioQueueRef.current.length === 0) {
      return;
    }

    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    isPlayingRef.current = true;
    const audioBuffer = audioQueueRef.current.shift()!;
    
    const source = audioContextRef.current.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(audioContextRef.current.destination);
    
    // 🔥 Track current playing source for interruption/reset
    currentAudioSourceRef.current = source;
    
    source.onended = () => {
      isPlayingRef.current = false;
      currentAudioSourceRef.current = null; // Clear reference when done
      
      if (audioQueueRef.current.length > 0) {
        playNextAudio();
      } else {
        setState(prev => ({ ...prev, isSpeaking: false }));
      }
    };
    
    source.start();
  }, []);

  // 🚀 PHASE 1: Process sequence-based TTS queue (handles out-of-order chunks)
  const processSequenceQueue = useCallback(() => {
    // Check if we have the next expected chunk (or it was skipped)
    while (
      ttsSequenceQueueRef.current.has(nextExpectedSequenceRef.current) ||
      skippedSequencesRef.current.has(nextExpectedSequenceRef.current)
    ) {
      const seq = nextExpectedSequenceRef.current;
      
      if (skippedSequencesRef.current.has(seq)) {
        // Skip this sequence - TTS generation failed
        console.log(`[STREAMING TTS] ⏭️ Skipping sequence ${seq}`);
        skippedSequencesRef.current.delete(seq);
      } else {
        // Play this chunk
        const buffer = ttsSequenceQueueRef.current.get(seq)!;
        audioQueueRef.current.push(buffer);
        ttsSequenceQueueRef.current.delete(seq);
        console.log(`[STREAMING TTS] ▶️ Queued sequence ${seq}`);
      }
      
      nextExpectedSequenceRef.current++;
    }
    
    // Start playback if not already playing
    playNextAudio();
  }, [playNextAudio]);

  // Handle TTS audio chunk with sequence number
  const handleTTSChunk = useCallback(async (audioData: ArrayBuffer, sequence?: number) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.slice(0));
      
      if (sequence !== undefined) {
        // 🚀 PHASE 1: Sequence-based handling
        console.log(`[STREAMING TTS] 📥 Received chunk with sequence ${sequence}`);
        ttsSequenceQueueRef.current.set(sequence, audioBuffer);
        processSequenceQueue();
      } else {
        // Legacy: No sequence number, play immediately
        audioQueueRef.current.push(audioBuffer);
        playNextAudio();
      }
    } catch (error) {
      console.error('[VOICE] Audio decode error:', error);
    }
  }, [playNextAudio, processSequenceQueue]);

  // Handle TTS skip message
  const handleTTSSkip = useCallback((sequence: number) => {
    console.log(`[STREAMING TTS] ⏭️ Marking sequence ${sequence} as skipped`);
    skippedSequencesRef.current.add(sequence);
    processSequenceQueue();
  }, [processSequenceQueue]);

  // Handle WebSocket messages
  const handleMessage = useCallback(async (event: MessageEvent) => {
    if (event.data instanceof Blob) {
      // Binary TTS chunk
      const arrayBuffer = await event.data.arrayBuffer();
      handleTTSChunk(arrayBuffer);
      return;
    }

    try {
      const message: WSMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'TRANSCRIPTION':
          setState(prev => ({ 
            ...prev, 
            isProcessing: false,
            transcription: message.data.text,
            detectedLanguage: message.data.language || prev.detectedLanguage
          }));
          onTranscription?.(message.data.text);
          break;

        case 'TTS_CHUNK': {
          // 🚀 PHASE 1: Handle sequence-based TTS chunks (new format)
          // 🚀 PHASE 2.2: Support compressed audio
          // Also support legacy format for backward compatibility
          let audioDataB64: string | undefined;
          let sequence: number | undefined;
          let isLast = false;
          let compressed = false;
          
          if (message.data && typeof message.data === 'object') {
            // New format: { type, data: { sequence, data, text, isLast, compressed } }
            audioDataB64 = message.data.data;
            sequence = message.data.sequence;
            isLast = message.data.isLast;
            compressed = message.data.compressed || false;
          } else if (message.data && typeof message.data === 'string') {
            // Legacy format: { type, data: "base64..." }
            audioDataB64 = message.data;
          }
          
          if (audioDataB64) {
            let audioData = Uint8Array.from(atob(audioDataB64), c => c.charCodeAt(0));
            
            // 🚀 PHASE 2.2: Decompress if needed
            if (compressed) {
              try {
                audioData = pako.inflate(audioData);
                console.log('[STREAMING TTS] 📦 Decompressed audio chunk');
              } catch (error) {
                console.error('[STREAMING TTS] Decompression failed:', error);
              }
            }
            
            await handleTTSChunk(audioData.buffer, sequence);
            
            if (isLast) {
              console.log('[STREAMING TTS] ✅ Last chunk received');
            }
          }
          break;
        }

        case 'TTS_SKIP': {
          // 🚀 PHASE 1: Handle skipped TTS chunks
          if (message.data && typeof message.data === 'object') {
            const { sequence, reason } = message.data;
            console.log(`[STREAMING TTS] ⏭️ Skipping sequence ${sequence}: ${reason}`);
            handleTTSSkip(sequence);
          }
          break;
        }

        case 'TTS_START':
          setState(prev => ({ ...prev, isSpeaking: true }));
          onTTSStart?.();
          
          // 🔥 CRITICAL FIX: Stop currently playing audio source to prevent overlap
          if (currentAudioSourceRef.current) {
            try {
              currentAudioSourceRef.current.stop();
              currentAudioSourceRef.current.disconnect();
              currentAudioSourceRef.current = null;
            } catch (e) {
              // Source may have already ended, ignore error
            }
          }
          
          // 🔥 CRITICAL: Fully reset sequence tracking AND audio queue for new TTS session
          // This handles fallback from realtime to legacy correctly
          nextExpectedSequenceRef.current = 0;
          ttsSequenceQueueRef.current.clear();
          skippedSequencesRef.current.clear();
          audioQueueRef.current = []; // Clear pending audio to prevent mixing old/new
          isPlayingRef.current = false; // Reset playback state
          break;

        case 'TTS_END':
          onTTSEnd?.();
          break;

        case 'SESSION_STATE':
          setState(prev => ({ ...prev, sessionState: message.data }));
          break;

        case 'ERROR':
          console.error('[VOICE] Server error:', message.error);
          toast({
            title: "Voice Error",
            description: message.error || "An error occurred",
            variant: "destructive"
          });
          onError?.(message.error || "Unknown error");
          setState(prev => ({ 
            ...prev, 
            isProcessing: false, 
            isRecording: false 
          }));
          break;

        case 'PONG':
          // Heartbeat response
          break;
      }
    } catch (error) {
      console.error('[VOICE] Message parse error:', error);
    }
  }, [handleTTSChunk, handleTTSSkip, onTranscription, onTTSStart, onTTSEnd, onError, toast]);

  // Connect to WebSocket
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return;
    }

    const ws = new WebSocket(getWsUrl());
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('[VOICE] WebSocket connected');
      setState(prev => ({ ...prev, isConnected: true }));
      reconnectAttemptsRef.current = 0;
      shouldReconnectRef.current = true; // Enable auto-reconnect for fault tolerance
      
      // Start heartbeat
      const pingInterval = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          sendMessage('PING');
        } else {
          clearInterval(pingInterval);
        }
      }, 30000);
    };

    ws.onmessage = handleMessage;

    ws.onerror = (error) => {
      console.error('[VOICE] WebSocket error:', error);
    };

    ws.onclose = (event) => {
      console.log('[VOICE] WebSocket closed:', event.code, event.reason);
      setState(prev => ({ 
        ...prev, 
        isConnected: false, 
        isRecording: false,
        isProcessing: false 
      }));

      // Only auto-reconnect if not intentionally disconnected
      if (shouldReconnectRef.current && reconnectAttemptsRef.current < 5) {
        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000);
        reconnectAttemptsRef.current++;
        
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('[VOICE] Reconnecting... attempt', reconnectAttemptsRef.current);
          connect();
        }, delay);
      } else if (!shouldReconnectRef.current) {
        console.log('[VOICE] Intentional disconnect - no reconnect');
      } else {
        toast({
          title: "Voice Connection Lost",
          description: "Unable to reconnect. Please refresh the page.",
          variant: "destructive"
        });
      }
    };
  }, [getWsUrl, handleMessage, sendMessage, toast]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    // Prevent auto-reconnect on intentional disconnect
    shouldReconnectRef.current = false;
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current = null;
    }

    setState({
      isConnected: false,
      isRecording: false,
      isProcessing: false,
      isSpeaking: false,
      transcription: '',
    });
  }, []);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!state.isConnected) {
      toast({
        title: "Not Connected",
        description: "Please wait for voice connection",
        variant: "destructive"
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
        } 
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && wsRef.current?.readyState === WebSocket.OPEN) {
          const arrayBuffer = await event.data.arrayBuffer();
          wsRef.current.send(arrayBuffer);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(track => track.stop());
        setState(prev => ({ 
          ...prev, 
          isRecording: false, 
          isProcessing: true 
        }));
      };

      mediaRecorder.start(250); // Send chunks every 250ms
      setState(prev => ({ ...prev, isRecording: true }));

    } catch (error) {
      console.error('[VOICE] Mic access error:', error);
      toast({
        title: "Microphone Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive"
      });
    }
  }, [state.isConnected, toast]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  // Interrupt AI speaking
  const interrupt = useCallback(() => {
    // Stop audio playback
    audioQueueRef.current = [];
    isPlayingRef.current = false;
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    // Send interrupt signal to server
    sendMessage('INTERRUPT');
    
    setState(prev => ({ ...prev, isSpeaking: false }));
  }, [sendMessage]);

  // Auto-update chat language when detected
  useEffect(() => {
    const updateLanguage = async () => {
      if (state.detectedLanguage && (state.detectedLanguage === 'hi' || state.detectedLanguage === 'en')) {
        try {
          const response = await fetch(`/api/chats/${chatId}/language`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ language: state.detectedLanguage })
          });
          
          if (response.ok) {
            console.log('[VOICE] Auto-updated chat language to:', state.detectedLanguage);
            onLanguageChange?.(state.detectedLanguage as 'hi' | 'en');
          }
        } catch (error) {
          console.error('[VOICE] Failed to update language:', error);
        }
      }
    };

    updateLanguage();
  }, [state.detectedLanguage, chatId, onLanguageChange]);

  // Auto-connect on mount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    state,
    connect,
    disconnect,
    startRecording,
    stopRecording,
    interrupt,
    isConnected: state.isConnected,
    isRecording: state.isRecording,
    isProcessing: state.isProcessing,
    isSpeaking: state.isSpeaking,
    transcription: state.transcription,
    detectedLanguage: state.detectedLanguage,
  };
}
