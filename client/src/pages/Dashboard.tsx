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
  Brain,
  Sparkles,
} from "lucide-react";

interface DashboardStats {
  activeSessions: number;
  quizAccuracy: number;
  studyTime: number;
  goalsAchieved: number;
  totalGoals: number;
}

interface ActivityItem {
  id: string;
  icon: string;
  title: string;
  time: string;
}

interface TaskItem {
  id: string;
  icon: string;
  status: string;
  title: string;
  duration: string;
  subject: string;
}

// Icon mapping helper
const getIconComponent = (iconName: string) => {
  const iconMap: Record<string, any> = {
    MessageCircle,
    CheckCircle,
    Calendar,
    BookOpen,
    ClipboardList,
    Brain,
    FileText,
  };
  return iconMap[iconName] || MessageCircle;
};

export default function Dashboard() {
  const { user } = useAuth();

  // Fetch real dashboard data from APIs
  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ["/api/stats"],
  });

  const { data: recentActivity, isLoading: activityLoading } = useQuery<ActivityItem[]>({
    queryKey: ["/api/activity"],
  });

  const { data: upcomingTasks, isLoading: tasksLoading } = useQuery<TaskItem[]>({
    queryKey: ["/api/tasks/upcoming"],
  });

  const firstName = user?.firstName || "Student";

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto" data-testid="dashboard-container">
      {/* Welcome Section with Gradient Text */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-subtle dark:bg-gradient-to-br dark:from-primary/20 dark:to-accent/20 p-10 border border-border/50 shadow-lg" data-testid="welcome-section">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-radial opacity-30 pointer-events-none" />
        <div className="relative z-10">
          <h1 className="text-5xl font-bold mb-3 gradient-text" data-testid="text-welcome-message">
            Welcome back, {firstName}! 👋
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            Ready to continue your learning journey?
          </p>
          <Button
            asChild
            size="lg"
            className="btn-gradient shadow-lg hover:shadow-xl transition-all duration-200"
            data-testid="button-start-learning"
          >
            <Link href="/tutor">
              <GraduationCap className="w-5 h-5 mr-2" />
              Start Learning
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid with Glass Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6" data-testid="stats-grid">
        <div className="glass-card card-hover rounded-xl p-6 shadow-md" data-testid="card-active-sessions">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
                <BookOpen className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold gradient-text mb-1" data-testid="text-active-sessions-count">
                {stats?.activeSessions || 0}
              </div>
              <p className="text-sm text-muted-foreground font-medium">Active Sessions</p>
            </div>
          </div>
        </div>

        <div className="glass-card card-hover rounded-xl p-6 shadow-md" data-testid="card-quiz-accuracy">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold gradient-text mb-1" data-testid="text-quiz-accuracy">
                {stats?.quizAccuracy || 0}%
              </div>
              <p className="text-sm text-muted-foreground font-medium">Quiz Accuracy</p>
            </div>
          </div>
        </div>

        <div className="glass-card card-hover rounded-xl p-6 shadow-md" data-testid="card-study-time">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
                <Clock className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold gradient-text mb-1" data-testid="text-study-time">
                {stats?.studyTime || 0}h
              </div>
              <p className="text-sm text-muted-foreground font-medium">Study Time</p>
            </div>
          </div>
        </div>

        <div className="glass-card card-hover rounded-xl p-6 shadow-md" data-testid="card-goals">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="w-14 h-14 rounded-xl bg-gradient-accent flex items-center justify-center shadow-lg">
                <Target className="w-7 h-7 text-white" />
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold gradient-text mb-1" data-testid="text-goals-achieved">
                {stats?.goalsAchieved || 0}/{stats?.totalGoals || 0}
              </div>
              <p className="text-sm text-muted-foreground font-medium">Goals Achieved</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions & Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2 shadow-md border-border/50" data-testid="recent-activity-section">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold gradient-text">Recent Activity</h2>
            </div>
            <div className="space-y-4">
              {recentActivity && recentActivity.length > 0 ? recentActivity.map((activity: ActivityItem) => {
                const Icon = getIconComponent(activity.icon);
                return (
                  <div 
                    key={activity.id} 
                    className="card-interactive rounded-xl p-4 group cursor-pointer"
                    data-testid={`activity-item-${activity.id}`}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center flex-shrink-0 shadow-md group-hover:shadow-lg transition-shadow duration-200">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold mb-1 group-hover:text-primary transition-colors duration-200">
                          {activity.title}
                        </p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          <Clock className="w-3 h-3" />
                          {activity.time}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center py-12">
                  <div className="w-20 h-20 rounded-full bg-gradient-subtle dark:bg-muted/20 flex items-center justify-center mx-auto mb-4">
                    <TrendingUp className="w-10 h-10 text-muted-foreground/50" />
                  </div>
                  <p className="text-base font-medium text-muted-foreground mb-1">No recent activity</p>
                  <p className="text-sm text-muted-foreground">Start learning to see your progress here</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="shadow-md border-border/50" data-testid="quick-actions-section">
          <CardContent className="p-6">
            <div className="flex items-center gap-2 mb-6">
              <Sparkles className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold gradient-text">Quick Actions</h2>
            </div>
            <div className="space-y-3">
              <Button 
                asChild 
                size="lg"
                className="w-full justify-start gap-3 btn-gradient text-white shadow-md hover:shadow-lg transition-all duration-200"
                data-testid="button-start-tutor"
              >
                <Link href="/tutor">
                  <GraduationCap className="w-5 h-5" />
                  <span className="font-semibold">Start Tutor Session</span>
                </Link>
              </Button>

              <Button 
                asChild 
                size="lg"
                className="w-full justify-start gap-3 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                data-testid="button-upload-document"
              >
                <Link href="/docchat">
                  <Upload className="w-5 h-5" />
                  <span className="font-semibold">Upload Document</span>
                </Link>
              </Button>

              <Button 
                asChild 
                size="lg"
                className="w-full justify-start gap-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                data-testid="button-create-quiz"
              >
                <Link href="/quiz">
                  <ClipboardList className="w-5 h-5" />
                  <span className="font-semibold">Create Quiz</span>
                </Link>
              </Button>

              <Button 
                asChild 
                size="lg"
                className="w-full justify-start gap-3 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-md hover:shadow-lg transition-all duration-200"
                data-testid="button-new-note"
              >
                <Link href="/notes">
                  <NotebookPen className="w-5 h-5" />
                  <span className="font-semibold">New Note</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Tasks */}
      <Card className="shadow-lg border-border/50" data-testid="upcoming-tasks-section">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              <h2 className="text-2xl font-bold gradient-text">Upcoming Tasks</h2>
            </div>
            <Button asChild variant="ghost" size="sm" className="text-primary hover:text-primary/80" data-testid="button-view-all-tasks">
              <Link href="/study-plan" className="font-medium">
                View all →
              </Link>
            </Button>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingTasks && upcomingTasks.length > 0 ? upcomingTasks.map((task: TaskItem) => {
              const Icon = getIconComponent(task.icon);
              return (
                <div 
                  key={task.id} 
                  className="card-interactive rounded-xl p-5 group cursor-pointer"
                  data-testid={`task-item-${task.id}`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-3 py-1.5 text-xs font-semibold rounded-full ${
                      task.status === 'due-today' ? 'bg-gradient-primary text-white shadow-md' :
                      task.status === 'tomorrow' ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md' :
                      'bg-muted text-muted-foreground'
                    }`}>
                      {task.status === 'due-today' ? 'Due Today' :
                       task.status === 'tomorrow' ? 'Tomorrow' :
                       'Upcoming'}
                    </span>
                    <div className="w-8 h-8 rounded-lg bg-gradient-subtle dark:bg-muted/20 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-primary" />
                    </div>
                  </div>
                  <h3 className="font-semibold mb-2 group-hover:text-primary transition-colors duration-200">
                    {task.title}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {task.duration} • {task.subject}
                  </p>
                </div>
              );
            }) : (
              <div className="col-span-full text-center py-12">
                <div className="w-20 h-20 rounded-full bg-gradient-subtle dark:bg-muted/20 flex items-center justify-center mx-auto mb-4">
                  <Calendar className="w-10 h-10 text-muted-foreground/50" />
                </div>
                <p className="text-base font-medium text-muted-foreground mb-1">No upcoming tasks</p>
                <p className="text-sm text-muted-foreground">
                  <Button asChild variant="link" className="p-0 text-sm h-auto text-primary hover:text-primary/80" data-testid="button-create-study-plan">
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
