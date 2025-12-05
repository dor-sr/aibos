'use client';

import * as React from 'react';
import {
  Plus,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  Share2,
  Calendar,
  Star,
  Search,
  Users,
  Package,
  Megaphone,
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
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';

interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  presetType: 'date_range' | 'segment' | 'channel' | 'product' | 'customer' | 'custom';
  filters: Array<{
    id: string;
    field: string;
    operator: string;
    value: unknown;
    label?: string;
  }>;
  applicableTo: string[];
  isDefault: boolean;
  isShared: boolean;
  isOwn: boolean;
  usageCount: number;
  createdAt: string;
}

interface DateRangePreset {
  id: string;
  name: string;
  type: string;
  value: {
    preset?: string;
    startDate?: string;
    endDate?: string;
    relative?: {
      value: number;
      unit: string;
    };
  };
  isSystem: boolean;
  sortOrder: number;
}

const PRESET_TYPES = [
  { value: 'date_range', label: 'Date Range', icon: Calendar },
  { value: 'segment', label: 'Customer Segment', icon: Users },
  { value: 'channel', label: 'Channel', icon: Megaphone },
  { value: 'product', label: 'Product', icon: Package },
  { value: 'custom', label: 'Custom', icon: Filter },
];

const OPERATORS = [
  { value: 'eq', label: 'equals' },
  { value: 'neq', label: 'does not equal' },
  { value: 'gt', label: 'greater than' },
  { value: 'gte', label: 'greater than or equal' },
  { value: 'lt', label: 'less than' },
  { value: 'lte', label: 'less than or equal' },
  { value: 'contains', label: 'contains' },
  { value: 'in', label: 'is one of' },
];

const APPLICABLE_AREAS = [
  { value: 'dashboard', label: 'Dashboard' },
  { value: 'analytics', label: 'Analytics' },
  { value: 'marketing', label: 'Marketing' },
  { value: 'operations', label: 'Operations' },
  { value: 'reports', label: 'Reports' },
];

