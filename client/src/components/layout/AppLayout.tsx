import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  GraduationCap,
  FileText,
  HelpCircle,
  Calendar,
  BookOpen,
  Settings,
  Search,
  Globe,
  Bell,
  User,
  Home,
  LogOut,
  Menu,
  X
} from "lucide-react";
import logoPath from "@assets/Vakta AI.122_1759509648531.png";

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { user } = useAuth();
  const [location] = useLocation();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { toast } = useToast();

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout", {});
    },
    onSuccess: () => {
      queryClient.clear();
      window.location.href = "/";
    },
    onError: () => {
      toast({
        title: "Logout failed",
        description: "Could not logout. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleLogout = (e: React.MouseEvent) => {
    e.preventDefault();
    logoutMutation.mutate();
  };

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home, current: location === '/' },
    { name: 'AI Tutor', href: '/tutor', icon: GraduationCap, current: location === '/tutor' },
    { name: 'DocChat', href: '/docchat', icon: FileText, current: location === '/docchat' },
    { name: 'Quiz', href: '/quiz', icon: HelpCircle, current: location === '/quiz' },
    { name: 'Study Plan', href: '/study-plan', icon: Calendar, current: location === '/study-plan' },
    { name: 'Notes', href: '/notes', icon: BookOpen, current: location === '/notes' },
  ];

  const initials = user ? `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}` : 'U';

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-card-subtle border-r border-border flex flex-col transition-smooth`}>
        {/* Logo and Toggle */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <img 
                src={logoPath} 
                alt="Vakta AI" 
                className="w-12 h-12 object-contain flex-shrink-0"
              />
              {!sidebarCollapsed && (
                <div className="min-w-0">
                  <h1 className="font-bold text-xl leading-tight gradient-text">VaktaAI</h1>
                  <p className="text-xs text-muted-foreground mt-0.5">Study Assistant</p>
                </div>
              )}
            </div>
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-9 h-9 flex items-center justify-center hover:bg-accent rounded-full transition-smooth shadow-sm flex-shrink-0"
              data-testid="button-toggle-sidebar"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? (
                <Menu className="w-5 h-5" />
              ) : (
                <X className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link 
                key={item.name} 
                href={item.href}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-lg text-sm font-medium transition-smooth ${
                  item.current
                    ? 'bg-gradient-subtle text-foreground shadow-sm'
                    : 'text-muted-foreground card-interactive'
                }`}
              >
                <Icon className="w-6 h-6 flex-shrink-0" />
                {!sidebarCollapsed && <span>{item.name}</span>}
              </Link>
            );
          })}

          {!sidebarCollapsed && (
            <div className="pt-4 mt-4 border-t border-border">
              <Link 
                href="/settings"
                className="flex items-center gap-4 px-4 py-3.5 rounded-lg text-sm font-medium text-muted-foreground card-interactive transition-smooth"
              >
                <Settings className="w-6 h-6" />
                <span>Settings</span>
              </Link>
            </div>
          )}
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-card cursor-pointer transition-smooth hover:shadow-md card-subtle">
            <div className="w-10 h-10 rounded-full bg-gradient-primary text-white flex items-center justify-center text-sm font-semibold shadow-sm">
              {initials}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </p>
              </div>
            )}
            {!sidebarCollapsed && (
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-muted rounded-lg transition-smooth"
                title="Sign out"
                disabled={logoutMutation.isPending}
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-16 bg-card border-b border-border px-6 flex items-center justify-between">
          <div className="flex-1 max-w-2xl">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search or press ⌘K..."
                className="w-full pl-10 pr-4 py-2 bg-muted rounded-lg text-sm border border-transparent focus:border-ring focus:bg-background focus:outline-none transition-all duration-200"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 ml-6">
            {/* Language Selector */}
            <button className="px-3 py-1.5 text-sm bg-muted rounded-lg hover:bg-accent transition-colors duration-200 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              <span>English</span>
            </button>

            {/* Notifications */}
            <button className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-lg transition-colors duration-200 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-destructive rounded-full"></span>
            </button>

            {/* Help */}
            <button className="w-9 h-9 flex items-center justify-center hover:bg-muted rounded-lg transition-colors duration-200">
              <HelpCircle className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
