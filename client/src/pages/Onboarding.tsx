import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap, BookOpen, Target, Brain, Sparkles, ChevronLeft, ChevronRight, School, Trophy } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

type EducationLevel = "middle_school" | "high_school" | "senior_secondary" | "college" | "job_prep";
type Board = "cbse" | "icse" | "state" | "ib" | "igcse";
type Stream = "science_pcm" | "science_pcb" | "commerce" | "arts";

interface OnboardingData {
  educationLevel?: EducationLevel;
  class?: number;
  board?: Board;
  stateBoard?: string;
  stream?: Stream;
  course?: string;
  yearSemester?: number;
  examGoals: string[];
  subjectPreferences: string[];
  learningStyle: {
    prefersVideo: boolean;
    prefersText: boolean;
    prefersPractice: boolean;
    prefersVoice: boolean;
    prefersVisual: boolean;
  };
  primaryGoal?: string;
  whatsappNotifications: boolean;
  mobileNumber?: string;
}

const EXAM_OPTIONS = [
  { id: "board_exams", label: "Board Exams (CBSE/ICSE)", icon: "📚" },
  { id: "jee_main", label: "JEE Main", icon: "🎓" },
  { id: "jee_advanced", label: "JEE Advanced", icon: "🏆" },
  { id: "neet", label: "NEET", icon: "🩺" },
  { id: "cuet", label: "CUET", icon: "🎯" },
  { id: "olympiad_math", label: "Math Olympiad", icon: "🔢" },
  { id: "olympiad_science", label: "Science Olympiad", icon: "🔬" },
  { id: "nda", label: "NDA", icon: "⚔️" },
  { id: "foundation", label: "Foundation (Class 9-10)", icon: "📖" },
  { id: "upsc", label: "UPSC (Civil Services)", icon: "🏛️" },
  { id: "ssc", label: "SSC (CGL/CHSL)", icon: "💼" },
  { id: "banking", label: "Banking (IBPS/SBI)", icon: "🏦" },
  { id: "gate", label: "GATE", icon: "🎓" },
  { id: "cat", label: "CAT/MBA", icon: "📊" },
  { id: "syllabus_only", label: "Bas syllabus complete karna hai", icon: "✅" },
];

const SUBJECT_OPTIONS = [
  { id: "math", label: "Mathematics", icon: "🔢" },
  { id: "physics", label: "Physics", icon: "⚡" },
  { id: "chemistry", label: "Chemistry", icon: "🧪" },
  { id: "biology", label: "Biology", icon: "🧬" },
  { id: "english", label: "English", icon: "📝" },
  { id: "hindi", label: "Hindi", icon: "🇮🇳" },
  { id: "history", label: "History", icon: "📜" },
  { id: "geography", label: "Geography", icon: "🌍" },
  { id: "economics", label: "Economics", icon: "💰" },
  { id: "political_science", label: "Political Science", icon: "🏛️" },
  { id: "computer_science", label: "Computer Science", icon: "💻" },
  { id: "accountancy", label: "Accountancy", icon: "📊" },
  { id: "business_studies", label: "Business Studies", icon: "💼" },
];

