import { useState, useEffect, useRef } from "react";
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
  Volume2,
  VolumeX,
  Loader2,
} from "lucide-react";
import { Chat, Message } from "@shared/schema";
import QuickToolModal from "./QuickToolModal";
import PhaseIndicator from "./PhaseIndicator";

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
  const [streamingMessage, setStreamingMessage] = useState("");
  const [activeToolModal, setActiveToolModal] = useState<ToolType | null>(null);
  const [toolStreaming, setToolStreaming] = useState(false);
  const [toolStreamingContent, setToolStreamingContent] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [shouldAutoPlayTTS, setShouldAutoPlayTTS] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const { data: chat, isLoading: chatLoading } = useQuery<Chat>({
    queryKey: [`/api/chats/${chatId}`],
    enabled: !!chatId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: [`/api/chats/${chatId}/messages`],
    enabled: !!chatId,
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  // Fetch tutor session for 7-phase tracking
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
    retry: false, // Don't retry if session doesn't exist yet
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      setIsStreaming(true);
      setStreamingMessage("");

      // Use optimized session streaming if tutorSession exists
      const useSessionStream = !!tutorSession?.session;
      
      if (useSessionStream) {
        // POST to session streaming endpoint
        const response = await fetch('/api/tutor/optimized/session/ask-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            chatId,
            query: messageText
          })
        });

        if (!response.ok) {
          throw new Error('Failed to stream response');
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        return new Promise((resolve, reject) => {
          let buffer = ''; // Buffer for partial lines
          let sessionMetadata: any = null;

          const readStream = async () => {
            try {
              while (reader) {
                const { done, value } = await reader.read();
                if (done) break;

                // Decode chunk and add to buffer
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\n');
                
                // Keep last incomplete line in buffer
                buffer = lines.pop() || '';

                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6).trim();
                    if (data === '[DONE]') continue;
                    
                    try {
                      const parsed = JSON.parse(data);
                      
                      if (parsed.type === 'chunk') {
                        setStreamingMessage(prev => prev + parsed.content);
                      } else if (parsed.type === 'complete') {
                        setIsStreaming(false);
                        sessionMetadata = parsed.session; // Capture session metadata
                        setShouldAutoPlayTTS(true); // Enable voice playback
                        queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
                        queryClient.invalidateQueries({ queryKey: [`/api/tutor/optimized/session/${chatId}`] });
                        resolve({ 
                          success: true, 
                          emotion: parsed.emotion,
                          personaId: parsed.personaId,
                          session: sessionMetadata
                        });
                      } else if (parsed.type === 'error') {
                        setIsStreaming(false);
                        reject(new Error(parsed.error));
                      }
                    } catch (e) {
                      // Ignore parse errors for partial chunks
                      console.warn('Parse error:', e, 'Line:', line);
                    }
                  }
                }
              }
            } catch (error) {
              setIsStreaming(false);
              reject(error);
            }
          };

          readStream();
        });
      } else {
        // Fallback to legacy EventSource
        const eventSource = new EventSource(
          `/api/chats/${chatId}/stream?message=${encodeURIComponent(messageText)}`,
          { withCredentials: true }
        );

        return new Promise((resolve, reject) => {
          eventSource.onmessage = (event) => {
            const data = JSON.parse(event.data);
            
            if (data.type === 'chunk') {
              setStreamingMessage(prev => prev + data.content);
            } else if (data.type === 'complete') {
              setStreamingMessage(data.content);
            } else if (data.type === 'done') {
              eventSource.close();
              setIsStreaming(false);
              setShouldAutoPlayTTS(true);
              resolve(data);
            } else if (data.type === 'error') {
              eventSource.close();
              setIsStreaming(false);
              reject(new Error(data.message));
            }
          };

          eventSource.onerror = () => {
            eventSource.close();
            setIsStreaming(false);
            reject(new Error('Connection error'));
          };
        });
      }
    },
    onSuccess: () => {
      setMessage("");
      setStreamingMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
    },
    onError: (error) => {
      // Rollback optimistic update - refetch to remove phantom message
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
        // Optimistically add user message to UI
        const tempUserMessage: Message = {
          id: `temp-${Date.now()}`,
          chatId: chatId,
          role: 'user',
          content: transcript.trim(),
          createdAt: new Date(),
          tool: null,
          metadata: null,
        };
        
        // Update messages cache optimistically
        queryClient.setQueryData<Message[]>(
          [`/api/chats/${chatId}/messages`],
          (old = []) => [...old, tempUserMessage]
        );
        
        // Send to AI for response
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
    
    // Stop any currently playing audio
    if (audioElement) {
      console.log('[TTS] Stopping currently playing audio');
      audioElement.pause();
      audioElement.src = '';
    }

    if (playingAudio === messageId) {
      console.log('[TTS] Toggling off audio for message:', messageId);
      setPlayingAudio(null);
      setAudioElement(null);
      return;
    }

    try {
      console.log('[TTS] Setting playing audio to:', messageId);
      setPlayingAudio(messageId);

      console.log('[TTS] Fetching emotion-based TTS for text:', text.substring(0, 50) + '...');
      
      // Use emotion-based TTS only if session exists AND can resume
      const useOptimizedTTS = tutorSession?.session && tutorSession?.canResume;
      const ttsEndpoint = useOptimizedTTS
        ? '/api/tutor/optimized/session/tts'
        : '/api/tutor/tts';
      
      const requestBody = useOptimizedTTS
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

      const audioBlob = await response.blob();
      console.log('[TTS] Audio blob received, size:', audioBlob.size, 'type:', audioBlob.type);
      
      const audioUrl = URL.createObjectURL(audioBlob);
      console.log('[TTS] Audio URL created:', audioUrl);
      
      const audio = new Audio(audioUrl);
      console.log('[TTS] Audio element created');

      audio.onended = () => {
        console.log('[TTS] Audio playback ended');
        setPlayingAudio(null);
        setAudioElement(null);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = (e) => {
        console.error('[TTS] Audio playback error:', e);
        setPlayingAudio(null);
        setAudioElement(null);
        toast({
          title: "Audio Playback Error",
          description: "Could not play the audio. Please try again.",
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
      
      // Handle autoplay policy errors gracefully
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

  // Auto-scroll to bottom when messages change or streaming (only if user is near bottom)
  useEffect(() => {
    if (chatContainerRef.current) {
      const container = chatContainerRef.current;
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
      
      // Only auto-scroll if user is already near the bottom or if it's a new message/streaming
      if (isNearBottom) {
        container.scrollTop = container.scrollHeight;
      }
    }
  }, [messages, streamingMessage, isStreaming, transcribeMutation.isPending]);

  // Auto-play TTS when streaming completes
  useEffect(() => {
    if (shouldAutoPlayTTS && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];
      if (lastMessage.role === 'assistant') {
        // Auto-play with error handling for browser policies
        playAudio(lastMessage.id, lastMessage.content).catch((err) => {
          console.log('Auto-play blocked, user can click speaker manually', err);
        });
        setShouldAutoPlayTTS(false);
      }
    }
  }, [shouldAutoPlayTTS, messages]);

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

  // Calculate dynamic lesson plan based on chat progress
  const userMessages = messages.filter(m => m.role === 'user').length;
  const totalMessages = messages.length;
  
  // Calculate progress based on message exchanges
  const progress = totalMessages > 0 ? Math.min(Math.round((userMessages / 15) * 100), 100) : 0;
  
  // Determine lesson phases based on message count
  const introComplete = userMessages >= 2;
  const coreConceptsComplete = userMessages >= 8;
  const practiceComplete = userMessages >= 15;
  
  // Determine current active phase
  const currentPhase = userMessages >= 8 ? 'practice' : userMessages >= 2 ? 'core-concepts' : 'introduction';
  
  // Calculate time elapsed
  const startTime = chat.createdAt ? new Date(chat.createdAt) : new Date();
  const elapsedMs = new Date().getTime() - startTime.getTime();
  const elapsedMin = Math.floor(elapsedMs / 60000);
  
  // Calculate questions answered (user messages)
  const questionsAnswered = userMessages;
  const estimatedTotal = Math.max(15, userMessages + 3);

  // Map tutorSession phase to number for PhaseIndicator
  const getCurrentPhaseNumber = () => {
    if (!tutorSession?.session) return null;
    
    const phaseMap: Record<string, number> = {
      'greeting': 1,
      'rapport': 2,
      'assessment': 3,
      'teaching': 4,
      'practice': 5,
      'feedback': 6,
      'closure': 7
    };
    
    return phaseMap[tutorSession.session.currentPhase] || 1;
  };

  return (
    <div className="h-full flex gap-6">
      {/* Left: Lesson Plan */}
      <div className="w-64 bg-card rounded-xl p-4 border border-border space-y-4 overflow-y-auto">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Lesson Plan
        </h3>
        <div className="space-y-2">
          {/* Introduction Phase */}
          <div className={`p-3 rounded-lg ${
            introComplete 
              ? 'bg-primary/10 border border-primary/20' 
              : currentPhase === 'introduction' 
              ? 'bg-accent/10 border border-accent/20' 
              : 'bg-muted'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {introComplete ? (
                <CheckCircle className="w-4 h-4 text-primary" />
              ) : currentPhase === 'introduction' ? (
                <div className="w-4 h-4 rounded-full border-2 border-accent animate-pulse"></div>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30"></div>
              )}
              <span className={`text-sm font-medium ${!introComplete && currentPhase !== 'introduction' ? 'text-muted-foreground' : ''}`}>
                Introduction
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {introComplete ? 'Completed' : currentPhase === 'introduction' ? 'In Progress' : 'Not started'}
            </p>
          </div>

          {/* Core Concepts Phase */}
          <div className={`p-3 rounded-lg ${
            coreConceptsComplete 
              ? 'bg-primary/10 border border-primary/20' 
              : currentPhase === 'core-concepts' 
              ? 'bg-accent/10 border border-accent/20' 
              : 'bg-muted'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {coreConceptsComplete ? (
                <CheckCircle className="w-4 h-4 text-primary" />
              ) : currentPhase === 'core-concepts' ? (
                <div className="w-4 h-4 rounded-full border-2 border-accent animate-pulse"></div>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30"></div>
              )}
              <span className={`text-sm font-medium ${!coreConceptsComplete && currentPhase !== 'core-concepts' ? 'text-muted-foreground' : ''}`}>
                Core Concepts
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {coreConceptsComplete ? 'Completed' : currentPhase === 'core-concepts' ? 'In Progress' : 'Not started'}
            </p>
          </div>

          {/* Practice Phase */}
          <div className={`p-3 rounded-lg ${
            practiceComplete 
              ? 'bg-primary/10 border border-primary/20' 
              : currentPhase === 'practice' 
              ? 'bg-accent/10 border border-accent/20' 
              : 'bg-muted'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              {practiceComplete ? (
                <CheckCircle className="w-4 h-4 text-primary" />
              ) : currentPhase === 'practice' ? (
                <div className="w-4 h-4 rounded-full border-2 border-accent animate-pulse"></div>
              ) : (
                <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30"></div>
              )}
              <span className={`text-sm font-medium ${!practiceComplete && currentPhase !== 'practice' ? 'text-muted-foreground' : ''}`}>
                Practice
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              {practiceComplete ? 'Completed' : currentPhase === 'practice' ? 'In Progress' : 'Not started'}
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-border">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{progress}%</span>
          </div>
          <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-border space-y-2">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Questions Asked</span>
            <span className="font-medium">{questionsAnswered} / {estimatedTotal}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Time Elapsed</span>
            <span className="font-medium">{elapsedMin} min</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Total Exchanges</span>
            <span className="font-medium">{Math.floor(totalMessages / 2)}</span>
          </div>
        </div>
      </div>

      {/* Center: Chat */}
      <div className="flex-1 bg-card rounded-xl border border-border flex flex-col">
        {/* Chat Header */}
        <div className="border-b border-border">
          <div className="p-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">{chat.subject} • {chat.level}</h2>
              <p className="text-sm text-muted-foreground">{chat.topic}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={onEndSession}
              className="text-destructive hover:text-destructive"
              data-testid="button-end-session"
            >
              End Session
            </Button>
          </div>
          
          {/* 7-Phase Indicator (only if tutorSession exists) */}
          {tutorSession?.session && (
            <div className="px-4 pb-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Learning Phase</span>
                <span className="text-sm font-medium">
                  {getCurrentPhaseNumber()} of 7 • <span className="capitalize">{tutorSession.session.currentPhase}</span>
                </span>
              </div>
              <PhaseIndicator currentPhase={getCurrentPhaseNumber() || 1} />
            </div>
          )}
        </div>

        {/* Messages */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth" id="chat-messages-container">
          {messages.map((msg, index) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''} animate-fade-in`}>
              {msg.role === 'assistant' && (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div className={`flex-1 ${msg.role === 'user' ? 'max-w-2xl' : 'max-w-3xl'}`}>
                <div className={`rounded-2xl p-5 shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-gradient-to-br from-indigo-600 to-indigo-700 text-white ml-auto' 
                    : 'bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none dark:prose-invert leading-relaxed">
                      <ReactMarkdown
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[rehypeKatex]}
                      >
                        {msg.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="leading-relaxed">{msg.content}</p>
                  )}
                </div>
                <div className="flex items-center justify-between mt-2 px-1">
                  <p className="text-xs text-muted-foreground">
                    {new Date(msg.createdAt!).toLocaleTimeString()}
                  </p>
                  {msg.role === 'assistant' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => playAudio(msg.id, msg.content)}
                      disabled={playingAudio !== null && playingAudio !== msg.id}
                      className="h-7 px-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30"
                      data-testid={`button-play-audio-${msg.id}`}
                    >
                      {playingAudio === msg.id ? (
                        <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                      ) : playingAudio ? (
                        <VolumeX className="w-4 h-4 text-slate-400" />
                      ) : (
                        <Volume2 className="w-4 h-4 text-indigo-600" />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {msg.role === 'user' && (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-300 to-slate-400 dark:from-slate-600 dark:to-slate-700 flex items-center justify-center flex-shrink-0 shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}

          {/* Transcribing Indicator */}
          {transcribeMutation.isPending && (
            <div className="flex gap-4 animate-fade-in">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Mic className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950 dark:to-purple-950 border border-indigo-200 dark:border-indigo-800 rounded-2xl p-4 shadow-sm">
                  <p className="text-sm text-indigo-700 dark:text-indigo-300 font-medium flex items-center gap-2">
                    <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" />
                    Transcribing your voice...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Streaming Message */}
          {isStreaming && (
            <div className="flex gap-4 animate-fade-in">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1 max-w-3xl">
                <div className="bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm">
                  <div className="prose prose-sm max-w-none dark:prose-invert leading-relaxed inline-block">
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                    >
                      {streamingMessage}
                    </ReactMarkdown>
                  </div>
                  <div className="inline-block w-0.5 h-5 bg-indigo-600 animate-pulse ml-1" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={isRecording ? "Recording..." : transcribeMutation.isPending ? "Transcribing..." : "Type your response or question..."}
              disabled={isStreaming || isRecording || transcribeMutation.isPending}
              className="flex-1"
              data-testid="input-chat-message"
            />
            <Button 
              type="submit" 
              disabled={!message.trim() || isStreaming || isRecording}
              data-testid="button-send-message"
            >
              <Send className="w-4 h-4" />
            </Button>
            <Button 
              type="button" 
              variant={isRecording ? "destructive" : "outline"}
              disabled={isStreaming || transcribeMutation.isPending}
              onClick={isRecording ? stopRecording : startRecording}
              data-testid="button-voice-input"
              className={isRecording ? "animate-pulse" : ""}
            >
              <Mic className="w-4 h-4" />
            </Button>
          </form>
          <p className="text-xs text-muted-foreground mt-2">
            {isRecording ? (
              <span className="text-destructive font-medium flex items-center gap-1">
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
        </div>
      </div>

      {/* Right: Tools */}
      <div className="w-72 bg-card rounded-xl p-4 border border-border space-y-4 overflow-y-auto">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Quick Tools
        </h3>

        <div className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => setActiveToolModal('explain')}
            data-testid="button-explain-concept"
          >
            <Lightbulb className="w-4 h-4" />
            Explain Concept
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => setActiveToolModal('hint')}
            data-testid="button-give-hint"
          >
            <HelpCircle className="w-4 h-4" />
            Give Me a Hint
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => setActiveToolModal('example')}
            data-testid="button-show-example"
          >
            <BookOpen className="w-4 h-4" />
            Show Example
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => setActiveToolModal('practice5')}
            data-testid="button-practice-5"
          >
            <Brain className="w-4 h-4" />
            Practice 5 Qs
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 hover:bg-primary hover:text-primary-foreground transition-colors"
            onClick={() => setActiveToolModal('summary')}
            data-testid="button-get-summary"
          >
            <FileText className="w-4 h-4" />
            Get Summary
          </Button>
        </div>

        {/* Learning Insights */}
        <div className="pt-4 border-t border-border">
          <h4 className="font-semibold text-sm mb-3 text-muted-foreground uppercase tracking-wide">
            Learning Insights
          </h4>
          <div className="space-y-3">
            <div className="bg-success/10 border border-success/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <TrendingUp className="w-4 h-4 text-success mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-success-foreground">Strong grasp of basics</p>
                  <p className="text-xs text-success/80 mt-1">You're excelling at fundamental concepts</p>
                </div>
              </div>
            </div>

            <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-warning-foreground">Review needed</p>
                  <p className="text-xs text-warning/80 mt-1">Complex factoring patterns</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Session Stats */}
        <div className="pt-4 border-t border-border">
          <h4 className="font-semibold text-sm mb-3">Session Stats</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Questions Asked</span>
              <span className="font-medium">3</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Concepts Covered</span>
              <span className="font-medium">2</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Time Spent</span>
              <span className="font-medium">12 min</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Tool Modal */}
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
    </div>
  );
}
