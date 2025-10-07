import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import QuizModal from "./QuizModal";
import {
  Plus,
  Clock,
  CheckCircle,
  Play,
  Trophy,
  TrendingUp,
  Zap,
  ClipboardList,
} from "lucide-react";
import { Quiz } from "@shared/schema";

export default function QuizView() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [, navigate] = useLocation();

  const { data: quizzes = [], isLoading } = useQuery<Quiz[]>({
    queryKey: ["/api/quizzes"],
  });

  const getStatusColor = (quiz: Quiz) => {
    const daysSinceCreated = Math.floor((Date.now() - new Date(quiz.createdAt!).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceCreated === 0) return { status: 'New', gradient: 'bg-gradient-to-r from-purple-500 to-pink-500' };
    if (daysSinceCreated < 7) return { status: 'Recent', gradient: 'bg-gradient-to-r from-green-500 to-emerald-500' };
    return { status: 'Completed', gradient: 'bg-gradient-to-r from-gray-500 to-slate-500' };
  };

  const getQuizIcon = (subject?: string) => {
    switch (subject?.toLowerCase()) {
      case 'mathematics':
        return '🔢';
      case 'physics':
        return '⚛️';
      case 'chemistry':
        return '🧪';
      case 'biology':
        return '🧬';
      case 'history':
        return '📚';
      default:
        return '📝';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-8">
      {/* Header with Gradient Text */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold mb-2 gradient-text">Quiz Arena</h1>
          <p className="text-muted-foreground text-lg">Create and practice quizzes from any source</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="btn-gradient flex items-center gap-2 px-6 py-6 text-base"
          data-testid="button-create-quiz"
        >
          <Plus className="w-5 h-5" />
          Create Quiz
        </Button>
      </div>

      {/* Statistics Grid with Glass Cards */}
      <div className="grid grid-cols-4 gap-6 mb-10">
        <Card className="glass-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold gradient-text">{quizzes.length}</p>
                <p className="text-sm text-muted-foreground">Quizzes Created</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center shadow-lg">
                <TrendingUp className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold gradient-text">78%</p>
                <p className="text-sm text-muted-foreground">Average Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg">
                <Zap className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold gradient-text">12</p>
                <p className="text-sm text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-lg">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold gradient-text">8.5h</p>
                <p className="text-sm text-muted-foreground">Total Practice</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quizzes Grid */}
      {quizzes.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {quizzes.map((quiz) => {
            const statusInfo = getStatusColor(quiz);
            return (
              <Card key={quiz.id} className="card-interactive group" data-testid={`card-quiz-${quiz.id}`}>
                <CardContent className="p-8">
                  <div className="flex items-start justify-between mb-6">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                      {getQuizIcon(quiz.subject || undefined)}
                    </div>
                    <Badge className={`${statusInfo.gradient} text-white border-0 px-3 py-1 shadow-md`}>
                      {statusInfo.status}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold text-xl mb-3 group-hover:gradient-text transition-all duration-300">
                    {quiz.title}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground mb-6">
                    {quiz.totalQuestions} questions • {quiz.subject} • {quiz.difficulty}
                  </p>

                  <div className="flex items-center justify-between pt-6 border-t border-border/50">
                    <div className="text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <ClipboardList className="w-4 h-4" />
                        <span>{quiz.language === 'hi' ? 'हिन्दी' : 'English'}</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="btn-gradient opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:scale-105"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/quiz/${quiz.id}`);
                      }}
                      data-testid={`button-start-${quiz.id}`}
                    >
                      <Play className="w-4 h-4 mr-2" />
                      Start
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="glass-card border-0 p-16 text-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-6">
            <ClipboardList className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-semibold mb-3 gradient-text">No quizzes yet</h3>
          <p className="text-base text-muted-foreground mb-6 max-w-md mx-auto">
            Create your first quiz from a topic, document, or URL
          </p>
          <Button onClick={() => setShowCreateModal(true)} className="btn-gradient flex items-center gap-2 px-6 py-6 text-base mx-auto">
            <Plus className="w-5 h-5" />
            Create Your First Quiz
          </Button>
        </Card>
      )}

      <QuizModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
}
