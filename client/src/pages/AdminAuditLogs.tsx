import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, User, Activity, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";

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

export default function AdminAuditLogs() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterAction, setFilterAction] = useState<string>("all");

  // Fetch all audit logs
  const { data: auditLogs = [], isLoading } = useQuery<AuditLog[]>({
    queryKey: ['/api/admin/audit/logs'],
  });

  // Get unique actions for filter
  const uniqueActions = Array.from(new Set(auditLogs.map(log => log.action)));

  // Filter logs
  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userId.toString().includes(searchTerm);
    const matchesAction = filterAction === "all" || log.action === filterAction;
    return matchesSearch && matchesAction;
  });

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('create') || action.includes('add')) return "default";
    if (action.includes('update') || action.includes('edit')) return "secondary";
    if (action.includes('delete') || action.includes('remove')) return "destructive";
    if (action.includes('activate')) return "outline";
    return "outline";
  };

  const formatValue = (value: any) => {
    if (!value) return 'N/A';
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return String(value);
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-3xl font-bold gradient-text">Audit Logs</h1>
        <p className="text-muted-foreground">Track all configuration changes and admin actions</p>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="w-5 h-5 text-muted-foreground" />
          <h2 className="font-semibold">Filters</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Search</Label>
            <Input
              placeholder="Search by action or user ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              data-testid="input-audit-search"
            />
          </div>
          <div className="space-y-2">
            <Label>Action Type</Label>
            <Select value={filterAction} onValueChange={setFilterAction}>
              <SelectTrigger data-testid="select-action-filter">
                <SelectValue placeholder="All Actions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Actions</SelectItem>
                {uniqueActions.map(action => (
                  <SelectItem key={action} value={action}>{action}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Logs</p>
              <p className="text-2xl font-bold" data-testid="stat-total-logs">{auditLogs.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Filter className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Filtered Results</p>
              <p className="text-2xl font-bold" data-testid="stat-filtered-logs">{filteredLogs.length}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-purple-500/10 flex items-center justify-center">
              <User className="w-5 h-5 text-purple-500" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Unique Actions</p>
              <p className="text-2xl font-bold" data-testid="stat-unique-actions">{uniqueActions.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Audit Log List */}
      <Card className="p-6">
        <div className="space-y-4">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="text-sm text-muted-foreground mt-2">Loading audit logs...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No audit logs found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <Card 
                  key={log.id} 
                  className="p-4 hover:shadow-md transition-shadow"
                  data-testid={`audit-log-${log.id}`}
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Activity className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold">{log.action}</p>
                            <Badge variant={getActionBadgeVariant(log.action)}>
                              {log.action.split('_')[0]}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />
                              User ID: {log.userId}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {new Date(log.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Details */}
                    {log.ipAddress && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">IP Address: </span>
                        <span className="font-mono">{log.ipAddress}</span>
                      </div>
                    )}

                    {/* Value Changes */}
                    {(log.previousValue || log.newValue) && (
                      <div className="grid grid-cols-2 gap-4 pt-3 border-t">
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">Previous Value</p>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                            {formatValue(log.previousValue)}
                          </pre>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-muted-foreground mb-1">New Value</p>
                          <pre className="text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                            {formatValue(log.newValue)}
                          </pre>
                        </div>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}
