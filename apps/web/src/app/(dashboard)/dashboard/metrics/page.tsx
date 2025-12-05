'use client';

import * as React from 'react';
import {
  Plus,
  Calculator,
  MoreHorizontal,
  Pencil,
  Trash2,
  Copy,
  Share2,
  Search,
  Code,
  Database,
  TrendingUp,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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

interface CustomMetric {
  id: string;
  name: string;
  slug: string;
  description?: string;
  category?: string;
  formula: {
    type: 'simple' | 'calculated' | 'sql';
    column?: string;
    table?: string;
    expression?: string;
    variables?: Record<string, string>;
    sql?: string;
  };
  aggregation: string;
  format: string;
  decimals: number;
  prefix?: string;
  suffix?: string;
  nlqKeywords?: string[];
  nlqExamples?: string[];
  isShared: boolean;
  isOwn: boolean;
  usageCount: number;
  lastValue?: number;
  createdAt: string;
}

const AVAILABLE_TABLES = [
  { value: 'ecommerce_orders', label: 'Orders (Ecommerce)' },
  { value: 'ecommerce_order_items', label: 'Order Items (Ecommerce)' },
  { value: 'ecommerce_customers', label: 'Customers (Ecommerce)' },
  { value: 'ecommerce_products', label: 'Products (Ecommerce)' },
  { value: 'saas_subscriptions', label: 'Subscriptions (SaaS)' },
  { value: 'saas_invoices', label: 'Invoices (SaaS)' },
  { value: 'saas_customers', label: 'Customers (SaaS)' },
  { value: 'saas_plans', label: 'Plans (SaaS)' },
];

const AGGREGATIONS = [
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'count_distinct', label: 'Count Distinct' },
  { value: 'min', label: 'Minimum' },
  { value: 'max', label: 'Maximum' },
];

const FORMATS = [
  { value: 'number', label: 'Number' },
  { value: 'currency', label: 'Currency' },
  { value: 'percentage', label: 'Percentage' },
  { value: 'duration', label: 'Duration' },
];

const CATEGORIES = [
  'Revenue',
  'Orders',
  'Customers',
  'Products',
  'Subscriptions',
  'Marketing',
  'Operations',
  'Custom',
];

