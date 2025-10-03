import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
  ChevronRight,
  ChevronLeft,
  X,
  Calendar,
  Clock,
  BookOpen,
  Target,
} from "lucide-react";

interface StudyPlanWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const languages = [
  { value: 'en', label: 'English' },
  { value: 'hi', label: 'हिन्दी (Hindi)' },
];

const gradeLevels = [
  'Elementary',
  'Middle School',
  'High School',
  'Undergraduate',
  'Graduate',
  'Professional',
];

const intensityLevels = [
  { value: 'light', label: 'Light', description: '2-3 hours per week' },
  { value: 'regular', label: 'Regular', description: '4-6 hours per week' },
  { value: 'intense', label: 'Intense', description: '7+ hours per week' },
];

const sessionDurations = [
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '60 minutes' },
  { value: 90, label: '90 minutes' },
];

export default function StudyPlanWizard({ open, onOpenChange }: StudyPlanWizardProps) {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    language: 'en',
    gradeLevel: '',
    subject: '',
    topics: '',
    examDate: '',
    hasExamDate: false,
    intensity: 'regular',
    sessionDuration: 45,
    useExistingNotes: false,
    includeReminders: true,
    includeAITutor: true,
    includeQuizzes: true,
    includeFlashcards: true,
    includeDocChat: true,
    includeExtraResources: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPlanMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      console.log('[StudyPlanWizard] Starting mutation with data:', data);
      const topics = data.topics.split('\n').filter(t => t.trim()).map(t => t.trim());
      console.log('[StudyPlanWizard] Parsed topics:', topics);
      
      const payload = {
        name: data.name,
        subject: data.subject,
        topics,
        gradeLevel: data.gradeLevel,
        examDate: data.hasExamDate ? data.examDate : null,
        intensity: data.intensity,
        sessionDuration: data.sessionDuration,
        language: data.language,
      };
      console.log('[StudyPlanWizard] API payload:', payload);
      
      const result = await apiRequest("POST", "/api/study-plans", payload);
      console.log('[StudyPlanWizard] API result:', result);
      return result;
    },
    onSuccess: (data) => {
      console.log('[StudyPlanWizard] Mutation success:', data);
      toast({
        title: "Success",
        description: "Study plan created successfully!",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/study-plans"] });
      onOpenChange(false);
      resetForm();
    },
    onError: (error) => {
      console.error('[StudyPlanWizard] Mutation error:', error);
      toast({
        title: "Error",
        description: "Failed to create study plan. Please try again.",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setStep(1);
    setFormData({
      name: '',
      language: 'en',
      gradeLevel: '',
      subject: '',
      topics: '',
      examDate: '',
      hasExamDate: false,
      intensity: 'regular',
      sessionDuration: 45,
      useExistingNotes: false,
      includeReminders: true,
      includeAITutor: true,
      includeQuizzes: true,
      includeFlashcards: true,
      includeDocChat: true,
      includeExtraResources: false,
    });
  };

  const handleNext = () => {
    console.log('[StudyPlanWizard] handleNext called, step:', step, 'canProceed:', canProceed());
    if (step < 4) {
      setStep(step + 1);
    } else {
      console.log('[StudyPlanWizard] Calling mutation with formData:', formData);
      createPlanMutation.mutate(formData);
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
        return formData.name && formData.gradeLevel && formData.subject;
      case 2:
        return formData.hasExamDate ? formData.examDate : true;
      case 3:
        return formData.intensity && formData.sessionDuration;
      case 4:
        return true; // Inclusions are optional
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <Label htmlFor="plan-name">Plan Name</Label>
              <Input
                id="plan-name"
                data-testid="input-plan-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Final Exams Preparation"
              />
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="grade-level">Grade Level</Label>
                <Select value={formData.gradeLevel} onValueChange={(value) => setFormData({ ...formData, gradeLevel: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select grade level" />
                  </SelectTrigger>
                  <SelectContent>
                    {gradeLevels.map((grade) => (
                      <SelectItem key={grade} value={grade}>
                        {grade}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="subject">Subject(s)</Label>
                <Input
                  id="subject"
                  data-testid="input-subject"
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="e.g., Physics, Math, Chemistry"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="topics">Topics to Cover</Label>
              <Textarea
                id="topics"
                data-testid="textarea-topics"
                rows={4}
                value={formData.topics}
                onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                placeholder="List the topics you want to study (one per line)&#10;• Quantum Mechanics&#10;• Thermodynamics&#10;• Electromagnetism"
                className="resize-none"
              />
            </div>

            <div className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors duration-200">
              <Checkbox
                id="use-existing-notes"
                checked={formData.useExistingNotes}
                onCheckedChange={(checked) => setFormData({ ...formData, useExistingNotes: !!checked })}
              />
              <div className="flex-1">
                <Label htmlFor="use-existing-notes" className="font-medium cursor-pointer">
                  Use existing notes and documents
                </Label>
                <p className="text-sm text-muted-foreground">
                  Include materials from your library in the study plan
                </p>
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Calendar className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Exam Date & Timeline</h3>
              <p className="text-sm text-muted-foreground">
                Help us create an optimal study schedule for your goals
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-4 rounded-lg border border-border">
                <Checkbox
                  id="has-exam-date"
                  checked={formData.hasExamDate}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasExamDate: !!checked })}
                />
                <Label htmlFor="has-exam-date" className="font-medium cursor-pointer">
                  I have a specific exam date
                </Label>
              </div>

              {formData.hasExamDate && (
                <div>
                  <Label htmlFor="exam-date">Exam Date</Label>
                  <Input
                    id="exam-date"
                    type="date"
                    value={formData.examDate}
                    onChange={(e) => setFormData({ ...formData, examDate: e.target.value })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}

              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Study Timeline</h4>
                <p className="text-sm text-muted-foreground">
                  {formData.hasExamDate && formData.examDate
                    ? `${Math.ceil((new Date(formData.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days until exam`
                    : 'Continuous learning plan without specific deadline'
                  }
                </p>
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Clock className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Study Preferences</h3>
              <p className="text-sm text-muted-foreground">
                Customize your study schedule to fit your lifestyle
              </p>
            </div>

            <div>
              <Label className="text-base font-medium mb-4 block">Study Intensity</Label>
              <div className="space-y-3">
                {intensityLevels.map((intensity) => (
                  <div
                    key={intensity.value}
                    onClick={() => setFormData({ ...formData, intensity: intensity.value })}
                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all duration-200 ${
                      formData.intensity === intensity.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-4 h-4 rounded-full border-2 ${
                        formData.intensity === intensity.value
                          ? 'border-primary bg-primary'
                          : 'border-border'
                      }`} />
                      <div>
                        <p className="font-medium">{intensity.label}</p>
                        <p className="text-sm text-muted-foreground">{intensity.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="session-duration">Preferred Session Duration</Label>
              <Select 
                value={formData.sessionDuration.toString()} 
                onValueChange={(value) => setFormData({ ...formData, sessionDuration: parseInt(value) })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sessionDurations.map((duration) => (
                    <SelectItem key={duration.value} value={duration.value.toString()}>
                      {duration.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center mb-6">
              <Target className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Include Features</h3>
              <p className="text-sm text-muted-foreground">
                Choose which VaktaAI features to include in your study plan
              </p>
            </div>

            <div className="space-y-4">
              {[
                { key: 'includeReminders', label: 'Study Reminders', description: 'Get notified about upcoming tasks' },
                { key: 'includeAITutor', label: 'AI Tutor Sessions', description: 'Personalized tutoring sessions' },
                { key: 'includeQuizzes', label: 'Practice Quizzes', description: 'Auto-generated quizzes for practice' },
                { key: 'includeFlashcards', label: 'Flashcards Review', description: 'Spaced repetition flashcards' },
                { key: 'includeDocChat', label: 'Document Chat', description: 'Chat with your study materials' },
                { key: 'includeExtraResources', label: 'Extra Resources', description: 'Additional study materials and links' },
              ].map((feature) => (
                <div key={feature.key} className="flex items-center space-x-3 p-4 rounded-lg border border-border hover:bg-muted cursor-pointer transition-colors duration-200">
                  <Checkbox
                    id={feature.key}
                    checked={formData[feature.key as keyof typeof formData] as boolean}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, [feature.key]: !!checked })
                    }
                  />
                  <div className="flex-1">
                    <Label htmlFor={feature.key} className="font-medium cursor-pointer">
                      {feature.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {feature.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">Create Study Plan</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Step {step} of 4: {
                  step === 1 ? 'Basic Information' :
                  step === 2 ? 'Timeline & Goals' :
                  step === 3 ? 'Study Preferences' :
                  'Feature Selection'
                }
              </p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* Progress Bar */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2, 3, 4].map((i) => (
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
              {i < 4 && (
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
        <div className="min-h-[400px]">
          {renderStep()}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handleBack}
            disabled={step === 1}
            className="flex items-center gap-2"
            data-testid="button-wizard-back"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed() || createPlanMutation.isPending}
            className="flex items-center gap-2"
            data-testid="button-wizard-next"
          >
            {createPlanMutation.isPending ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-background border-t-transparent" />
            ) : step === 4 ? (
              'Create Plan'
            ) : (
              <>
                Next Step
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
