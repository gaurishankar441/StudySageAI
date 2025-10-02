import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import StudyPlanWizard from "./StudyPlanWizard";
import {
  Plus,
  Calendar,
  Clock,
  CheckCircle,
  BookOpen,
  GraduationCap,
  HelpCircle,
  Layers,
  Youtube,
  Filter,
  Settings,
  MoreVertical,
} from "lucide-react";
import { StudyPlan, StudyTask } from "@shared/schema";

export default function StudyPlanView() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeView, setActiveView] = useState<'today' | 'week' | 'month'>('today');

  const { data: studyPlans = [], isLoading: plansLoading } = useQuery<StudyPlan[]>({
    queryKey: ["/api/study-plans"],
  });

  const activePlan = studyPlans.find(plan => plan.status === 'active');

  const { data: planDetails, isLoading: tasksLoading } = useQuery({
    queryKey: [`/api/study-plans/${activePlan?.id}`],
    enabled: !!activePlan?.id,
  });

  const tasks: StudyTask[] = planDetails?.tasks || [];

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'read':
        return BookOpen;
      case 'tutor':
        return GraduationCap;
      case 'quiz':
        return HelpCircle;
      case 'flashcards':
        return Layers;
      case 'video':
        return Youtube;
      default:
        return BookOpen;
    }
  };

  const getTaskColor = (type: string) => {
    switch (type) {
      case 'read':
        return 'text-blue-600 bg-blue-100';
      case 'tutor':
        return 'text-green-600 bg-green-100';
      case 'quiz':
        return 'text-purple-600 bg-purple-100';
      case 'flashcards':
        return 'text-amber-600 bg-amber-100';
      case 'video':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-destructive/10 text-destructive';
      case 'medium':
        return 'bg-warning/10 text-warning';
      case 'low':
        return 'bg-success/10 text-success';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const todayTasks = tasks.filter(task => {
    const taskDate = new Date(task.dueAt!);
    const today = new Date();
    return taskDate.toDateString() === today.toDateString();
  });

  const upcomingTasks = tasks.filter(task => {
    const taskDate = new Date(task.dueAt!);
    const today = new Date();
    const weekFromNow = new Date();
    weekFromNow.setDate(today.getDate() + 7);
    return taskDate > today && taskDate <= weekFromNow;
  });

  if (plansLoading) {
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
          <h1 className="text-3xl font-bold mb-2">Study Plan</h1>
          <p className="text-muted-foreground">Organize your study schedule and track progress</p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 shadow-sm hover:shadow-md transition-all duration-200"
        >
          <Plus className="w-5 h-5" />
          Create Plan
        </Button>
      </div>

      {activePlan ? (
        <>
          {/* Active Plan Card */}
          <div className="bg-gradient-to-r from-primary to-accent rounded-xl p-8 text-primary-foreground mb-6">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">{activePlan.name}</h2>
                <p className="text-primary-foreground/90">
                  {activePlan.subject} • {activePlan.intensity} intensity
                </p>
              </div>
              <Button variant="secondary" size="sm" className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-6">
              <div>
                <p className="text-primary-foreground/80 text-sm mb-1">Progress</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">42</span>
                  <span className="text-sm text-primary-foreground/80">/ 85 tasks</span>
                </div>
              </div>
              <div>
                <p className="text-primary-foreground/80 text-sm mb-1">Study Time</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">18.5</span>
                  <span className="text-sm text-primary-foreground/80">hours</span>
                </div>
              </div>
              <div>
                <p className="text-primary-foreground/80 text-sm mb-1">Days Left</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">
                    {activePlan.examDate 
                      ? Math.max(0, Math.ceil((new Date(activePlan.examDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
                      : '∞'
                    }
                  </span>
                  <span className="text-sm text-primary-foreground/80">days</span>
                </div>
              </div>
              <div>
                <p className="text-primary-foreground/80 text-sm mb-1">Completion</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">49</span>
                  <span className="text-sm text-primary-foreground/80">%</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-white rounded-full transition-all duration-500" style={{ width: '49%' }} />
              </div>
            </div>
          </div>

          {/* View Controls */}
          <div className="flex items-center gap-4 mb-6">
            <div className="flex items-center gap-2 bg-card rounded-lg p-1 border border-border">
              {(['today', 'week', 'month'] as const).map((view) => (
                <Button
                  key={view}
                  variant={activeView === view ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setActiveView(view)}
                  className="text-sm"
                >
                  {view === 'today' ? 'Today' : view === 'week' ? 'Week' : 'Month'}
                </Button>
              ))}
            </div>
            
            <div className="flex-1"></div>
            
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filter
            </Button>
          </div>

          {/* Tasks Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Today's Tasks */}
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg">Today's Tasks</h3>
                  <span className="text-xs text-muted-foreground">
                    {todayTasks.filter(t => t.status === 'completed').length} of {todayTasks.length} completed
                  </span>
                </div>

                <div className="space-y-3">
                  {todayTasks.map((task) => {
                    const TaskIcon = getTaskIcon(task.type);
                    const taskColor = getTaskColor(task.type);
                    
                    return (
                      <div key={task.id} className="flex items-start gap-4 p-4 rounded-lg border border-border hover:border-primary transition-colors duration-200">
                        <Checkbox
                          checked={task.status === 'completed'}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="px-2 py-1 text-xs font-medium rounded bg-primary/10 text-primary">
                              {new Date(task.dueAt!).toLocaleTimeString('en-US', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded ${taskColor}`}>
                              <TaskIcon className="w-3 h-3 inline mr-1" />
                              {task.type}
                            </span>
                          </div>
                          <h4 className={`font-medium mb-1 ${task.status === 'completed' ? 'line-through text-muted-foreground' : ''}`}>
                            {task.title}
                          </h4>
                          <p className="text-sm text-muted-foreground">
                            {task.durationMin} minutes
                          </p>
                        </div>
                        <Button variant="ghost" size="sm">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </div>
                    );
                  })}

                  {todayTasks.length === 0 && (
                    <div className="text-center py-8">
                      <CheckCircle className="w-12 h-12 text-success/50 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No tasks for today</p>
                      <p className="text-xs text-muted-foreground mt-1">Great job staying on track!</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Upcoming Tasks */}
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold text-lg mb-4">Upcoming This Week</h3>
                
                <div className="space-y-3">
                  {upcomingTasks.map((task) => {
                    const taskDate = new Date(task.dueAt!);
                    const TaskIcon = getTaskIcon(task.type);
                    
                    return (
                      <div key={task.id} className="flex items-start gap-4 p-4 rounded-lg bg-muted/50">
                        <div className="w-12 text-center flex-shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {taskDate.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                          </p>
                          <p className="text-lg font-bold">
                            {taskDate.getDate()}
                          </p>
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium mb-1">{task.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2">
                            {task.durationMin} minutes • {task.type}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-muted text-muted-foreground">
                              Medium Priority
                            </Badge>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {upcomingTasks.length === 0 && (
                    <div className="text-center py-8">
                      <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">No upcoming tasks</p>
                      <p className="text-xs text-muted-foreground mt-1">Your schedule is clear</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : (
        /* No Active Plan State */
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Calendar className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-2">No active study plan</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Create a personalized study plan to organize your learning schedule and track your progress towards your goals.
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Your First Study Plan
          </Button>
          
          {/* Other Study Plans */}
          {studyPlans.length > 0 && (
            <div className="mt-12">
              <h4 className="font-semibold mb-4">Other Study Plans</h4>
              <div className="grid md:grid-cols-2 gap-4">
                {studyPlans.map((plan) => (
                  <Card key={plan.id} className="text-left">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-semibold">{plan.name}</h5>
                        <Badge variant={plan.status === 'paused' ? 'secondary' : 'outline'}>
                          {plan.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        {plan.subject} • {plan.intensity} intensity
                      </p>
                      <Button variant="outline" size="sm">
                        {plan.status === 'paused' ? 'Resume' : 'View'}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <StudyPlanWizard
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
      />
    </div>
  );
}