export default function CustomMetricsPage() {
  const { toast } = useToast();
  const [metrics, setMetrics] = React.useState<CustomMetric[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedCategory, setSelectedCategory] = React.useState<string | null>(null);
  const [showCreateDialog, setShowCreateDialog] = React.useState(false);
  const [editingMetric, setEditingMetric] = React.useState<CustomMetric | null>(null);

  const workspaceId = typeof window !== 'undefined' ? localStorage.getItem('currentWorkspaceId') : null;

  // Form state
  const [formData, setFormData] = React.useState({
    name: '',
    description: '',
    category: '',
    formulaType: 'simple' as 'simple' | 'calculated' | 'sql',
    table: '',
    column: '',
    expression: '',
    aggregation: 'sum',
    format: 'number',
    decimals: 2,
    prefix: '',
    suffix: '',
    nlqKeywords: '',
    isShared: false,
  });

  React.useEffect(() => {
    if (workspaceId) {
      fetchMetrics();
    }
  }, [workspaceId]);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/metrics/custom?workspaceId=${workspaceId}`);
      if (!response.ok) throw new Error('Failed to fetch metrics');
      const data = await response.json();
      setMetrics(data.metrics || []);
    } catch (error) {
      console.error('Error fetching metrics:', error);
      toast({
        title: 'Error',
        description: 'Failed to load custom metrics',
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
      category: '',
      formulaType: 'simple',
      table: '',
      column: '',
      expression: '',
      aggregation: 'sum',
      format: 'number',
      decimals: 2,
      prefix: '',
      suffix: '',
      nlqKeywords: '',
      isShared: false,
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setEditingMetric(null);
    setShowCreateDialog(true);
  };

  const openEditDialog = (metric: CustomMetric) => {
    setFormData({
      name: metric.name,
      description: metric.description || '',
      category: metric.category || '',
      formulaType: metric.formula.type,
      table: metric.formula.table || '',
      column: metric.formula.column || '',
      expression: metric.formula.expression || '',
      aggregation: metric.aggregation,
      format: metric.format,
      decimals: metric.decimals,
      prefix: metric.prefix || '',
      suffix: metric.suffix || '',
      nlqKeywords: metric.nlqKeywords?.join(', ') || '',
      isShared: metric.isShared,
    });
    setEditingMetric(metric);
    setShowCreateDialog(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({ title: 'Error', description: 'Name is required', variant: 'destructive' });
      return;
    }

    const formula: CustomMetric['formula'] = {
      type: formData.formulaType,
    };

    if (formData.formulaType === 'simple') {
      if (!formData.table || !formData.column) {
        toast({ title: 'Error', description: 'Table and column are required', variant: 'destructive' });
        return;
      }
      formula.table = formData.table;
      formula.column = formData.column;
    } else if (formData.formulaType === 'calculated') {
      if (!formData.expression) {
        toast({ title: 'Error', description: 'Expression is required', variant: 'destructive' });
        return;
      }
      formula.expression = formData.expression;
    }

    const payload = {
      workspaceId,
      name: formData.name,
      description: formData.description,
      category: formData.category || null,
      formula,
      aggregation: formData.aggregation,
      format: formData.format,
      decimals: formData.decimals,
      prefix: formData.prefix || null,
      suffix: formData.suffix || null,
      nlqKeywords: formData.nlqKeywords ? formData.nlqKeywords.split(',').map((k) => k.trim()) : [],
      isShared: formData.isShared,
    };

    try {
      let response;
      if (editingMetric) {
        response = await fetch('/api/metrics/custom', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, metricId: editingMetric.id }),
        });
      } else {
        response = await fetch('/api/metrics/custom', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save');
      }

      await fetchMetrics();
      setShowCreateDialog(false);
      toast({ title: 'Success', description: editingMetric ? 'Metric updated' : 'Metric created' });
    } catch (error) {
      console.error('Error saving metric:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save metric',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this metric?')) return;

    try {
      const response = await fetch(`/api/metrics/custom?workspaceId=${workspaceId}&metricId=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete');

      setMetrics((prev) => prev.filter((m) => m.id !== id));
      toast({ title: 'Success', description: 'Metric deleted' });
    } catch (error) {
      console.error('Error deleting metric:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete metric',
        variant: 'destructive',
      });
    }
  };

  const filteredMetrics = metrics.filter((m) => {
    const matchesSearch =
      !searchQuery ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.slug.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = Array.from(new Set(metrics.map((m) => m.category).filter(Boolean)));

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Custom Metrics</h1>
            <p className="text-muted-foreground">Create and manage custom metrics</p>
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
          <h1 className="text-2xl font-bold tracking-tight">Custom Metrics</h1>
          <p className="text-muted-foreground">Create and manage custom metrics for your dashboards</p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          New Metric
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search metrics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={selectedCategory || 'all'}
          onValueChange={(v) => setSelectedCategory(v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat!}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Metrics Grid */}
      {filteredMetrics.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center h-64">
            <Calculator className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No custom metrics yet</p>
            <p className="text-muted-foreground text-sm mt-1 mb-4">
              Create your first custom metric
            </p>
            <Button onClick={openCreateDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Create Metric
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredMetrics.map((metric) => (
            <Card key={metric.id} className="group">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{metric.name}</CardTitle>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-1">
                      {metric.slug}
                    </p>
                    {metric.description && (
                      <CardDescription className="mt-2 line-clamp-2">
                        {metric.description}
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
                      <DropdownMenuItem onClick={() => openEditDialog(metric)}>
                        <Pencil className="h-4 w-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(metric.id)}
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
                  {metric.category && (
                    <Badge variant="outline">{metric.category}</Badge>
                  )}
                  <Badge variant="secondary">
                    {metric.formula.type === 'simple' && <Database className="h-3 w-3 mr-1" />}
                    {metric.formula.type === 'calculated' && <Calculator className="h-3 w-3 mr-1" />}
                    {metric.formula.type === 'sql' && <Code className="h-3 w-3 mr-1" />}
                    {metric.formula.type}
                  </Badge>
                  {metric.isShared && (
                    <Badge variant="outline">
                      <Share2 className="h-3 w-3 mr-1" />
                      Shared
                    </Badge>
                  )}
                </div>
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    Used {metric.usageCount} times
                  </span>
                  {metric.lastValue !== undefined && metric.lastValue !== null && (
                    <span className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {metric.prefix}
                      {metric.lastValue.toLocaleString()}
                      {metric.suffix}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingMetric ? 'Edit Metric' : 'Create Custom Metric'}</DialogTitle>
            <DialogDescription>
              Define a custom metric for your dashboards and AI queries
            </DialogDescription>
          </DialogHeader>

          <Tabs value={formData.formulaType} onValueChange={(v) => setFormData((prev) => ({ ...prev, formulaType: v as 'simple' | 'calculated' | 'sql' }))}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="simple">
                <Database className="h-4 w-4 mr-2" />
                Simple
              </TabsTrigger>
              <TabsTrigger value="calculated">
                <Calculator className="h-4 w-4 mr-2" />
                Calculated
              </TabsTrigger>
              <TabsTrigger value="sql" disabled>
                <Code className="h-4 w-4 mr-2" />
                SQL (Pro)
              </TabsTrigger>
            </TabsList>

            <div className="space-y-4 mt-4">
              {/* Common fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Monthly Revenue"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, category: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category..." />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Total revenue from completed orders"
                  rows={2}
                />
              </div>

              {/* Formula type specific fields */}
              <TabsContent value="simple" className="space-y-4 mt-0">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Table *</Label>
                    <Select
                      value={formData.table}
                      onValueChange={(v) => setFormData((prev) => ({ ...prev, table: v }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select table..." />
                      </SelectTrigger>
                      <SelectContent>
                        {AVAILABLE_TABLES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="column">Column *</Label>
                    <Input
                      id="column"
                      value={formData.column}
                      onChange={(e) => setFormData((prev) => ({ ...prev, column: e.target.value }))}
                      placeholder="total_amount"
                    />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="calculated" className="space-y-4 mt-0">
                <div className="space-y-2">
                  <Label htmlFor="expression">Expression *</Label>
                  <Textarea
                    id="expression"
                    value={formData.expression}
                    onChange={(e) => setFormData((prev) => ({ ...prev, expression: e.target.value }))}
                    placeholder="revenue / orders"
                    rows={3}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use existing metrics like: revenue, orders, customers, aov, mrr
                  </p>
                </div>
              </TabsContent>

              {/* Aggregation and formatting */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Aggregation</Label>
                  <Select
                    value={formData.aggregation}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, aggregation: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AGGREGATIONS.map((a) => (
                        <SelectItem key={a.value} value={a.value}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Format</Label>
                  <Select
                    value={formData.format}
                    onValueChange={(v) => setFormData((prev) => ({ ...prev, format: v }))}
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
                <div className="space-y-2">
                  <Label htmlFor="decimals">Decimals</Label>
                  <Input
                    id="decimals"
                    type="number"
                    min={0}
                    max={6}
                    value={formData.decimals}
                    onChange={(e) => setFormData((prev) => ({ ...prev, decimals: parseInt(e.target.value) || 0 }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="prefix">Prefix</Label>
                  <Input
                    id="prefix"
                    value={formData.prefix}
                    onChange={(e) => setFormData((prev) => ({ ...prev, prefix: e.target.value }))}
                    placeholder="$"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="suffix">Suffix</Label>
                  <Input
                    id="suffix"
                    value={formData.suffix}
                    onChange={(e) => setFormData((prev) => ({ ...prev, suffix: e.target.value }))}
                    placeholder="%"
                  />
                </div>
              </div>

              {/* NLQ Keywords */}
              <div className="space-y-2">
                <Label htmlFor="nlqKeywords">NLQ Keywords</Label>
                <Input
                  id="nlqKeywords"
                  value={formData.nlqKeywords}
                  onChange={(e) => setFormData((prev) => ({ ...prev, nlqKeywords: e.target.value }))}
                  placeholder="revenue, sales, income (comma-separated)"
                />
                <p className="text-xs text-muted-foreground">
                  Keywords that help the AI find this metric when you ask questions
                </p>
              </div>

              {/* Sharing */}
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <Label htmlFor="isShared">Share with team</Label>
                  <p className="text-xs text-muted-foreground">Allow team members to use this metric</p>
                </div>
                <Switch
                  id="isShared"
                  checked={formData.isShared}
                  onCheckedChange={(v) => setFormData((prev) => ({ ...prev, isShared: v }))}
                />
              </div>
            </div>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {editingMetric ? 'Save Changes' : 'Create Metric'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


