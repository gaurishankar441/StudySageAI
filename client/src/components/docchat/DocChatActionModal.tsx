import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Highlighter, BookOpen, Layers } from "lucide-react";

type ActionType = 'summary' | 'highlights' | 'quiz' | 'flashcards';

interface DocChatActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  actionType: ActionType | null;
  selectedDocs: { id: string; title: string }[];
  onSubmit: (actionType: ActionType, formData: any) => void;
  isProcessing: boolean;
  streamingContent: string;
  userProfile?: any;
}

const actionConfig: Record<ActionType, {
  title: string;
  icon: typeof FileText;
  color: string;
  description: string;
}> = {
  summary: {
    title: "Generate Summary",
    icon: FileText,
    color: "text-blue-600",
    description: "Create structured notes with key points and references"
  },
  highlights: {
    title: "Extract Highlights",
    icon: Highlighter,
    color: "text-yellow-600",
    description: "Get important quotes and key concepts with page references"
  },
  quiz: {
    title: "Generate Quiz",
    icon: BookOpen,
    color: "text-green-600",
    description: "Create practice questions from document content"
  },
  flashcards: {
    title: "Create Flashcards",
    icon: Layers,
    color: "text-purple-600",
    description: "Generate flashcards for spaced repetition learning"
  }
};

