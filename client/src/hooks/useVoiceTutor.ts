import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from './use-toast';

// WebSocket message types
type WSMessageType = 
  | 'AUDIO_CHUNK' 
  | 'TRANSCRIPTION' 
  | 'TTS_CHUNK' 
  | 'TTS_START' 
  | 'TTS_END'
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
  sessionState?: any;
}

interface UseVoiceTutorOptions {
  chatId: string;
  onTranscription?: (text: string) => void;
  onTTSStart?: () => void;
  onTTSEnd?: () => void;
  onError?: (error: string) => void;
}

export function useVoiceTutor({ 
  chatId, 
  onTranscription,
  onTTSStart,
  onTTSEnd,
  onError 
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
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const reconnectAttemptsRef = useRef(0);
  const shouldReconnectRef = useRef(true);
  const { toast } = useToast();

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
    
    source.onended = () => {
      isPlayingRef.current = false;
      
      if (audioQueueRef.current.length > 0) {
        playNextAudio();
      } else {
        setState(prev => ({ ...prev, isSpeaking: false }));
      }
    };
    
    source.start();
  }, []);

  // Handle TTS audio chunk
  const handleTTSChunk = useCallback(async (audioData: ArrayBuffer) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }

    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData.slice(0));
      audioQueueRef.current.push(audioBuffer);
      playNextAudio();
    } catch (error) {
      console.error('[VOICE] Audio decode error:', error);
    }
  }, [playNextAudio]);

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
            transcription: message.data.text 
          }));
          onTranscription?.(message.data.text);
          break;

        case 'TTS_START':
          setState(prev => ({ ...prev, isSpeaking: true }));
          onTTSStart?.();
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
  }, [handleTTSChunk, onTranscription, onTTSStart, onTTSEnd, onError, toast]);

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
  };
}
