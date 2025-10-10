import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import {
  Bot,
  User,
  Lightbulb,
  HelpCircle,
  BookOpen,
  Brain,
  FileText,
  Send,
  Mic,
  CheckCircle,
  Clock,
  TrendingUp,
  AlertCircle,
  Settings,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCircle,
} from "lucide-react";
import { Chat, Message } from "@shared/schema";
import QuickToolModal from "./QuickToolModal";
import VoiceControl from "./VoiceControl";
import { Phone, PhoneOff } from "lucide-react";
import { useUnityAvatar } from "@/contexts/UnityAvatarContext";
import { AvatarContainer } from "./avatar/AvatarContainer";
import { useVoiceTutor } from "@/hooks/useVoiceTutor";

interface TutorResponse {
  type: 'teach' | 'check' | 'diagnose';
  content: string;
  explain?: string;
  check?: {
    stem: string;
    options: string[];
    answer: string[];
  };
  diagnostic?: string;
  progress?: number;
  options?: string[];
  meta?: any;
}

interface TutorSessionProps {
  chatId: string;
  onEndSession: () => void;
}

type ToolType = 'explain' | 'hint' | 'example' | 'practice5' | 'summary';

export default function TutorSession({ chatId, onEndSession }: TutorSessionProps) {
  const [message, setMessage] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeToolModal, setActiveToolModal] = useState<ToolType | null>(null);
  const [toolStreaming, setToolStreaming] = useState(false);
  const [toolStreamingContent, setToolStreamingContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [shouldAutoPlayTTS, setShouldAutoPlayTTS] = useState(false);
  const [lessonPlanCollapsed, setLessonPlanCollapsed] = useState(false);
  const [quickToolsCollapsed, setQuickToolsCollapsed] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  // PHASE 2: Unified WebSocket for voice + text
  const voiceTutor = useVoiceTutor({
    chatId,
    onTranscription: (text) => {
      console.log('[TutorSession] Transcription received:', text);
    },
    onTTSStart: () => {
      setPlayingAudio('tts');
    },
    onTTSEnd: () => {
      setPlayingAudio(null);
    },
    onError: (error) => {
      toast({
        title: "Voice Error",
        description: error,
        variant: "destructive"
      });
    }
  });
  
  // 🔥 CRITICAL FIX: Connect WebSocket on mount
  useEffect(() => {
    console.log('[TutorSession] 🚀 Connecting WebSocket for chat:', chatId);
    voiceTutor.connect();
    
    return () => {
      console.log('[TutorSession] 🔌 Disconnecting WebSocket');
      voiceTutor.disconnect();
    };
  }, [chatId]);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Access global Unity avatar from context (for compatibility)
  const { 
    avatarRef: unityAvatarRef, 
    isReady: avatarIsReady, 
    isLoading: avatarIsLoading
  } = useUnityAvatar();

  const { data: chat, isLoading: chatLoading } = useQuery<Chat>({
    queryKey: [`/api/chats/${chatId}`],
    enabled: !!chatId,
  });

  const { data: rawMessages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: [`/api/chats/${chatId}/messages`],
    enabled: !!chatId,
  });

  // 🔧 FIX: Sort messages by createdAt with useMemo to avoid re-sorting on every render
  const messages = useMemo(() => {
    return [...rawMessages].sort((a, b) => {
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateA - dateB; // Ascending order (oldest first)
    });
  }, [rawMessages]);

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: tutorSession } = useQuery<{
    session: {
      id: string;
      chatId: string;
      currentPhase: string;
      progress: number;
      personaId: string;
      level: string;
      subject: string;
      topic: string;
    };
    resumeText: string;
    canResume: boolean;
  }>({
    queryKey: [`/api/tutor/optimized/session/${chatId}`],
    enabled: !!chatId,
    retry: false,
  });

  // PHASE 2: WebSocket-based text query (replaces HTTP streaming)
  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      console.log('[TutorSession] Sending text query via WebSocket:', messageText);
      
      // Send via WebSocket instead of HTTP
      const success = voiceTutor.sendTextQuery(messageText, chat?.language as 'hi' | 'en' | undefined);
      
      if (!success) {
        throw new Error('WebSocket not connected');
      }
      
      // Wait a bit for response to start (WebSocket is async)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return { success: true };
    },
    onSuccess: () => {
      setMessage("");
      // 📝 Invalidate queries to refresh messages - streaming response will clear after
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
      queryClient.invalidateQueries({ queryKey: [`/api/tutor/optimized/session/${chatId}`] });
    },
    onError: (error) => {
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });

  const transcribeMutation = useMutation({
    mutationFn: async (audioBlob: Blob) => {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', chat?.language || 'en');

      const response = await fetch('/api/tutor/transcribe', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to transcribe audio');
      }

      return response.json();
    },
    onSuccess: (data) => {
      const transcript = data.transcript;
      if (transcript && transcript.trim()) {
        const tempUserMessage: Message = {
          id: `temp-${Date.now()}`,
          chatId: chatId,
          role: 'user',
          content: transcript.trim(),
          createdAt: new Date(),
          tool: null,
          metadata: null,
        };
        
        queryClient.setQueryData<Message[]>(
          [`/api/chats/${chatId}/messages`],
          (old = []) => [...old, tempUserMessage]
        );
        
        sendMessageMutation.mutate(transcript.trim());
      }
    },
    onError: () => {
      toast({
        title: "Transcription Failed",
        description: "Could not transcribe your voice. Please try again.",
        variant: "destructive",
      });
    },
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        transcribeMutation.mutate(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
    } catch (error) {
      toast({
        title: "Microphone Access Denied",
        description: "Please allow microphone access to use voice input.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const playAudio = async (messageId: string, text: string) => {
    console.log('[TTS] playAudio called for message:', messageId);
    
    if (playingAudio === messageId && audioElement) {
      console.log('[TTS] Muting/stopping currently playing audio');
      audioElement.pause();
      audioElement.src = '';
      audioElement.remove();
      setPlayingAudio(null);
      setAudioElement(null);
      return;
    }

    if (audioElement) {
      console.log('[TTS] Stopping other playing audio');
      audioElement.pause();
      audioElement.src = '';
      audioElement.remove();
      setPlayingAudio(null);
      setAudioElement(null);
    }

    try {
      console.log('[TTS] Setting playing audio to:', messageId);
      setPlayingAudio(messageId);

      console.log('[TTS] 🚀 CODE VERSION: 2025-10-09-PHONEME-FINAL 🚀');
      console.log('[TTS] Fetching emotion-based TTS for text:', text.substring(0, 50) + '...');
      
      // 🎯 CRITICAL: Reliable tutor session detection (use tutorSession data, not chat!)
      // tutorSession comes from useTutorSessionData hook - more reliable than chat
      const isOptimizedSession = !!tutorSession || chat?.mode === 'tutor';
      console.log('[TTS] tutorSession exists:', !!tutorSession, 'chat.mode:', chat?.mode, 'isOptimizedSession:', isOptimizedSession);
      
      // 🎯 ALWAYS use phoneme endpoint for tutor mode
      const usePhonemeTTS = isOptimizedSession;
      const ttsEndpoint = usePhonemeTTS
        ? '/api/tutor/optimized/session/tts-with-phonemes'
        : '/api/tutor/tts';
      console.log('[TTS] Endpoint:', ttsEndpoint);
      
      const requestBody = isOptimizedSession
        ? { chatId, text }
        : { text: text, voice: 'nova' };

      const response = await fetch(ttsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(requestBody),
      });

      console.log('[TTS] Response status:', response.status);
      if (!response.ok) {
        throw new Error(`Failed to generate speech: ${response.status}`);
      }

      // 🎯 Handle phoneme-based response (JSON) vs regular audio (blob)
      let audioBlob: Blob;
      let phonemes: Array<{time: number; blendshape: string; weight: number}> = [];
      
      if (usePhonemeTTS) {
        // Phoneme-based TTS returns JSON
        const ttsData = await response.json();
        console.log('[TTS] Phoneme data received - Phonemes:', ttsData.phonemes?.length || 0, 'Audio base64 length:', ttsData.audio?.length || 0);
        
        // Convert base64 audio to blob (🎯 FIX: Polly returns MP3, not WAV)
        const audioBuffer = Uint8Array.from(atob(ttsData.audio), c => c.charCodeAt(0));
        audioBlob = new Blob([audioBuffer], { type: 'audio/mpeg' }); // Correct MIME type for Polly MP3
        phonemes = ttsData.phonemes || [];
        
        console.log('[TTS] Converted to blob, size:', audioBlob.size);
      } else {
        // Regular TTS returns audio blob
        audioBlob = await response.blob();
        console.log('[TTS] Audio blob received, size:', audioBlob.size, 'type:', audioBlob.type);
      }
      
      // 🎭 AVATAR: Check if Unity is ready OR loading (wait if loading)
      const currentAvatarReady = unityAvatarRef.current?.isReady || false;
      const isAvatarStillLoading = avatarIsLoading && !currentAvatarReady;
      
      console.log('[Avatar] Status check - Ready:', currentAvatarReady, 'Loading:', isAvatarStillLoading);
      
      // 🎭 AVATAR: If Unity is loading, wait up to 5 seconds for it to be ready
      if (isAvatarStillLoading && unityAvatarRef.current) {
        console.log('[Avatar] ⏳ Unity loading... waiting for it to be ready (max 5s)');
        
        const waitForUnity = new Promise<boolean>((resolve) => {
          const startTime = Date.now();
          const checkInterval = setInterval(() => {
            const isNowReady = unityAvatarRef.current?.isReady || false;
            const elapsed = Date.now() - startTime;
            
            if (isNowReady) {
              clearInterval(checkInterval);
              console.log('[Avatar] ✅ Unity ready after', elapsed, 'ms');
              resolve(true);
            } else if (elapsed > 5000) {
              clearInterval(checkInterval);
              console.log('[Avatar] ⏱️ Timeout waiting for Unity (5s) - using browser fallback');
              resolve(false);
            }
          }, 100); // Check every 100ms
        });
        
        const unityBecameReady = await waitForUnity;
        
        if (unityBecameReady && unityAvatarRef.current) {
          console.log('[Avatar] ✅ Unity ready - sending audio with lip-sync');
          try {
            // 🎯 Use phoneme-based method if phonemes available
            if (phonemes.length > 0 && usePhonemeTTS) {
              console.log('[Avatar] 🎵 Sending phoneme-based lip-sync - Phonemes:', phonemes.length);
              // Convert blob to base64 for phoneme method
              const audioBase64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
                reader.readAsDataURL(audioBlob);
              });
              unityAvatarRef.current.sendAudioWithPhonemesToAvatar(audioBase64, phonemes, messageId);
            } else {
              console.log('[Avatar] 🔊 Sending amplitude-based lip-sync (no phonemes)');
              await unityAvatarRef.current.sendAudioToAvatar(audioBlob);
            }
            console.log('[Avatar] ✅ Audio sent to Unity successfully');
            setPlayingAudio(null);
            return; // Exit early - Unity plays the audio
          } catch (avatarError) {
            console.error('[Avatar] ❌ Failed to send audio:', avatarError);
            console.warn('[Avatar] ⚠️ Falling back to browser audio');
          }
        }
      }
      
      // 🎭 AVATAR: If Unity is already ready, send immediately
      if (currentAvatarReady && unityAvatarRef.current) {
        console.log('[Avatar] ✅ Avatar ready - sending audio to Unity WebGL with lip-sync');
        console.log('[Avatar] 🔇 Skipping browser audio - Unity will play with lip-sync');
        
        // 🔍 DEBUG: Force visible alert to verify execution
        console.log('🔍 DEBUG: Phonemes count:', phonemes.length, 'usePhonemeTTS:', usePhonemeTTS);
        
        try {
          // 🎯 Use phoneme-based method if phonemes available
          if (phonemes.length > 0 && usePhonemeTTS) {
            console.log('[Avatar] 🎵 Sending phoneme-based lip-sync - Phonemes:', phonemes.length);
            console.log('🔍 DEBUG: About to send', phonemes.length, 'phonemes to Unity');
            
            // Convert blob to base64 for phoneme method
            const audioBase64 = await new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result?.toString().split(',')[1] || '');
              reader.readAsDataURL(audioBlob);
            });
            
            console.log('🔍 DEBUG: Base64 audio length:', audioBase64.length);
            console.log('🔍 DEBUG: Calling sendAudioWithPhonemesToAvatar...');
            
            unityAvatarRef.current.sendAudioWithPhonemesToAvatar(audioBase64, phonemes, messageId);
            
            console.log('🔍 DEBUG: ✅ sendAudioWithPhonemesToAvatar called successfully!');
          } else {
            console.log('[Avatar] 🔊 Sending amplitude-based lip-sync (no phonemes)');
            console.log('🔍 DEBUG: No phonemes, using amplitude method');
            await unityAvatarRef.current.sendAudioToAvatar(audioBlob);
          }
          console.log('[Avatar] ✅ Audio sent to Unity successfully');
          setPlayingAudio(null);
          return; // Exit early - Unity plays the audio
        } catch (avatarError) {
          console.error('[Avatar] ❌ Failed to send audio to avatar:', avatarError);
          console.warn('[Avatar] ⚠️ Falling back to browser audio playback');
        }
      } else {
        console.log('[Avatar] Avatar not ready - using browser audio playback');
        console.log('🔍 DEBUG: currentAvatarReady:', currentAvatarReady, 'unityAvatarRef exists:', !!unityAvatarRef.current);
      }
      
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('[TTS] Audio URL created:', audioUrl);
      
      const audio = new Audio(audioUrl);
      console.log('[TTS] Audio element created');
      
      // Add load event handlers
      audio.onloadstart = () => console.log('[TTS] Audio loading started');
      audio.onloadedmetadata = () => {
        console.log('[TTS] Audio metadata loaded');
        console.log('[TTS] Duration:', audio.duration);
        console.log('[TTS] Audio type:', audioBlob.type);
      };
      audio.oncanplay = () => console.log('[TTS] Audio can start playing');
      audio.oncanplaythrough = () => console.log('[TTS] Audio can play through without buffering');

      audio.onended = () => {
        console.log('[TTS] Audio playback ended');
        setPlayingAudio(null);
        setAudioElement(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (e) => {
        console.error('[TTS] Audio playback error event:', e);
        
        // Get detailed error information from audio element
        const mediaError = audio.error;
        let errorDetails = 'Unknown error';
        let errorCode = 'UNKNOWN';
        
        if (mediaError) {
          errorCode = mediaError.code.toString();
          switch (mediaError.code) {
            case MediaError.MEDIA_ERR_ABORTED:
              errorDetails = 'Audio loading aborted by user';
              break;
            case MediaError.MEDIA_ERR_NETWORK:
              errorDetails = 'Network error while loading audio';
              break;
            case MediaError.MEDIA_ERR_DECODE:
              errorDetails = 'Audio decoding failed - format may be unsupported or corrupt';
              break;
            case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED:
              errorDetails = 'Audio format not supported by browser';
              break;
            default:
              errorDetails = mediaError.message || 'Unknown media error';
          }
          console.error('[TTS] Media Error Code:', mediaError.code);
          console.error('[TTS] Media Error Message:', mediaError.message);
          console.error('[TTS] Error Details:', errorDetails);
        }
        
        console.error('[TTS] Audio src:', audio.src);
        console.error('[TTS] Audio readyState:', audio.readyState);
        console.error('[TTS] Audio networkState:', audio.networkState);
        
        setPlayingAudio(null);
        setAudioElement(null);
        URL.revokeObjectURL(audioUrl);
        
        toast({
          title: "Audio Playback Error",
          description: `${errorDetails} (Code: ${errorCode})`,
          variant: "destructive",
        });
      };

      setAudioElement(audio);
      console.log('[TTS] Attempting to play audio...');
      
      await audio.play();
      console.log('[TTS] Audio play() successful');
    } catch (error: any) {
      console.error('[TTS] Error in playAudio:', error);
      setPlayingAudio(null);
      setAudioElement(null);
      
      if (error.name === 'NotAllowedError') {
        console.log('[TTS] Audio autoplay blocked by browser policy');
        toast({
          title: "Audio Blocked",
          description: "Please interact with the page first to enable audio playback.",
          variant: "default",
        });
      } else {
        toast({
          title: "Speech Generation Failed",
          description: error.message || "Could not generate speech. Please try again.",
          variant: "destructive",
        });
      }
    }
  };

  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages, voiceTutor.transcription, voiceTutor.isProcessing, transcribeMutation.isPending]);

  // PHASE 2: Sync isStreaming with voiceTutor.isProcessing
  useEffect(() => {
    setIsStreaming(voiceTutor.isProcessing);
  }, [voiceTutor.isProcessing]);
  
  // 📝 Clear streaming response only when NEW assistant message actually appears
  const lastAssistantIdRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Find most recent assistant message
    const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant');
    
    if (voiceTutor.streamingResponse && !voiceTutor.isProcessing && lastAssistant) {
      // Check if this is a NEW assistant message (different ID from last tracked)
      if (lastAssistantIdRef.current !== lastAssistant.id) {
        console.log(`[STREAMING] ✅ New assistant message detected (${lastAssistant.id}), clearing streaming response`);
        lastAssistantIdRef.current = lastAssistant.id;
        voiceTutor.clearStreamingResponse();
      }
    }
    
    // Update tracking even if not clearing (for next message)
    if (lastAssistant && lastAssistantIdRef.current !== lastAssistant.id) {
      lastAssistantIdRef.current = lastAssistant.id;
    }
  }, [messages, voiceTutor.streamingResponse, voiceTutor.isProcessing, voiceTutor]);

  const lastPlayedRef = useRef<string | null>(null);
  const [avatarViewState, setAvatarViewState] = useState<'minimized' | 'half' | 'fullscreen' | 'fullscreen-chat'>('minimized'); // 🆕 Track avatar visibility

  // 🔧 FIX: Clear lastPlayedRef when chatId changes or component unmounts
  useEffect(() => {
    console.log('[TTS] 🧹 Chat changed, clearing lastPlayedRef');
    lastPlayedRef.current = null;
    
    return () => {
      console.log('[TTS] 🧹 Component unmounting, clearing lastPlayedRef');
      lastPlayedRef.current = null;
    };
  }, [chatId]);

  // 🔧 FIX: Stop audio when avatar closes
  const stopAudioPlayback = useCallback(() => {
    console.log('[TTS] 🛑 Stopping all audio playback');
    
    // Stop browser audio
    if (audioElement) {
      console.log('[TTS] 🛑 Stopping browser audio element');
      audioElement.pause();
      audioElement.src = '';
      audioElement.remove();
      setAudioElement(null);
      setPlayingAudio(null);
    }
    
    // Stop Unity audio
    if (unityAvatarRef.current?.stopAudio) {
      console.log('[TTS] 🛑 Stopping Unity avatar audio');
      unityAvatarRef.current.stopAudio();
    }
  }, [audioElement, unityAvatarRef]);

  // 🔧 FIX: Stop audio when avatar minimizes
  useEffect(() => {
    if (avatarViewState === 'minimized') {
      console.log('[TTS] 🛑 Avatar minimized - stopping audio');
      stopAudioPlayback();
    }
  }, [avatarViewState, stopAudioPlayback]);

  useEffect(() => {
    // 🎯 CRITICAL: Auto-play TTS ONLY when avatar is VISIBLE (not minimized)
    const isAvatarVisible = avatarViewState !== 'minimized';
    
    if (messages.length > 0 && chat && avatarIsReady && isAvatarVisible) {
      const lastMessage = messages[messages.length - 1];
      
      if (
        lastMessage.role === 'assistant' && 
        lastMessage.id !== lastPlayedRef.current &&
        !isStreaming
      ) {
        console.log('[TTS] ✅ Avatar VISIBLE - Auto-playing with lip-sync:', lastMessage.id);
        console.log('[TTS] Chat mode:', chat.mode, '- Will use', chat.mode === 'tutor' ? 'PHONEME' : 'REGULAR', 'TTS');
        lastPlayedRef.current = lastMessage.id;
        
        playAudio(lastMessage.id, lastMessage.content).catch((err) => {
          console.log('[TTS] Auto-play blocked, user can click speaker manually', err);
        });
      }
    } else if (messages.length > 0 && chat && !isAvatarVisible) {
      console.log('[TTS] ⏳ Avatar minimized - TTS will play when avatar opens...');
    } else if (messages.length > 0 && chat && !avatarIsReady) {
      console.log('[TTS] ⏳ Waiting for avatar Unity instance to load...');
    }
  }, [messages, isStreaming, chat, avatarIsReady, avatarViewState]); // 🆕 Added avatarViewState dependency

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isStreaming) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleQuickToolSubmit = async (toolType: ToolType, formData: any) => {
    if (!chat) return;

    setToolStreaming(true);
    setToolStreamingContent("");

    try {
      const response = await fetch('/api/tutor/quick-tool', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId: chatId,
          toolType,
          subject: chat.subject,
          level: chat.level,
          topic: chat.topic,
          ...formData
        })
      });

      if (!response.ok) {
        throw new Error('Failed to execute quick tool');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error('No response stream');

      let fullContent = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';

        for (const event of events) {
          const lines = event.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                
                if (data.type === 'chunk') {
                  fullContent += data.content;
                  setToolStreamingContent(fullContent);
                } else if (data.type === 'complete') {
                  fullContent = data.content;
                  setToolStreamingContent(fullContent);
                } else if (data.type === 'done') {
                  setToolStreaming(false);
                  queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
                  toast({
                    title: "Generated Successfully",
                    description: "Quick tool result has been added to the chat",
                  });
                  setTimeout(() => {
                    setActiveToolModal(null);
                    setToolStreamingContent("");
                  }, 1500);
                } else if (data.type === 'error') {
                  throw new Error(data.message);
                }
              } catch (parseError) {
                console.warn('Failed to parse SSE event:', line, parseError);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Quick tool error:', error);
      setToolStreaming(false);
      toast({
        title: "Error",
        description: "Failed to execute quick tool. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (chatLoading || messagesLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Chat not found</p>
      </div>
    );
  }

  const userMessages = messages.filter(m => m.role === 'user').length;
  const totalMessages = messages.length;
  
  const progress = totalMessages > 0 ? Math.min(Math.round((userMessages / 15) * 100), 100) : 0;
  
  const introComplete = userMessages >= 2;
  const coreConceptsComplete = userMessages >= 8;
  const practiceComplete = userMessages >= 15;
  
  const currentPhase = userMessages >= 8 ? 'practice' : userMessages >= 2 ? 'core-concepts' : 'introduction';
  
  const startTime = chat.createdAt ? new Date(chat.createdAt) : new Date();
  const elapsedMs = new Date().getTime() - startTime.getTime();
  const elapsedMin = Math.floor(elapsedMs / 60000);
  
  const questionsAnswered = userMessages;
  const estimatedTotal = Math.max(15, userMessages + 3);

  return (
    <div className="h-full flex gap-6 p-6">
      {/* Left: Lesson Plan */}
      <div className={`${lessonPlanCollapsed ? 'w-12' : 'w-72'} bg-gradient-to-br from-card-subtle to-card rounded-2xl border border-border overflow-hidden transition-all duration-300 flex flex-col shadow-lg`}>
        <div className="p-5 flex items-center justify-between border-b border-border/50 bg-gradient-to-r from-primary/5 to-purple-500/5">
          {!lessonPlanCollapsed && (
            <h3 className="font-semibold text-sm text-foreground uppercase tracking-wide">
              Lesson Plan
            </h3>
          )}
          <button
            onClick={() => setLessonPlanCollapsed(!lessonPlanCollapsed)}
            className="w-9 h-9 flex items-center justify-center hover:bg-primary/10 rounded-xl transition-all duration-200 ml-auto"
            data-testid="button-toggle-lesson-plan"
            title={lessonPlanCollapsed ? "Expand Lesson Plan" : "Collapse Lesson Plan"}
          >
            {lessonPlanCollapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <ChevronLeft className="w-5 h-5" />
            )}
          </button>
        </div>
        
        {!lessonPlanCollapsed && (
          <div className="flex-1 p-6 space-y-4 overflow-y-auto">
        <div className="space-y-3">
          <div className={`p-4 rounded-xl transition-all duration-300 ${
            introComplete 
              ? 'bg-gradient-to-br from-primary/15 to-purple-500/10 border-2 border-primary/30 shadow-md' 
              : currentPhase === 'introduction' 
              ? 'bg-gradient-to-br from-primary/10 to-purple-500/5 border-2 border-primary/20 shadow-sm' 
              : 'bg-card-subtle/50 border border-border/50'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              {introComplete ? (
                <CheckCircle className="w-5 h-5 text-primary" />
              ) : currentPhase === 'introduction' ? (
                <div className="w-5 h-5 rounded-full border-2 border-primary animate-pulse bg-primary/20"></div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30"></div>
              )}
              <span className={`text-sm font-semibold ${!introComplete && currentPhase !== 'introduction' ? 'text-muted-foreground' : 'text-foreground'}`}>
                Introduction
              </span>
            </div>
            <p className="text-xs text-muted-foreground pl-8">
              {introComplete ? 'Completed ✓' : currentPhase === 'introduction' ? 'In Progress...' : 'Not started'}
            </p>
          </div>

          <div className={`p-4 rounded-xl transition-all duration-300 ${
            coreConceptsComplete 
              ? 'bg-gradient-to-br from-primary/15 to-purple-500/10 border-2 border-primary/30 shadow-md' 
              : currentPhase === 'core-concepts' 
              ? 'bg-gradient-to-br from-primary/10 to-purple-500/5 border-2 border-primary/20 shadow-sm' 
              : 'bg-card-subtle/50 border border-border/50'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              {coreConceptsComplete ? (
                <CheckCircle className="w-5 h-5 text-primary" />
              ) : currentPhase === 'core-concepts' ? (
                <div className="w-5 h-5 rounded-full border-2 border-primary animate-pulse bg-primary/20"></div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30"></div>
              )}
              <span className={`text-sm font-semibold ${!coreConceptsComplete && currentPhase !== 'core-concepts' ? 'text-muted-foreground' : 'text-foreground'}`}>
                Core Concepts
              </span>
            </div>
            <p className="text-xs text-muted-foreground pl-8">
              {coreConceptsComplete ? 'Completed ✓' : currentPhase === 'core-concepts' ? 'In Progress...' : 'Not started'}
            </p>
          </div>

          <div className={`p-4 rounded-xl transition-all duration-300 ${
            practiceComplete 
              ? 'bg-gradient-to-br from-primary/15 to-purple-500/10 border-2 border-primary/30 shadow-md' 
              : currentPhase === 'practice' 
              ? 'bg-gradient-to-br from-primary/10 to-purple-500/5 border-2 border-primary/20 shadow-sm' 
              : 'bg-card-subtle/50 border border-border/50'
          }`}>
            <div className="flex items-center gap-3 mb-2">
              {practiceComplete ? (
                <CheckCircle className="w-5 h-5 text-primary" />
              ) : currentPhase === 'practice' ? (
                <div className="w-5 h-5 rounded-full border-2 border-primary animate-pulse bg-primary/20"></div>
              ) : (
                <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30"></div>
              )}
              <span className={`text-sm font-semibold ${!practiceComplete && currentPhase !== 'practice' ? 'text-muted-foreground' : 'text-foreground'}`}>
                Practice
              </span>
            </div>
            <p className="text-xs text-muted-foreground pl-8">
              {practiceComplete ? 'Completed ✓' : currentPhase === 'practice' ? 'In Progress...' : 'Not started'}
            </p>
          </div>
        </div>

        <div className="pt-5 border-t border-border/50">
          <div className="flex items-center justify-between text-sm mb-3">
            <span className="text-muted-foreground font-medium">Overall Progress</span>
            <span className="font-semibold text-primary">{progress}%</span>
          </div>
          <div className="w-full h-3 bg-muted/50 rounded-full overflow-hidden shadow-inner">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 transition-all duration-500 shadow-lg"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="pt-5 border-t border-border/50 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Questions Asked</span>
            <span className="font-semibold">{questionsAnswered} / {estimatedTotal}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Time Elapsed</span>
            <span className="font-semibold">{elapsedMin} min</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total Exchanges</span>
            <span className="font-semibold">{Math.floor(totalMessages / 2)}</span>
          </div>
        </div>
          </div>
        )}
      </div>

      {/* Center: Chat */}
      <div className="flex-1 bg-gradient-to-br from-card to-card-subtle rounded-2xl border border-border flex flex-col shadow-xl overflow-hidden">
        {/* Chat Header */}
        <div className="border-b border-border/50 bg-gradient-to-r from-primary/5 to-purple-500/5">
          <div className="p-5 flex items-center justify-between">
            <div>
              <h2 className="font-bold text-lg">{chat.subject} • {chat.level}</h2>
              <p className="text-sm text-muted-foreground">{chat.topic}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onEndSession}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 transition-colors duration-200"
              data-testid="button-end-session"
            >
              End Session
            </Button>
          </div>
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-8 space-y-8 scroll-smooth bg-gradient-to-b from-transparent to-primary/5" id="chat-messages-container">
          {messages.map((msg, index) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''} animate-fade-in-up stagger-${Math.min((index % 6) + 1, 6)}`}>
              {msg.role === 'assistant' && (
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Bot className="w-6 h-6 text-white" />
                </div>
              )}
              
              <div className={`flex-1 ${msg.role === 'user' ? 'max-w-2xl' : 'max-w-3xl'}`}>
                <div className={`rounded-2xl p-6 shadow-md transition-all duration-200 hover:shadow-lg ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-indigo-600 to-purple-600 text-white ml-auto' 
                    : 'bg-gradient-to-br from-slate-50/90 via-white/90 to-indigo-50/90 dark:from-slate-800/90 dark:via-slate-900/90 dark:to-indigo-950/90 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-base max-w-none dark:prose-invert leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="leading-relaxed text-base">{msg.content}</p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 px-1">
                  <p className="text-xs text-muted-foreground">
                    {new Date(msg.createdAt!).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <User className="w-6 h-6 text-white" />
                </div>
              )}
            </div>
          ))}

          {transcribeMutation.isPending && (
            <div className="flex gap-4 animate-fade-in">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Mic className="w-6 h-6 text-white animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-5 shadow-md">
                  <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                    Transcribing your voice...
                  </p>
                </div>
              </div>
            </div>
          )}

          {(isStreaming || voiceTutor.streamingResponse) && (
            <div className="flex gap-4 animate-fade-in-up">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg animate-pulse-glow">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 max-w-3xl">
                <div className="bg-gradient-to-br from-slate-50/90 via-white/90 to-indigo-50/90 dark:from-slate-800/90 dark:via-slate-900/90 dark:to-indigo-950/90 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50 rounded-2xl p-6 shadow-md">
                  {voiceTutor.streamingResponse ? (
                    <>
                      <div className="prose prose-base max-w-none dark:prose-invert leading-relaxed inline-block">
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[rehypeKatex]}
                        >
                          {voiceTutor.streamingResponse}
                        </ReactMarkdown>
                      </div>
                      {isStreaming && <div className="inline-block w-0.5 h-5 bg-indigo-600 animate-pulse ml-1" />}
                    </>
                  ) : (
                    <div className="typing-indicator" data-testid="typing-indicator">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-6 border-t border-border/50 bg-gradient-to-r from-primary/5 to-purple-500/5 space-y-4">
          {/* Mode Toggles: Avatar & Voice */}
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {voiceMode ? "Voice Conversation Mode" : "Text Input Mode"}
            </p>
            <div className="flex gap-2">
              {/* Avatar Status Indicator (Global Preloaded) */}
              <div 
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/20 rounded-md"
                data-testid="avatar-status"
              >
                {avatarIsReady ? (
                  <>
                    <UserCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">
                      3D Avatar Active
                    </span>
                    <span className="px-1.5 py-0.5 bg-green-500/20 text-green-600 dark:text-green-400 rounded text-[10px] font-semibold">
                      Lip-Sync ON
                    </span>
                  </>
                ) : (
                  <>
                    <Loader2 className="w-4 h-4 text-amber-600 dark:text-amber-400 animate-spin" />
                    <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
                      Loading Avatar...
                    </span>
                  </>
                )}
              </div>
              <Button
                type="button"
                variant={voiceMode ? "default" : "outline"}
                size="sm"
                onClick={() => setVoiceMode(!voiceMode)}
                className={voiceMode ? "btn-gradient" : ""}
                data-testid="button-toggle-voice-mode"
              >
                {voiceMode ? (
                  <>
                    <Phone className="w-4 h-4 mr-2" />
                    Voice On
                  </>
                ) : (
                  <>
                    <PhoneOff className="w-4 h-4 mr-2" />
                    Voice Off
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Conditional Input - Voice or Text */}
          {voiceMode ? (
            <VoiceControl
              chatId={chatId}
              onTranscription={(text) => {
                // Auto-send voice transcription as message
                setMessage(text);
                setTimeout(() => {
                  const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                  const formElement = document.querySelector('form');
                  if (formElement && text.trim()) {
                    formElement.dispatchEvent(submitEvent);
                  }
                }, 100);
              }}
              disabled={isStreaming}
            />
          ) : (
            <>
              <form onSubmit={handleSubmit} className="flex gap-3">
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={isRecording ? "Recording..." : transcribeMutation.isPending ? "Transcribing..." : "Type your response or question..."}
                  disabled={isStreaming || isRecording || transcribeMutation.isPending}
                  className="flex-1 h-12 text-base border-2 focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                  data-testid="input-chat-message"
                />
                <Button 
                  type="submit" 
                  disabled={!message.trim() || isStreaming || isRecording}
                  className="h-12 px-6 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                  data-testid="button-send-message"
                >
                  <Send className="w-5 h-5" />
                </Button>
                <Button 
                  type="button" 
                  variant={isRecording ? "destructive" : "outline"}
                  disabled={isStreaming || transcribeMutation.isPending}
                  onClick={isRecording ? stopRecording : startRecording}
                  data-testid="button-voice-input"
                  className={`h-12 px-6 transition-all duration-200 ${isRecording ? "animate-pulse shadow-lg" : "shadow-md hover:shadow-lg"}`}
                >
                  <Mic className="w-5 h-5" />
                </Button>
              </form>
              <p className="text-xs text-muted-foreground mt-3">
                {isRecording ? (
                  <span className="text-destructive font-medium flex items-center gap-2">
                    <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                    Recording... Click mic to stop
                  </span>
                ) : transcribeMutation.isPending ? (
                  <span className="text-primary font-medium">
                    Transcribing your voice...
                  </span>
                ) : (
                  "Press Enter to send • Click mic for voice input"
                )}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Right: Tools */}
      <div className={`${quickToolsCollapsed ? 'w-12' : 'w-80'} bg-gradient-to-br from-card-subtle to-card rounded-2xl border border-border overflow-hidden transition-all duration-300 flex flex-col shadow-lg`}>
        <div className="p-5 flex items-center justify-between border-b border-border/50 bg-gradient-to-r from-primary/5 to-purple-500/5">
          {!quickToolsCollapsed && (
            <h3 className="font-semibold text-sm text-foreground uppercase tracking-wide">
              Quick Tools
            </h3>
          )}
          <button
            onClick={() => setQuickToolsCollapsed(!quickToolsCollapsed)}
            className="w-9 h-9 flex items-center justify-center hover:bg-primary/10 rounded-xl transition-all duration-200 ml-auto"
            data-testid="button-toggle-quick-tools"
            title={quickToolsCollapsed ? "Expand Quick Tools" : "Collapse Quick Tools"}
          >
            {quickToolsCollapsed ? (
              <ChevronLeft className="w-5 h-5" />
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>

        {!quickToolsCollapsed && (
          <div className="flex-1 p-6 space-y-5 overflow-y-auto">
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 hover:text-white hover:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() => setActiveToolModal('explain')}
                data-testid="button-explain-concept"
              >
                <Lightbulb className="w-5 h-5" />
                <span className="font-medium">Explain Concept</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 hover:text-white hover:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() => setActiveToolModal('hint')}
                data-testid="button-give-hint"
              >
                <HelpCircle className="w-5 h-5" />
                <span className="font-medium">Give Me a Hint</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 hover:text-white hover:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() => setActiveToolModal('example')}
                data-testid="button-show-example"
              >
                <BookOpen className="w-5 h-5" />
                <span className="font-medium">Show Example</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 hover:text-white hover:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() => setActiveToolModal('practice5')}
                data-testid="button-practice-5"
              >
                <Brain className="w-5 h-5" />
                <span className="font-medium">Practice 5 Qs</span>
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3 h-12 hover:bg-gradient-to-r hover:from-indigo-600 hover:to-purple-600 hover:text-white hover:border-transparent transition-all duration-200 shadow-sm hover:shadow-md"
                onClick={() => setActiveToolModal('summary')}
                data-testid="button-get-summary"
              >
                <FileText className="w-5 h-5" />
                <span className="font-medium">Get Summary</span>
              </Button>
            </div>

            <div className="pt-5 border-t border-border/50">
              <h4 className="font-semibold text-sm mb-4 text-muted-foreground uppercase tracking-wide">
                Learning Insights
              </h4>
              <div className="space-y-3">
                <div className="bg-gradient-to-br from-success/10 to-success/5 border-2 border-success/30 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <TrendingUp className="w-5 h-5 text-success mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-success-foreground">Strong grasp of basics</p>
                      <p className="text-xs text-success/80 mt-1">You're excelling at fundamental concepts</p>
                    </div>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-warning/10 to-warning/5 border-2 border-warning/30 rounded-xl p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-warning mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-warning-foreground">Review needed</p>
                      <p className="text-xs text-warning/80 mt-1">Complex factoring patterns</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-5 border-t border-border/50">
              <h4 className="font-semibold text-sm mb-4">Session Stats</h4>
              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Questions Asked</span>
                  <span className="font-semibold">3</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Concepts Covered</span>
                  <span className="font-semibold">2</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Time Spent</span>
                  <span className="font-semibold">12 min</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {chat && (
        <QuickToolModal
          open={activeToolModal !== null}
          onOpenChange={(open) => {
            if (!open) {
              setActiveToolModal(null);
              setToolStreamingContent("");
            }
          }}
          toolType={activeToolModal}
          chat={chat}
          onSubmit={handleQuickToolSubmit}
          isStreaming={toolStreaming}
          streamingContent={toolStreamingContent}
          userProfile={user}
        />
      )}

      {/* 🎭 New D-iD Style Avatar Interface */}
      <AvatarContainer
        messages={messages.map(msg => ({
          id: msg.id,
          role: msg.role as 'user' | 'assistant' | 'system',
          content: msg.content,
          timestamp: msg.createdAt ? new Date(msg.createdAt) : undefined,
        }))}
        onSendMessage={(text) => {
          if (text.trim() && !isStreaming) {
            sendMessageMutation.mutate(text.trim());
          }
        }}
        onMicClick={() => {
          if (isRecording) {
            stopRecording();
          } else {
            startRecording();
          }
        }}
        isMicActive={isRecording}
        currentLanguage={(chat?.language as 'en' | 'hi') || 'en'}
        onLanguageToggle={() => {
          // Language toggle logic can be added here
          console.log('[Avatar] Language toggle clicked');
        }}
        isSpeaking={playingAudio !== null}
        onViewStateChange={setAvatarViewState} // 🆕 Track avatar visibility for TTS control
      />
    </div>
  );
}
