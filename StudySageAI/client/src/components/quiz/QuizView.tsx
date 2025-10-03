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
    // This would be determined by checking if there are any attempts
    // For now, we'll use a simple heuristic based on creation time
    const daysSinceCreated = Math.floor((Date.now() - new Date(quiz.createdAt!).getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSinceCreated === 0) return { status: 'New', color: 'bg-primary text-primary-foreground' };
    if (daysSinceCreated < 7) return { status: 'Recent', color: 'bg-success text-success-foreground' };
    return { status: 'Completed', color: 'bg-muted text-muted-foreground' };
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
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Quiz</h1>
          <p className="text-muted-foreground">Create and practice quizzes from any source</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          Create Quiz
        </Button>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-4 gap-6 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{quizzes.length}</p>
                <p className="text-xs text-muted-foreground">Quizzes Created</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">78%</p>
                <p className="text-xs text-muted-foreground">Average Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">12</p>
                <p className="text-xs text-muted-foreground">Day Streak</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">8.5h</p>
                <p className="text-xs text-muted-foreground">Total Practice</p>
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
              <Card key={quiz.id} className="hover:shadow-md transition-all duration-200 cursor-pointer group">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-2xl">
                      {getQuizIcon(quiz.subject || undefined)}
                    </div>
                    <Badge className={statusInfo.color}>
                      {statusInfo.status}
                    </Badge>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2 group-hover:text-primary transition-colors">
                    {quiz.title}
                  </h3>
                  
                  <p className="text-sm text-muted-foreground mb-4">
                    {quiz.totalQuestions} questions • {quiz.subject} • {quiz.difficulty}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-border">
                    <div className="text-sm">
                      <div className="flex items-center gap-1 text-muted-foreground">
                        <ClipboardList className="w-4 h-4" />
                        <span>{quiz.language === 'hi' ? 'हिन्दी' : 'English'}</span>
                      </div>
                    </div>
                    <Button 
                      size="sm" 
                      className="opacity-0 group-hover:opacity-100 transition-all duration-200"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/quiz/${quiz.id}`);
                      }}
                      data-testid={`button-start-${quiz.id}`}
                    >
                      <Play className="w-4 h-4 mr-1" />
                      Start
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="p-12 text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ClipboardList className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No quizzes yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first quiz from a topic, document, or URL
          </p>
          <Button onClick={() => setShowCreateModal(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
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
