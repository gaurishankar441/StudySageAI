import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TutorSetupWizard, { type TutorConfig } from "@/components/tutor/TutorSetupWizard";
import TutorSession from "@/components/tutor/TutorSession";
import logoPath from "@assets/Vakta AI.122_1759509648531.png";

export default function Tutor() {
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const startSessionMutation = useMutation({
    mutationFn: async (config: TutorConfig) => {
      // Auto-select persona based on subject
      const personaId = ['physics', 'mathematics'].includes(config.subject) 
        ? 'priya' 
        : 'amit';
      
      // Use optimized 7-phase session API
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
      setCurrentSessionId(data.session.chatId);
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      queryClient.invalidateQueries({ queryKey: [`/api/chats/${data.session.chatId}/messages`] });
      
      // Map persona ID to name
      const personaName = data.session.personaId === 'priya' ? 'Priya' : 
                          data.session.personaId === 'amit' ? 'Amit' : 'your tutor';
      
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

  // If there's an active session, show the session interface
  if (currentSessionId) {
    return (
      <TutorSession 
        chatId={currentSessionId} 
        onEndSession={handleEndSession}
      />
    );
  }

  // Otherwise show the setup interface
  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center mb-4">
          <img 
            src={logoPath} 
            alt="Vakta AI" 
            className="w-20 h-20 object-contain"
          />
        </div>
        <h1 className="text-3xl font-bold mb-2">AI Tutor</h1>
        <p className="text-muted-foreground">Start a personalized learning session</p>
      </div>

      <div className="text-center">
        <button
          onClick={() => setShowSetupWizard(true)}
          className="px-8 py-4 bg-primary text-primary-foreground rounded-xl hover:bg-primary/90 transition-all duration-200 font-semibold shadow-sm hover:shadow-md text-lg"
          data-testid="button-new-session"
        >
          Start New Tutoring Session
        </button>
      </div>

      <TutorSetupWizard
        open={showSetupWizard}
        onOpenChange={setShowSetupWizard}
        onSubmit={handleStartSession}
      />
    </div>
  );
}
