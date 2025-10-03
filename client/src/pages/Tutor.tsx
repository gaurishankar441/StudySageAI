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
      const response = await apiRequest("POST", "/api/tutor/session", config);
      return response.json();
    },
    onSuccess: (data: any) => {
      setCurrentSessionId(data.id);
      queryClient.invalidateQueries({ queryKey: ["/api/chats"] });
      toast({
        title: "Session Started",
        description: "Your AI tutor session has begun!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to start tutor session. Please try again.",
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
