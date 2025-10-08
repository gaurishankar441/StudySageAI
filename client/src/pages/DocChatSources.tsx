import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "@/components/ObjectUploader";
import LoadingScreen from "@/components/LoadingScreen";
import {
  Upload,
  FileText,
  Youtube,
  Globe,
  Trash2,
  Sparkles,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Document } from "@shared/schema";

export default function DocChatSources() {
  const [url, setUrl] = useState("");
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  const { data: documents = [], isLoading: documentsLoading } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
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
      setUploadingFile(false);
    },
    onError: (error) => {
      console.error('Document upload error:', error);
      toast({
        title: "Error",
        description: "Failed to upload document",
        variant: "destructive",
      });
      setUploadingFile(false);
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
      setUrl("");
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
      return { docId };
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
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
      
      const chatId = data.id || data.chatId;
      if (!chatId) {
        throw new Error('Invalid response: missing chat ID');
      }
      
      return { ...data, id: chatId };
    },
    onSuccess: (chat: any) => {
      console.log('Chat started successfully, ID:', chat.id);
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      toast({
        title: "Success",
        description: "Chat session started",
      });
      setLocation(`/docchat/${chat.id}`);
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

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocIds(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleStartChat = () => {
    if (selectedDocIds.length === 0) {
      toast({
        title: "No documents selected",
        description: "Please select at least one document",
        variant: "destructive",
      });
      return;
    }
    startChatMutation.mutate(selectedDocIds);
  };

  const selectedDocs = documents.filter(doc => selectedDocIds.includes(doc.id));

  return (
    <div className="h-full p-8 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
            Document Chat
          </h1>
          <p className="text-muted-foreground">Upload documents and chat with them using AI</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Add Source Section */}
          <div className="lg:col-span-1">
            <div className="glass-card rounded-xl p-8">
              <h3 className="font-semibold mb-6 flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                Add Source
              </h3>
              <div className="space-y-4">
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={200 * 1024 * 1024}
                  onGetUploadParameters={async (file) => {
                    const response = await apiRequest("POST", "/api/objects/upload", {
                      contentType: file.type
                    });
                    const { uploadURL } = await response.json();
                    return { 
                      method: "PUT" as const, 
                      url: uploadURL,
                      headers: {
                        'Content-Type': file.type
                      }
                    };
                  }}
                  onComplete={(result) => {
                    const uploadedFile = result.successful?.[0];
                    const uploadURL = uploadedFile?.uploadURL;
                    const fileName = uploadedFile?.name || 'Uploaded Document';
                    if (uploadedFile && uploadURL && typeof uploadURL === 'string') {
                      setUploadingFile(true);
                      uploadDocumentMutation.mutate({
                        uploadURL: uploadURL,
                        fileName: fileName,
                        fileSize: uploadedFile.size || 0,
                        fileType: uploadedFile.type || 'application/octet-stream'
                      });
                    }
                  }}
                  buttonClassName="w-full h-32 border-2 border-dashed border-primary/30 hover:border-primary rounded-xl transition-all duration-200 hover:shadow-lg bg-gradient-subtle"
                >
                  <div className="flex flex-col items-center text-center">
                    <div className="w-12 h-12 rounded-full bg-gradient-primary flex items-center justify-center mb-3">
                      <Upload className="w-6 h-6 text-white" />
                    </div>
                    <p className="text-sm font-medium mb-1">Drop files or click to upload</p>
                    <p className="text-xs text-muted-foreground">PDF, DOCX, PPTX up to 200MB</p>
                  </div>
                </ObjectUploader>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-border/50"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-card/50 text-muted-foreground backdrop-blur-sm">OR</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Input
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="Paste YouTube or website URL..."
                    className="flex-1 transition-all duration-200 focus:shadow-md"
                    data-testid="input-url"
                  />
                  <Button
                    size="sm"
                    onClick={() => addUrlMutation.mutate({ url, title: "Document" })}
                    disabled={!url || addUrlMutation.isPending}
                    className="btn-gradient"
                    data-testid="button-add-url"
                  >
                    + Add
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Sources List */}
          <div className="lg:col-span-2">
            <div className="glass-card rounded-xl p-8">
              <h3 className="font-semibold mb-6 text-sm text-muted-foreground uppercase tracking-wide">
                Your Documents
              </h3>
              
              {documentsLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {documents.map((doc) => {
                    const isSelected = selectedDocIds.includes(doc.id);
                    return <div
                      key={doc.id}
                      data-testid={`document-card-${doc.id}`}
                      className={`card-interactive group relative p-5 rounded-xl cursor-pointer transition-all duration-200 hover:scale-[1.02] ${isSelected ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950/20' : ''}`}
                      onClick={() => toggleDocumentSelection(doc.id)}
                    >
                      {/* Selection Indicator */}
                      <div className="absolute top-3 left-3">
                        {isSelected ? (
                          <CheckCircle2 className="w-5 h-5 text-purple-600" data-testid={`selected-${doc.id}`} />
                        ) : (
                          <Circle className="w-5 h-5 text-slate-300 dark:text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}
                      </div>
                      <div className="flex items-start gap-3 ml-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-md">
                          {doc.sourceType === 'youtube' ? (
                            <Youtube className="w-6 h-6 text-white" />
                          ) : doc.sourceType === 'web' ? (
                            <Globe className="w-6 h-6 text-white" />
                          ) : (
                            <FileText className="w-6 h-6 text-white" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm mb-1 truncate">{doc.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {doc.pages ? `${doc.pages} pages` : ''} {doc.pages ? '•' : ''} {doc.status}
                          </p>
                          {doc.status === 'ready' && (
                            <div className="flex items-center gap-2 mt-3">
                              <span className="px-3 py-1 text-xs rounded-full bg-gradient-primary text-white shadow-sm">
                                Ready to chat
                              </span>
                            </div>
                          )}
                          {doc.status === 'processing' && (
                            <div className="flex items-center gap-2 mt-3">
                              <span className="px-3 py-1 text-xs rounded-full bg-gradient-accent text-white shadow-sm animate-pulse-subtle">
                                Processing...
                              </span>
                            </div>
                          )}
                          {doc.status === 'error' && (
                            <div className="flex items-center gap-2 mt-3">
                              <span className="px-3 py-1 text-xs rounded-full bg-destructive/80 text-white shadow-sm">
                                Error
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute top-3 right-3 h-8 w-8 p-0 opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all duration-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDocumentMutation.mutate(doc.id);
                        }}
                        data-testid={`button-delete-${doc.id}`}
                        disabled={deleteDocumentMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>;
                  })}
                  
                  {documents.length === 0 && (
                    <div className="col-span-3 text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-gradient-subtle mx-auto mb-4 flex items-center justify-center">
                        <FileText className="w-8 h-8 text-muted-foreground/50" />
                      </div>
                      <p className="text-sm text-muted-foreground">No documents yet</p>
                      <p className="text-xs text-muted-foreground mt-1">Upload a document to get started</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Sidebar - Selected Documents */}
          <div className="lg:col-span-1">
            <div className="sticky top-8">
              <div className="glass-card rounded-xl p-6">
                <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                  Selected Documents ({selectedDocs.length})
                </h3>
                
                {selectedDocs.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No documents selected
                  </p>
                ) : (
                  <div className="space-y-3 mb-6">
                    {selectedDocs.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg"
                        data-testid={`selected-doc-${doc.id}`}
                      >
                        <CheckCircle2 className="w-4 h-4 text-purple-600 flex-shrink-0" />
                        <p className="text-sm flex-1 truncate">{doc.title}</p>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => toggleDocumentSelection(doc.id)}
                          data-testid={`remove-selected-${doc.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <Button
                  onClick={handleStartChat}
                  disabled={selectedDocs.length === 0 || startChatMutation.isPending}
                  className="w-full btn-gradient"
                  data-testid="button-start-chat"
                >
                  {startChatMutation.isPending ? (
                    <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  ) : (
                    "Start Chat"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Loading Screen for File Upload */}
      {uploadingFile && (
        <LoadingScreen context="doc_upload" />
      )}
      
      {/* Loading Screen for URL Processing */}
      {addUrlMutation.isPending && (
        <LoadingScreen context="web_upload" />
      )}
    </div>
  );
}
