'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  Plus,
  LayoutGrid,
  MoreHorizontal,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Share2,
  Star,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface Dashboard {
  id: string;
  name: string;
  description?: string;
  slug: string;
  status: 'draft' | 'published' | 'archived';
  isDefault: boolean;
  isShared: boolean;
  isOwn: boolean;
  viewCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function DashboardsListPage() {
  const { toast } = useToast();
  const [dashboards, setDashboards] = React.useState<Dashboard[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('all');

  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('currentWorkspaceId') : null;

  React.useEffect(() => {
    if (workspaceId) {
      fetchDashboards();
    }
  }, [workspaceId]);

  const fetchDashboards = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/dashboards?workspaceId=${workspaceId}`);
      if (!response.ok) throw new Error('Failed to fetch dashboards');
      const data = await response.json();
      setDashboards(data.dashboards || []);
    } catch (error) {
      console.error('Error fetching dashboards:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboards',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this dashboard?')) return;

    try {
      const response = await fetch(`/api/dashboards/${id}?workspaceId=${workspaceId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      setDashboards((prev) => prev.filter((d) => d.id !== id));
      toast({ title: 'Success', description: 'Dashboard deleted' });
    } catch (error) {
      console.error('Error deleting dashboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete dashboard',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (dashboard: Dashboard) => {
    try {
      const response = await fetch('/api/dashboards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          name: `${dashboard.name} (Copy)`,
          description: dashboard.description,
          status: 'draft',
        }),
      });

      if (!response.ok) throw new Error('Failed to duplicate');
      const data = await response.json();

      setDashboards((prev) => [data.dashboard, ...prev]);
      toast({ title: 'Success', description: 'Dashboard duplicated' });
    } catch (error) {
      console.error('Error duplicating dashboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to duplicate dashboard',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      const response = await fetch(`/api/dashboards/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ workspaceId, isDefault: true }),
      });

      if (!response.ok) throw new Error('Failed to update');

      setDashboards((prev) =>
        prev.map((d) => ({ ...d, isDefault: d.id === id }))
      );
      toast({ title: 'Success', description: 'Default dashboard updated' });
    } catch (error) {
      console.error('Error updating dashboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to update dashboard',
        variant: 'destructive',
      });
    }
  };

  const filteredDashboards = dashboards.filter((d) => {
    switch (activeTab) {
      case 'published':
        return d.status === 'published';
      case 'drafts':
        return d.status === 'draft';
      case 'shared':
        return d.isShared || !d.isOwn;
      default:
        return true;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Custom Dashboards</h1>
            <p className="text-muted-foreground">Create and manage your dashboards</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-48 rounded-lg border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Custom Dashboards</h1>
          <p className="text-muted-foreground">Create and manage your dashboards</p>
        </div>
        <Link href="/dashboard/builder">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            New Dashboard
          </Button>
        </Link>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All ({dashboards.length})</TabsTrigger>
          <TabsTrigger value="published">
            Published ({dashboards.filter((d) => d.status === 'published').length})
          </TabsTrigger>
          <TabsTrigger value="drafts">
            Drafts ({dashboards.filter((d) => d.status === 'draft').length})
          </TabsTrigger>
          <TabsTrigger value="shared">
            Shared ({dashboards.filter((d) => d.isShared || !d.isOwn).length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          {filteredDashboards.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <LayoutGrid className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No dashboards yet</p>
                <p className="text-muted-foreground text-sm mt-1 mb-4">
                  Create your first custom dashboard
                </p>
                <Link href="/dashboard/builder">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredDashboards.map((dashboard) => (
                <Card key={dashboard.id} className="group relative">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-base">{dashboard.name}</CardTitle>
                          {dashboard.isDefault && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        {dashboard.description && (
                          <CardDescription className="mt-1 line-clamp-2">
                            {dashboard.description}
                          </CardDescription>
                        )}
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/dashboard/builder?id=${dashboard.id}`}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleDuplicate(dashboard)}>
                            <Copy className="h-4 w-4 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleSetDefault(dashboard.id)}>
                            <Star className="h-4 w-4 mr-2" />
                            Set as Default
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(dashboard.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant={dashboard.status === 'published' ? 'default' : 'secondary'}>
                        {dashboard.status}
                      </Badge>
                      {dashboard.isShared && (
                        <Badge variant="outline">
                          <Share2 className="h-3 w-3 mr-1" />
                          Shared
                        </Badge>
                      )}
                      {!dashboard.isOwn && (
                        <Badge variant="outline">Team</Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>
                        <Eye className="h-3 w-3 inline mr-1" />
                        {dashboard.viewCount} views
                      </span>
                      <span>
                        {new Date(dashboard.updatedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </CardContent>
                  <Link
                    href={`/dashboard/builder?id=${dashboard.id}`}
                    className="absolute inset-0 z-0"
                  />
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
