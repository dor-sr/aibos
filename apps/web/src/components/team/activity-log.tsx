'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  Loader2,
  User,
  UserPlus,
  UserMinus,
  Settings,
  Link,
  FileText,
  MessageSquare,
  AlertTriangle,
  Download,
  RefreshCw,
  ChevronDown,
} from 'lucide-react';

interface ActivityLog {
  id: string;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  resourceName: string | null;
  metadata: Record<string, unknown> | null;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    avatarUrl: string | null;
  } | null;
  createdAt: string;
}

interface ActivityLogProps {
  workspaceId: string;
}

type LucideIcon = typeof User;

const actionIcons: { [key: string]: LucideIcon } = {
  'user.login': User,
  'user.logout': User,
  'team.invite_sent': UserPlus,
  'team.invite_accepted': UserPlus,
  'team.invite_revoked': UserMinus,
  'team.member_removed': UserMinus,
  'team.role_changed': Settings,
  'connector.added': Link,
  'connector.removed': Link,
  'connector.synced': RefreshCw,
  'analytics.question_asked': MessageSquare,
  'analytics.report_generated': FileText,
  'resource.question_saved': FileText,
  'resource.view_saved': FileText,
};

const defaultIcon: LucideIcon = AlertTriangle;

const actionDescriptions: Record<string, (log: ActivityLog) => string> = {
  'user.login': () => 'Logged in',
  'user.logout': () => 'Logged out',
  'team.invite_sent': (log) => `Sent invite to ${log.resourceName}`,
  'team.invite_accepted': () => 'Accepted workspace invitation',
  'team.invite_revoked': (log) => `Revoked invite for ${log.resourceName}`,
  'team.member_removed': (log) => `Removed ${log.resourceName} from workspace`,
  'team.role_changed': (log) => {
    const meta = log.metadata as { previousRole?: string; newRole?: string } | null;
    if (meta?.newRole) {
      return `Changed ${log.resourceName}'s role to ${meta.newRole}`;
    }
    return `Updated ${log.resourceName}'s role`;
  },
  'team.role_created': (log) => `Created role "${log.resourceName}"`,
  'team.role_updated': (log) => `Updated role "${log.resourceName}"`,
  'team.role_deleted': (log) => `Deleted role "${log.resourceName}"`,
  'connector.added': (log) => `Added ${log.resourceName} connector`,
  'connector.removed': (log) => `Removed ${log.resourceName} connector`,
  'connector.synced': (log) => `Synced ${log.resourceName} data`,
  'analytics.question_asked': () => 'Asked a question',
  'analytics.report_generated': () => 'Generated a report',
  'resource.question_saved': (log) => `Saved question "${log.resourceName}"`,
  'resource.view_saved': (log) => `Saved view "${log.resourceName}"`,
  'resource.shared': (log) => `Shared ${log.resourceType} "${log.resourceName}"`,
  'resource.unshared': (log) => `Unshared ${log.resourceType} "${log.resourceName}"`,
};

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 7) {
    return date.toLocaleDateString();
  } else if (days > 0) {
    return `${days}d ago`;
  } else if (hours > 0) {
    return `${hours}h ago`;
  } else if (minutes > 0) {
    return `${minutes}m ago`;
  } else {
    return 'Just now';
  }
}

export function ActivityLogComponent({ workspaceId }: ActivityLogProps) {
  const { toast } = useToast();
  const [logs, setLogs] = React.useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoadingMore, setIsLoadingMore] = React.useState(false);
  const [filter, setFilter] = React.useState<string>('all');
  const [hasMore, setHasMore] = React.useState(false);
  const [offset, setOffset] = React.useState(0);
  const limit = 20;

  const fetchLogs = React.useCallback(async (loadMore = false) => {
    const currentOffset = loadMore ? offset : 0;
    
    try {
      if (loadMore) {
        setIsLoadingMore(true);
      } else {
        setIsLoading(true);
      }

      let url = `/api/team/activity?workspaceId=${workspaceId}&limit=${limit}&offset=${currentOffset}`;
      if (filter !== 'all') {
        url += `&action=${filter}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        if (loadMore) {
          setLogs((prev) => [...prev, ...data.logs]);
        } else {
          setLogs(data.logs);
        }
        setHasMore(data.pagination.hasMore);
        setOffset(currentOffset + data.logs.length);
      }
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      toast({
        title: 'Error',
        description: 'Failed to load activity logs.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [workspaceId, filter, offset, toast]);

  React.useEffect(() => {
    setOffset(0);
    fetchLogs(false);
  }, [filter, workspaceId]);

  const handleExport = async () => {
    try {
      const response = await fetch('/api/team/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, format: 'csv' }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `activity-log-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Failed to export');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to export activity logs.',
        variant: 'destructive',
      });
    }
  };

  const getActionIcon = (action: string): LucideIcon => {
    return actionIcons[action] || defaultIcon;
  };

  const getActionDescription = (log: ActivityLog): string => {
    const descFn = actionDescriptions[log.action];
    return descFn ? descFn(log) : log.action.replace(/\./g, ' ').replace(/_/g, ' ');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>Recent activity in your workspace</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activity</SelectItem>
                <SelectItem value="team.invite_sent">Invites</SelectItem>
                <SelectItem value="team.role_changed">Role Changes</SelectItem>
                <SelectItem value="connector.synced">Sync Activity</SelectItem>
                <SelectItem value="resource.question_saved">Saved Questions</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Export
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {logs.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activity recorded yet.
          </div>
        ) : (
          <div className="space-y-1">
            {logs.map((log, index) => {
              const Icon = getActionIcon(log.action);
              const isLast = index === logs.length - 1;

              return (
                <div
                  key={log.id}
                  className={`relative flex items-start gap-4 py-3 ${
                    !isLast ? 'border-b' : ''
                  }`}
                >
                  {/* Timeline line */}
                  {!isLast && (
                    <div className="absolute left-5 top-12 bottom-0 w-px bg-border" />
                  )}

                  {/* Icon */}
                  <div className="relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">
                        {log.user?.fullName || log.user?.email?.split('@')[0] || 'System'}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {getActionDescription(log)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-muted-foreground">
                        {formatRelativeTime(log.createdAt)}
                      </span>
                      {log.resourceType && (
                        <Badge variant="outline" className="text-xs">
                          {log.resourceType}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {hasMore && (
              <div className="flex justify-center pt-4">
                <Button
                  variant="outline"
                  onClick={() => fetchLogs(true)}
                  disabled={isLoadingMore}
                >
                  {isLoadingMore ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    <>
                      <ChevronDown className="mr-2 h-4 w-4" />
                      Load More
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
