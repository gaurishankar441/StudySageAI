import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  Upload,
  FileText,
  Youtube,
  Globe,
  Send,
  Bot,
  User,
  Mic,
  Sparkles,
  BookOpen,
  Highlighter,
  Brain,
  Layers,
  StickyNote,
  Search,
  ChevronLeft,
  ChevronRight,
  Play,
  Loader2,
  File,
  Video,
  Link as LinkIcon,
  X,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Document, Chat, Message } from "@shared/schema";
import { cn } from "@/lib/utils";
import DocChatActionModal from "./DocChatActionModal";

type ActionType = 'summary' | 'highlights' | 'quiz' | 'flashcards';

export default function DocChatView() {
  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);
  
  // State Management
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingMessage, setStreamingMessage] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isActionsPanelOpen, setIsActionsPanelOpen] = useState(true);
  const [activeView, setActiveView] = useState<'upload' | 'chat'>('upload');
  const [activeActionModal, setActiveActionModal] = useState<ActionType | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionContent, setActionContent] = useState("");
  const [mobileBottomSheet, setMobileBottomSheet] = useState<'sources' | 'actions' | null>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);
  const [citationPreview, setCitationPreview] = useState<{source: string, excerpt: string, title: string} | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mobile detection on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      // Auto-close sidebars on mobile
      if (mobile) {
        setIsSidebarOpen(false);
        setIsActionsPanelOpen(false);
      } else {
        setIsSidebarOpen(true);
        setIsActionsPanelOpen(true);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Touch gesture detection for swipe to close
  useEffect(() => {
    if (!isMobile) return;

    let touchStartX = 0;
    let touchStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;

      // Swipe threshold (50px) and ensure horizontal swipe
      if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY)) {
        // Swipe left to close actions panel (from right)
        if (deltaX < 0 && isActionsPanelOpen) {
          setIsActionsPanelOpen(false);
        }
        // Swipe right to close sources sidebar (from left)
        if (deltaX > 0 && isSidebarOpen) {
          setIsSidebarOpen(false);
        }
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchend', handleTouchEnd);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [isMobile, isSidebarOpen, isActionsPanelOpen]);

  // Queries
  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: currentChat } = useQuery<Chat>({
    queryKey: [`/api/chats/${currentChatId}`],
    enabled: !!currentChatId,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: [`/api/chats/${currentChatId}/messages`],
    enabled: !!currentChatId,
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingMessage]);

  // Fetch suggested questions after AI responds
  useEffect(() => {
    const fetchSuggestedQuestions = async () => {
      if (!currentChatId || isStreaming || messages.length === 0) return;
      
      // Only fetch if last message is from assistant
      const lastMessage = messages[messages.length - 1];
      if (lastMessage?.role !== 'assistant') return;
      
      try {
        const response = await fetch(`/api/docchat/${currentChatId}/suggested-questions?count=3`, {
          credentials: 'include'
        });
        if (response.ok) {
          const data = await response.json();
          setSuggestedQuestions(data.questions || []);
        }
      } catch (error) {
        console.error('Failed to fetch suggested questions:', error);
      }
    };
    
    // Debounce to avoid too many requests
    const timer = setTimeout(fetchSuggestedQuestions, 500);
    return () => clearTimeout(timer);
  }, [messages, currentChatId, isStreaming]);

  // Mutations
  const uploadDocumentMutation = useMutation({
    mutationFn: async (uploadData: { uploadURL: string; fileName: string; fileSize: number; fileType: string }) => {
      const response = await apiRequest("POST", "/api/documents/from-upload", uploadData);
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "Document uploaded successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to upload document", variant: "destructive" });
    },
  });

  const addUrlMutation = useMutation({
    mutationFn: async ({ url, title }: { url: string; title: string }) => {
      const response = await apiRequest("POST", "/api/documents/by-url", { url, title });
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Success", description: "URL added successfully" });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setYoutubeUrl("");
      setWebsiteUrl("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add URL", variant: "destructive" });
    },
  });

  const startChatMutation = useMutation({
    mutationFn: async (docIds: string[]) => {
      const response = await apiRequest("POST", "/api/docchat/session", { docIds });
      if (!response.ok) throw new Error("Failed to start chat");
      return response.json();
    },
    onSuccess: (data) => {
      const chatId = data.id || data.chatId;
      setCurrentChatId(chatId);
      setActiveView('chat');
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async ({ chatId, message, tempId }: { chatId: string; message: string; tempId: string }) => {
      setIsStreaming(true);
      setStreamingMessage("");

      const response = await fetch(`/api/chats/${chatId}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ message }),
      });

      if (!response.ok || !response.body) throw new Error("Stream failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              setIsStreaming(false);
              const aiMessage: Message = {
                id: `msg-${Date.now()}`,
                chatId,
                role: 'assistant',
                content: fullResponse,
                tool: null,
                metadata: {},
                createdAt: new Date()
              };
              queryClient.setQueryData<Message[]>([`/api/chats/${chatId}/messages`], (old = []) => [...old, aiMessage]);
              setStreamingMessage("");
              queryClient.invalidateQueries({ queryKey: [`/api/chats/${chatId}/messages`] });
              return;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.content) {
                fullResponse += parsed.content;
                setStreamingMessage(fullResponse);
              }
            } catch (e) {
              console.error("Parse error:", e);
            }
          }
        }
      }
    },
    onError: (error, variables) => {
      // Rollback optimistic message on error
      const { chatId, tempId } = variables;
      queryClient.setQueryData<Message[]>([`/api/chats/${chatId}/messages`], (old = []) => 
        old.filter(msg => msg.id !== tempId)
      );
      setIsStreaming(false);
      setStreamingMessage("");
      toast({ title: "Error", description: "Failed to send message", variant: "destructive" });
    },
  });

  const handleSendMessage = () => {
    if (!message.trim() || !currentChatId || isStreaming) return;
    
    const tempId = `temp-${Date.now()}`;
    const userMessage: Message = {
      id: tempId,
      chatId: currentChatId,
      role: 'user',
      content: message,
      tool: null,
      metadata: {},
      createdAt: new Date()
    };
    
    // Optimistic update
    queryClient.setQueryData<Message[]>([`/api/chats/${currentChatId}/messages`], (old = []) => [...old, userMessage]);
    
    sendMessageMutation.mutate({ chatId: currentChatId, message, tempId });
    setMessage("");
  };

  const handleStartChat = () => {
    if (selectedDocuments.length === 0) {
      toast({ title: "No documents selected", description: "Please select at least one document", variant: "destructive" });
      return;
    }
    startChatMutation.mutate(selectedDocuments);
  };

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  const getDocumentIcon = (doc: Document) => {
    if (doc.sourceType === 'youtube') return <Video className="w-4 h-4" />;
    if (doc.sourceType === 'web') return <Globe className="w-4 h-4" />;
    return <FileText className="w-4 h-4" />;
  };

  // Parse citations and make them clickable
  const renderMessageWithCitations = (content: string, metadata: any) => {
    if (!metadata?.sources) return <p className="text-sm whitespace-pre-wrap">{content}</p>;
    
    const parts = content.split(/(\[\d+\])/g);
    return (
      <p className="text-sm whitespace-pre-wrap">
        {parts.map((part, index) => {
          const match = part.match(/\[(\d+)\]/);
          if (match) {
            const citationNum = parseInt(match[1]) - 1;
            const source = metadata.sources[citationNum];
            if (source) {
              return (
                <button
                  key={index}
                  onClick={() => setCitationPreview({
                    source: source.source || 'Unknown',
                    excerpt: source.content || 'No excerpt available',
                    title: source.title || 'Document'
                  })}
                  className="inline-flex items-center justify-center w-5 h-5 text-xs font-medium text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/30 rounded hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors mx-0.5"
                  data-testid={`citation-${citationNum}`}
                >
                  {match[1]}
                </button>
              );
            }
          }
          return <span key={index}>{part}</span>;
        })}
      </p>
    );
  };

  const selectedDocsData = documents.filter(d => selectedDocuments.includes(d.id));

  // Voice recording handlers
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunks.push(e.data);
      };

      recorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      toast({ title: "Recording...", description: "Tap mic again to stop" });
    } catch (error) {
      console.error('Failed to start recording:', error);
      toast({ title: "Error", description: "Could not access microphone", variant: "destructive" });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
      setMediaRecorder(null);
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');
      formData.append('language', user?.preferredLanguage || 'en');

      const response = await fetch('/api/voice/transcribe', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) throw new Error('Transcription failed');

      const data = await response.json();
      setMessage(data.text);
      toast({ title: "✅ Transcribed", description: data.text.substring(0, 50) + '...' });
    } catch (error) {
      console.error('Transcription error:', error);
      toast({ title: "Error", description: "Failed to transcribe audio", variant: "destructive" });
    }
  };

  const handleVoiceInput = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleActionSubmit = async (actionType: ActionType, formData: any) => {
    setActionProcessing(true);
    setActionContent("");
    
    try {
      const response = await fetch(`/api/docchat/action/${actionType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          docIds: selectedDocuments,
          language: formData.language || 'en',
          level: formData.level,
          examBoard: formData.examBoard,
          ...formData,
        }),
      });

      if (!response.ok || !response.body) throw new Error("Action failed");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let fullContent = "";
      let isDone = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        // Split by double newline to get complete SSE events
        const events = buffer.split('\n\n');
        
        // Keep the last incomplete event in buffer
        buffer = events.pop() || "";
        
        // Process complete events
        for (const event of events) {
          const lines = event.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === 'chunk' && parsed.content) {
                  fullContent += parsed.content;
                  setActionContent(fullContent);
                } else if (parsed.type === 'complete') {
                  toast({ title: "Success", description: `${actionType.charAt(0).toUpperCase() + actionType.slice(1)} generated successfully!` });
                } else if (parsed.type === 'done') {
                  isDone = true;
                } else if (parsed.type === 'error') {
                  throw new Error(parsed.message);
                }
              } catch (e) {
                console.error("SSE parse error:", e, "Data:", data);
              }
            }
          }
        }
      }
      
      // Process any remaining buffered data
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'done') {
                isDone = true;
              }
            } catch (e) {
              console.error("Final SSE parse error:", e);
            }
          }
        }
      }
      
      // Only clear processing state after confirming done
      if (isDone) {
        setActionProcessing(false);
      }
    } catch (error) {
      setActionProcessing(false);
      toast({ title: "Error", description: `Failed to generate ${actionType}`, variant: "destructive" });
    }
  };

  // Upload Screen
  if (activeView === 'upload') {
    return (
      <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950">
        {/* Header */}
        <div className="border-b border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <h1 className="text-2xl font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
              नमस्ते {(user as any)?.name?.split(' ')[0] || 'Student'}, Upload and chat with your documents
            </h1>
            <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
              Upload lecture notes, articles, any document, and Garima Ma'am will help you understand them
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-auto">
          <div className="max-w-4xl mx-auto px-6 py-8">
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-2 glass-card">
                <TabsTrigger value="upload" data-testid="tab-upload">Upload</TabsTrigger>
                <TabsTrigger value="previous" data-testid="tab-previous">Previous Sources</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-6 space-y-6">
                {/* Supported Formats */}
                <div className="text-center">
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">VaktaAI now supports</p>
                  <div className="flex justify-center gap-4 text-slate-700 dark:text-slate-300">
                    <div className="flex flex-col items-center">
                      <FileText className="w-8 h-8 mb-1" />
                      <span className="text-xs">PDF</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <FileText className="w-8 h-8 mb-1" />
                      <span className="text-xs">Docs</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <FileText className="w-8 h-8 mb-1" />
                      <span className="text-xs">PPT</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Video className="w-8 h-8 mb-1" />
                      <span className="text-xs">YouTube</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <Globe className="w-8 h-8 mb-1" />
                      <span className="text-xs">Web</span>
                    </div>
                  </div>
                </div>

                {/* File Upload */}
                <Card className="p-8 glass-card border-dashed border-2 border-purple-200 dark:border-purple-800">
                  <div className="text-center">
                    <Upload className="w-12 h-12 mx-auto mb-4 text-purple-600" />
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Upload PDFs, PPTx, Docx, MP3, MP4 or Paste a URL
                    </p>
                    <ObjectUploader
                      maxFileSize={50 * 1024 * 1024}
                      onGetUploadParameters={async (file) => {
                        const response = await fetch('/api/documents/upload', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          credentials: 'include',
                          body: JSON.stringify({
                            fileName: file.name,
                            fileType: file.type,
                            fileSize: file.size
                          })
                        });
                        const { uploadURL } = await response.json();
                        return { method: "PUT" as const, url: uploadURL };
                      }}
                      onComplete={(result) => {
                        const file = result.meta as any;
                        uploadDocumentMutation.mutate({ 
                          uploadURL: result.uploadURL as string, 
                          fileName: file.name, 
                          fileSize: file.size, 
                          fileType: file.type 
                        });
                      }}
                    >
                      <Button variant="outline" data-testid="button-browse-files">
                        <Upload className="w-4 h-4 mr-2" />
                        Browse Files
                      </Button>
                    </ObjectUploader>
                  </div>
                </Card>

                {/* YouTube URL */}
                <Card className="p-6 glass-card">
                  <div className="flex gap-3">
                    <Youtube className="w-5 h-5 text-red-600 mt-2" />
                    <div className="flex-1">
                      <Input
                        placeholder="Paste YouTube URL (e.g., https://youtube.com/watch?v=...)"
                        value={youtubeUrl}
                        onChange={(e) => setYoutubeUrl(e.target.value)}
                        className="mb-2"
                        data-testid="input-youtube-url"
                      />
                      <Button 
                        onClick={() => addUrlMutation.mutate({ url: youtubeUrl, title: 'YouTube Video' })}
                        disabled={!youtubeUrl || addUrlMutation.isPending}
                        size="sm"
                        data-testid="button-add-youtube"
                      >
                        {addUrlMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add YouTube Video'}
                      </Button>
                    </div>
                  </div>
                </Card>

                {/* Web URL */}
                <Card className="p-6 glass-card">
                  <div className="flex gap-3">
                    <Globe className="w-5 h-5 text-blue-600 mt-2" />
                    <div className="flex-1">
                      <Input
                        placeholder="Paste Website URL (articles, blogs, etc.)"
                        value={websiteUrl}
                        onChange={(e) => setWebsiteUrl(e.target.value)}
                        className="mb-2"
                        data-testid="input-website-url"
                      />
                      <Button 
                        onClick={() => addUrlMutation.mutate({ url: websiteUrl, title: 'Web Article' })}
                        disabled={!websiteUrl || addUrlMutation.isPending}
                        size="sm"
                        data-testid="button-add-website"
                      >
                        {addUrlMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Add Website'}
                      </Button>
                    </div>
                  </div>
                </Card>
              </TabsContent>

              <TabsContent value="previous" className="mt-6">
                {documentsLoading ? (
                  <div className="text-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin mx-auto text-purple-600" />
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-12 text-slate-500">
                    <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No documents yet. Upload some to get started!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {documents.map(doc => (
                      <Card
                        key={doc.id}
                        className={cn(
                          "p-4 cursor-pointer transition-all hover:scale-105 glass-card",
                          selectedDocuments.includes(doc.id) && "ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950/30"
                        )}
                        onClick={() => toggleDocumentSelection(doc.id)}
                        data-testid={`card-document-${doc.id}`}
                      >
                        <div className="flex items-start justify-between mb-2">
                          {getDocumentIcon(doc)}
                          {selectedDocuments.includes(doc.id) && (
                            <div className="w-5 h-5 rounded-full bg-purple-600 text-white flex items-center justify-center text-xs">
                              ✓
                            </div>
                          )}
                        </div>
                        <p className="text-sm font-medium line-clamp-2 mb-1" title={doc.title}>
                          {doc.title}
                        </p>
                        <p className="text-xs text-slate-500">
                          {doc.sourceType === 'youtube' ? 'Video' : doc.sourceType === 'web' ? 'Article' : 'Document'}
                        </p>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Footer with Selected Docs */}
        {selectedDocuments.length > 0 && (
          <div className="border-t border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium">Selected ({selectedDocuments.length}):</span>
                <div className="flex gap-2">
                  {selectedDocsData.slice(0, 3).map(doc => (
                    <div key={doc.id} className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 rounded text-xs">
                      {getDocumentIcon(doc)}
                      <span className="max-w-[100px] truncate">{doc.title}</span>
                    </div>
                  ))}
                  {selectedDocuments.length > 3 && (
                    <span className="text-xs text-slate-500">+{selectedDocuments.length - 3} more</span>
                  )}
                </div>
              </div>
              <Button 
                onClick={handleStartChat}
                disabled={startChatMutation.isPending}
                className="btn-gradient"
                data-testid="button-start-chat"
              >
                {startChatMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-2" />
                )}
                Start Chat with Garima
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Chat Screen (Three-Panel Layout)
  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950 relative">
      {/* Mobile Overlay */}
      {isMobile && (isSidebarOpen || isActionsPanelOpen || mobileBottomSheet) && (
        <div 
          className="absolute inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden"
          onClick={() => {
            setIsSidebarOpen(false);
            setIsActionsPanelOpen(false);
            setMobileBottomSheet(null);
          }}
        />
      )}

      {/* Left Sidebar - Sources */}
      <div className={cn(
        "transition-all duration-300 border-r border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl flex flex-col",
        // Desktop behavior - inline flex column
        isSidebarOpen ? "w-64" : "w-0 overflow-hidden",
        // Mobile behavior - fixed overlay (only on mobile)
        isMobile && "fixed inset-y-0 left-0 w-80 max-w-[85vw] z-50",
        isMobile && !isSidebarOpen && "-translate-x-full"
      )}>
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Sources ({selectedDocuments.length})</h3>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActiveView('upload')}
                data-testid="button-change-sources"
              >
                <ExternalLink className="w-4 h-4" />
              </Button>
              {isMobile && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsSidebarOpen(false)}
                  data-testid="button-close-sidebar-mobile"
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          {selectedDocsData.map(doc => (
            <Card key={doc.id} className="p-3 glass-card hover:bg-purple-50 dark:hover:bg-purple-950/30 transition-colors" data-testid={`source-card-${doc.id}`}>
              <div className="flex items-start gap-2">
                {getDocumentIcon(doc)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium line-clamp-2">{doc.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {doc.sourceType === 'youtube' ? 'Video' : doc.sourceType === 'web' ? 'Article' : 'Document'}
                  </p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Center - Chat Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Chat Header - Mobile Optimized */}
        <div className="border-b border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-3 md:p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 md:gap-3 min-w-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                data-testid="button-toggle-sidebar"
                className="h-9 w-9 md:h-auto md:w-auto p-0 md:px-3"
              >
                {isSidebarOpen ? <ChevronLeft className="w-5 h-5 md:w-4 md:h-4" /> : <ChevronRight className="w-5 h-5 md:w-4 md:h-4" />}
              </Button>
              <div className="min-w-0">
                <h2 className="font-semibold text-sm md:text-base truncate">Doc Chat: Garima Ma'am</h2>
                <p className="text-xs text-slate-500 hidden md:block">{selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected</p>
              </div>
            </div>
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsActionsPanelOpen(!isActionsPanelOpen)}
                data-testid="button-toggle-actions-mobile"
                className="h-9 w-9 p-0 md:hidden"
              >
                <Sparkles className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Messages - Mobile Optimized */}
        <div className="flex-1 overflow-auto p-3 md:p-4 space-y-3 md:space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-2 md:gap-3",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
              data-testid={`message-${msg.id}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 md:w-5 md:h-5 text-white" />
                </div>
              )}
              <div className={cn(
                "max-w-[80%] md:max-w-[70%] rounded-2xl px-3 py-2 md:px-4 md:py-3",
                msg.role === 'user' 
                  ? "bg-purple-600 text-white" 
                  : "glass-card"
              )}>
                {renderMessageWithCitations(msg.content, msg.metadata)}
                {(msg.metadata as any)?.citations && (
                  <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                    <p className="text-xs opacity-75">📖 Page {(msg.metadata as any).citations}</p>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 md:w-5 md:h-5" />
                </div>
              )}
            </div>
          ))}

          {/* Streaming Message */}
          {isStreaming && streamingMessage && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="max-w-[70%] rounded-2xl px-4 py-3 glass-card">
                <p className="text-sm whitespace-pre-wrap">{streamingMessage}</p>
                <span className="inline-block w-2 h-4 bg-purple-600 animate-pulse ml-1"></span>
              </div>
            </div>
          )}

          {/* Typing Indicator */}
          {isStreaming && !streamingMessage && (
            <div className="flex gap-3 justify-start">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="glass-card rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                  <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                  <span className="w-2 h-2 bg-purple-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area - Mobile Optimized with larger touch targets */}
        <div className="border-t border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-3 md:p-4 pb-safe">
          {/* Suggested Questions Chips */}
          {suggestedQuestions.length > 0 && !isStreaming && (
            <div className="mb-3 overflow-x-auto">
              <div className="flex gap-2 pb-1">
                {suggestedQuestions.map((question, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setMessage(question);
                      setSuggestedQuestions([]);
                    }}
                    className="flex-shrink-0 px-3 py-2 md:px-4 md:py-2 text-xs md:text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-900 dark:text-purple-100 rounded-full hover:bg-purple-200 dark:hover:bg-purple-800/50 transition-colors whitespace-nowrap"
                    data-testid={`suggested-question-${index}`}
                  >
                    <Sparkles className="w-3 h-3 md:w-4 md:h-4 inline mr-1.5" />
                    {question}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex gap-2 md:gap-3">
            <Input
              placeholder={isMobile ? "Ask anything..." : "Ask anything... Use @ to select docs"}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              disabled={isStreaming}
              className="flex-1 h-11 md:h-10 text-base md:text-sm"
              data-testid="input-message"
            />
            <Button
              variant="ghost"
              size="icon"
              onClick={handleVoiceInput}
              disabled={isStreaming}
              data-testid="button-voice-input"
              className={cn(
                "h-11 w-11 md:h-10 md:w-10 transition-colors",
                isRecording && "bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 animate-pulse"
              )}
            >
              <Mic className="w-5 h-5" />
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isStreaming}
              className="btn-gradient h-11 w-11 md:h-10 md:w-auto md:px-4"
              data-testid="button-send-message"
            >
              {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Quick Actions - Desktop & Mobile */}
      <div className={cn(
        "transition-all duration-300 border-l border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl flex flex-col",
        // Desktop behavior - inline flex column
        isActionsPanelOpen ? "w-64" : "w-0 overflow-hidden",
        // Mobile behavior - fixed overlay from right (only on mobile)
        isMobile && "fixed inset-y-0 right-0 w-80 max-w-[85vw] z-50",
        isMobile && !isActionsPanelOpen && "translate-x-full"
      )}>
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Quick Actions</h3>
            {isMobile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsActionsPanelOpen(false)}
                data-testid="button-close-actions-mobile"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 h-12 md:h-auto" 
            onClick={() => setActiveActionModal('summary')}
            data-testid="action-summary"
          >
            <FileText className="w-5 h-5 md:w-4 md:h-4" />
            <span className="text-sm">Summary</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 h-12 md:h-auto" 
            onClick={() => setActiveActionModal('highlights')}
            data-testid="action-highlights"
          >
            <Highlighter className="w-5 h-5 md:w-4 md:h-4" />
            <span className="text-sm">Highlights</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 h-12 md:h-auto" 
            onClick={() => setActiveActionModal('quiz')}
            data-testid="action-quiz"
          >
            <Brain className="w-5 h-5 md:w-4 md:h-4" />
            <span className="text-sm">Generate Quiz</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 h-12 md:h-auto" 
            onClick={() => setActiveActionModal('flashcards')}
            data-testid="action-flashcards"
          >
            <Layers className="w-5 h-5 md:w-4 md:h-4" />
            <span className="text-sm">Flashcards</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2" 
            onClick={() => toast({ title: "Coming Soon", description: "Smart Notes feature is under development" })}
            data-testid="action-notes"
          >
            <StickyNote className="w-4 h-4" />
            <span className="text-sm">Smart Notes</span>
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-2" 
            onClick={() => toast({ title: "Coming Soon", description: "Search feature is under development" })}
            data-testid="action-search"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">Search</span>
          </Button>
        </div>
      </div>

      {/* Toggle Actions Panel Button - Desktop only */}
      {!isMobile && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsActionsPanelOpen(!isActionsPanelOpen)}
          className="fixed right-4 top-20 z-50 glass-card shadow-lg"
          data-testid="button-toggle-actions"
        >
          {isActionsPanelOpen ? (
            <ChevronRight className="w-5 h-5 text-purple-600" />
          ) : (
            <Sparkles className="w-5 h-5 text-purple-600" />
          )}
        </Button>
      )}

      {/* Mobile FAB - Floating Action Button for Quick Actions */}
      {isMobile && (
        <Button
          onClick={() => setIsActionsPanelOpen(!isActionsPanelOpen)}
          className="fixed bottom-24 right-4 z-50 w-14 h-14 rounded-full btn-gradient shadow-2xl"
          data-testid="button-mobile-fab"
        >
          <Sparkles className="w-6 h-6 text-white" />
        </Button>
      )}

      {/* Action Modal */}
      <DocChatActionModal
        open={activeActionModal !== null}
        onOpenChange={(open) => !open && setActiveActionModal(null)}
        actionType={activeActionModal}
        selectedDocs={selectedDocsData.map(d => ({ id: d.id, title: d.title }))}
        onSubmit={handleActionSubmit}
        isProcessing={actionProcessing}
        streamingContent={actionContent}
        userProfile={user as any}
      />

      {/* Citation Preview Modal - Mobile Optimized */}
      <Dialog open={!!citationPreview} onOpenChange={() => setCitationPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" />
              {citationPreview?.title || 'Citation Source'}
            </DialogTitle>
            <DialogDescription>
              Source: {citationPreview?.source}
            </DialogDescription>
          </DialogHeader>
          <div className="mt-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800">
            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {citationPreview?.excerpt}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