export default function Onboarding() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [data, setData] = useState<OnboardingData>({
    examGoals: [],
    subjectPreferences: [],
    learningStyle: {
      prefersVideo: false,
      prefersText: false,
      prefersPractice: false,
      prefersVoice: false,
      prefersVisual: false,
    },
    whatsappNotifications: false,
  });

  const totalSteps = 7;
  const progress = (currentStep / totalSteps) * 100;

  // Auto-skip step 3 for job prep users
  useEffect(() => {
    if (currentStep === 3 && data.educationLevel === "job_prep") {
      setCurrentStep(4);
    }
  }, [currentStep, data.educationLevel]);

  // Auto-skip step 4 for non-senior secondary users
  useEffect(() => {
    if (currentStep === 4 && data.educationLevel !== "senior_secondary") {
      setCurrentStep(5);
    }
  }, [currentStep, data.educationLevel]);

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await apiRequest("POST", "/api/auth/complete-onboarding", data);
      
      await queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "🎉 Onboarding Complete!",
        description: "Tumhara personalized dashboard ready hai!",
      });
      
      setLocation("/");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFilteredExamOptions = () => {
    if (data.educationLevel === "job_prep") {
      return EXAM_OPTIONS.filter(opt => ["upsc", "ssc", "banking", "gate", "cat"].includes(opt.id));
    }
    if (data.educationLevel === "college") {
      return EXAM_OPTIONS.filter(opt => ["gate", "cat"].includes(opt.id));
    }
    return EXAM_OPTIONS.filter(opt => !["upsc", "ssc", "banking"].includes(opt.id));
  };

  const getSmartSubjectSuggestions = () => {
    if (data.examGoals.includes("jee_main") || data.examGoals.includes("jee_advanced")) {
      return ["math", "physics", "chemistry"];
    }
    if (data.examGoals.includes("neet")) {
      return ["physics", "chemistry", "biology"];
    }
    if (data.stream === "science_pcm") {
      return ["math", "physics", "chemistry"];
    }
    if (data.stream === "science_pcb") {
      return ["physics", "chemistry", "biology"];
    }
    if (data.stream === "commerce") {
      return ["accountancy", "business_studies", "economics"];
    }
    return [];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-purple-950 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Step {currentStep} of {totalSteps}
            </span>
            <span className="text-sm font-medium text-primary">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <Progress value={progress} className="h-2" data-testid="progress-onboarding" />
        </div>

        {/* Step 1: Welcome */}
        {currentStep === 1 && (
          <Card className="glass-card border-2" data-testid="step-welcome">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-3xl gradient-text">🙏 Namaste!</CardTitle>
              <CardDescription className="text-lg mt-2">
                Main Vakta hoon, tumhare padhai mein madad ke liye yahaan hoon
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-center text-muted-foreground">
                Tum kis class mein padhte ho? Ya phir kisi exam ki preparation kar rahe ho?
              </p>
              <Button 
                onClick={handleNext} 
                className="w-full btn-gradient" 
                size="lg"
                data-testid="button-start-onboarding"
              >
                Chalo Shuru Karte Hain <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Education Level */}
        {currentStep === 2 && (
          <Card className="glass-card border-2" data-testid="step-education-level">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-6 w-6 text-primary" />
                Tum kis stage mein ho?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup 
                value={data.educationLevel} 
                onValueChange={(value) => setData({ ...data, educationLevel: value as EducationLevel })}
              >
                <div className="space-y-3">
                  <Label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-middle-school">
                    <RadioGroupItem value="middle_school" />
                    <div>
                      <div className="font-medium">📚 Class 6-8</div>
                      <div className="text-sm text-muted-foreground">Middle School</div>
                    </div>
                  </Label>
                  
                  <Label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-high-school">
                    <RadioGroupItem value="high_school" />
                    <div>
                      <div className="font-medium">📖 Class 9-10</div>
                      <div className="text-sm text-muted-foreground">High School</div>
                    </div>
                  </Label>
                  
                  <Label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-senior-secondary">
                    <RadioGroupItem value="senior_secondary" />
                    <div>
                      <div className="font-medium">🎓 Class 11-12</div>
                      <div className="text-sm text-muted-foreground">Senior Secondary</div>
                    </div>
                  </Label>
                  
                  <Label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-college">
                    <RadioGroupItem value="college" />
                    <div>
                      <div className="font-medium">🏛️ College</div>
                      <div className="text-sm text-muted-foreground">Graduation</div>
                    </div>
                  </Label>
                  
                  <Label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-job-prep">
                    <RadioGroupItem value="job_prep" />
                    <div>
                      <div className="font-medium">👔 Job Preparation</div>
                      <div className="text-sm text-muted-foreground">Competitive Exams</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
              
              <div className="flex gap-3 pt-4">
                <Button onClick={handleBack} variant="outline" data-testid="button-back">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  className="flex-1 btn-gradient" 
                  disabled={!data.educationLevel}
                  data-testid="button-next"
                >
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Class & Board (School Students) */}
        {currentStep === 3 && ["middle_school", "high_school", "senior_secondary"].includes(data.educationLevel!) && (
          <Card className="glass-card border-2" data-testid="step-class-board">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                Tumhari class aur board kya hai?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label>Class</Label>
                <div className="grid grid-cols-4 gap-2">
                  {[6, 7, 8, 9, 10, 11, 12].map((cls) => (
                    <Button
                      key={cls}
                      type="button"
                      variant={data.class === cls ? "default" : "outline"}
                      onClick={() => setData({ ...data, class: cls })}
                      className={data.class === cls ? "btn-gradient" : ""}
                      data-testid={`button-class-${cls}`}
                    >
                      {cls}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="space-y-3">
                <Label>Board</Label>
                <RadioGroup 
                  value={data.board} 
                  onValueChange={(value) => setData({ ...data, board: value as Board })}
                >
                  <div className="space-y-2">
                    <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-cbse">
                      <RadioGroupItem value="cbse" />
                      <span>📋 CBSE</span>
                    </Label>
                    <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-icse">
                      <RadioGroupItem value="icse" />
                      <span>📋 ICSE</span>
                    </Label>
                    <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-state">
                      <RadioGroupItem value="state" />
                      <span>📋 State Board</span>
                    </Label>
                    <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-ib">
                      <RadioGroupItem value="ib" />
                      <span>📋 IB / IGCSE</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              {data.board === "state" && (
                <div className="space-y-2">
                  <Label>Kis state board se?</Label>
                  <Input 
                    placeholder="e.g., Maharashtra, UP, Bihar" 
                    value={data.stateBoard || ""} 
                    onChange={(e) => setData({ ...data, stateBoard: e.target.value })}
                    data-testid="input-state-board"
                  />
                </div>
              )}
              
              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" data-testid="button-back">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  className="flex-1 btn-gradient" 
                  disabled={!data.class || !data.board}
                  data-testid="button-next"
                >
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: College Details */}
        {currentStep === 3 && data.educationLevel === "college" && (
          <Card className="glass-card border-2" data-testid="step-college">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-6 w-6 text-primary" />
                Kya padh rahe ho?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Course</Label>
                <Input 
                  placeholder="e.g., B.Tech, MBBS, B.Com" 
                  value={data.course || ""} 
                  onChange={(e) => setData({ ...data, course: e.target.value })}
                  data-testid="input-course"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Year/Semester</Label>
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((year) => (
                    <Button
                      key={year}
                      type="button"
                      variant={data.yearSemester === year ? "default" : "outline"}
                      onClick={() => setData({ ...data, yearSemester: year })}
                      className={data.yearSemester === year ? "btn-gradient" : ""}
                      data-testid={`button-year-${year}`}
                    >
                      {year}
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button onClick={handleBack} variant="outline" data-testid="button-back">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  className="flex-1 btn-gradient" 
                  disabled={!data.course || !data.yearSemester}
                  data-testid="button-next"
                >
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Step 4: Stream (Class 11-12 Only) */}
        {currentStep === 4 && data.educationLevel === "senior_secondary" && (
          <Card className="glass-card border-2" data-testid="step-stream">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-6 w-6 text-primary" />
                Tumhara stream kya hai?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup 
                value={data.stream} 
                onValueChange={(value) => setData({ ...data, stream: value as Stream })}
              >
                <div className="space-y-3">
                  <Label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-pcm">
                    <RadioGroupItem value="science_pcm" />
                    <div>
                      <div className="font-medium">🧪 Science (PCM)</div>
                      <div className="text-sm text-muted-foreground">Physics, Chemistry, Maths</div>
                    </div>
                  </Label>
                  
                  <Label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-pcb">
                    <RadioGroupItem value="science_pcb" />
                    <div>
                      <div className="font-medium">🧬 Science (PCB)</div>
                      <div className="text-sm text-muted-foreground">Physics, Chemistry, Biology</div>
                    </div>
                  </Label>
                  
                  <Label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-commerce">
                    <RadioGroupItem value="commerce" />
                    <div>
                      <div className="font-medium">💼 Commerce</div>
                      <div className="text-sm text-muted-foreground">Accounts, Business, Economics</div>
                    </div>
                  </Label>
                  
                  <Label className="flex items-center gap-3 p-4 border-2 rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-arts">
                    <RadioGroupItem value="arts" />
                    <div>
                      <div className="font-medium">🎨 Arts/Humanities</div>
                      <div className="text-sm text-muted-foreground">History, Political Science, etc.</div>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
              
              <div className="flex gap-3 pt-4">
                <Button onClick={handleBack} variant="outline" data-testid="button-back">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  className="flex-1 btn-gradient" 
                  disabled={!data.stream}
                  data-testid="button-next"
                >
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}


        {/* Step 5: Exam Goals */}
        {currentStep === 5 && (
          <Card className="glass-card border-2" data-testid="step-exam-goals">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-6 w-6 text-primary" />
                Kisi exam ki preparation kar rahe ho?
              </CardTitle>
              <CardDescription>Multiple select kar sakte ho</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {getFilteredExamOptions().map((exam) => (
                  <Label 
                    key={exam.id} 
                    className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors"
                    data-testid={`option-exam-${exam.id}`}
                  >
                    <Checkbox 
                      checked={data.examGoals.includes(exam.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setData({ ...data, examGoals: [...data.examGoals, exam.id] });
                        } else {
                          setData({ ...data, examGoals: data.examGoals.filter(g => g !== exam.id) });
                        }
                      }}
                    />
                    <span>{exam.icon} {exam.label}</span>
                  </Label>
                ))}
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button onClick={handleBack} variant="outline" data-testid="button-back">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  className="flex-1 btn-gradient"
                  data-testid="button-next"
                >
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 6: Subject Preferences */}
        {currentStep === 6 && (
          <Card className="glass-card border-2" data-testid="step-subjects">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-primary" />
                Kin subjects mein help chahiye?
              </CardTitle>
              <CardDescription>Top 3-5 subjects select karo</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSmartSubjectSuggestions().length > 0 && (
                <div className="p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium mb-2">💡 Suggested based on your goals:</p>
                  <div className="flex flex-wrap gap-2">
                    {getSmartSubjectSuggestions().map(subj => {
                      const subject = SUBJECT_OPTIONS.find(s => s.id === subj);
                      return subject ? (
                        <Button
                          key={subj}
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            if (!data.subjectPreferences.includes(subj)) {
                              setData({ ...data, subjectPreferences: [...data.subjectPreferences, subj] });
                            }
                          }}
                          className={data.subjectPreferences.includes(subj) ? "btn-gradient" : ""}
                          data-testid={`button-suggest-${subj}`}
                        >
                          {subject.icon} {subject.label}
                        </Button>
                      ) : null;
                    })}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {SUBJECT_OPTIONS.map((subject) => (
                  <Label 
                    key={subject.id} 
                    className="flex items-center gap-2 p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors"
                    data-testid={`option-subject-${subject.id}`}
                  >
                    <Checkbox 
                      checked={data.subjectPreferences.includes(subject.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setData({ ...data, subjectPreferences: [...data.subjectPreferences, subject.id] });
                        } else {
                          setData({ ...data, subjectPreferences: data.subjectPreferences.filter(s => s !== subject.id) });
                        }
                      }}
                    />
                    <span className="text-sm">{subject.icon} {subject.label}</span>
                  </Label>
                ))}
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button onClick={handleBack} variant="outline" data-testid="button-back">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleNext} 
                  className="flex-1 btn-gradient" 
                  disabled={data.subjectPreferences.length === 0}
                  data-testid="button-next"
                >
                  Next <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 7: Learning Style & Goals */}
        {currentStep === 7 && (
          <Card className="glass-card border-2" data-testid="step-learning-style">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                Kaise seekhna pasand hai?
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <Label className="text-base">Learning Preferences:</Label>
                <div className="space-y-2">
                  <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer" data-testid="option-video">
                    <Checkbox 
                      checked={data.learningStyle.prefersVideo}
                      onCheckedChange={(checked) => setData({ 
                        ...data, 
                        learningStyle: { ...data.learningStyle, prefersVideo: !!checked } 
                      })}
                    />
                    <span>📹 Video explanations</span>
                  </Label>
                  <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer" data-testid="option-text">
                    <Checkbox 
                      checked={data.learningStyle.prefersText}
                      onCheckedChange={(checked) => setData({ 
                        ...data, 
                        learningStyle: { ...data.learningStyle, prefersText: !!checked } 
                      })}
                    />
                    <span>📝 Text-based notes</span>
                  </Label>
                  <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer" data-testid="option-practice">
                    <Checkbox 
                      checked={data.learningStyle.prefersPractice}
                      onCheckedChange={(checked) => setData({ 
                        ...data, 
                        learningStyle: { ...data.learningStyle, prefersPractice: !!checked } 
                      })}
                    />
                    <span>✏️ Practice questions</span>
                  </Label>
                  <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer" data-testid="option-voice">
                    <Checkbox 
                      checked={data.learningStyle.prefersVoice}
                      onCheckedChange={(checked) => setData({ 
                        ...data, 
                        learningStyle: { ...data.learningStyle, prefersVoice: !!checked } 
                      })}
                    />
                    <span>🎙️ Voice interactions (Hinglish)</span>
                  </Label>
                  <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer" data-testid="option-visual">
                    <Checkbox 
                      checked={data.learningStyle.prefersVisual}
                      onCheckedChange={(checked) => setData({ 
                        ...data, 
                        learningStyle: { ...data.learningStyle, prefersVisual: !!checked } 
                      })}
                    />
                    <span>📊 Visual diagrams</span>
                  </Label>
                </div>
              </div>
              
              <div className="space-y-3">
                <Label className="text-base">Tumhara main goal kya hai?</Label>
                <RadioGroup 
                  value={data.primaryGoal} 
                  onValueChange={(value) => setData({ ...data, primaryGoal: value })}
                >
                  <div className="space-y-2">
                    <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-topper">
                      <RadioGroupItem value="exam_topper" />
                      <span>🎯 Exam topper banna</span>
                    </Label>
                    <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-improve">
                      <RadioGroupItem value="improve_weak" />
                      <span>📈 Weak subjects improve karna</span>
                    </Label>
                    <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-revision">
                      <RadioGroupItem value="last_minute" />
                      <span>⏰ Last-minute revision</span>
                    </Label>
                    <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-clarity">
                      <RadioGroupItem value="concept_clarity" />
                      <span>🧠 Concepts clearly samajhna</span>
                    </Label>
                    <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:border-primary transition-colors" data-testid="option-practice-daily">
                      <RadioGroupItem value="daily_practice" />
                      <span>💪 Daily practice karna</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              
              <div className="space-y-3 pt-2 border-t">
                <Label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer" data-testid="option-whatsapp">
                  <Checkbox 
                    checked={data.whatsappNotifications}
                    onCheckedChange={(checked) => setData({ 
                      ...data, 
                      whatsappNotifications: !!checked 
                    })}
                  />
                  <span>📱 WhatsApp pe reminders chahiye</span>
                </Label>
                
                {data.whatsappNotifications && (
                  <div className="ml-8 space-y-2">
                    <Label>Mobile Number (Optional)</Label>
                    <Input 
                      type="tel"
                      placeholder="+91 XXXXXXXXXX" 
                      value={data.mobileNumber || ""} 
                      onChange={(e) => setData({ ...data, mobileNumber: e.target.value })}
                      data-testid="input-mobile"
                    />
                  </div>
                )}
              </div>
              
              <div className="flex gap-3 pt-4">
                <Button onClick={handleBack} variant="outline" data-testid="button-back">
                  <ChevronLeft className="mr-2 h-4 w-4" /> Back
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  className="flex-1 btn-gradient" 
                  disabled={isSubmitting || !data.primaryGoal}
                  data-testid="button-complete"
                >
                  {isSubmitting ? "Saving..." : "Complete Setup 🎉"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
