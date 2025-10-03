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
  Wand2,
  Edit,
  Book,
  FileText,
  Youtube,
  Globe,
  ChevronRight,
  ChevronLeft,
  X,
} from "lucide-react";
import { Document } from "@shared/schema";

interface QuizModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const subjects = [
  'Mathematics',
  'Physics',
  'Chemistry',
  'Biology',
  'History',
  'Literature',
  'Computer Science',
];

const difficulties = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
  { value: 'mixed', label: 'Mixed' },
];

const questionTypes = [
  { id: 'mcq_single', label: 'Multiple Choice (Single)' },
  { id: 'mcq_multi', label: 'Multiple Choice (Multi)' },
  { id: 'short', label: 'Short Answer' },
  { id: 'long', label: 'Long Answer' },
];

export default function QuizModal({ open, onOpenChange }: QuizModalProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    setupType: 'auto',
    generateFrom: 'topic',
    title: '',
    subject: '',
    topic: '',
    difficulty: 'medium',
    questionCount: 10,
    selectedTypes: ['mcq_single', 'mcq_multi'],
    language: 'en',
    sourceId: '',
    sourceUrl: '',
  });
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [] } = useQuery<Document[]>({
    queryKey: ["/api/documents"],
    enabled: formData.generateFrom === 'document',
  });

  const createQuizMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return apiRequest("POST", "/api/quizzes", {
        title: data.title,
        source: data.generateFrom,
        sourceId: data.sourceId || null,
        sourceUrl: data.sourceUrl || null,
        subject: data.subject,
        topic: data.topic,
        difficulty: data.difficulty,
        questionCount: data.questionCount,
        questionTypes: data.selectedTypes,
        language: data.language,
      });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Quiz created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/quizzes"] });
      onOpenChange(false);
      resetForm();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create quiz. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setStep(1);
    setFormData({
      setupType: 'auto',
      generateFrom: 'topic',
      title: '',
      subject: '',
      topic: '',
      difficulty: 'medium',
      questionCount: 10,
      selectedTypes: ['mcq_single', 'mcq_multi'],
      language: 'en',
      sourceId: '',
      sourceUrl: '',
    });
  };

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      createQuizMutation.mutate(formData);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return formData.setupType && formData.generateFrom;
      case 2:
        if (formData.generateFrom === 'topic') {
          return formData.subject && formData.topic;
        } else if (formData.generateFrom === 'document') {
          return formData.sourceId;
        } else {
          return formData.sourceUrl;
        }
      case 3:
        return formData.title && formData.selectedTypes.length > 0;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            {/* Setup Type */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Setup Type</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, setupType: 'auto' })}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    formData.setupType === 'auto'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <Wand2 className="w-5 h-5 mx-auto mb-2" />
                  <span className="font-medium text-sm">Auto Generate</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, setupType: 'manual' })}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    formData.setupType === 'manual'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <Edit className="w-5 h-5 mx-auto mb-2" />
                  <span className="font-medium text-sm">Manual</span>
                </button>
              </div>
            </div>

            {/* Generate From */}
            <div>
              <Label className="text-sm font-medium mb-3 block">Generate From</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, generateFrom: 'topic' })}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    formData.generateFrom === 'topic'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <Book className="w-5 h-5 mx-auto mb-2" />
                  <span className="font-medium text-sm">Topic</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, generateFrom: 'document' })}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    formData.generateFrom === 'document'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <FileText className="w-5 h-5 mx-auto mb-2" />
                  <span className="font-medium text-sm">Document</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, generateFrom: 'youtube' })}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    formData.generateFrom === 'youtube'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <Youtube className="w-5 h-5 mx-auto mb-2" />
                  <span className="font-medium text-sm">YouTube</span>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, generateFrom: 'website' })}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    formData.generateFrom === 'website'
                      ? 'border-primary bg-primary/5 text-primary'
                      : 'border-border hover:border-primary'
                  }`}
                >
                  <Globe className="w-5 h-5 mx-auto mb-2" />
                  <span className="font-medium text-sm">Website</span>
                </button>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            {formData.generateFrom === 'topic' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Select value={formData.subject} onValueChange={(value) => setFormData({ ...formData, subject: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="topic">Topic</Label>
                    <Input
                      id="topic"
                      value={formData.topic}
                      onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                      placeholder="e.g., Quantum Mechanics"
                    />
                  </div>
                </div>
              </>
            )}

            {formData.generateFrom === 'document' && (
              <div>
                <Label>Select Document</Label>
                <Select value={formData.sourceId} onValueChange={(value) => setFormData({ ...formData, sourceId: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a document" />
                  </SelectTrigger>
                  <SelectContent>
                    {documents.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id}>
                        {doc.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {(formData.generateFrom === 'youtube' || formData.generateFrom === 'website') && (
              <div>
                <Label htmlFor="sourceUrl">
                  {formData.generateFrom === 'youtube' ? 'YouTube URL' : 'Website URL'}
                </Label>
                <Input
                  id="sourceUrl"
                  value={formData.sourceUrl}
                  onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                  placeholder={
                    formData.generateFrom === 'youtube'
                      ? 'https://youtube.com/watch?v=...'
                      : 'https://example.com/article'
                  }
                />
              </div>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="quiz-title">Quiz Title</Label>
              <Input
                id="quiz-title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="e.g., Quantum Mechanics Final Review"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="question-count">Number of Questions</Label>
                <Input
                  id="question-count"
                  type="number"
                  min="5"
                  max="50"
                  value={formData.questionCount}
                  onChange={(e) => setFormData({ ...formData, questionCount: parseInt(e.target.value) })}
                />
              </div>
              
              <div>
                <Label htmlFor="difficulty">Difficulty</Label>
                <Select value={formData.difficulty} onValueChange={(value) => setFormData({ ...formData, difficulty: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {difficulties.map((diff) => (
                      <SelectItem key={diff.value} value={diff.value}>
                        {diff.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-3 block">Question Types</Label>
              <div className="space-y-2">
                {questionTypes.map((type) => (
                  <div key={type.id} className="flex items-center space-x-3 p-3 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors duration-200">
                    <Checkbox
                      id={type.id}
                      checked={formData.selectedTypes.includes(type.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setFormData({
                            ...formData,
                            selectedTypes: [...formData.selectedTypes, type.id]
                          });
                        } else {
                          setFormData({
                            ...formData,
                            selectedTypes: formData.selectedTypes.filter(t => t !== type.id)
                          });
                        }
                      }}
                    />
                    <Label htmlFor={type.id} className="cursor-pointer">{type.label}</Label>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="language">Language</Label>
              <Select value={formData.language} onValueChange={(value) => setFormData({ ...formData, language: value })}>
                <SelectTrigger>
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

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Create Quiz</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Step {step} of 3: {step === 1 ? 'Setup Type' : step === 2 ? 'Source Configuration' : 'Quiz Details'}
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-6 flex-shrink-0">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors duration-200 ${
                  i <= step
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {i}
              </div>
              {i < 3 && (
                <div
                  className={`h-1 flex-1 rounded transition-colors duration-200 ${
                    i < step ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <div className="flex-1 overflow-y-auto min-h-0 py-4">
          {renderStep()}
        </div>

        <DialogFooter className="flex justify-between flex-shrink-0">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || createQuizMutation.isPending}
            className="flex items-center gap-2"
          >
            {createQuizMutation.isPending ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : step === 3 ? (
              <Wand2 className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
            {step === 3 ? 'Generate Quiz' : 'Next'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
