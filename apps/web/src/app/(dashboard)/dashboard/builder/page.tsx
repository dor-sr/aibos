'use client';

import * as React from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Save,
  Eye,
  Settings,
  Share2,
  Download,
  ArrowLeft,
  Plus,
  LayoutGrid,
  Smartphone,
  Monitor,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { WidgetLibrary, WidgetRenderer, WidgetConfigPanel, WIDGET_TYPES } from '@/components/dashboard/builder';
import type { WidgetType, WidgetData } from '@/components/dashboard/builder';

interface DashboardState {
  id?: string;
  name: string;
  description: string;
  widgets: WidgetData[];
  layout: {
    columns: number;
    rowHeight: number;
    margin: [number, number];
    containerPadding: [number, number];
  };
}

export default function DashboardBuilderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const dashboardId = searchParams.get('id');
  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('currentWorkspaceId') : null;

  const [dashboard, setDashboard] = React.useState<DashboardState>({
    name: 'New Dashboard',
    description: '',
    widgets: [],
    layout: {
      columns: 12,
      rowHeight: 60,
      margin: [16, 16],
      containerPadding: [16, 16],
    },
  });

  const [selectedWidget, setSelectedWidget] = React.useState<WidgetData | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(false);
  const [showShareDialog, setShowShareDialog] = React.useState(false);
  const [viewMode, setViewMode] = React.useState<'desktop' | 'tablet' | 'mobile'>('desktop');

  // Load existing dashboard if editing
  React.useEffect(() => {
    if (dashboardId && workspaceId) {
      loadDashboard(dashboardId);
    }
  }, [dashboardId, workspaceId]);

  const loadDashboard = async (id: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/dashboards/${id}?workspaceId=${workspaceId}`);
      if (!response.ok) throw new Error('Failed to load dashboard');
      const data = await response.json();
      
      setDashboard({
        id: data.dashboard.id,
        name: data.dashboard.name,
        description: data.dashboard.description || '',
        widgets: data.dashboard.widgets || [],
        layout: data.dashboard.layout || dashboard.layout,
      });
    } catch (error) {
      console.error('Error loading dashboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to load dashboard',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddWidget = (widgetType: WidgetType) => {
    const newWidget: WidgetData = {
      id: crypto.randomUUID(),
      widgetType: widgetType.type,
      title: widgetType.name,
      gridX: 0,
      gridY: calculateNextY(),
      gridW: widgetType.defaultSize.w,
      gridH: widgetType.defaultSize.h,
      config: {},
    };

    setDashboard((prev) => ({
      ...prev,
      widgets: [...prev.widgets, newWidget],
    }));

    setSelectedWidget(newWidget);
  };

  const calculateNextY = () => {
    if (dashboard.widgets.length === 0) return 0;
    const maxY = Math.max(...dashboard.widgets.map((w) => w.gridY + w.gridH));
    return maxY;
  };

  const handleUpdateWidget = (widgetId: string, updates: Partial<WidgetData>) => {
    setDashboard((prev) => ({
      ...prev,
      widgets: prev.widgets.map((w) => (w.id === widgetId ? { ...w, ...updates } : w)),
    }));

    if (selectedWidget?.id === widgetId) {
      setSelectedWidget((prev) => (prev ? { ...prev, ...updates } : null));
    }
  };

  const handleDeleteWidget = (widgetId: string) => {
    setDashboard((prev) => ({
      ...prev,
      widgets: prev.widgets.filter((w) => w.id !== widgetId),
    }));

    if (selectedWidget?.id === widgetId) {
      setSelectedWidget(null);
    }
  };

  const handleSave = async (publish = false) => {
    if (!workspaceId) {
      toast({
        title: 'Error',
        description: 'No workspace selected',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        workspaceId,
        name: dashboard.name,
        description: dashboard.description,
        layout: dashboard.layout,
        widgets: dashboard.widgets,
        status: publish ? 'published' : 'draft',
      };

      let response;
      if (dashboard.id) {
        // Update existing
        response = await fetch(`/api/dashboards/${dashboard.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        // Create new
        response = await fetch('/api/dashboards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) throw new Error('Failed to save dashboard');
      const data = await response.json();

      setDashboard((prev) => ({ ...prev, id: data.dashboard.id }));

      toast({
        title: 'Success',
        description: publish ? 'Dashboard published' : 'Dashboard saved',
      });

      // Update URL if new dashboard
      if (!dashboard.id) {
        router.replace(`/dashboard/builder?id=${data.dashboard.id}`);
      }
    } catch (error) {
      console.error('Error saving dashboard:', error);
      toast({
        title: 'Error',
        description: 'Failed to save dashboard',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = async (format: 'pdf' | 'csv' | 'json') => {
    if (!dashboard.id || !workspaceId) {
      toast({
        title: 'Error',
        description: 'Save the dashboard first',
        variant: 'destructive',
      });
      return;
    }

    try {
      const response = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          exportType: 'dashboard',
          resourceId: dashboard.id,
          format,
          config: {},
        }),
      });

      if (!response.ok) throw new Error('Failed to create export');
      const data = await response.json();

      // Download the file
      window.open(`/api/exports/download/${data.job.id}`, '_blank');

      toast({
        title: 'Export Started',
        description: 'Your export is being prepared',
      });
    } catch (error) {
      console.error('Error exporting:', error);
      toast({
        title: 'Error',
        description: 'Failed to export dashboard',
        variant: 'destructive',
      });
    }
  };

  const getContainerWidth = () => {
    switch (viewMode) {
      case 'mobile':
        return 'max-w-sm';
      case 'tablet':
        return 'max-w-2xl';
      default:
        return 'w-full';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <Input
              value={dashboard.name}
              onChange={(e) => setDashboard((prev) => ({ ...prev, name: e.target.value }))}
              className="font-semibold text-lg border-0 bg-transparent focus-visible:ring-0 px-0 h-auto"
              placeholder="Dashboard name..."
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* View mode selector */}
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === 'desktop' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('desktop')}
            >
              <Monitor className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'tablet' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('tablet')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'mobile' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('mobile')}
            >
              <Smartphone className="h-4 w-4" />
            </Button>
          </div>

          <Button variant="outline" size="sm" onClick={() => setShowSettings(true)}>
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('csv')}>
                Export as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>
                Export as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="sm" onClick={() => setShowShareDialog(true)}>
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>

          <Button variant="outline" size="sm" onClick={() => handleSave(false)} disabled={isSaving}>
            <Save className="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </Button>

          <Button size="sm" onClick={() => handleSave(true)} disabled={isSaving}>
            <Eye className="h-4 w-4 mr-2" />
            Publish
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Widget Library (left sidebar) */}
        <div className="w-64 border-r bg-background overflow-y-auto">
          <WidgetLibrary onAddWidget={handleAddWidget} />
        </div>

        {/* Canvas (center) */}
        <div
          className="flex-1 overflow-auto p-6 bg-slate-100"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const widgetData = e.dataTransfer.getData('widget-type');
            if (widgetData) {
              const widget = JSON.parse(widgetData) as WidgetType;
              handleAddWidget(widget);
            }
          }}
        >
          <div className={`mx-auto ${getContainerWidth()}`}>
            {dashboard.widgets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed rounded-lg bg-background">
                <Plus className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">Start Building</p>
                <p className="text-muted-foreground text-sm mt-1">
                  Drag widgets from the library or click to add
                </p>
                <Button className="mt-4" onClick={() => { const widget = WIDGET_TYPES[0]; if (widget) handleAddWidget(widget); }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Widget
                </Button>
              </div>
            ) : (
              <div
                className="grid gap-4"
                style={{
                  gridTemplateColumns: `repeat(${dashboard.layout.columns}, minmax(0, 1fr))`,
                }}
              >
                {dashboard.widgets.map((widget) => (
                  <div
                    key={widget.id}
                    style={{
                      gridColumn: `span ${Math.min(widget.gridW, dashboard.layout.columns)}`,
                      minHeight: widget.gridH * dashboard.layout.rowHeight,
                    }}
                    onClick={() => setSelectedWidget(widget)}
                    className={`cursor-pointer ${
                      selectedWidget?.id === widget.id ? 'ring-2 ring-primary rounded-lg' : ''
                    }`}
                  >
                    <WidgetRenderer
                      widget={widget}
                      isEditing={true}
                      onConfigure={() => setSelectedWidget(widget)}
                      onDelete={() => handleDeleteWidget(widget.id)}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Configuration Panel (right sidebar) */}
        {selectedWidget && (
          <div className="w-72 border-l bg-background overflow-y-auto">
            <WidgetConfigPanel
              widget={selectedWidget}
              onUpdate={(updates) => handleUpdateWidget(selectedWidget.id, updates)}
              onClose={() => setSelectedWidget(null)}
            />
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dashboard Settings</DialogTitle>
            <DialogDescription>Configure dashboard properties and layout</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dashboard-name">Name</Label>
              <Input
                id="dashboard-name"
                value={dashboard.name}
                onChange={(e) => setDashboard((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dashboard-description">Description</Label>
              <Input
                id="dashboard-description"
                value={dashboard.description}
                onChange={(e) => setDashboard((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grid-columns">Grid Columns</Label>
              <Input
                id="grid-columns"
                type="number"
                min={4}
                max={24}
                value={dashboard.layout.columns}
                onChange={(e) =>
                  setDashboard((prev) => ({
                    ...prev,
                    layout: { ...prev.layout, columns: parseInt(e.target.value) || 12 },
                  }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="row-height">Row Height (px)</Label>
              <Input
                id="row-height"
                type="number"
                min={20}
                max={200}
                value={dashboard.layout.rowHeight}
                onChange={(e) =>
                  setDashboard((prev) => ({
                    ...prev,
                    layout: { ...prev.layout, rowHeight: parseInt(e.target.value) || 60 },
                  }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSettings(false)}>
              Cancel
            </Button>
            <Button onClick={() => setShowSettings(false)}>Save Settings</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Dashboard</DialogTitle>
            <DialogDescription>Create a shareable link for this dashboard</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Share options will be available after saving the dashboard.
            </p>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Public Link</p>
                  <p className="text-sm text-muted-foreground">Anyone with the link can view</p>
                </div>
                <Button variant="outline" size="sm" disabled={!dashboard.id}>
                  Create Link
                </Button>
              </div>
              <div className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <p className="font-medium">Team Access</p>
                  <p className="text-sm text-muted-foreground">Share with workspace members</p>
                </div>
                <Button variant="outline" size="sm" disabled={!dashboard.id}>
                  Manage
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowShareDialog(false)}>Done</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
