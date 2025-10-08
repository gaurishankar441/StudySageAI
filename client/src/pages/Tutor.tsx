import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TutorSetupWizard, { type TutorConfig } from "@/components/tutor/TutorSetupWizard";
import TutorSession from "@/components/tutor/TutorSession";
import logoPath from "@assets/Vakta AI.122_1759509648531.png";
import { Sparkles } from "lucide-react";

export default function Tutor() {
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const startSessionMutation = useMutation({
    mutationFn: async (config: TutorConfig) => {
      // ALWAYS use Garima Ma'am (female voice) for all subjects
      const personaId = 'garima';
      
      const response = await apiRequest("POST", "/api/tutor/optimized/session/start", {
        subject: config.subject,
        topic: config.topic,
        level: config.level,
        language: config.language,
        personaId,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to start session: ${response.status} ${errorText}`);
      }
      
      const data = await response.json();
      
      if (!data || !data.session || !data.session.chatId) {
        throw new Error('Invalid response from server - missing chat ID');
      }
      
      return data;
    },
    onSuccess: (data: any) => {
      const chatId = data.session.chatId;
      setCurrentSessionId(chatId);
      
      if (data.message && data.message.trim()) {
        const greetingMessage = {
          id: `greeting-${Date.now()}`,
          chatId: chatId,
          role: 'assistant',
          content: data.message.trim(),
          tool: null,
          metadata: {
            personaId: data.session.personaId,
            emotion: data.emotion || 'enthusiastic',
            phase: 'greeting',
            isGreeting: true
          },
          createdAt: new Date().toISOString()
        };
        
        queryClient.setQueryData([`/api/chats/${chatId}/messages`], [greetingMessage]);
      }
      
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      
      // Display Garima Ma'am as the tutor name
      const personaName = data.session.personaId === 'garima' ? 'Garima Ma\'am' : 'your tutor';
      
      toast({
        title: "Session Started",
        description: `Your AI tutor ${personaName} is ready! 🎓`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start tutor session. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartSession = (config: TutorConfig) => {
    startSessionMutation.mutate(config);
  };

  const handleEndSession = () => {
    setCurrentSessionId(null);
    toast({
      title: "Session Ended",
      description: "Your tutor session has been saved.",
    });
  };

  if (currentSessionId) {
    return (
      <TutorSession 
        chatId={currentSessionId} 
        onEndSession={handleEndSession}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/30 to-purple-50 dark:from-slate-950 dark:via-indigo-950/30 dark:to-purple-950 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(99,102,241,0.08),transparent_50%),radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.08),transparent_50%)]" />
      
      <div className="relative max-w-4xl mx-auto px-6 py-24">
        <div className="text-center mb-12 space-y-6">
          <div className="inline-flex items-center justify-center mb-6 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/30 to-purple-500/30 blur-2xl rounded-full animate-pulse-subtle" />
              <img 
                src={logoPath} 
                alt="Vakta AI" 
                className="w-32 h-32 object-contain relative z-10 drop-shadow-2xl"
              />
            </div>
          </div>
          
          <div className="space-y-3 animate-slide-in">
            <h1 className="text-6xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 bg-clip-text text-transparent leading-tight">
              AI Tutor
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Start a personalized learning session with our advanced AI tutors
            </p>
          </div>
        </div>

        <div className="text-center mb-12">
          <button
            onClick={() => setShowSetupWizard(true)}
            className="group relative inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105"
            data-testid="button-new-session"
          >
            <Sparkles className="w-6 h-6" />
            <span>Start New Tutoring Session</span>
            <div className="absolute inset-0 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300 -z-10" />
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Personalized Learning</h3>
            <p className="text-sm text-muted-foreground">
              AI adapts to your learning style and pace
            </p>
          </div>

          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Expert Tutors</h3>
            <p className="text-sm text-muted-foreground">
              Choose from specialized AI tutors for each subject
            </p>
          </div>

          <div className="bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
            <div className="w-12 h-12 bg-gradient-to-br from-pink-500 to-rose-500 rounded-xl flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Interactive Practice</h3>
            <p className="text-sm text-muted-foreground">
              Engage with questions, examples, and instant feedback
            </p>
          </div>
        </div>
      </div>

      <TutorSetupWizard
        open={showSetupWizard}
        onOpenChange={setShowSetupWizard}
        onSubmit={handleStartSession}
      />
    </div>
  );
}
