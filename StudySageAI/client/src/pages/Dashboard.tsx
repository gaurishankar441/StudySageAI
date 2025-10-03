import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Link } from "wouter";
import {
  BookOpen,
  CheckCircle,
  Clock,
  Target,
  MessageCircle,
  Upload,
  ClipboardList,
  NotebookPen,
  Calendar,
  User,
  GraduationCap,
  FileText,
  HelpCircle,
  Folder,
  TrendingUp,
  Plus,
} from "lucide-react";

export default function Dashboard() {
  const { user } = useAuth();

  // Mock data queries - in real implementation these would fetch actual data
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/stats"],
    queryFn: () => Promise.resolve({
      activeSessions: 12,
      quizAccuracy: 85,
      studyTime: 24,
      goalsAchieved: 7,
      totalGoals: 10,
    }),
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ["/api/activity"],
    queryFn: () => Promise.resolve([
      {
        id: 1,
        type: "docchat",
        title: "Completed DocChat session on Quantum Physics",
        time: "2 hours ago",
        icon: MessageCircle,
      },
      {
        id: 2,
        type: "quiz",
        title: "Scored 90% on Calculus Quiz",
        time: "Yesterday",
        icon: CheckCircle,
      },
      {
        id: 3,
        type: "study-plan",
        title: "Updated Study Plan for Final Exams",
        time: "2 days ago",
        icon: Calendar,
      },
    ]),
  });

  const { data: upcomingTasks, isLoading: tasksLoading } = useQuery({
    queryKey: ["/api/tasks/upcoming"],
    queryFn: () => Promise.resolve([
      {
        id: 1,
        title: "Review Chapter 5 - Thermodynamics",
        subject: "Physics",
        duration: "20 min",
        type: "DocChat",
        status: "due-today",
        icon: BookOpen,
      },
      {
        id: 2,
        title: "Complete Algebra Quiz",
        subject: "Mathematics",
        duration: "15 min",
        type: "Quiz",
        status: "tomorrow",
        icon: ClipboardList,
      },
      {
        id: 3,
        title: "Read: Introduction to Quantum Mechanics",
        subject: "Physics",
        duration: "45 min",
        type: "Reading",
        status: "upcoming",
        icon: BookOpen,
      },
    ]),
  });

  const firstName = user?.firstName || "Student";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-primary to-accent rounded-xl p-8 text-primary-foreground">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {firstName}! 👋</h1>
        <p className="text-primary-foreground/90 mb-6">Ready to continue your learning journey?</p>
        <Button
          asChild
          variant="secondary"
          className="bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white border-white/20"
        >
          <Link href="/tutor">
            <GraduationCap className="w-4 h-4 mr-2" />
            Start Learning
          </Link>
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <span className="text-2xl font-bold">{stats?.activeSessions || 0}</span>
            </div>
            <p className="text-muted-foreground text-sm">Active Sessions</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <span className="text-2xl font-bold">{stats?.quizAccuracy || 0}%</span>
            </div>
            <p className="text-muted-foreground text-sm">Quiz Accuracy</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-warning/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <span className="text-2xl font-bold">{stats?.studyTime || 0}h</span>
            </div>
            <p className="text-muted-foreground text-sm">Study Time</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-accent" />
              </div>
              <span className="text-2xl font-bold">{stats?.goalsAchieved || 0}/{stats?.totalGoals || 0}</span>
            </div>
            <p className="text-muted-foreground text-sm">Goals Achieved</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Activity</h2>
            <div className="space-y-4">
              {recentActivity?.map((activity) => {
                const Icon = activity.icon;
                return (
                  <div key={activity.id} className="flex items-start gap-4 pb-4 border-b border-border last:border-0 last:pb-0">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium mb-1">{activity.title}</p>
                      <p className="text-sm text-muted-foreground">{activity.time}</p>
                    </div>
                  </div>
                );
              }) || (
                <div className="text-center py-8">
                  <TrendingUp className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No recent activity</p>
                  <p className="text-xs text-muted-foreground mt-1">Start learning to see your progress here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-3">
              <Button asChild variant="outline" className="w-full justify-start gap-3 hover:bg-primary hover:text-primary-foreground transition-all duration-200">
                <Link href="/tutor">
                  <GraduationCap className="w-5 h-5" />
                  <span className="font-medium">Start Tutor Session</span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start gap-3 hover:bg-primary hover:text-primary-foreground transition-all duration-200">
                <Link href="/docchat">
                  <Upload className="w-5 h-5" />
                  <span className="font-medium">Upload Document</span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start gap-3 hover:bg-primary hover:text-primary-foreground transition-all duration-200">
                <Link href="/quiz">
                  <ClipboardList className="w-5 h-5" />
                  <span className="font-medium">Create Quiz</span>
                </Link>
              </Button>

              <Button asChild variant="outline" className="w-full justify-start gap-3 hover:bg-primary hover:text-primary-foreground transition-all duration-200">
                <Link href="/notes">
                  <NotebookPen className="w-5 h-5" />
                  <span className="font-medium">New Note</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Upcoming Tasks</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/study-plan" className="text-primary hover:underline text-sm font-medium">
                View all
              </Link>
            </Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingTasks?.map((task) => {
              const Icon = task.icon;
              return (
                <div key={task.id} className="p-4 rounded-lg border border-border hover:border-primary transition-colors duration-200 cursor-pointer">
                  <div className="flex items-start justify-between mb-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${
                      task.status === 'due-today' ? 'bg-primary/10 text-primary' :
                      task.status === 'tomorrow' ? 'bg-warning/10 text-warning' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {task.status === 'due-today' ? 'Due Today' :
                       task.status === 'tomorrow' ? 'Tomorrow' :
                       'Upcoming'}
                    </span>
                    <Icon className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <h3 className="font-medium mb-1">{task.title}</h3>
                  <p className="text-sm text-muted-foreground">{task.duration} • {task.subject}</p>
                </div>
              );
            }) || (
              <div className="col-span-full text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                <p className="text-sm text-muted-foreground">No upcoming tasks</p>
                <p className="text-xs text-muted-foreground mt-1">
                  <Button asChild variant="link" className="p-0 text-xs h-auto">
                    <Link href="/study-plan">Create a study plan</Link>
                  </Button>
                  {" "}to get organized
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
