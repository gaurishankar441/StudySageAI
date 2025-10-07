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
import {
  Upload,
  FileText,
  Youtube,
  Globe,
  Trash2,
} from "lucide-react";
import { Document } from "@shared/schema";

export default function DocChatSources() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [textContent, setTextContent] = useState("");
  const [textTitle, setTextTitle] = useState("");
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

  const addTextMutation = useMutation({
    mutationFn: async ({ title, content }: { title: string; content: string }) => {
      const response = await apiRequest("POST", "/api/documents", { title, content, sourceType: 'text' });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Text document added successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      setTextTitle("");
      setTextContent("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add text document",
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

  const handleDocumentClick = (docId: string) => {
    startChatMutation.mutate([docId]);
  };

  return (
    <div className="h-full p-6 overflow-auto">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Document Chat</h1>
          <p className="text-muted-foreground">Upload documents and chat with them using AI</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Add Source Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4">Add Source</h3>
                <div className="space-y-3">
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
                        data-testid="input-youtube-url"
                      />
                      <Button
                        size="sm"
                        onClick={() => addUrlMutation.mutate({ url: youtubeUrl, title: "YouTube Video" })}
                        disabled={!youtubeUrl || addUrlMutation.isPending}
                        data-testid="button-add-youtube"
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
                        data-testid="input-website-url"
                      />
                      <Button
                        size="sm"
                        onClick={() => addUrlMutation.mutate({ url: websiteUrl, title: "Website" })}
                        disabled={!websiteUrl || addUrlMutation.isPending}
                        data-testid="button-add-website"
                      >
                        <Globe className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="px-2 bg-card text-muted-foreground">OR PASTE TEXT</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Input
                      value={textTitle}
                      onChange={(e) => setTextTitle(e.target.value)}
                      placeholder="Document title (optional)"
                      className="w-full"
                      data-testid="input-text-title"
                    />
                    <Textarea
                      value={textContent}
                      onChange={(e) => setTextContent(e.target.value)}
                      placeholder="Paste your text content here..."
                      className="w-full min-h-[100px]"
                      data-testid="textarea-text-content"
                    />
                    <Button
                      size="sm"
                      onClick={() => addTextMutation.mutate({ 
                        title: textTitle || 'Text Document', 
                        content: textContent 
                      })}
                      disabled={!textContent || addTextMutation.isPending}
                      className="w-full"
                      data-testid="button-add-text"
                    >
                      {addTextMutation.isPending ? (
                        <div className="w-4 h-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
                      ) : (
                        <>
                          <FileText className="w-4 h-4 mr-2" />
                          Add Text Document
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sources List */}
          <div className="lg:col-span-2">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 text-sm text-muted-foreground uppercase tracking-wide">
                  Your Documents
                </h3>
                
                {documentsLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        data-testid={`document-card-${doc.id}`}
                        className="group relative p-4 rounded-lg border-2 border-border hover:border-primary/50 hover:shadow-md transition-all duration-200 cursor-pointer"
                        onClick={() => handleDocumentClick(doc.id)}
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-12 h-12 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
                            {doc.sourceType === 'youtube' ? (
                              <Youtube className="w-6 h-6 text-primary" />
                            ) : doc.sourceType === 'web' ? (
                              <Globe className="w-6 h-6 text-primary" />
                            ) : (
                              <FileText className="w-6 h-6 text-primary" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm mb-1 truncate">{doc.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {doc.pages ? `${doc.pages} pages` : ''} {doc.pages ? '•' : ''} {doc.status}
                            </p>
                            {doc.status === 'ready' && (
                              <div className="flex items-center gap-2 mt-2">
                                <span className="px-2 py-0.5 text-xs rounded bg-success/10 text-success">
                                  Ready to chat
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
                      <div className="col-span-2 text-center py-12">
                        <FileText className="w-16 h-16 text-muted-foreground/50 mx-auto mb-4" />
                        <p className="text-sm text-muted-foreground">No documents yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Upload a document to get started</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
