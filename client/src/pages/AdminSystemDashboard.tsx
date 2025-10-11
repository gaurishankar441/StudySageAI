import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Settings, 
  FileText, 
  Volume2, 
  Key, 
  Activity,
  Users,
  Clock,
  ChevronRight
} from "lucide-react";
import { Link } from "wouter";

interface UnityBuild {
  id: number;
  version: string;
  buildDate: string;
  files: any;
  isActive: boolean;
  createdAt: string;
}

interface AuditLog {
  id: number;
  userId: number;
  action: string;
  configId: number | null;
  previousValue: any;
  newValue: any;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface AdminConfig {
  id: number;
  category: string;
  key: string;
  value: any;
  createdAt: string;
  updatedAt: string;
}

export default function AdminSystemDashboard() {
  // Fetch all configs
  const { data: configs = [] } = useQuery<AdminConfig[]>({
    queryKey: ['/api/admin/configs'],
  });

  // Fetch Unity builds
  const { data: builds = [] } = useQuery<UnityBuild[]>({
    queryKey: ['/api/admin/unity/builds'],
  });

  // Fetch recent audit logs (limit 5)
  const { data: auditLogs = [] } = useQuery<AuditLog[]>({
    queryKey: ['/api/admin/audit/logs'],
  });

  // Calculate stats
  const activeUnityBuild = builds.find(b => b.isActive);
  const tutorPersonas = configs.find(c => c.category === 'tutor' && c.key === 'personas')?.value?.length || 0;
  const recentAudits = auditLogs.slice(0, 5);

  const configsByCategory = configs.reduce((acc, config) => {
    if (!acc[config.category]) acc[config.category] = [];
    acc[config.category].push(config);
    return acc;
  }, {} as Record<string, AdminConfig[]>);

  const categoryIcons = {
    tutor: <Settings className="w-5 h-5" />,
    voice: <Volume2 className="w-5 h-5" />,
    api: <Key className="w-5 h-5" />,
  };

  const categoryLabels = {
    tutor: "AI Tutor",
    voice: "Voice Settings",
    api: "API Keys",
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold gradient-text">System Dashboard</h1>
        <p className="text-muted-foreground mt-1">Overview of platform configuration and activity</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Configs</p>
              <p className="text-2xl font-bold" data-testid="stat-total-configs">{configs.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <FileText className="w-6 h-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Tutor Personas</p>
              <p className="text-2xl font-bold" data-testid="stat-personas">{tutorPersonas}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Unity Builds</p>
              <p className="text-2xl font-bold" data-testid="stat-unity-builds">{builds.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Activity className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card className="p-4 hover:shadow-lg transition-shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Audit Logs</p>
              <p className="text-2xl font-bold" data-testid="stat-audit-logs">{auditLogs.length}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-orange-500/10 flex items-center justify-center">
              <Clock className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Active Configuration */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Active Configuration</h2>
            <Link href="/admin/tutor">
              <Button variant="ghost" size="sm" data-testid="link-view-all-configs">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {Object.entries(configsByCategory).map(([category, categoryConfigs]) => (
              <div 
                key={category} 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                data-testid={`config-category-${category}`}
              >
                <div className="flex items-center gap-3">
                  {categoryIcons[category as keyof typeof categoryIcons]}
                  <div>
                    <p className="font-medium">{categoryLabels[category as keyof typeof categoryLabels] || category}</p>
                    <p className="text-sm text-muted-foreground">{categoryConfigs.length} setting{categoryConfigs.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
                <Badge variant="outline">{categoryConfigs.length}</Badge>
              </div>
            ))}

            {activeUnityBuild && (
              <div 
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                data-testid="active-unity-build"
              >
                <div className="flex items-center gap-3">
                  <Activity className="w-5 h-5" />
                  <div>
                    <p className="font-medium">Unity Avatar</p>
                    <p className="text-sm text-muted-foreground">v{activeUnityBuild.version}</p>
                  </div>
                </div>
                <Badge>Active</Badge>
              </div>
            )}

            {!activeUnityBuild && builds.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No Unity builds uploaded yet</p>
            )}
          </div>
        </Card>

        {/* Recent Audit Logs */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Recent Activity</h2>
            <Link href="/admin/audit">
              <Button variant="ghost" size="sm" data-testid="link-view-audit-logs">
                View All <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {recentAudits.length > 0 ? (
              recentAudits.map((log) => (
                <div 
                  key={log.id} 
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                  data-testid={`audit-log-${log.id}`}
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{log.action}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(log.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No recent activity</p>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Link href="/admin/tutor">
            <Button variant="outline" className="w-full justify-start" data-testid="button-manage-tutor">
              <Settings className="w-4 h-4 mr-2" />
              AI Tutor Config
            </Button>
          </Link>
          <Link href="/admin/voice">
            <Button variant="outline" className="w-full justify-start" data-testid="button-manage-voice">
              <Volume2 className="w-4 h-4 mr-2" />
              Voice Settings
            </Button>
          </Link>
          <Link href="/admin/api">
            <Button variant="outline" className="w-full justify-start" data-testid="button-manage-api">
              <Key className="w-4 h-4 mr-2" />
              API Management
            </Button>
          </Link>
          <Link href="/admin/unity">
            <Button variant="outline" className="w-full justify-start" data-testid="button-manage-unity">
              <Activity className="w-4 h-4 mr-2" />
              Unity Builds
            </Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
