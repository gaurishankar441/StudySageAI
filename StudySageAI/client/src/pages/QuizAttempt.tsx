import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, CheckCircle, XCircle, Clock } from "lucide-react";
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
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-lg text-muted-foreground">Quiz not found</p>
            <Button onClick={() => navigate("/quiz")} className="mt-4">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Quizzes
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = () => {
    if (Object.keys(answers).length < questions.length) {
      toast({
        title: "Incomplete quiz",
        description: "Please answer all questions before submitting",
        variant: "destructive",
      });
      return;
    }
    submitAttemptMutation.mutate();
  };

  if (showResults && results) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Button onClick={() => navigate("/quiz")} variant="ghost" className="mb-4" data-testid="button-back-to-quiz">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Quizzes
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Quiz Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center p-4 bg-primary/10 rounded-lg">
                <p className="text-3xl font-bold text-primary" data-testid="text-score">{results.score}%</p>
                <p className="text-sm text-muted-foreground">Score</p>
              </div>
              <div className="text-center p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <p className="text-3xl font-bold text-green-600" data-testid="text-correct">{results.correctCount}</p>
                <p className="text-sm text-muted-foreground">Correct</p>
              </div>
              <div className="text-center p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <p className="text-3xl font-bold text-blue-600" data-testid="text-time">{Math.floor(results.attempt.timeSpent / 60)}m</p>
                <p className="text-sm text-muted-foreground">Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {questions.map((question, index) => {
          const userAnswer = answers[question.id];
          const isCorrect = userAnswer === question.answer;
          const feedback = results.feedback?.find((f: any) => f.questionId === question.id);

          return (
            <Card key={question.id} className="mb-4" data-testid={`card-result-${index}`}>
              <CardContent className="p-6">
                <div className="flex items-start gap-3 mb-4">
                  {isCorrect ? (
                    <CheckCircle className="w-5 h-5 text-green-600 mt-1" data-testid={`icon-correct-${index}`} />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 mt-1" data-testid={`icon-wrong-${index}`} />
                  )}
                  <div className="flex-1">
                    <p className="font-medium mb-3" data-testid={`text-question-${index}`}>
                      {index + 1}. {question.stem}
                    </p>
                    <div className="space-y-2 mb-3">
                      {(question.options as string[] | null)?.map((option: string, optIndex: number) => (
                        <div
                          key={optIndex}
                          className={`p-3 rounded-lg border ${
                            option === question.answer
                              ? "bg-green-100 dark:bg-green-900/20 border-green-600"
                              : option === userAnswer
                              ? "bg-red-100 dark:bg-red-900/20 border-red-600"
                              : "bg-muted/50 border-border"
                          }`}
                          data-testid={`option-${index}-${optIndex}`}
                        >
                          {option}
                          {option === question.answer && " ✓"}
                        </div>
                      ))}
                    </div>
                    {question.rationale && (
                      <p className="text-sm text-muted-foreground mt-3 p-3 bg-muted/50 rounded-lg" data-testid={`text-rationale-${index}`}>
                        <strong>Explanation:</strong> {question.rationale}
                      </p>
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

  return (
    <div className="max-w-4xl mx-auto p-6">
      <Button onClick={() => navigate("/quiz")} variant="ghost" className="mb-4" data-testid="button-back">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back
      </Button>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle data-testid="text-quiz-title">{quiz.title}</CardTitle>
          <p className="text-sm text-muted-foreground" data-testid="text-quiz-info">
            {quiz.subject} • {quiz.difficulty} • {questions.length} questions
          </p>
        </CardHeader>
      </Card>

      {questions.map((question, index) => (
        <Card key={question.id} className="mb-4" data-testid={`card-question-${index}`}>
          <CardContent className="p-6">
            <p className="font-medium mb-4" data-testid={`text-question-text-${index}`}>
              {index + 1}. {question.stem}
            </p>
            <RadioGroup
              value={answers[question.id] || ""}
              onValueChange={(value) => setAnswers({ ...answers, [question.id]: value })}
              data-testid={`radio-group-${index}`}
            >
              {(question.options as string[] | null)?.map((option: string, optIndex: number) => (
                <div key={optIndex} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <RadioGroupItem value={option} id={`q${question.id}-${optIndex}`} data-testid={`radio-${index}-${optIndex}`} />
                  <Label htmlFor={`q${question.id}-${optIndex}`} className="flex-1 cursor-pointer" data-testid={`label-${index}-${optIndex}`}>
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>
      ))}

      <Button
        onClick={handleSubmit}
        disabled={submitAttemptMutation.isPending}
        className="w-full"
        size="lg"
        data-testid="button-submit-quiz"
      >
        {submitAttemptMutation.isPending ? (
          <>
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
            Submitting...
          </>
        ) : (
          <>
            <CheckCircle className="w-5 h-5 mr-2" />
            Submit Quiz
          </>
        )}
      </Button>
    </div>
  );
}
