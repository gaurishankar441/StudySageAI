import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
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
} from "lucide-react";
import { Chat, Message } from "@shared/schema";
import QuickToolModal from "./QuickToolModal";

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
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      setIsStreaming(true);
      setStreamingMessage("");

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
          createdAt: new Date().toISOString(),
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

  const progress = 65; // This would come from the chat metadata in a real implementation

  return (
    <div className="h-full flex gap-6">
      {/* Left: Lesson Plan */}
      <div className="w-64 bg-card rounded-xl p-4 border border-border space-y-4 overflow-y-auto">
        <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Lesson Plan
        </h3>
        <div className="space-y-2">
          <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Introduction</span>
            </div>
            <p className="text-xs text-muted-foreground">Completed</p>
          </div>

          <div className="p-3 rounded-lg bg-accent/10 border border-accent/20">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded-full border-2 border-accent animate-pulse"></div>
              <span className="text-sm font-medium">Core Concepts</span>
            </div>
            <p className="text-xs text-muted-foreground">In Progress</p>
          </div>

          <div className="p-3 rounded-lg bg-muted">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-4 h-4 rounded-full border-2 border-muted-foreground/30"></div>
              <span className="text-sm font-medium text-muted-foreground">Practice</span>
            </div>
            <p className="text-xs text-muted-foreground">Not started</p>
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
            <span className="text-muted-foreground">Questions Answered</span>
            <span className="font-medium">12 / 18</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Time Elapsed</span>
            <span className="font-medium">22 min</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Accuracy</span>
            <span className="font-medium text-success">83%</span>
          </div>
        </div>
      </div>

      {/* Center: Chat */}
      <div className="flex-1 bg-card rounded-xl border border-border flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="font-semibold">{chat.subject} • {chat.level}</h2>
            <p className="text-sm text-muted-foreground">{chat.topic}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={onEndSession}
            className="text-destructive hover:text-destructive"
          >
            End Session
          </Button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, index) => (
            <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : ''} animate-fade-in`}>
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
              
              <div className={`flex-1 ${msg.role === 'user' ? 'max-w-lg' : ''}`}>
                <div className={`rounded-xl p-4 ${
                  msg.role === 'user' 
                    ? 'bg-primary text-primary-foreground ml-auto' 
                    : 'bg-muted'
                }`}>
                  {msg.role === 'assistant' ? (
                    <div className="prose prose-sm max-w-none">
                      {/* Parse JSON response for tutor messages */}
                      {(() => {
                        try {
                          const tutorResponse = JSON.parse(msg.content) as TutorResponse;
                          return (
                            <>
                              <p className="mb-3">{tutorResponse.explain}</p>
                              {tutorResponse.check && (
                                <Card className="mt-3 bg-background border">
                                  <CardContent className="p-4">
                                    <div className="flex items-center gap-2 text-xs font-medium text-primary mb-3">
                                      <HelpCircle className="w-3 h-3" />
                                      Check Your Understanding
                                    </div>
                                    <p className="text-sm font-medium mb-3">{tutorResponse.check.stem}</p>
                                    <div className="space-y-2">
                                      {tutorResponse.check.options.map((option, i) => (
                                        <button
                                          key={i}
                                          className="w-full text-left p-3 rounded-lg border border-border hover:bg-accent transition-all duration-200"
                                        >
                                          <span className="font-medium mr-2">{String.fromCharCode(65 + i)}.</span>
                                          {option}
                                        </button>
                                      ))}
                                    </div>
                                  </CardContent>
                                </Card>
                              )}
                            </>
                          );
                        } catch {
                          return <p>{msg.content}</p>;
                        }
                      })()}
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-2 text-right">
                  {new Date(msg.createdAt!).toLocaleTimeString()}
                </p>
              </div>

              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 text-sm font-medium">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {/* Transcribing Indicator */}
          {transcribeMutation.isPending && (
            <div className="flex gap-4 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Mic className="w-4 h-4 text-primary-foreground animate-pulse" />
              </div>
              <div className="flex-1">
                <div className="bg-primary/10 border border-primary/20 rounded-xl p-4">
                  <p className="text-sm text-primary font-medium flex items-center gap-2">
                    <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                    Transcribing your voice...
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Streaming Message */}
          {isStreaming && (
            <div className="flex gap-4 animate-fade-in">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <div className="bg-muted rounded-xl p-4">
                  <p className="text-sm leading-relaxed">{streamingMessage}</p>
                  <div className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
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
