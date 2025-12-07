'use client';

import * as React from 'react';
import {
  Plus,
  Download,
  MoreHorizontal,
  Pencil,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Calendar,
  FileText,
  FileSpreadsheet,
  File,
  RefreshCw,
  Play,
  Pause,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';

interface ExportJob {
  id: string;
  exportType: string;
  resourceId?: string;
  format: 'pdf' | 'csv' | 'xlsx' | 'json';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  fileName?: string;
  fileUrl?: string;
  fileSize?: number;
  error?: string;
  createdAt: string;
  completedAt?: string;
  expiresAt?: string;
}

interface ScheduledExport {
  id: string;
  name: string;
  exportType: string;
  resourceId?: string;
  format: 'pdf' | 'csv' | 'xlsx' | 'json';
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number;
  dayOfMonth?: number;
  hour: number;
  timezone: string;
  recipients: string[];
  isActive: boolean;
  lastRunAt?: string;
  nextRunAt?: string;
  lastStatus?: string;
  runCount: number;
  createdAt: string;
}

const FORMAT_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="h-4 w-4" />,
  csv: <FileSpreadsheet className="h-4 w-4" />,
  xlsx: <FileSpreadsheet className="h-4 w-4" />,
  json: <File className="h-4 w-4" />,
};

const STATUS_ICONS: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-yellow-500" />,
  processing: <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />,
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
};

const EXPORT_TYPES = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'report', label: 'Report' },
  { value: 'data_table', label: 'Data Table' },
  { value: 'metric', label: 'Metrics' },
];

const FORMATS = [
  { value: 'pdf', label: 'PDF' },
  { value: 'csv', label: 'CSV' },
  { value: 'xlsx', label: 'Excel (XLSX)' },
  { value: 'json', label: 'JSON' },
];

const FREQUENCIES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
];

