import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Lightbulb, HelpCircle, BookOpen, Brain, FileText } from "lucide-react";
import { Chat } from "@shared/schema";

type ToolType = 'explain' | 'hint' | 'example' | 'practice5' | 'summary';

interface QuickToolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  toolType: ToolType | null;
  chat: Chat;
  onSubmit: (toolType: ToolType, formData: any) => void;
  isStreaming: boolean;
  streamingContent: string;
  userProfile?: any;
}

const toolConfig: Record<ToolType, {
  title: string;
  icon: typeof Lightbulb;
  color: string;
  description: string;
}> = {
  explain: {
    title: "Explain Concept",
    icon: Lightbulb,
    color: "text-yellow-600",
    description: "Get a clear, structured explanation with examples"
  },
  hint: {
    title: "Give Me a Hint",
    icon: HelpCircle,
    color: "text-blue-600",
    description: "Progressive hints without revealing the full solution"
  },
  example: {
    title: "Show Example",
    icon: BookOpen,
    color: "text-green-600",
    description: "See a solved example or real-life application"
  },
  practice5: {
    title: "Practice 5 Questions",
    icon: Brain,
    color: "text-purple-600",
    description: "Generate practice questions to test your understanding"
  },
  summary: {
    title: "Get Summary",
    icon: FileText,
    color: "text-indigo-600",
    description: "Summarize recent learning with key takeaways"
  }
};

export default function QuickToolModal({
  open,
  onOpenChange,
  toolType,
  chat,
  onSubmit,
  isStreaming,
  streamingContent,
  userProfile
}: QuickToolModalProps) {
  const [formData, setFormData] = useState<Record<string, any>>({
    language: chat.language || userProfile?.locale || 'en',
    difficulty: 'medium',
    examBoard: userProfile?.educationBoard || '',
    subtopic: '',
    exampleType: 'Solved Example',
    qTypes: 'mixed',
    count: 5,
    summaryTurns: 10,
    userQuery: ''
  });

  useEffect(() => {
    if (toolType) {
      setFormData({
        language: chat.language || userProfile?.locale || 'en',
        difficulty: 'medium',
        examBoard: userProfile?.educationBoard || '',
        subtopic: '',
        exampleType: 'Solved Example',
        qTypes: 'mixed',
        count: 5,
        summaryTurns: 10,
        userQuery: ''
      });
    }
  }, [toolType, chat.language, userProfile]);

  if (!toolType) return null;

  const config = toolConfig[toolType];
  const Icon = config.icon;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(toolType, formData);
  };

  const renderForm = () => {
    switch (toolType) {
      case 'explain':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="subtopic">Sub-topic (Optional)</Label>
              <Input
                id="subtopic"
                value={formData.subtopic}
                onChange={(e) => setFormData({ ...formData, subtopic: e.target.value })}
                placeholder={`Enter specific concept within ${chat.topic}`}
                data-testid="input-subtopic"
              />
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

      case 'hint':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="userQuery">Question</Label>
              <Textarea
                id="userQuery"
                value={formData.userQuery}
                onChange={(e) => setFormData({ ...formData, userQuery: e.target.value })}
                placeholder="Paste or type your question here..."
                rows={4}
                data-testid="textarea-user-query"
              />
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

      case 'example':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="exampleType">Example Type</Label>
              <Select value={formData.exampleType} onValueChange={(val) => setFormData({ ...formData, exampleType: val })}>
                <SelectTrigger id="exampleType" data-testid="select-example-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Solved Example">Solved Example</SelectItem>
                  <SelectItem value="Real-life Application">Real-life Application</SelectItem>
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

      case 'practice5':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="count">Number of Questions</Label>
              <Select value={String(formData.count)} onValueChange={(val) => setFormData({ ...formData, count: parseInt(val) })}>
                <SelectTrigger id="count" data-testid="select-count">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Questions</SelectItem>
                  <SelectItem value="5">5 Questions</SelectItem>
                  <SelectItem value="10">10 Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="qTypes">Question Types</Label>
              <Select value={formData.qTypes} onValueChange={(val) => setFormData({ ...formData, qTypes: val })}>
                <SelectTrigger id="qTypes" data-testid="select-q-types">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mixed">Mixed (MCQ + Short + Numeric)</SelectItem>
                  <SelectItem value="mcq">MCQ Only</SelectItem>
                  <SelectItem value="short">Short Answer Only</SelectItem>
                  <SelectItem value="numeric">Numeric Only</SelectItem>
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

      case 'summary':
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="summaryTurns">Summarize Last N Turns</Label>
              <Select value={String(formData.summaryTurns)} onValueChange={(val) => setFormData({ ...formData, summaryTurns: parseInt(val) })}>
                <SelectTrigger id="summaryTurns" data-testid="select-summary-turns">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">Last 5 turns</SelectItem>
                  <SelectItem value="10">Last 10 turns</SelectItem>
                  <SelectItem value="20">Last 20 turns</SelectItem>
                  <SelectItem value="50">All conversation</SelectItem>
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
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col" data-testid={`dialog-quick-tool-${toolType}`}>
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
            <span className="font-medium text-primary">{chat.subject}</span>
            <span className="text-muted-foreground">•</span>
            <span>{chat.level}</span>
            <span className="text-muted-foreground">•</span>
            <span>{chat.topic}</span>
            {formData.examBoard && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-sm text-primary">{formData.examBoard}</span>
              </>
            )}
            <span className="text-muted-foreground">•</span>
            <span>{formData.language === 'hi' ? 'हिन्दी' : 'English'}</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            {renderForm()}

            {(streamingContent || isStreaming) && (
              <div className="mt-4 p-4 bg-muted rounded-lg max-h-80 overflow-y-auto">
                {isStreaming && !streamingContent && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    <span className="text-sm">AI is thinking...</span>
                  </div>
                )}
                {streamingContent && (
                  <div className="prose prose-sm max-w-none">
                    <div className="whitespace-pre-wrap break-words">{streamingContent}</div>
                    {isStreaming && (
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
            disabled={isStreaming}
            data-testid="button-cancel"
          >
            {streamingContent ? 'Close' : 'Cancel'}
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={isStreaming || (toolType === 'hint' && !formData.userQuery.trim())}
            data-testid="button-generate"
          >
            {isStreaming ? 'Generating...' : `Generate ${config.title}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
