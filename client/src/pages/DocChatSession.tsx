import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  FileText,
  Youtube,
  Globe,
  Send,
  Bot,
  User,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  Download,
  Highlighter,
  Layers,
  BookOpen,
  Sparkles,
} from "lucide-react";
import { Document, Chat, Message } from "@shared/schema";
import DocChatActionModal from "@/components/docchat/DocChatActionModal";

type ActionType = 'summary' | 'highlights' | 'quiz' | 'flashcards';

export default function DocChatSession() {
  const [, params] = useRoute("/docchat/:chatId");
  const chatId = params?.chatId || null;
  
  const [message, setMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(100);
  const [activeActionModal, setActiveActionModal] = useState<ActionType | null>(null);
  const [actionProcessing, setActionProcessing] = useState(false);
  const [actionContent, setActionContent] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const { data: currentChat, isLoading: chatLoading } = useQuery<Chat>({
    queryKey: ["/api/chats", chatId],
    enabled: !!chatId,
  });

  const { data: messages = [], isLoading: messagesLoading } = useQuery<Message[]>({
    queryKey: ["/api/chats", chatId, "messages"],
    enabled: !!chatId,
  });

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (messageText: string) => {
      if (!chatId) throw new Error("No chat session");
      
      const eventSource = new EventSource(
        `/api/chats/${chatId}/stream?message=${encodeURIComponent(messageText)}`,
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
      queryClient.invalidateQueries({ queryKey: ["/api/chats", chatId, "messages"] });
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
    if (message.trim() && chatId) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  const handleDocChatActionSubmit = async (actionType: ActionType, formData: any) => {
    setActionProcessing(true);
    setActionContent("");

    const docIds = currentChat?.docIds || [];

    try {
      const response = await fetch('/api/docchat/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          action: actionType,
          docIds: docIds,
          ...formData
        })
      });

      if (!response.ok) throw new Error('Failed to execute action');

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
          for (const line of event.split('\n')) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'chunk') {
                  fullContent += data.content;
                  setActionContent(fullContent);
                } else if (data.type === 'done' || data.type === 'complete') {
                  setActionProcessing(false);
                  toast({ title: "Generated Successfully" });
                  setTimeout(() => {
                    setActiveActionModal(null);
                    setActionContent("");
                  }, 1500);
                } else if (data.type === 'error') {
                  setActionProcessing(false);
                  toast({ 
                    title: "Error", 
                    description: data.message || "Failed to execute action", 
                    variant: "destructive" 
                  });
                }
              } catch (e) {
                console.warn('Parse error:', e);
              }
            }
          }
        }
      }
    } catch (error) {
      console.error('Action error:', error);
      setActionProcessing(false);
      toast({ title: "Error", description: "Failed to execute action", variant: "destructive" });
    }
  };

  if (chatLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!currentChat) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Chat not found</h3>
          <p className="text-sm text-muted-foreground">This chat session doesn't exist</p>
        </div>
      </div>
    );
  }

  const chatDocs = documents.filter(doc => 
    Array.isArray(currentChat.docIds) && currentChat.docIds.includes(doc.id)
  );
  const currentDoc = chatDocs[0];
  const selectedDocs = chatDocs.map(d => ({ id: d.id, title: d.title }));

  return (
    <div className="h-full flex gap-6 p-8">
      {/* Center: Document Viewer */}
      <div className="flex-1 glass-card rounded-xl overflow-hidden flex flex-col shadow-lg">
        {currentDoc ? (
          <>
            <div className="p-5 border-b border-border/50 flex items-center justify-between backdrop-blur-sm bg-card/50">
              <div className="flex items-center gap-3">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  className="btn-gradient text-white border-0"
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <span className="text-sm font-medium px-3 py-1 rounded-lg bg-gradient-subtle" data-testid="text-page-info">
                  Page {currentPage} of {currentDoc.pages || 1}
                </span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="btn-gradient text-white border-0"
                  data-testid="button-next-page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setZoom(Math.max(50, zoom - 25))}
                  className="transition-all duration-200 hover:scale-105"
                  data-testid="button-zoom-out"
                >
                  <ZoomOut className="w-4 h-4" />
                </Button>
                <span className="text-sm px-3 py-1 rounded-lg bg-gradient-subtle font-medium" data-testid="text-zoom-level">{zoom}%</span>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setZoom(Math.min(200, zoom + 25))}
                  className="transition-all duration-200 hover:scale-105"
                  data-testid="button-zoom-in"
                >
                  <ZoomIn className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  className="transition-all duration-200 hover:scale-105"
                  data-testid="button-download"
                >
                  <Download className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="flex-1 bg-muted/50 overflow-hidden backdrop-blur-sm">
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
              <p className="text-sm text-muted-foreground">This chat has no associated documents</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: Quick Actions & Chat */}
      <div className="w-96 flex flex-col gap-6">
        {/* Quick Actions */}
        <div className="glass-card rounded-xl p-6 shadow-lg">
          <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <Button 
              variant="outline" 
              className="p-4 h-auto flex-col gap-2 transition-all duration-200 hover:scale-105 hover:shadow-lg border-primary/20 hover:border-primary/40"
              onClick={() => setActiveActionModal('summary')}
              disabled={chatDocs.length === 0}
              data-testid="button-quick-summary"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <FileText className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium">Summary</span>
            </Button>
            <Button 
              variant="outline" 
              className="p-4 h-auto flex-col gap-2 transition-all duration-200 hover:scale-105 hover:shadow-lg border-primary/20 hover:border-primary/40"
              onClick={() => setActiveActionModal('highlights')}
              disabled={chatDocs.length === 0}
              data-testid="button-quick-highlights"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-accent flex items-center justify-center">
                <Highlighter className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium">Highlights</span>
            </Button>
            <Button 
              variant="outline" 
              className="p-4 h-auto flex-col gap-2 transition-all duration-200 hover:scale-105 hover:shadow-lg border-primary/20 hover:border-primary/40"
              onClick={() => setActiveActionModal('quiz')}
              disabled={chatDocs.length === 0}
              data-testid="button-quick-quiz"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-primary flex items-center justify-center">
                <BookOpen className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium">Quiz</span>
            </Button>
            <Button 
              variant="outline" 
              className="p-4 h-auto flex-col gap-2 transition-all duration-200 hover:scale-105 hover:shadow-lg border-primary/20 hover:border-primary/40"
              onClick={() => setActiveActionModal('flashcards')}
              disabled={chatDocs.length === 0}
              data-testid="button-quick-flashcards"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-accent flex items-center justify-center">
                <Layers className="w-5 h-5 text-white" />
              </div>
              <span className="text-xs font-medium">Flashcards</span>
            </Button>
          </div>
        </div>

        {/* Chat Panel */}
        <div className="glass-card rounded-xl flex-1 flex flex-col overflow-hidden shadow-lg">
          <div className="p-5 border-b border-border/50 backdrop-blur-sm bg-card/50">
            <h3 className="font-semibold flex items-center gap-2">
              <Bot className="w-5 h-5 text-primary" />
              Chat with Documents
            </h3>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`} data-testid={`message-${msg.id}`}>
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-md">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                
                <div className={msg.role === 'user' ? 'bg-gradient-primary text-white rounded-2xl px-4 py-3 text-sm max-w-xs shadow-md' : 'flex-1'}>
                  {msg.role === 'assistant' ? (
                    <div className="bg-card/80 backdrop-blur-sm rounded-2xl px-4 py-3 text-sm border border-border/50 shadow-sm">
                      <p className="mb-2">{msg.content}</p>
                      {msg.metadata && typeof msg.metadata === 'object' && 'sources' in msg.metadata ? (
                        <div className="mt-2 pt-2 border-t border-border/50">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <BookOpen className="w-3 h-3" />
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
                  <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center flex-shrink-0 shadow-md">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {messages.length === 0 && (
              <div className="text-center py-8">
                <div className="w-16 h-16 rounded-full bg-gradient-subtle mx-auto mb-4 flex items-center justify-center">
                  <Bot className="w-8 h-8 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">Start a conversation</p>
                <p className="text-xs text-muted-foreground mt-1">Ask questions about your documents</p>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="p-5 border-t border-border/50 backdrop-blur-sm bg-card/50">
            <form onSubmit={handleSubmit} className="flex gap-3">
              <Input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Ask a question..."
                disabled={sendMessageMutation.isPending}
                className="flex-1 transition-all duration-200 focus:shadow-md"
                data-testid="input-chat-message"
              />
              <Button 
                type="submit" 
                disabled={!message.trim() || sendMessageMutation.isPending}
                size="sm"
                className="btn-gradient px-4 shadow-md"
                data-testid="button-send-message"
              >
                <Send className="w-4 h-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>

      {/* DocChat Action Modal */}
      <DocChatActionModal
        open={activeActionModal !== null}
        onOpenChange={(open) => {
          if (!open) {
            setActiveActionModal(null);
            setActionContent("");
          }
        }}
        actionType={activeActionModal}
        selectedDocs={selectedDocs}
        onSubmit={handleDocChatActionSubmit}
        isProcessing={actionProcessing}
        streamingContent={actionContent}
        userProfile={user}
      />
    </div>
  );
}
