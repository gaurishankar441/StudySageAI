import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import {
  X,
  FileText,
  Globe,
  Youtube,
  Mic,
  GraduationCap,
  CheckSquare,
  List,
  Edit,
} from "lucide-react";
import { Document } from "@shared/schema";

interface NotesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  template?: string;
}

const templates = [
  { id: 'cornell', name: 'Cornell Style', description: 'Structured note-taking with cues, notes, and summary sections' },
  { id: 'lecture', name: 'Lecture Notes', description: 'Organized format for recording live lectures' },
  { id: 'research', name: 'Research Paper', description: 'Academic writing structure with citations' },
  { id: 'summary', name: 'Summary', description: 'Condensed overview of key points' },
  { id: 'review', name: 'Review', description: 'Critical analysis and evaluation format' },
  { id: 'blank', name: 'Blank Note', description: 'Start with a clean slate' },
];

const languages = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
];

export default function NotesModal({ open, onOpenChange, template }: NotesModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    template: template || 'blank',
    language: 'en',
    sourceType: 'blank',
    sourceUrls: '',
    sourceDocIds: [] as string[],
    generateFlashcards: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    enabled: formData.sourceType === 'documents',
  });

  const createNoteMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        title: data.title,
        template: data.template,
        language: data.language,
      };

      if (data.sourceType === 'documents' && data.sourceDocIds.length > 0) {
        return apiRequest("POST", "/api/notes", {
          ...payload,
          sourceIds: data.sourceDocIds,
        });
      } else if (data.sourceType === 'urls' && data.sourceUrls.trim()) {
        // For URLs, split by newlines and filter empty lines
        const urls = data.sourceUrls.split('\n').map(url => url.trim()).filter(url => url.length > 0);
        return apiRequest("POST", "/api/notes", {
          ...payload,
          sourceUrls: urls,
        });
      } else {
        // Create blank note
        return apiRequest("POST", "/api/notes", {
          ...payload,
          content: {
            bigIdea: '',
            summary: '',
            sections: [],
            keyTerms: [],
            flashcards: [],
          },
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Note created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/notes"] });
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create note. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      template: template || 'blank',
      language: 'en',
      sourceType: 'blank',
      sourceUrls: '',
      sourceDocIds: [],
      generateFlashcards: true,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a title for your note.",
        variant: "destructive",
      });
      return;
    }
    createNoteMutation.mutate(formData);
  };

  const handleDocumentToggle = (docId: string) => {
    setFormData(prev => ({
      ...prev,
      sourceDocIds: prev.sourceDocIds.includes(docId)
        ? prev.sourceDocIds.filter(id => id !== docId)
        : [...prev.sourceDocIds, docId]
    }));
  };

  const selectedTemplate = templates.find(t => t.id === formData.template);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Create New Note</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {selectedTemplate ? selectedTemplate.description : 'Create a new study note'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Note Title</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Quantum Physics Chapter 3 Notes"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="template">Template</Label>
                <Select value={formData.template} onValueChange={(value) => setFormData({ ...formData, template: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="language">Language</Label>
                <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Source Selection */}
          <div className="space-y-4">
            <Label className="text-sm font-medium">Create From</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, sourceType: 'blank' })}
                className={`p-4 rounded-lg border-2 transition-all duration-200 text-center ${
                  formData.sourceType === 'blank'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary'
                }`}
              >
                <Edit className="w-5 h-5 mx-auto mb-2" />
                <span className="font-medium text-sm">Blank Note</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, sourceType: 'documents' })}
                className={`p-4 rounded-lg border-2 transition-all duration-200 text-center ${
                  formData.sourceType === 'documents'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary'
                }`}
              >
                <FileText className="w-5 h-5 mx-auto mb-2" />
                <span className="font-medium text-sm">From Documents</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, sourceType: 'urls' })}
                className={`p-4 rounded-lg border-2 transition-all duration-200 text-center ${
                  formData.sourceType === 'urls'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary'
                }`}
              >
                <Globe className="w-5 h-5 mx-auto mb-2" />
                <span className="font-medium text-sm">From URLs</span>
              </button>

              <button
                type="button"
                onClick={() => setFormData({ ...formData, sourceType: 'audio' })}
                className={`p-4 rounded-lg border-2 transition-all duration-200 text-center ${
                  formData.sourceType === 'audio'
                    ? 'border-primary bg-primary/5 text-primary'
                    : 'border-border hover:border-primary'
                }`}
              >
                <Mic className="w-5 h-5 mx-auto mb-2" />
                <span className="font-medium text-sm">Record Audio</span>
              </button>
            </div>
          </div>

          {/* Source-specific fields */}
          {formData.sourceType === 'documents' && (
            <div>
              <Label>Select Documents</Label>
              <div className="max-h-48 overflow-y-auto border border-border rounded-lg p-3 mt-2">
                {documents.length > 0 ? (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div key={doc.id} className="flex items-center space-x-3">
                        <Checkbox
                          id={doc.id}
                          checked={formData.sourceDocIds.includes(doc.id)}
                          onCheckedChange={() => handleDocumentToggle(doc.id)}
                        />
                        <Label htmlFor={doc.id} className="flex-1 cursor-pointer text-sm">
                          {doc.title}
                        </Label>
                        <span className="text-xs text-muted-foreground">
                          {doc.status === 'ready' ? '✓' : '⏳'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No documents available. Upload some documents first.
                  </p>
                )}
              </div>
            </div>
          )}

          {formData.sourceType === 'urls' && (
            <div>
              <Label htmlFor="sourceUrls">URLs to Summarize</Label>
              <Textarea
                id="sourceUrls"
                value={formData.sourceUrls}
                onChange={(e) => setFormData({ ...formData, sourceUrls: e.target.value })}
                placeholder="Paste URLs here (one per line)&#10;https://example.com/article1&#10;https://example.com/article2"
                rows={4}
                className="resize-none mt-2"
              />
            </div>
          )}

          {formData.sourceType === 'audio' && (
            <div className="p-4 rounded-lg border border-border bg-muted/50">
              <p className="text-sm text-muted-foreground mb-2">
                Audio recording feature will be available soon.
              </p>
              <p className="text-xs text-muted-foreground">
                For now, you can create a blank note and add content manually.
              </p>
            </div>
          )}

          {/* Options */}
          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="generateFlashcards"
                checked={formData.generateFlashcards}
                onCheckedChange={(checked) => setFormData({ ...formData, generateFlashcards: !!checked })}
              />
              <Label htmlFor="generateFlashcards" className="text-sm">
                Auto-generate flashcards from key concepts
              </Label>
            </div>
          </div>
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={createNoteMutation.isPending || !formData.title.trim()}
            className="flex items-center gap-2"
          >
            {createNoteMutation.isPending ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
            Create Note
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
