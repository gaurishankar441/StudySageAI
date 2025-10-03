import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Highlighter,
  Layers,
  BookOpen,
  Trash2,
} from "lucide-react";
import { Document, Chat, Message } from "@shared/schema";

export default function DocChatView() {
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const { data: currentChat } = useQuery<Chat>({
    queryKey: [`/api/chats/${currentChatId}`],
    enabled: !!currentChatId,
  });

  const { data: messages = [] } = useQuery<Message[]>({
    queryKey: [`/api/chats/${currentChatId}/messages`],
    enabled: !!currentChatId,
  });

  const uploadDocumentMutation = useMutation({
    mutationFn: async (uploadData: { uploadURL: string; fileName: string; fileSize: number; fileType: string }) => {
      const response = await apiRequest("POST", "/api/documents/from-upload", uploadData);
      return response.json();
    },
    onSuccess: (data) => {
      console.log('Document upload success:', data);
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
    },
    onError: (error) => {
      console.error('Document upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
    },
  });

  const addUrlMutation = useMutation({
    mutationFn: async ({ url, title }: { url: string; title: string }) => {
      return apiRequest("POST", "/api/documents/by-url", { url, title });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "URL added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setYoutubeUrl("");
      setWebsiteUrl("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add URL",
        variant: "destructive",
      });
    },
  });

  const deleteDocumentMutation = useMutation({
    mutationFn: async (docId: string) => {
      const response = await apiRequest("DELETE", `/api/documents/${docId}`, {});
      if (!response.ok) {
        throw new Error("Failed to delete document");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setSelectedDocuments(prev => prev.filter(id => !documents.find(d => d.id === id)));
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  const startChatMutation = useMutation({
    mutationFn: async (docIds: string[]) => {
      console.log('Starting chat with docs:', docIds);
      const response = await apiRequest("POST", "/api/docchat/session", { docIds });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to start chat' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Chat API response:', data);
      
      // Backend returns the chat object directly with an id field
      const chatId = data.id || data.chatId;
      if (!chatId) {
        throw new Error('Invalid response: missing chat ID');
      }
      
      return { ...data, id: chatId };
    },
    onSuccess: (chat: any) => {
      console.log('Chat started successfully, ID:', chat.id);
      setCurrentChatId(chat.id);
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      toast({
        title: "Success",
        description: "Chat session started",
      });
    },
    onError: (error: any) => {
      console.error('Failed to start chat:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to start chat session",
        variant: "destructive",
      });
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (!currentChatId) throw new Error("No chat session");
      
      const eventSource = new EventSource(
        `/api/chats/${currentChatId}/stream?message=${encodeURIComponent(messageText)}`,
        { withCredentials: true }
      );

      return new Promise((resolve, reject) => {
        eventSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.type === 'done') {
            eventSource.close();
            resolve(data);
          } else if (data.type === 'error') {
            eventSource.close();
            reject(new Error(data.message));
          }
        };
        eventSource.onerror = () => {
          eventSource.close();
          reject(new Error('Connection error'));
        };
      });
    },
    onSuccess: () => {
      setMessage("");
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${currentChatId}/messages`] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && currentChatId) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const generateSummaryMutation = useMutation({
    mutationFn: async (docIds: string[]) => {
      const response = await apiRequest("POST", "/api/notes", {
        title: `Summary - ${currentDoc?.title || 'Documents'}`,
        sourceIds: docIds,
        template: 'cornell',
        language: 'en'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to generate summary' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (note) => {
      toast({
        title: "Success",
        description: "Summary generated successfully",
      });
      window.location.href = '/notes';
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate summary",
        variant: "destructive",
      });
    },
  });

  const generateQuizMutation = useMutation({
    mutationFn: async (docId: string) => {
      const doc = documents.find(d => d.id === docId);
      const response = await apiRequest("POST", "/api/quizzes", {
        title: `Quiz - ${doc?.title || 'Document'}`,
        source: 'document',
        sourceId: docId,
        subject: 'General',
        topic: doc?.title || 'Document Content',
        difficulty: 'medium',
        questionCount: 5,
        questionTypes: ['mcq', 'true-false'],
        language: 'en'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to generate quiz' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (quiz) => {
      toast({
        title: "Success",
        description: "Quiz generated successfully",
      });
      window.location.href = '/quiz';
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate quiz",
        variant: "destructive",
      });
    },
  });

  const generateFlashcardsMutation = useMutation({
    mutationFn: async (docIds: string[]) => {
      const response = await apiRequest("POST", "/api/notes", {
        title: `Flashcards - ${currentDoc?.title || 'Documents'}`,
        sourceIds: docIds,
        template: 'outline',
        language: 'en'
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to generate flashcards' }));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: (note) => {
      toast({
        title: "Success",
        description: "Flashcards generated successfully",
      });
      window.location.href = '/notes';
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate flashcards",
        variant: "destructive",
      });
    },
  });

  const handleStartChat = () => {
    if (selectedDocuments.length > 0) {
      startChatMutation.mutate(selectedDocuments);
    }
  };

  const handleGenerateSummary = () => {
    if (selectedDocuments.length > 0) {
      generateSummaryMutation.mutate(selectedDocuments);
    }
  };

  const handleGenerateQuiz = () => {
    if (selectedDocuments.length > 0) {
      generateQuizMutation.mutate(selectedDocuments[0]);
    }
  };

  const handleGenerateFlashcards = () => {
    if (selectedDocuments.length > 0) {
      generateFlashcardsMutation.mutate(selectedDocuments);
    }
  };

  const selectedDocs = documents.filter(doc => selectedDocuments.includes(doc.id));
  const currentDoc = selectedDocs[0]; // Show first selected document

  return (
    <div className="h-full flex gap-6">
      {/* Left: Sources & Upload */}
      <div className="w-96 flex flex-col gap-4">
        {/* Upload Section */}
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Add Source</h3>
            <div className="space-y-3">
              <ObjectUploader
                maxNumberOfFiles={1}
                maxFileSize={200 * 1024 * 1024} // 200MB
                onGetUploadParameters={async () => {
                  const response = await apiRequest("POST", "/api/objects/upload", {});
                  const { uploadURL } = await response.json();
                  return { method: "PUT" as const, url: uploadURL };
                }}
                onComplete={(result) => {
                  const uploadedFile = result.successful?.[0];
                  const uploadURL = uploadedFile?.uploadURL;
                  const fileName = uploadedFile?.name || 'Uploaded Document';
                  if (uploadedFile && uploadURL && typeof uploadURL === 'string') {
                    uploadDocumentMutation.mutate({
                      uploadURL: uploadURL,
                      fileName: fileName,
                      fileSize: uploadedFile.size || 0,
                      fileType: uploadedFile.type || 'application/octet-stream'
                    });
                  }
                }}
                buttonClassName="w-full h-24 border-2 border-dashed border-border hover:border-primary transition-colors duration-200"
              >
                <div className="flex flex-col items-center text-center">
                  <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                  <p className="text-sm font-medium mb-1">Drop files here or click to upload</p>
                  <p className="text-xs text-muted-foreground">PDF, DOCX, PPTX up to 200MB</p>
                </div>
              </ObjectUploader>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-2 bg-card text-muted-foreground">OR</span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="Paste YouTube URL..."
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => addUrlMutation.mutate({ url: youtubeUrl, title: "YouTube Video" })}
                    disabled={!youtubeUrl || addUrlMutation.isPending}
                  >
                    <Youtube className="w-4 h-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="Paste website URL..."
                    className="flex-1"
                  />
                  <Button
                    size="sm"
                    onClick={() => addUrlMutation.mutate({ url: websiteUrl, title: "Website" })}
                    disabled={!websiteUrl || addUrlMutation.isPending}
                  >
                    <Globe className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sources List */}
        <Card className="flex-1 overflow-hidden">
          <CardContent className="p-4 h-full flex flex-col">
            <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
              Sources
            </h3>
            
            {documentsLoading ? (
              <div className="flex items-center justify-center flex-1">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-3 overflow-y-auto flex-1">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    data-testid={`document-${doc.id}`}
                    className={`group p-3 rounded-lg border-2 transition-all duration-200 relative ${
                      selectedDocuments.includes(doc.id)
                        ? 'border-primary bg-primary/10 shadow-md'
                        : 'border-border hover:border-primary/50 hover:shadow-sm'
                    }`}
                  >
                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedDocuments(prev => 
                          prev.includes(doc.id)
                            ? prev.filter(id => id !== doc.id)
                            : [...prev, doc.id]
                        );
                      }}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                          {doc.sourceType === 'youtube' ? (
                            <Youtube className="w-5 h-5 text-primary" />
                          ) : doc.sourceType === 'web' ? (
                            <Globe className="w-5 h-5 text-primary" />
                          ) : (
                            <FileText className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.pages ? `${doc.pages} pages` : ''} • {doc.status}
                          </p>
                          {doc.status === 'ready' && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="px-2 py-0.5 text-xs rounded bg-success/10 text-success">
                                Ready
                              </span>
                            </div>
                          )}
                          {doc.status === 'processing' && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="px-2 py-0.5 text-xs rounded bg-warning/10 text-warning animate-pulse">
                                Processing...
                              </span>
                            </div>
                          )}
                          {doc.status === 'error' && (
                            <div className="flex items-center gap-2 mt-2">
                              <span className="px-2 py-0.5 text-xs rounded bg-destructive/10 text-destructive">
                                Error
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2 h-7 w-7 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-opacity"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteDocumentMutation.mutate(doc.id);
                      }}
                      data-testid={`button-delete-${doc.id}`}
                      disabled={deleteDocumentMutation.isPending}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                
                {documents.length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">No documents yet</p>
                    <p className="text-xs text-muted-foreground mt-1">Upload a document to get started</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Center: Document Viewer */}
      <div className="flex-1 bg-card rounded-xl border border-border overflow-hidden flex flex-col">
        {currentDoc ? (
          <>
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium">
                  Page {currentPage} of {currentDoc.pages || 1}
                </span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(currentPage + 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(50, zoom - 25))}>
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm">{zoom}%</span>
                <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(200, zoom + 25))}>
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 bg-muted overflow-hidden">
              {currentDoc.sourceType === 'pdf' && currentDoc.fileKey ? (
                <div className="w-full h-full overflow-auto bg-gray-200">
                  <iframe
                    src={currentDoc.fileKey}
                    className="w-full h-full border-0"
                    title={currentDoc.title}
                    style={{ minHeight: '100%' }}
                  />
                </div>
              ) : currentDoc.sourceType === 'youtube' && currentDoc.metadata?.videoId ? (
                <div className="w-full h-full flex items-center justify-center bg-black p-8">
                  <div className="w-full max-w-4xl aspect-video">
                    <iframe
                      src={`https://www.youtube.com/embed/${currentDoc.metadata.videoId}`}
                      className="w-full h-full border-0 rounded-lg shadow-2xl"
                      title={currentDoc.title}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                </div>
              ) : currentDoc.status === 'processing' ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm font-medium">Processing document...</p>
                    <p className="text-xs text-muted-foreground mt-2">This may take a few moments</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="text-center max-w-md">
                    {currentDoc.sourceType === 'youtube' && <Youtube className="w-16 h-16 text-primary/50 mx-auto mb-4" />}
                    {currentDoc.sourceType === 'web' && <Globe className="w-16 h-16 text-primary/50 mx-auto mb-4" />}
                    {!['youtube', 'web', 'pdf'].includes(currentDoc.sourceType) && <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />}
                    <h3 className="text-lg font-semibold mb-2">{currentDoc.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {currentDoc.sourceType === 'youtube' 
                        ? 'YouTube video transcript is ready for chat' 
                        : currentDoc.sourceType === 'web'
                        ? 'Web content is ready for chat'
                        : 'Document content is ready'}
                    </p>
                    <Button 
                      onClick={handleStartChat}
                      disabled={selectedDocuments.length === 0}
                      className="mt-2"
                      data-testid="button-start-chat"
                    >
                      Start Chat to Explore Content
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No document selected</h3>
              <p className="text-sm text-muted-foreground">Select a document from the sources list to view it</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Chat & Quick Actions */}
      <div className="w-96 flex flex-col gap-4">
        {/* Quick Actions */}
        <Card>
          <CardContent className="p-4">
            <h3 className="font-semibold mb-3 text-sm text-muted-foreground uppercase tracking-wide">
              Quick Actions
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <Button 
                variant="outline" 
                className="p-3 h-auto flex-col gap-1"
                onClick={handleGenerateSummary}
                disabled={selectedDocuments.length === 0 || generateSummaryMutation.isPending}
                data-testid="button-quick-summary"
              >
                <FileText className="w-4 h-4" />
                <span className="text-xs">{generateSummaryMutation.isPending ? 'Generating...' : 'Summary'}</span>
              </Button>
              <Button 
                variant="outline" 
                className="p-3 h-auto flex-col gap-1"
                onClick={handleGenerateSummary}
                disabled={selectedDocuments.length === 0 || generateSummaryMutation.isPending}
                data-testid="button-quick-highlights"
              >
                <Highlighter className="w-4 h-4" />
                <span className="text-xs">{generateSummaryMutation.isPending ? 'Generating...' : 'Highlights'}</span>
              </Button>
              <Button 
                variant="outline" 
                className="p-3 h-auto flex-col gap-1"
                onClick={handleGenerateQuiz}
                disabled={selectedDocuments.length === 0 || generateQuizMutation.isPending}
                data-testid="button-quick-quiz"
              >
                <BookOpen className="w-4 h-4" />
                <span className="text-xs">{generateQuizMutation.isPending ? 'Generating...' : 'Quiz'}</span>
              </Button>
              <Button 
                variant="outline" 
                className="p-3 h-auto flex-col gap-1"
                onClick={handleGenerateFlashcards}
                disabled={selectedDocuments.length === 0 || generateFlashcardsMutation.isPending}
                data-testid="button-quick-flashcards"
              >
                <Layers className="w-4 h-4" />
                <span className="text-xs">{generateFlashcardsMutation.isPending ? 'Generating...' : 'Flashcards'}</span>
              </Button>
            </div>
            
            {selectedDocuments.length > 0 && !currentChatId && (
              <Button 
                className="w-full mt-3" 
                onClick={handleStartChat}
                disabled={startChatMutation.isPending}
                data-testid="button-start-chat"
              >
                {startChatMutation.isPending ? "Starting..." : "Start Chat with Selected Documents"}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Chat Panel */}
        <Card className="flex-1 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-border">
            <h3 className="font-semibold">Chat with Documents</h3>
          </div>

          {currentChatId ? (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                    
                    <div className={msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-lg p-3 text-sm max-w-xs' : 'flex-1'}>
                      {msg.role === 'assistant' ? (
                        <div className="bg-muted rounded-lg p-3 text-sm">
                          <p className="mb-2">{msg.content}</p>
                          {msg.metadata && typeof msg.metadata === 'object' && 'sources' in msg.metadata ? (
                            <div className="mt-2 pt-2 border-t border-border">
                              <p className="text-xs text-muted-foreground">
                                <BookOpen className="w-3 h-3 inline mr-1" />
                                Sources referenced
                              </p>
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <p>{msg.content}</p>
                      )}
                    </div>

                    {msg.role === 'user' && (
                      <div className="w-7 h-7 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4" />
                      </div>
                    )}
                  </div>
                ))}

                {messages.length === 0 && (
                  <div className="text-center py-8">
                    <Bot className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Start a conversation</p>
                    <p className="text-xs text-muted-foreground mt-1">Ask questions about your documents</p>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="p-4 border-t border-border">
                <form onSubmit={handleSubmit} className="flex gap-2">
                  <Input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Ask a question..."
                    disabled={sendMessageMutation.isPending}
                    className="flex-1"
                    data-testid="input-chat-message"
                  />
                  <Button 
                    type="submit" 
                    disabled={!message.trim() || sendMessageMutation.isPending}
                    size="sm"
                    data-testid="button-send-message"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Bot className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">Select documents and start chatting</p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
