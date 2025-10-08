import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
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

export default function DocChatView() {
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
  
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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

  const selectedDocsData = documents.filter(d => selectedDocuments.includes(d.id));

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
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-purple-50/30 to-slate-50 dark:from-slate-950 dark:via-purple-950/20 dark:to-slate-950">
      {/* Left Sidebar - Sources */}
      <div className={cn(
        "transition-all duration-300 border-r border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl flex flex-col",
        isSidebarOpen ? "w-64" : "w-0 overflow-hidden"
      )}>
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Sources ({selectedDocuments.length})</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setActiveView('upload')}
              data-testid="button-change-sources"
            >
              <ExternalLink className="w-4 h-4" />
            </Button>
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
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="border-b border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl p-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              data-testid="button-toggle-sidebar"
            >
              {isSidebarOpen ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
            <div>
              <h2 className="font-semibold">Doc Chat: Garima Ma'am</h2>
              <p className="text-xs text-slate-500">{selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected</p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {messages.map(msg => (
            <div
              key={msg.id}
              className={cn(
                "flex gap-3",
                msg.role === 'user' ? "justify-end" : "justify-start"
              )}
              data-testid={`message-${msg.id}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-600 to-indigo-600 flex items-center justify-center flex-shrink-0">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              <div className={cn(
                "max-w-[70%] rounded-2xl px-4 py-3",
                msg.role === 'user' 
                  ? "bg-purple-600 text-white" 
                  : "glass-card"
              )}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {(msg.metadata as any)?.citations && (
                  <div className="mt-2 pt-2 border-t border-slate-200/50 dark:border-slate-700/50">
                    <p className="text-xs opacity-75">📖 Page {(msg.metadata as any).citations}</p>
                  </div>
                )}
              </div>
              {msg.role === 'user' && (
                <div className="w-8 h-8 rounded-full bg-slate-300 dark:bg-slate-700 flex items-center justify-center flex-shrink-0">
                  <User className="w-5 h-5" />
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

        {/* Input Area */}
        <div className="border-t border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl p-4">
          <div className="flex gap-3">
            <Input
              placeholder="Ask anything... Use @ to select docs"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              disabled={isStreaming}
              className="flex-1"
              data-testid="input-message"
            />
            <Button
              variant="ghost"
              size="icon"
              disabled={isStreaming}
              data-testid="button-voice-input"
            >
              <Mic className="w-5 h-5" />
            </Button>
            <Button
              onClick={handleSendMessage}
              disabled={!message.trim() || isStreaming}
              className="btn-gradient"
              data-testid="button-send-message"
            >
              {isStreaming ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
        </div>
      </div>

      {/* Right Sidebar - Quick Actions */}
      <div className={cn(
        "transition-all duration-300 border-l border-slate-200/60 dark:border-slate-800/60 bg-white/60 dark:bg-slate-900/60 backdrop-blur-xl flex flex-col",
        isActionsPanelOpen ? "w-64" : "w-0 overflow-hidden"
      )}>
        <div className="p-4 border-b border-slate-200/60 dark:border-slate-800/60">
          <h3 className="font-medium text-sm">Quick Actions</h3>
        </div>
        <div className="flex-1 overflow-auto p-3 space-y-2">
          <Button variant="ghost" className="w-full justify-start gap-2" data-testid="action-summary">
            <FileText className="w-4 h-4" />
            <span className="text-sm">Summary</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2" data-testid="action-highlights">
            <Highlighter className="w-4 h-4" />
            <span className="text-sm">Highlights</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2" data-testid="action-quiz">
            <Brain className="w-4 h-4" />
            <span className="text-sm">Generate Quiz</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2" data-testid="action-flashcards">
            <Layers className="w-4 h-4" />
            <span className="text-sm">Flashcards</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2" data-testid="action-notes">
            <StickyNote className="w-4 h-4" />
            <span className="text-sm">Smart Notes</span>
          </Button>
          <Button variant="ghost" className="w-full justify-start gap-2" data-testid="action-search">
            <Search className="w-4 h-4" />
            <span className="text-sm">Search</span>
          </Button>
        </div>
      </div>

      {/* Toggle Actions Panel Button - Always visible outside the panel */}
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
    </div>
  );
}
