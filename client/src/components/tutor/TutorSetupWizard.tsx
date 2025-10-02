import { useState } from "react";
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
import { Calculator, FlaskConical, Book, Globe, ChevronLeft, ChevronRight } from "lucide-react";

interface TutorSetupWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (config: TutorConfig) => void;
}

export interface TutorConfig {
  subject: string;
  level: string;
  topic: string;
  language: string;
}

const subjects = [
  { id: 'mathematics', name: 'Mathematics', icon: Calculator, color: 'text-blue-600 bg-blue-100' },
  { id: 'science', name: 'Science', icon: FlaskConical, color: 'text-green-600 bg-green-100' },
  { id: 'history', name: 'History', icon: Book, color: 'text-purple-600 bg-purple-100' },
  { id: 'literature', name: 'Literature', icon: Book, color: 'text-amber-600 bg-amber-100' },
  { id: 'physics', name: 'Physics', icon: FlaskConical, color: 'text-red-600 bg-red-100' },
  { id: 'chemistry', name: 'Chemistry', icon: FlaskConical, color: 'text-emerald-600 bg-emerald-100' },
];

const levels = [
  { id: 'beginner', name: 'Beginner' },
  { id: 'intermediate', name: 'Intermediate' },
  { id: 'advanced', name: 'Advanced' },
  { id: 'expert', name: 'Expert' },
];

const languages = [
  { id: 'en', name: 'English' },
  { id: 'hi', name: 'हिन्दी (Hindi)' },
];

export default function TutorSetupWizard({ open, onOpenChange, onSubmit }: TutorSetupWizardProps) {
  const [step, setStep] = useState(1);
  const [config, setConfig] = useState<TutorConfig>({
    subject: 'mathematics',
    level: 'intermediate',
    topic: '',
    language: 'en',
  });

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      onSubmit(config);
      onOpenChange(false);
      // Reset for next time
      setStep(1);
      setConfig({
        subject: 'mathematics',
        level: 'intermediate',
        topic: '',
        language: 'en',
      });
    }
  };

  const handlePrev = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1:
        return config.subject;
      case 2:
        return config.level;
      case 3:
        return config.topic.trim().length > 0;
      case 4:
        return config.language;
      default:
        return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <Label className="text-base font-semibold">Select Subject</Label>
            <div className="grid grid-cols-2 gap-3">
              {subjects.map((subject) => {
                const Icon = subject.icon;
                return (
                  <button
                    key={subject.id}
                    onClick={() => setConfig({ ...config, subject: subject.id })}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      config.subject === subject.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-2 ${subject.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="font-medium text-sm">{subject.name}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <Label className="text-base font-semibold">Select Level</Label>
            <div className="grid grid-cols-2 gap-3">
              {levels.map((level) => (
                <button
                  key={level.id}
                  onClick={() => setConfig({ ...config, level: level.id })}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                    config.level === level.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <span className="font-medium">{level.name}</span>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div>
              <Label htmlFor="topic" className="text-base font-semibold">Topic</Label>
              <p className="text-sm text-muted-foreground mt-1">
                What specific topic would you like to learn about?
              </p>
            </div>
            <Input
              id="topic"
              value={config.topic}
              onChange={(e) => setConfig({ ...config, topic: e.target.value })}
              placeholder="e.g., Quadratic Equations, Newton's Laws, French Revolution"
              className="text-base"
            />
            <div className="mt-4 p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Examples for {subjects.find(s => s.id === config.subject)?.name}:</strong>
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {config.subject === 'mathematics' && (
                  <>
                    <span className="px-2 py-1 bg-background rounded text-xs">Algebra</span>
                    <span className="px-2 py-1 bg-background rounded text-xs">Calculus</span>
                    <span className="px-2 py-1 bg-background rounded text-xs">Geometry</span>
                  </>
                )}
                {config.subject === 'science' && (
                  <>
                    <span className="px-2 py-1 bg-background rounded text-xs">Cell Biology</span>
                    <span className="px-2 py-1 bg-background rounded text-xs">Genetics</span>
                    <span className="px-2 py-1 bg-background rounded text-xs">Evolution</span>
                  </>
                )}
                {config.subject === 'physics' && (
                  <>
                    <span className="px-2 py-1 bg-background rounded text-xs">Quantum Mechanics</span>
                    <span className="px-2 py-1 bg-background rounded text-xs">Thermodynamics</span>
                    <span className="px-2 py-1 bg-background rounded text-xs">Electromagnetism</span>
                  </>
                )}
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <Label className="text-base font-semibold">Select Language</Label>
            <div className="grid grid-cols-1 gap-3">
              {languages.map((language) => (
                <button
                  key={language.id}
                  onClick={() => setConfig({ ...config, language: language.id })}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-left flex items-center gap-3 ${
                    config.language === language.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <Globe className="w-5 h-5" />
                  <span className="font-medium">{language.name}</span>
                </button>
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
      <DialogContent className="max-w-2xl" data-testid="dialog-tutor-setup">
        <DialogHeader>
          <DialogTitle className="text-xl">Start AI Tutor Session</DialogTitle>
          <DialogDescription>
            Step {step} of 4: Set up your personalized learning experience
          </DialogDescription>
        </DialogHeader>

        {/* Progress Indicator */}
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
        <div className="min-h-[300px] flex flex-col justify-center">
          {renderStep()}
        </div>

        <DialogFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={step === 1}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>
          <Button
            onClick={handleNext}
            disabled={!canProceed()}
            className="flex items-center gap-2"
          >
            {step === 4 ? 'Start Learning' : 'Next'}
            {step < 4 && <ChevronRight className="w-4 h-4" />}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