export default function SavedViewsPage() {
  const { toast } = useToast();
  const [filterPresets, setFilterPresets] = React.useState<FilterPreset[]>([]);
  const [dateRanges, setDateRanges] = React.useState<DateRangePreset[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [activeTab, setActiveTab] = React.useState('filters');
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [editingPreset, setEditingPreset] = React.useState<FilterPreset | null>(null);

  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('currentWorkspaceId') : null;

  // Form state
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    presetType: 'custom' as FilterPreset['presetType'],
    filters: [] as FilterPreset['filters'],
    applicableTo: ['dashboard', 'analytics'],
    isDefault: false,
    isShared: false,
  });

  // Date range form state
  const [dateFormData, setDateFormData] = React.useState({
    name: '',
    type: 'relative',
    relativeValue: 7,
    relativeUnit: 'days',
    startDate: '',
    endDate: '',
  });

  React.useEffect(() => {
    if (workspaceId) {
      fetchData();
    }
  }, [workspaceId]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [filtersRes, dateRangesRes] = await Promise.all([
        fetch(`/api/views/filters?workspaceId=${workspaceId}`),
        fetch(`/api/views/filters?workspaceId=${workspaceId}&type=dateRange`),
      ]);

      if (filtersRes.ok) {
        const data = await filtersRes.json();
        setFilterPresets(data.presets || []);
      }

      if (dateRangesRes.ok) {
        const data = await dateRangesRes.json();
        setDateRanges(data.dateRanges || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load saved views',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      presetType: 'custom',
      filters: [],
      applicableTo: ['dashboard', 'analytics'],
      isDefault: false,
      isShared: false,
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingPreset(null);
    setShowCreateDialog(true);
  };

  const openEditDialog = (preset: FilterPreset) => {
    setFormData({
      name: preset.name,
      description: preset.description || '',
      presetType: preset.presetType,
      filters: preset.filters,
      applicableTo: preset.applicableTo,
      isDefault: preset.isDefault,
      isShared: preset.isShared,
    });
    setEditingPreset(preset);
    setShowCreateDialog(true);
  };

  const handleSavePreset = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }

    const payload = {
      workspaceId,
      name: formData.name,
      description: formData.description,
      presetType: formData.presetType,
      filters: formData.filters,
      applicableTo: formData.applicableTo,
      isDefault: formData.isDefault,
      isShared: formData.isShared,
    };

    try {
      let response;
      if (editingPreset) {
        response = await fetch('/api/views/filters', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, presetId: editingPreset.id }),
        });
      } else {
        response = await fetch('/api/views/filters', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) throw new Error('Failed to save');

      await fetchData();
      setShowCreateDialog(false);
      toast({ title: 'Success', description: editingPreset ? 'Preset updated' : 'Preset created' });
    } catch (error) {
      console.error('Error saving preset:', error);
      toast({
        title: 'Error',
        description: 'Failed to save preset',
        variant: 'destructive',
      });
    }
  };

  const handleSaveDateRange = async () => {
    if (!dateFormData.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }

    const value =
      dateFormData.type === 'relative'
        ? {
            relative: {
              value: dateFormData.relativeValue,
              unit: dateFormData.relativeUnit,
            },
          }
        : {
            startDate: dateFormData.startDate,
            endDate: dateFormData.endDate,
          };

    try {
      const response = await fetch('/api/views/filters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          name: dateFormData.name,
          type: dateFormData.type,
          value,
        }),
      });

      if (!response.ok) throw new Error('Failed to save');

      await fetchData();
      toast({ title: 'Success', description: 'Date range preset created' });
    } catch (error) {
      console.error('Error saving date range:', error);
      toast({
        title: 'Error',
        description: 'Failed to save date range',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string, type: 'filter' | 'dateRange') => {
    if (!confirm('Are you sure you want to delete this preset?')) return;

    try {
      const response = await fetch(
        `/api/views/filters?workspaceId=${workspaceId}&presetId=${id}&type=${type}`,
        { method: 'DELETE' }
      );

      if (!response.ok) throw new Error('Failed to delete');

      if (type === 'filter') {
        setFilterPresets((prev) => prev.filter((p) => p.id !== id));
      } else {
        setDateRanges((prev) => prev.filter((d) => d.id !== id));
      }

      toast({ title: 'Success', description: 'Preset deleted' });
    } catch (error) {
      console.error('Error deleting preset:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete preset',
        variant: 'destructive',
      });
    }
  };

  const addFilter = () => {
    setFormData((prev) => ({
      ...prev,
      filters: [
        ...prev.filters,
        { id: crypto.randomUUID(), field: '', operator: 'eq', value: '', label: '' },
      ],
    }));
  };

  const updateFilter = (index: number, updates: Partial<FilterPreset['filters'][0]>) => {
    setFormData((prev) => ({
      ...prev,
      filters: prev.filters.map((f, i) => (i === index ? { ...f, ...updates } : f)),
    }));
  };

  const removeFilter = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      filters: prev.filters.filter((_, i) => i !== index),
    }));
  };

  const getPresetIcon = (type: string) => {
    const preset = PRESET_TYPES.find((p) => p.value === type);
    const Icon = preset?.icon || Filter;
    return <Icon className="h-4 w-4" />;
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Saved Views and Filters</h1>
            <p className="text-muted-foreground">Manage your filter presets and date ranges</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-40 rounded-lg border bg-card animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Saved Views and Filters</h1>
          <p className="text-muted-foreground">Manage your filter presets and date ranges</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Preset
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="filters">
            <Filter className="h-4 w-4 mr-2" />
            Filter Presets ({filterPresets.length})
          </TabsTrigger>
          <TabsTrigger value="dateRanges">
            <Calendar className="h-4 w-4 mr-2" />
            Date Ranges ({dateRanges.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="filters" className="mt-4">
          {filterPresets.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center h-64">
                <Filter className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-lg font-medium">No filter presets yet</p>
                <p className="text-muted-foreground text-sm mt-1 mb-4">
                  Create reusable filter combinations
                </p>
                <Button onClick={openCreateDialog}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Preset
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filterPresets.map((preset) => (
                <Card key={preset.id} className="group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {getPresetIcon(preset.presetType)}
                          <CardTitle className="text-base">{preset.name}</CardTitle>
                          {preset.isDefault && (
                            <Star className="h-4 w-4 text-yellow-500 fill-yellow-500" />
                          )}
                        </div>
                        {preset.description && (
                          <CardDescription className="mt-2 line-clamp-2">
                            {preset.description}
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
                          <DropdownMenuItem onClick={() => openEditDialog(preset)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(preset.id, 'filter')}
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
                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <Badge variant="outline">
                        {preset.filters.length} filter{preset.filters.length !== 1 ? 's' : ''}
                      </Badge>
                      {preset.isShared && (
                        <Badge variant="outline">
                          <Share2 className="h-3 w-3 mr-1" />
                          Shared
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Used {preset.usageCount} times
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="dateRanges" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {dateRanges.map((range) => (
              <Card key={range.id} className={range.isSystem ? 'opacity-75' : ''}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{range.name}</span>
                    </div>
                    {!range.isSystem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleDelete(range.id, 'dateRange')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <Badge variant={range.isSystem ? 'secondary' : 'outline'}>
                    {range.isSystem ? 'System' : 'Custom'}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Filter Preset Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingPreset ? 'Edit Preset' : 'Create Filter Preset'}</DialogTitle>
            <DialogDescription>
              Create a reusable filter combination for your dashboards
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="High-value customers"
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select
                  value={formData.presetType}
                  onValueChange={(v) => setFormData((prev) => ({ ...prev, presetType: v as FilterPreset['presetType'] }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRESET_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                placeholder="Customers with lifetime value above $1000"
              />
            </div>

            {/* Filters */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Filters</Label>
                <Button variant="outline" size="sm" onClick={addFilter}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Filter
                </Button>
              </div>

              {formData.filters.length === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground border rounded-md">
                  No filters added. Click "Add Filter" to start.
                </div>
              ) : (
                <div className="space-y-2">
                  {formData.filters.map((filter, index) => (
                    <div key={filter.id} className="flex items-center gap-2">
                      <Input
                        value={filter.field}
                        onChange={(e) => updateFilter(index, { field: e.target.value })}
                        placeholder="Field name"
                        className="flex-1"
                      />
                      <Select
                        value={filter.operator}
                        onValueChange={(v) => updateFilter(index, { operator: v })}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {OPERATORS.map((op) => (
                            <SelectItem key={op.value} value={op.value}>
                              {op.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Input
                        value={filter.value as string}
                        onChange={(e) => updateFilter(index, { value: e.target.value })}
                        placeholder="Value"
                        className="flex-1"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFilter(index)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Applicable areas */}
            <div className="space-y-2">
              <Label>Apply to</Label>
              <div className="flex flex-wrap gap-2">
                {APPLICABLE_AREAS.map((area) => (
                  <Badge
                    key={area.value}
                    variant={formData.applicableTo.includes(area.value) ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => {
                      setFormData((prev) => ({
                        ...prev,
                        applicableTo: prev.applicableTo.includes(area.value)
                          ? prev.applicableTo.filter((a) => a !== area.value)
                          : [...prev.applicableTo, area.value],
                      }));
                    }}
                  >
                    {area.label}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <Switch
                    id="isDefault"
                    checked={formData.isDefault}
                    onCheckedChange={(v) => setFormData((prev) => ({ ...prev, isDefault: v }))}
                  />
                  <Label htmlFor="isDefault">Set as default</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    id="isShared"
                    checked={formData.isShared}
                    onCheckedChange={(v) => setFormData((prev) => ({ ...prev, isShared: v }))}
                  />
                  <Label htmlFor="isShared">Share with team</Label>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset}>
              {editingPreset ? 'Save Changes' : 'Create Preset'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


