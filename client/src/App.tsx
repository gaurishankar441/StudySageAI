import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";
import { OverlayProvider } from "@/lib/useOverlay";
import { UnityAvatarProvider } from "@/contexts/UnityAvatarContext";

// Pages
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Tutor from "@/pages/Tutor";
import DocChatSources from "@/pages/DocChatSources";
import DocChatSession from "@/pages/DocChatSession";
import Quiz from "@/pages/Quiz";
import QuizAttempt from "@/pages/QuizAttempt";
import StudyPlan from "@/pages/StudyPlan";
import Notes from "@/pages/Notes";
import NoteDetail from "@/pages/NoteDetail";
import Settings from "@/pages/Settings";
import AdminDashboard from "@/pages/AdminDashboard";
import AdminTutorConfig from "@/pages/AdminTutorConfig";
import AdminUnityBuild from "@/pages/AdminUnityBuild";
import AdminVoiceSettings from "@/pages/AdminVoiceSettings";
import AdminAPIManagement from "@/pages/AdminAPIManagement";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show landing page for unauthenticated users
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/" component={Landing} />
        <Route component={Landing} />
      </Switch>
    );
  }

  // Authenticated users get the full app with layout + Unity Avatar preload
  return (
    <UnityAvatarProvider>
      <AppLayout>
        <Switch>
          <Route path="/" component={Dashboard} />
          <Route path="/tutor" component={Tutor} />
          <Route path="/docchat/:chatId" component={DocChatSession} />
          <Route path="/docchat" component={DocChatSources} />
          <Route path="/quiz/:id" component={QuizAttempt} />
          <Route path="/quiz" component={Quiz} />
          <Route path="/study-plan" component={StudyPlan} />
          <Route path="/notes/:id" component={NoteDetail} />
          <Route path="/notes" component={Notes} />
          <Route path="/settings" component={Settings} />
          <Route path="/admin" component={AdminDashboard} />
          <Route path="/admin/tutor" component={AdminTutorConfig} />
          <Route path="/admin/unity" component={AdminUnityBuild} />
          <Route path="/admin/voice" component={AdminVoiceSettings} />
          <Route path="/admin/api" component={AdminAPIManagement} />
          <Route component={NotFound} />
        </Switch>
      </AppLayout>
    </UnityAvatarProvider>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <OverlayProvider>
        <Router />
        <Toaster />
      </OverlayProvider>
    </QueryClientProvider>
  );
}
