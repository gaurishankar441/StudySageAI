import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, User, GraduationCap, Globe, Loader2, X } from "lucide-react";
import { useState, useEffect } from "react";

const profileSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().optional(),
  locale: z.enum(["en", "hi"]),
  aiProvider: z.enum(["cohere", "openai"]),
  educationBoard: z.string().optional(),
  examTarget: z.string().optional(),
  currentClass: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

const EDUCATION_BOARDS = [
  { value: "CBSE", label: "CBSE" },
  { value: "ICSE", label: "ICSE" },
  { value: "State Board", label: "State Board" },
  { value: "IB", label: "International Baccalaureate (IB)" },
  { value: "Other", label: "Other" },
];

const EXAM_TARGETS = [
  { value: "JEE", label: "JEE (Joint Entrance Exam)" },
  { value: "NEET", label: "NEET (Medical Entrance)" },
  { value: "Board Exams", label: "Board Exams" },
  { value: "CAT", label: "CAT (MBA Entrance)" },
  { value: "GATE", label: "GATE (Engineering)" },
  { value: "UPSC", label: "UPSC (Civil Services)" },
  { value: "Other", label: "Other" },
];

const COMMON_SUBJECTS = [
  "Mathematics", "Physics", "Chemistry", "Biology", "English", 
  "Hindi", "Computer Science", "History", "Geography", "Economics",
  "Political Science", "Business Studies", "Accountancy", "Psychology",
  "Sociology", "Sanskrit", "Physical Education"
];

export default function Settings() {
  const { toast } = useToast();
  const [newSubject, setNewSubject] = useState("");
  const [subjects, setSubjects] = useState<string[]>([]);

  const { data: user, isLoading } = useQuery({
    queryKey: ["/api/auth/user"],
  });

  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      locale: "en",
      aiProvider: "cohere",
      educationBoard: "",
      examTarget: "",
      currentClass: "",
    },
  });

  // Initialize form and subjects from user data
  useEffect(() => {
    if (user) {
      form.reset({
        firstName: (user as any).firstName || "",
        lastName: (user as any).lastName || "",
        locale: (user as any).locale || "en",
        aiProvider: (user as any).aiProvider || "cohere",
        educationBoard: (user as any).educationBoard || "",
        examTarget: (user as any).examTarget || "",
        currentClass: (user as any).currentClass || "",
      });
      
      if ((user as any).subjects && Array.isArray((user as any).subjects)) {
        setSubjects((user as any).subjects);
      }
    }
  }, [user, form]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileForm & { subjects: string[] }) => {
      const response = await apiRequest("PATCH", "/api/auth/profile", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Update failed",
        description: error.message || "Could not update profile",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ProfileForm) => {
    updateProfileMutation.mutate({ ...data, subjects });
  };

  const addSubject = (subject: string) => {
    const trimmed = subject.trim();
    if (trimmed && !subjects.includes(trimmed)) {
      setSubjects([...subjects, trimmed]);
      setNewSubject("");
    }
  };

  const removeSubject = (subject: string) => {
    setSubjects(subjects.filter(s => s !== subject));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <SettingsIcon className="w-8 h-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">Manage your profile and preferences</p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Personal Information
              </CardTitle>
              <CardDescription>Your basic profile information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-first-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} data-testid="input-last-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="locale"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Language</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-language">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="en">English</SelectItem>
                          <SelectItem value="hi">हिन्दी (Hindi)</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>Language for AI responses</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="aiProvider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>AI Provider</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-ai-provider">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cohere">Cohere (Default)</SelectItem>
                          <SelectItem value="openai">OpenAI GPT</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormDescription>AI model for chat responses</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* India-Centric Education Profile */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5" />
                Education Profile
              </CardTitle>
              <CardDescription>
                Help us personalize your learning experience for Indian education system
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="educationBoard"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Education Board</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger data-testid="select-education-board">
                            <SelectValue placeholder="Select your board" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {EDUCATION_BOARDS.map(board => (
                            <SelectItem key={board.value} value={board.value}>
                              {board.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="currentClass"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Current Class/Year</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          placeholder="e.g., 10th, 12th, BSc Year 1"
                          data-testid="input-current-class"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="examTarget"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Exam Target (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value || ""}>
                      <FormControl>
                        <SelectTrigger data-testid="select-exam-target">
                          <SelectValue placeholder="Are you preparing for any exam?" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {EXAM_TARGETS.map(exam => (
                          <SelectItem key={exam.value} value={exam.value}>
                            {exam.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      This helps us tailor questions and examples
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subjects */}
              <div className="space-y-3">
                <FormLabel>Subjects</FormLabel>
                <div className="flex flex-wrap gap-2 mb-3">
                  {subjects.map(subject => (
                    <Badge 
                      key={subject} 
                      variant="secondary" 
                      className="px-3 py-1.5 flex items-center gap-2"
                      data-testid={`badge-subject-${subject}`}
                    >
                      {subject}
                      <X 
                        className="w-3 h-3 cursor-pointer hover:text-destructive" 
                        onClick={() => removeSubject(subject)}
                        data-testid={`button-remove-subject-${subject}`}
                      />
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Select 
                    value={newSubject} 
                    onValueChange={(val) => {
                      if (val !== "custom") {
                        addSubject(val);
                      } else {
                        setNewSubject("");
                      }
                    }}
                  >
                    <SelectTrigger className="flex-1" data-testid="select-add-subject">
                      <SelectValue placeholder="Add a subject..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_SUBJECTS.filter(s => !subjects.includes(s)).map(subject => (
                        <SelectItem key={subject} value={subject}>
                          {subject}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom">+ Custom Subject</SelectItem>
                    </SelectContent>
                  </Select>
                  {newSubject === "" && (
                    <div className="flex gap-2">
                      <Input 
                        placeholder="Custom subject name"
                        value={newSubject}
                        onChange={(e) => setNewSubject(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addSubject(newSubject);
                          }
                        }}
                        data-testid="input-custom-subject"
                      />
                      <Button 
                        type="button" 
                        variant="outline"
                        onClick={() => addSubject(newSubject)}
                        data-testid="button-add-custom-subject"
                      >
                        Add
                      </Button>
                    </div>
                  )}
                </div>
                <FormDescription>
                  Add subjects you're studying to get better recommendations
                </FormDescription>
              </div>
            </CardContent>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button 
              type="submit" 
              size="lg"
              disabled={updateProfileMutation.isPending}
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
