import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DialogUnified } from "@/components/ui/dialog-unified";
import { Calculator, FlaskConical, Book, Globe, ChevronLeft, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

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
  const [step, setStep] = useState(0); // Start at 0 for resume screen
  const initializedRef = useRef(false); // Track if we've auto-filled from profile
  
  // Fetch user profile to auto-fill wizard
  const { data: user } = useQuery<any>({
    queryKey: ['/api/user'],
    enabled: open, // Only fetch when dialog is open
  });

  // Fetch resumable sessions
  const { data: resumableData, status: resumableStatus, isError: resumableError } = useQuery<{
    sessions: Array<{
      id: string;
      chatId: string;
      subject: string;
      topic: string;
      currentPhase: string;
      progress: number;
      level: string;
      createdAt: Date;
    }>;
  }>({
    queryKey: ['/api/tutor/optimized/sessions/user'],
    enabled: open,
    retry: false,
  });

  const resumableSessions = resumableData?.sessions || [];

  // Auto-advance past resume screen if no sessions (after data successfully loads)
  useEffect(() => {
    if (step === 0 && resumableStatus === 'success' && resumableSessions.length === 0) {
      setStep(1); // Skip to subject selection
    }
  }, [step, resumableStatus, resumableSessions.length]);

  // Reset to step 0 when dialog reopens
  useEffect(() => {
    if (open && step > 0) {
      setStep(0); // Start at resume screen
    }
  }, [open]);
  
  // Auto-detect subject from user profile
  const getInitialSubject = () => {
    if (user?.subjects && Array.isArray(user.subjects) && user.subjects.length > 0) {
      const firstSubject = String(user.subjects[0]).toLowerCase();
      // Map profile subject to wizard subject
      if (firstSubject.includes('math')) return 'mathematics';
      if (firstSubject.includes('physics')) return 'physics';
      if (firstSubject.includes('chemistry')) return 'chemistry';
      if (firstSubject.includes('science')) return 'science';
      if (firstSubject.includes('history')) return 'history';
      if (firstSubject.includes('literature') || firstSubject.includes('english')) return 'literature';
    }
    return 'mathematics'; // Default
  };
  
  // Auto-detect level from currentClass
  const getInitialLevel = () => {
    if (user?.currentClass && typeof user.currentClass === 'string') {
      const classNum = parseInt(user.currentClass.replace(/\D/g, ''));
      if (classNum <= 8) return 'beginner';
      if (classNum <= 10) return 'intermediate';
      if (classNum <= 12) return 'advanced';
      return 'expert';
    }
    return 'intermediate'; // Default
  };
  
  const [config, setConfig] = useState<TutorConfig>({
    subject: 'mathematics',
    level: 'intermediate',
    topic: '',
    language: 'en',
  });
  
  // Auto-populate config ONCE when user profile loads (preserve all user edits)
  useEffect(() => {
    if (user && open && !initializedRef.current) {
      setConfig(prev => ({
        ...prev, // Keep any existing values (especially topic!)
        subject: getInitialSubject(),
        level: getInitialLevel(),
        language: user.preferredLanguage || prev.language,
      }));
      initializedRef.current = true;
    }
    
    // Reset initialization flag when dialog closes
    if (!open) {
      initializedRef.current = false;
    }
  }, [user, open]);

  const handleResume = (chatId: string) => {
    // Navigate to the existing chat
    window.location.href = `/tutor?chatId=${chatId}`;
    onOpenChange(false);
  };

  const handleStartNew = () => {
    setStep(1); // Move to subject selection
  };

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      onSubmit(config);
      onOpenChange(false);
      // Reset for next time
      setStep(0);
      setConfig({
        subject: 'mathematics',
        level: 'intermediate',
        topic: '',
        language: 'en',
      });
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return true; // Resume screen, can always proceed to new session
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
      case 0:
        // Resume or Start New screen
        // Show loading while query is pending
        if (resumableStatus === 'pending') {
          return (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-muted-foreground">Loading sessions...</p>
              </div>
            </div>
          );
        }
        
        // Show error state if query failed
        if (resumableError) {
          return (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground mb-4">Could not load sessions</p>
              <Button onClick={handleStartNew} data-testid="button-start-new-after-error">
                Start New Session
              </Button>
            </div>
          );
        }
        
        // This will be skipped by useEffect if no sessions
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-semibold mb-2">Continue Learning?</h3>
              <p className="text-sm text-muted-foreground">
                You have {resumableSessions.length} session{resumableSessions.length > 1 ? 's' : ''} in progress
              </p>
            </div>
            
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {resumableSessions.map((session) => (
                <button
                  key={session.id}
                  onClick={() => handleResume(session.chatId)}
                  className="w-full p-4 border-2 border-border rounded-xl hover:border-primary hover:bg-primary/5 transition-all text-left"
                  data-testid={`button-resume-${session.chatId}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold">{session.subject}</h4>
                      <p className="text-sm text-muted-foreground">{session.topic}</p>
                    </div>
                    <span className="text-xs bg-primary/10 text-primary px-2 py-1 rounded-full">
                      {session.progress}% complete
                    </span>
                  </div>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>Phase: {session.currentPhase}</span>
                    <span>•</span>
                    <span>Level: {session.level}</span>
                  </div>
                </button>
              ))}
            </div>
            
            <Button
              variant="outline"
              className="w-full"
              onClick={handleStartNew}
              data-testid="button-start-new-session"
            >
              Start New Session Instead
            </Button>
          </div>
        );
      
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
                    type="button"
                    onClick={() => setConfig({ ...config, subject: subject.id })}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      config.subject === subject.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    data-testid={`button-subject-${subject.id}`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-2 ${subject.color}`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <span className="font-medium text-sm" data-testid={`text-subject-${subject.id}`}>{subject.name}</span>
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
                  type="button"
                  onClick={() => setConfig({ ...config, level: level.id })}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-center ${
                    config.level === level.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  data-testid={`button-level-${level.id}`}
                >
                  <span className="font-medium" data-testid={`text-level-${level.id}`}>{level.name}</span>
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
              data-testid="input-topic"
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
                  type="button"
                  onClick={() => setConfig({ ...config, language: language.id })}
                  className={`p-4 rounded-xl border-2 transition-all duration-200 text-left flex items-center gap-3 ${
                    config.language === language.id
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  data-testid={`button-language-${language.id}`}
                >
                  <Globe className="w-5 h-5" />
                  <span className="font-medium" data-testid={`text-language-${language.id}`}>{language.name}</span>
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
    <DialogUnified 
      open={open} 
      onClose={() => onOpenChange(false)}
      size="lg"
      closeOnOuterClick={false}
      title={step === 0 ? "AI Tutor" : "Start AI Tutor Session"}
      description={step === 0 ? "Resume a session or start a new one" : `Step ${step} of 4: Set up your personalized learning experience`}
    >
      <div className="space-y-6" data-testid="dialog-tutor-setup">

        {/* Progress Indicator - Hide on resume screen */}
        {step > 0 && (
          <div className="flex items-center gap-2">
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
        )}

        {/* Step Content */}
        <div className="min-h-[200px]">
          {renderStep()}
        </div>

        {/* Footer Actions - Hide on resume screen */}
        {step > 0 && (
          <div className="flex justify-between pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={step === 1}
              className="flex items-center gap-2"
              data-testid="button-wizard-prev"
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </Button>
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed()}
              className="flex items-center gap-2"
              data-testid="button-wizard-next"
            >
              {step === 4 ? 'Start Learning' : 'Next'}
              {step < 4 && <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        )}
      </div>
    </DialogUnified>
  );
}
