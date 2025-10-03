import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { useAuth } from "@/hooks/useAuth";
import AppLayout from "@/components/layout/AppLayout";

// Pages
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Tutor from "@/pages/Tutor";
import DocChat from "@/pages/DocChat";
import Quiz from "@/pages/Quiz";
import QuizAttempt from "@/pages/QuizAttempt";
import StudyPlan from "@/pages/StudyPlan";
import Notes from "@/pages/Notes";
import Settings from "@/pages/Settings";
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

  // Authenticated users get the full app with layout
  return (
    <AppLayout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/tutor" component={Tutor} />
        <Route path="/docchat" component={DocChat} />
        <Route path="/quiz/:id" component={QuizAttempt} />
        <Route path="/quiz" component={Quiz} />
        <Route path="/study-plan" component={StudyPlan} />
        <Route path="/notes" component={Notes} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </AppLayout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}