const DAYS_OF_WEEK = [
  { value: '0', label: 'Sunday' },
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

export default function ExportsPage() {
  const { toast } = useToast();
  const [exportJobs, setExportJobs] = React.useState<ExportJob[]>([]);
  const [scheduledExports, setScheduledExports] = React.useState<ScheduledExport[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('history');
  const [showScheduleDialog, setShowScheduleDialog] = React.useState(false);
  const [editingSchedule, setEditingSchedule] = React.useState<ScheduledExport | null>(null);

  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('currentWorkspaceId') : null;

  // Schedule form state
  const [scheduleForm, setScheduleForm] = React.useState({
    name: '',
    exportType: 'data_table',
    format: 'csv' as 'pdf' | 'csv' | 'xlsx' | 'json',
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly' | 'quarterly',
    dayOfWeek: 1,
    dayOfMonth: 1,
    hour: 9,
    timezone: 'UTC',
    recipients: '',
    subject: '',
    message: '',
  });

  React.useEffect(() => {
    if (workspaceId) {
      fetchData();
    }
  }, [workspaceId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [jobsRes, scheduledRes] = await Promise.all([
        fetch(`/api/exports?workspaceId=${workspaceId}`),
        fetch(`/api/exports?workspaceId=${workspaceId}&type=scheduled`),
      ]);

      if (jobsRes.ok) {
        const data = await jobsRes.json();
        setExportJobs(data.jobs || []);
      }

      if (scheduledRes.ok) {
        const data = await scheduledRes.json();
        setScheduledExports(data.scheduled || []);
      }
    } catch (error) {
      console.error('Error fetching exports:', error);
      toast({
        title: 'Error',
        description: 'Failed to load exports',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportNow = async (exportType: string, format: string) => {
    try {
      const response = await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          exportType,
          format,
          config: {},
        }),
      });

      if (!response.ok) throw new Error('Failed to create export');
      const data = await response.json();

      setExportJobs((prev) => [data.job, ...prev]);
      toast({ title: 'Success', description: 'Export started' });

      // If completed, offer download
      if (data.job.status === 'completed') {
        window.open(`/api/exports/download/${data.job.id}`, '_blank');
      }
    } catch (error) {
      console.error('Error creating export:', error);
      toast({
        title: 'Error',
        description: 'Failed to create export',
        variant: 'destructive',
      });
    }
  };

  const handleDownload = (jobId: string) => {
    window.open(`/api/exports/download/${jobId}`, '_blank');
  };

  const resetScheduleForm = () => {
    setScheduleForm({
      name: '',
      exportType: 'data_table',
      format: 'csv',
      frequency: 'weekly',
      dayOfWeek: 1,
      dayOfMonth: 1,
      hour: 9,
      timezone: 'UTC',
      recipients: '',
      subject: '',
      message: '',
    });
  };

  const openScheduleDialog = () => {
    resetScheduleForm();
    setEditingSchedule(null);
    setShowScheduleDialog(true);
  };

  const openEditScheduleDialog = (schedule: ScheduledExport) => {
    setScheduleForm({
      name: schedule.name,
      exportType: schedule.exportType,
      format: schedule.format,
      frequency: schedule.frequency,
      dayOfWeek: schedule.dayOfWeek ?? 1,
      dayOfMonth: schedule.dayOfMonth ?? 1,
      hour: schedule.hour,
      timezone: schedule.timezone,
      recipients: schedule.recipients.join(', '),
      subject: '',
      message: '',
    });
    setEditingSchedule(schedule);
    setShowScheduleDialog(true);
  };

  const handleSaveSchedule = async () => {
    if (!scheduleForm.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }

    const recipients = scheduleForm.recipients.split(',').map((r) => r.trim()).filter(Boolean);
    if (recipients.length === 0) {
      toast({ title: 'Error', description: 'At least one recipient is required', variant: 'destructive' });
      return;
    }

    const payload = {
      workspaceId,
      type: 'scheduled',
      name: scheduleForm.name,
      exportType: scheduleForm.exportType,
      format: scheduleForm.format,
      frequency: scheduleForm.frequency,
      dayOfWeek: scheduleForm.frequency === 'weekly' ? scheduleForm.dayOfWeek : undefined,
      dayOfMonth: ['monthly', 'quarterly'].includes(scheduleForm.frequency) ? scheduleForm.dayOfMonth : undefined,
      hour: scheduleForm.hour,
      timezone: scheduleForm.timezone,
      recipients,
      subject: scheduleForm.subject || undefined,
      message: scheduleForm.message || undefined,
    };

    try {
      let response;
      if (editingSchedule) {
        response = await fetch('/api/exports', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, scheduleId: editingSchedule.id }),
        });
      } else {
        response = await fetch('/api/exports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) throw new Error('Failed to save');

      await fetchData();
      setShowScheduleDialog(false);
      toast({ title: 'Success', description: editingSchedule ? 'Schedule updated' : 'Schedule created' });
    } catch (error) {
      console.error('Error saving schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to save schedule',
        variant: 'destructive',
      });
    }
  };

  const handleToggleSchedule = async (schedule: ScheduledExport) => {
    try {
      const response = await fetch('/api/exports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          scheduleId: schedule.id,
          isActive: !schedule.isActive,
        }),
      });

      if (!response.ok) throw new Error('Failed to update');

      setScheduledExports((prev) =>
        prev.map((s) => (s.id === schedule.id ? { ...s, isActive: !s.isActive } : s))
      );

      toast({
        title: 'Success',
        description: schedule.isActive ? 'Schedule paused' : 'Schedule activated',
      });
    } catch (error) {
      console.error('Error toggling schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to update schedule',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm('Are you sure you want to delete this scheduled export?')) return;

    try {
      const response = await fetch(`/api/exports?workspaceId=${workspaceId}&scheduleId=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      setScheduledExports((prev) => prev.filter((s) => s.id !== id));
      toast({ title: 'Success', description: 'Schedule deleted' });
    } catch (error) {
      console.error('Error deleting schedule:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete schedule',
        variant: 'destructive',
      });
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Exports</h1>
            <p className="text-muted-foreground">Download and schedule exports</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-32 rounded-lg border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Exports</h1>
          <p className="text-muted-foreground">Download data and schedule automated exports</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export Now
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExportNow('data_table', 'csv')}>
                Export Data as CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportNow('data_table', 'xlsx')}>
                Export Data as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExportNow('data_table', 'json')}>
                Export Data as JSON
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={openScheduleDialog}>
            <Plus className="h-4 w-4 mr-2" />
            Schedule Export
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="history">
            <Download className="h-4 w-4 mr-2" />
            Export History ({exportJobs.length})
          </TabsTrigger>
          <TabsTrigger value="scheduled">
            <Calendar className="h-4 w-4 mr-2" />
            Scheduled ({scheduledExports.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="history" className="mt-4">
          {exportJobs.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Download className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No exports yet</p>
                <p className="text-muted-foreground text-sm mt-1 mb-4">
                  Create your first export using the button above
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {exportJobs.map((job) => (
                <Card key={job.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-4">
                      {FORMAT_ICONS[job.format]}
                      <div>
                        <p className="font-medium">
                          {job.fileName || `${job.exportType}-export.${job.format}`}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(job.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        {STATUS_ICONS[job.status]}
                        <span className="text-sm capitalize">{job.status}</span>
                      </div>
                      <span className="text-sm text-muted-foreground">
                        {formatFileSize(job.fileSize)}
                      </span>
                      {job.status === 'completed' && (
                        <Button size="sm" onClick={() => handleDownload(job.id)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                      {job.status === 'failed' && (
                        <Badge variant="destructive">{job.error || 'Failed'}</Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="scheduled" className="mt-4">
          {scheduledExports.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No scheduled exports</p>
                <p className="text-muted-foreground text-sm mt-1 mb-4">
                  Set up automated exports to receive data regularly
                </p>
                <Button onClick={openScheduleDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Export
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {scheduledExports.map((schedule) => (
                <Card key={schedule.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{schedule.name}</CardTitle>
                        <CardDescription>
                          {schedule.frequency} at {schedule.hour}:00 {schedule.timezone}
                        </CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditScheduleDialog(schedule)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleToggleSchedule(schedule)}>
                            {schedule.isActive ? (
                              <>
                                <Pause className="h-4 w-4 mr-2" />
                                Pause
                              </>
                            ) : (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteSchedule(schedule.id)}
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
                      <Badge variant={schedule.isActive ? 'default' : 'secondary'}>
                        {schedule.isActive ? 'Active' : 'Paused'}
                      </Badge>
                      <Badge variant="outline">{schedule.format.toUpperCase()}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>Recipients: {schedule.recipients.join(', ')}</p>
                      {schedule.nextRunAt && (
                        <p>Next run: {new Date(schedule.nextRunAt).toLocaleString()}</p>
                      )}
                      <p>Total runs: {schedule.runCount}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Schedule Dialog */}
      <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSchedule ? 'Edit Schedule' : 'Schedule Export'}</DialogTitle>
            <DialogDescription>
              Set up automated exports to receive data by email
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={scheduleForm.name}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder="Weekly Revenue Report"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Export Type</Label>
                <Select
                  value={scheduleForm.exportType}
                  onValueChange={(v) => setScheduleForm((prev) => ({ ...prev, exportType: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPORT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Format</Label>
                <Select
                  value={scheduleForm.format}
                  onValueChange={(v) => setScheduleForm((prev) => ({ ...prev, format: v as 'csv' | 'xlsx' | 'pdf' | 'json' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Frequency</Label>
                <Select
                  value={scheduleForm.frequency}
                  onValueChange={(v) => setScheduleForm((prev) => ({ ...prev, frequency: v as 'daily' | 'weekly' | 'monthly' | 'quarterly' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Time (Hour)</Label>
                <Select
                  value={String(scheduleForm.hour)}
                  onValueChange={(v) => setScheduleForm((prev) => ({ ...prev, hour: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {i.toString().padStart(2, '0')}:00
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {scheduleForm.frequency === 'weekly' && (
              <div className="space-y-2">
                <Label>Day of Week</Label>
                <Select
                  value={String(scheduleForm.dayOfWeek)}
                  onValueChange={(v) => setScheduleForm((prev) => ({ ...prev, dayOfWeek: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {['monthly', 'quarterly'].includes(scheduleForm.frequency) && (
              <div className="space-y-2">
                <Label>Day of Month</Label>
                <Select
                  value={String(scheduleForm.dayOfMonth)}
                  onValueChange={(v) => setScheduleForm((prev) => ({ ...prev, dayOfMonth: parseInt(v) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 28 }, (_, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>
                        {i + 1}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="recipients">Recipients (comma-separated) *</Label>
              <Input
                id="recipients"
                value={scheduleForm.recipients}
                onChange={(e) => setScheduleForm((prev) => ({ ...prev, recipients: e.target.value }))}
                placeholder="email@example.com, another@example.com"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSchedule}>
              {editingSchedule ? 'Save Changes' : 'Create Schedule'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}



