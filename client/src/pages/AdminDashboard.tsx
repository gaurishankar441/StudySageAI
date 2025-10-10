import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Settings, Users, Cpu, Mic, Database, Shield } from "lucide-react";
import { Link } from "wouter";
import { Card } from "@/components/ui/card";

export default function AdminDashboard() {
  const { user } = useAuth();

  // Check admin permission
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <Shield className="w-16 h-16 text-destructive mx-auto" />
          <h2 className="text-2xl font-bold">Access Denied</h2>
          <p className="text-muted-foreground">
            You don't have permission to access the admin panel.
          </p>
        </div>
      </div>
    );
  }

  const adminSections = [
    {
      title: "AI Tutor Config",
      description: "Manage personas, prompts, and first messages",
      icon: Users,
      href: "/admin/tutor",
      color: "from-purple-500 to-indigo-500"
    },
    {
      title: "Unity Build",
      description: "Upload and manage Unity WebGL builds",
      icon: Cpu,
      href: "/admin/unity",
      color: "from-blue-500 to-cyan-500"
    },
    {
      title: "Voice Services",
      description: "Configure TTS/STT providers and settings",
      icon: Mic,
      href: "/admin/voice",
      color: "from-green-500 to-emerald-500"
    },
    {
      title: "API Management",
      description: "Manage API keys and service providers",
      icon: Database,
      href: "/admin/api",
      color: "from-orange-500 to-red-500"
    },
    {
      title: "System Settings",
      description: "Feature flags, caching, rate limits",
      icon: Settings,
      href: "/admin/system",
      color: "from-pink-500 to-rose-500"
    },
    {
      title: "Audit Logs",
      description: "View configuration change history",
      icon: Shield,
      href: "/admin/audit",
      color: "from-slate-500 to-gray-500"
    }
  ];

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold gradient-text">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage VaktaAI platform configuration and settings
        </p>
      </div>

      {/* Admin Sections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {adminSections.map((section) => {
          const Icon = section.icon;
          return (
            <Link key={section.href} href={section.href}>
              <Card className="p-6 card-interactive group h-full">
                <div className="space-y-4">
                  <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${section.color} flex items-center justify-center transition-transform group-hover:scale-110`}>
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-semibold text-lg">{section.title}</h3>
                    <p className="text-sm text-muted-foreground">
                      {section.description}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Quick Stats */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">System Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Active Personas</p>
            <p className="text-2xl font-bold">3</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Unity Build Version</p>
            <p className="text-2xl font-bold">Oct 9, 2025</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Cache Hit Rate</p>
            <p className="text-2xl font-bold">70%</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
