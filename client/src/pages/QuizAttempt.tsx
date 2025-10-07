import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, Clock, MinusCircle, Award } from "lucide-react";
import { Quiz, QuizQuestion } from "@shared/schema";

interface QuizWithQuestions {
  quiz: Quiz;
  questions: QuizQuestion[];
}

export default function QuizAttempt() {
  const { id } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [startTime] = useState(Date.now());

  const { data, isLoading } = useQuery<QuizWithQuestions>({
    queryKey: [`/api/quizzes/${id}`],
    enabled: !!id,
  });

  const quiz = data?.quiz;
  const questions = data?.questions || [];

  const submitAttemptMutation = useMutation({
    mutationFn: async () => {
      const timeSpent = Math.floor((Date.now() - startTime) / 1000);
      const response = await apiRequest("POST", `/api/quizzes/${id}/attempts`, {
        answers,
        timeSpent
      });
      return response.json();
    },
    onSuccess: (data) => {
      setResults(data);
      setShowResults(true);
      queryClient.invalidateQueries({ queryKey: [`/api/quizzes/${id}`] });
      toast({
        title: "Quiz submitted!",
        description: `You scored ${data.score}% (${data.correctCount}/${questions.length} correct)`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to submit quiz",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="max-w-4xl mx-auto p-8">
        <Card className="glass-card border-0">
          <CardContent className="p-16 text-center">
            <p className="text-xl text-muted-foreground">Quiz not found</p>
            <Button onClick={() => navigate("/quiz")} className="btn-gradient mt-6">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quizzes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = () => {
    submitAttemptMutation.mutate();
  };

  if (showResults && results) {
    const answeredCount = Object.keys(answers).length;
    const unattemptedCount = questions.length - answeredCount;
    const wrongCount = answeredCount - results.correctCount;
    const progressPercentage = Math.round(results.score);

    return (
      <div className="max-w-5xl mx-auto p-8">
        <Button onClick={() => navigate("/quiz")} variant="ghost" className="mb-6 hover:bg-accent/50" data-testid="button-back-to-quiz">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quizzes
        </Button>

        {/* Results Header Card with Gradient */}
        <Card className="glass-card border-0 mb-8 overflow-hidden">
          <div className="bg-gradient-to-r from-primary via-purple-500 to-pink-500 p-8">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-2">Quiz Complete!</h1>
                <p className="text-white/80">Here's how you performed</p>
              </div>
              <div className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                <Award className="w-10 h-10 text-white" />
              </div>
            </div>
            <Progress value={progressPercentage} className="h-3 bg-white/20" />
          </div>
          
          <CardContent className="p-8">
            <div className="grid grid-cols-4 gap-6">
              <div className="text-center p-6 bg-gradient-to-br from-primary/10 to-purple-500/10 rounded-2xl">
                <p className="text-4xl font-bold gradient-text mb-2" data-testid="text-score">{Math.round(results.score)}%</p>
                <p className="text-sm text-muted-foreground">Your Score</p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 rounded-2xl">
                <p className="text-4xl font-bold text-green-600 mb-2" data-testid="text-correct">{results.correctCount}</p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-red-100 to-pink-100 dark:from-red-900/20 dark:to-pink-900/20 rounded-2xl">
                <p className="text-4xl font-bold text-red-600 mb-2" data-testid="text-wrong">{wrongCount}</p>
                <p className="text-sm text-muted-foreground">Wrong</p>
              </div>
              <div className="text-center p-6 bg-gradient-to-br from-gray-100 to-slate-100 dark:from-gray-900/20 dark:to-slate-900/20 rounded-2xl">
                <p className="text-4xl font-bold text-gray-600 dark:text-gray-400 mb-2" data-testid="text-unattempted">{unattemptedCount}</p>
                <p className="text-sm text-muted-foreground">Unattempted</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions Review */}
        <h2 className="text-2xl font-bold mb-6 gradient-text animate-fade-in-up">Detailed Review</h2>
        {questions.map((question, index) => {
          const userAnswer = answers[question.id];
          const isUnattempted = !userAnswer;
          
          const correctAnswerArray = Array.isArray(question.answer) ? question.answer : [question.answer];
          const correctAnswer = correctAnswerArray[0];
          const isCorrect = userAnswer === correctAnswer;

          return (
            <Card key={question.id} className={`glass-card border-0 mb-6 animate-fade-in-up stagger-${Math.min((index % 6) + 1, 6)}`} data-testid={`card-result-${index}`}>
              <CardContent className="p-8">
                <div className="flex items-start gap-4">
                  {isUnattempted ? (
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-900/20 flex items-center justify-center flex-shrink-0" data-testid={`icon-unattempted-${index}`}>
                      <MinusCircle className="w-6 h-6 text-gray-500" />
                    </div>
                  ) : isCorrect ? (
                    <div className="w-10 h-10 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center flex-shrink-0" data-testid={`icon-correct-${index}`}>
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0" data-testid={`icon-wrong-${index}`}>
                      <XCircle className="w-6 h-6 text-red-600" />
                    </div>
                  )}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <p className="font-semibold text-lg" data-testid={`text-question-${index}`}>
                        {index + 1}. {question.stem}
                      </p>
                      {isUnattempted && (
                        <Badge variant="outline" className="ml-4">Skipped</Badge>
                      )}
                    </div>
                    <div className="space-y-3 mb-4">
                      {(question.options as string[] | null)?.map((option: string, optIndex: number) => {
                        const isCorrectOption = option === correctAnswer;
                        const isUserAnswer = option === userAnswer && !isUnattempted;
                        
                        return (
                          <div
                            key={optIndex}
                            className={`p-4 rounded-xl border-2 transition-all ${
                              isCorrectOption
                                ? "bg-green-50 dark:bg-green-900/10 border-green-500 shadow-md"
                                : isUserAnswer
                                ? "bg-red-50 dark:bg-red-900/10 border-red-500 shadow-md"
                                : "bg-accent/30 border-border"
                            }`}
                            data-testid={`option-${index}-${optIndex}`}
                          >
                            <div className="flex items-center justify-between">
                              <span>{option}</span>
                              {isCorrectOption && (
                                <Badge className="bg-green-600 text-white">Correct Answer</Badge>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {question.rationale && (
                      <div className="p-4 bg-primary/5 rounded-xl border border-primary/20" data-testid={`text-rationale-${index}`}>
                        <p className="text-sm font-medium text-primary mb-1">Explanation:</p>
                        <p className="text-sm text-muted-foreground">{question.rationale}</p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  }

  const answeredCount = Object.keys(answers).length;
  const progressPercentage = (answeredCount / questions.length) * 100;

  return (
    <div className="max-w-5xl mx-auto p-8">
      <Button onClick={() => navigate("/quiz")} variant="ghost" className="mb-6 hover:bg-accent/50" data-testid="button-back">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      {/* Quiz Header with Progress */}
      <Card className="glass-card border-0 mb-8">
        <CardHeader className="pb-4">
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-2xl gradient-text mb-2" data-testid="text-quiz-title">{quiz.title}</CardTitle>
              <p className="text-sm text-muted-foreground" data-testid="text-quiz-info">
                {quiz.subject} • {quiz.difficulty} • {questions.length} questions
              </p>
            </div>
            <Badge className="bg-gradient-to-r from-primary to-purple-500 text-white px-4 py-2">
              {answeredCount} / {questions.length}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <Progress value={progressPercentage} className="h-2" />
        </CardContent>
      </Card>

      {/* Questions */}
      {questions.map((question, index) => (
        <Card key={question.id} className={`glass-card border-0 mb-6 animate-fade-in-up stagger-${Math.min((index % 6) + 1, 6)}`} data-testid={`card-question-${index}`}>
          <CardContent className="p-8">
            <p className="font-semibold text-lg mb-6" data-testid={`text-question-text-${index}`}>
              {index + 1}. {question.stem}
            </p>
            <RadioGroup
              value={answers[question.id] || ""}
              onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
              data-testid={`radio-group-${index}`}
            >
              {(question.options as string[] | null)?.map((option: string, optIndex: number) => {
                const isSelected = answers[question.id] === option;
                return (
                  <div 
                    key={optIndex} 
                    className={`flex items-center space-x-3 p-4 rounded-xl border-2 transition-all duration-200 ${
                      isSelected 
                        ? 'border-primary bg-primary/5 shadow-md' 
                        : 'border-border hover:border-primary/50 hover:bg-accent/50'
                    }`}
                  >
                    <RadioGroupItem value={option} id={`q${question.id}-${optIndex}`} data-testid={`radio-${index}-${optIndex}`} />
                    <Label htmlFor={`q${question.id}-${optIndex}`} className="flex-1 cursor-pointer text-base" data-testid={`label-${index}-${optIndex}`}>
                      {option}
                    </Label>
                  </div>
                );
              })}
            </RadioGroup>
          </CardContent>
        </Card>
      ))}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={submitAttemptMutation.isPending}
        className="btn-gradient w-full py-7 text-lg"
        size="lg"
        data-testid="button-submit-quiz"
      >
        {submitAttemptMutation.isPending ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" data-testid="spinner-submitting" />
            Submitting...
          </>
        ) : (
          <>
            <CheckCircle className="w-6 h-6 mr-2" />
            Submit Quiz
          </>
        )}
      </Button>
    </div>
  );
}