export default function DocChatActionModal({
  open,
  onOpenChange,
  actionType,
  selectedDocs,
  onSubmit,
  isProcessing,
  streamingContent,
  userProfile
}: DocChatActionModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({
    language: userProfile?.locale || 'en',
    level: userProfile?.currentClass || 'Class-12',
    examBoard: userProfile?.educationBoard || '',
    maxLength: 'Medium',
    density: 'Medium',
    extractQuotes: true,
    count: 10,
    types: 'mixed',
    difficulty: 'medium',
    style: 'Basic',
    keywords: ''
  });

  useEffect(() => {
    if (actionType) {
      setFormData({
        language: userProfile?.locale || 'en',
        level: userProfile?.currentClass || 'Class-12',
        examBoard: userProfile?.educationBoard || '',
        maxLength: 'Medium',
        density: 'Medium',
        extractQuotes: true,
        count: 10,
        types: 'mixed',
        difficulty: 'medium',
        style: 'Basic',
        keywords: ''
      });
    }
  }, [actionType, userProfile]);

  if (!actionType) return null;

  const config = actionConfig[actionType];
  const Icon = config.icon;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(actionType, formData);
  };

  const renderForm = () => {
    switch (actionType) {
      case 'summary':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="keywords">Focus Keywords (Optional)</Label>
              <Input
                id="keywords"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="e.g., photosynthesis, cell structure"
                data-testid="input-keywords"
              />
            </div>
            <div>
              <Label htmlFor="maxLength">Detail Level</Label>
              <Select value={formData.maxLength} onValueChange={(val) => setFormData({ ...formData, maxLength: val })}>
                <SelectTrigger id="maxLength" data-testid="select-max-length">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Short">Short (Quick overview)</SelectItem>
                  <SelectItem value="Medium">Medium (Balanced)</SelectItem>
                  <SelectItem value="Detailed">Detailed (Comprehensive)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <Select value={formData.language} onValueChange={(val) => setFormData({ ...formData, language: val })}>
                <SelectTrigger id="language" data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'highlights':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="density">Highlight Density</Label>
              <Select value={formData.density} onValueChange={(val) => setFormData({ ...formData, density: val })}>
                <SelectTrigger id="density" data-testid="select-density">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low (Top 5)</SelectItem>
                  <SelectItem value="Medium">Medium (Top 10)</SelectItem>
                  <SelectItem value="High">High (Top 20)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="extractQuotes"
                checked={formData.extractQuotes}
                onChange={(e) => setFormData({ ...formData, extractQuotes: e.target.checked })}
                className="rounded"
                data-testid="checkbox-extract-quotes"
              />
              <Label htmlFor="extractQuotes" className="cursor-pointer">
                Include exact quotes with page numbers
              </Label>
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <Select value={formData.language} onValueChange={(val) => setFormData({ ...formData, language: val })}>
                <SelectTrigger id="language" data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'quiz':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="count">Number of Questions</Label>
              <Select value={String(formData.count)} onValueChange={(val) => setFormData({ ...formData, count: parseInt(val) })}>
                <SelectTrigger id="count" data-testid="select-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 Questions</SelectItem>
                  <SelectItem value="10">10 Questions</SelectItem>
                  <SelectItem value="20">20 Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="types">Question Types</Label>
              <Select value={formData.types} onValueChange={(val) => setFormData({ ...formData, types: val })}>
                <SelectTrigger id="types" data-testid="select-types">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">Mixed (MCQ + Short + Numerical)</SelectItem>
                  <SelectItem value="MCQ">MCQ Only</SelectItem>
                  <SelectItem value="Assertion-Reason">Assertion-Reason (CBSE Style)</SelectItem>
                  <SelectItem value="Short">Short Answer</SelectItem>
                  <SelectItem value="Numerical">Numerical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="difficulty">Difficulty</Label>
              <Select value={formData.difficulty} onValueChange={(val) => setFormData({ ...formData, difficulty: val })}>
                <SelectTrigger id="difficulty" data-testid="select-difficulty">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="examBoard">Exam Board (Optional)</Label>
              <Select value={formData.examBoard} onValueChange={(val) => setFormData({ ...formData, examBoard: val })}>
                <SelectTrigger id="examBoard" data-testid="select-exam-board">
                  <SelectValue placeholder="Select board" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CBSE">CBSE</SelectItem>
                  <SelectItem value="ICSE">ICSE</SelectItem>
                  <SelectItem value="State Board">State Board</SelectItem>
                  <SelectItem value="JEE">JEE</SelectItem>
                  <SelectItem value="NEET">NEET</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <Select value={formData.language} onValueChange={(val) => setFormData({ ...formData, language: val })}>
                <SelectTrigger id="language" data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'flashcards':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="style">Flashcard Style</Label>
              <Select value={formData.style} onValueChange={(val) => setFormData({ ...formData, style: val })}>
                <SelectTrigger id="style" data-testid="select-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic">Basic (Q → A)</SelectItem>
                  <SelectItem value="Cloze">Cloze Deletion</SelectItem>
                  <SelectItem value="Reverse">Reverse (A → Q)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="count">Number of Cards</Label>
              <Select value={String(formData.count)} onValueChange={(val) => setFormData({ ...formData, count: parseInt(val) })}>
                <SelectTrigger id="count" data-testid="select-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 Cards</SelectItem>
                  <SelectItem value="20">20 Cards</SelectItem>
                  <SelectItem value="30">30 Cards</SelectItem>
                  <SelectItem value="50">50 Cards</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="language">Language</Label>
              <Select value={formData.language} onValueChange={(val) => setFormData({ ...formData, language: val })}>
                <SelectTrigger id="language" data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="en">English</SelectItem>
                  <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" data-testid={`dialog-docchat-action-${actionType}`}>
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center`}>
              <Icon className={`w-5 h-5 ${config.color}`} />
            </div>
            <div>
              <DialogTitle>{config.title}</DialogTitle>
              <DialogDescription>{config.description}</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-shrink-0 mb-4 p-3 bg-muted/50 rounded-lg text-sm">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-muted-foreground">Selected:</span>
            {selectedDocs.slice(0, 2).map((doc, idx) => (
              <span key={doc.id} className="font-medium text-primary">
                {doc.title}{idx < Math.min(selectedDocs.length, 2) - 1 ? ',' : ''}
              </span>
            ))}
            {selectedDocs.length > 2 && (
              <span className="text-muted-foreground">+ {selectedDocs.length - 2} more</span>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {renderForm()}

            {(streamingContent || isProcessing) && (
              <div className="mt-4 p-4 bg-muted rounded-lg max-h-80 overflow-y-auto">
                {isProcessing && !streamingContent && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm">Generating...</span>
                  </div>
                )}
                {streamingContent && (
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap break-words">{streamingContent}</div>
                    {isProcessing && (
                      <div className="inline-block w-2 h-4 bg-primary animate-pulse ml-1" />
                    )}
                  </div>
                )}
              </div>
            )}
          </form>
        </div>

        <DialogFooter className="flex-shrink-0 mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
            data-testid="button-cancel"
          >
            {streamingContent ? 'Close' : 'Cancel'}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isProcessing}
            data-testid="button-generate"
          >
            {isProcessing ? 'Generating...' : `Generate ${config.title}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
