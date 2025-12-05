'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { WidgetData } from './widget-renderer';

interface WidgetConfigPanelProps {
  widget: WidgetData;
  onUpdate: (updates: Partial<WidgetData>) => void;
  onClose: () => void;
}

export function WidgetConfigPanel({ widget, onUpdate, onClose }: WidgetConfigPanelProps) {
  const [localConfig, setLocalConfig] = React.useState(widget.config);
  const [title, setTitle] = React.useState(widget.title || '');

  const handleConfigChange = (key: string, value: unknown) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
    onUpdate({ config: newConfig });
  };

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle);
    onUpdate({ title: newTitle });
  };

  const renderConfigFields = () => {
    switch (widget.widgetType) {
      case 'metric':
        return <MetricConfigFields config={localConfig} onChange={handleConfigChange} />;
      case 'line_chart':
      case 'bar_chart':
      case 'area_chart':
      case 'pie_chart':
        return <ChartConfigFields config={localConfig} onChange={handleConfigChange} chartType={widget.widgetType} />;
      case 'table':
        return <TableConfigFields config={localConfig} onChange={handleConfigChange} />;
      case 'text':
        return <TextConfigFields config={localConfig} onChange={handleConfigChange} />;
      case 'question':
        return <QuestionConfigFields config={localConfig} onChange={handleConfigChange} />;
      case 'image':
        return <ImageConfigFields config={localConfig} onChange={handleConfigChange} />;
      default:
        return <p className="text-sm text-muted-foreground">No configuration available</p>;
    }
  };

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-sm font-medium">Widget Configuration</CardTitle>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Common fields */}
        <div className="space-y-2">
          <Label htmlFor="widget-title">Title</Label>
          <Input
            id="widget-title"
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="Widget title..."
          />
        </div>

        {/* Widget-specific fields */}
        {renderConfigFields()}

        {/* Size controls */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-2">Size</h4>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label htmlFor="grid-w" className="text-xs">Width</Label>
              <Input
                id="grid-w"
                type="number"
                min={1}
                max={12}
                value={widget.gridW}
                onChange={(e) => onUpdate({ gridW: parseInt(e.target.value) || 1 })}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="grid-h" className="text-xs">Height</Label>
              <Input
                id="grid-h"
                type="number"
                min={1}
                max={12}
                value={widget.gridH}
                onChange={(e) => onUpdate({ gridH: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Metric Configuration
function MetricConfigFields({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const builtInMetrics = [
    { value: 'revenue', label: 'Revenue' },
    { value: 'orders', label: 'Orders' },
    { value: 'aov', label: 'Average Order Value' },
    { value: 'customers', label: 'Customers' },
    { value: 'mrr', label: 'MRR' },
    { value: 'subscribers', label: 'Subscribers' },
    { value: 'churn', label: 'Churn Rate' },
    { value: 'arpu', label: 'ARPU' },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Metric</Label>
        <Select
          value={(config.metricName as string) || ''}
          onValueChange={(v) => onChange('metricName', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select metric..." />
          </SelectTrigger>
          <SelectContent>
            {builtInMetrics.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Comparison Period</Label>
        <Select
          value={(config.comparisonType as string) || 'previous_period'}
          onValueChange={(v) => onChange('comparisonType', v)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="previous_period">Previous Period</SelectItem>
            <SelectItem value="previous_year">Previous Year</SelectItem>
            <SelectItem value="target">Target Value</SelectItem>
            <SelectItem value="none">No Comparison</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {config.comparisonType === 'target' && (
        <div className="space-y-2">
          <Label>Target Value</Label>
          <Input
            type="number"
            value={(config.targetValue as number) || ''}
            onChange={(e) => onChange('targetValue', parseFloat(e.target.value))}
            placeholder="Enter target..."
          />
        </div>
      )}
    </div>
  );
}

// Chart Configuration
function ChartConfigFields({
  config,
  onChange,
  chartType,
}: {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
  chartType: string;
}) {
  const chartConfig = (config.chartConfig || {}) as Record<string, unknown>;

  const updateChartConfig = (key: string, value: unknown) => {
    onChange('chartConfig', { ...chartConfig, [key]: value });
  };

  const metrics = [
    { value: 'revenue', label: 'Revenue' },
    { value: 'orders', label: 'Orders' },
    { value: 'customers', label: 'Customers' },
    { value: 'aov', label: 'AOV' },
    { value: 'mrr', label: 'MRR' },
  ];

  const dimensions = [
    { value: 'date', label: 'Date' },
    { value: 'product', label: 'Product' },
    { value: 'category', label: 'Category' },
    { value: 'channel', label: 'Channel' },
    { value: 'plan', label: 'Plan' },
  ];

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>X-Axis (Dimension)</Label>
        <Select
          value={(chartConfig.xAxis as string) || ''}
          onValueChange={(v) => updateChartConfig('xAxis', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select dimension..." />
          </SelectTrigger>
          <SelectContent>
            {dimensions.map((d) => (
              <SelectItem key={d.value} value={d.value}>
                {d.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label>Y-Axis (Metric)</Label>
        <Select
          value={(chartConfig.yAxis as string[])?.[0] || ''}
          onValueChange={(v) => updateChartConfig('yAxis', [v])}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select metric..." />
          </SelectTrigger>
          <SelectContent>
            {metrics.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-legend">Show Legend</Label>
        <Switch
          id="show-legend"
          checked={(chartConfig.showLegend as boolean) ?? true}
          onCheckedChange={(v) => updateChartConfig('showLegend', v)}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="show-grid">Show Grid</Label>
        <Switch
          id="show-grid"
          checked={(chartConfig.showGrid as boolean) ?? true}
          onCheckedChange={(v) => updateChartConfig('showGrid', v)}
        />
      </div>

      {(chartType === 'line_chart' || chartType === 'area_chart') && (
        <div className="flex items-center justify-between">
          <Label htmlFor="curved">Curved Lines</Label>
          <Switch
            id="curved"
            checked={(chartConfig.curved as boolean) ?? false}
            onCheckedChange={(v) => updateChartConfig('curved', v)}
          />
        </div>
      )}

      {chartType === 'bar_chart' && (
        <div className="flex items-center justify-between">
          <Label htmlFor="stacked">Stacked Bars</Label>
          <Switch
            id="stacked"
            checked={(chartConfig.stacked as boolean) ?? false}
            onCheckedChange={(v) => updateChartConfig('stacked', v)}
          />
        </div>
      )}
    </div>
  );
}

// Table Configuration
function TableConfigFields({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  const tableConfig = (config.tableConfig || {}) as Record<string, unknown>;

  const updateTableConfig = (key: string, value: unknown) => {
    onChange('tableConfig', { ...tableConfig, [key]: value });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Data Source</Label>
        <Select
          value={(config.dataSource as string) || ''}
          onValueChange={(v) => onChange('dataSource', v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select data source..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="orders">Orders</SelectItem>
            <SelectItem value="products">Products</SelectItem>
            <SelectItem value="customers">Customers</SelectItem>
            <SelectItem value="subscriptions">Subscriptions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center justify-between">
        <Label htmlFor="pagination">Enable Pagination</Label>
        <Switch
          id="pagination"
          checked={(tableConfig.pagination as boolean) ?? true}
          onCheckedChange={(v) => updateTableConfig('pagination', v)}
        />
      </div>

      {(tableConfig.pagination as boolean) && (
        <div className="space-y-2">
          <Label>Page Size</Label>
          <Select
            value={String((tableConfig.pageSize as number) || 10)}
            onValueChange={(v) => updateTableConfig('pageSize', parseInt(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 rows</SelectItem>
              <SelectItem value="10">10 rows</SelectItem>
              <SelectItem value="25">25 rows</SelectItem>
              <SelectItem value="50">50 rows</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

// Text Configuration
function TextConfigFields({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Content</Label>
        <Textarea
          value={(config.content as string) || ''}
          onChange={(e) => onChange('content', e.target.value)}
          placeholder="Enter text content..."
          rows={6}
        />
      </div>
    </div>
  );
}

// Question Configuration
function QuestionConfigFields({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Question</Label>
        <Textarea
          value={(config.question as string) || ''}
          onChange={(e) => onChange('question', e.target.value)}
          placeholder="What is my revenue this month?"
          rows={3}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        The AI will answer this question using your business data.
      </p>
    </div>
  );
}

// Image Configuration
function ImageConfigFields({
  config,
  onChange,
}: {
  config: Record<string, unknown>;
  onChange: (key: string, value: unknown) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label>Image URL</Label>
        <Input
          value={(config.src as string) || ''}
          onChange={(e) => onChange('src', e.target.value)}
          placeholder="https://example.com/image.png"
        />
      </div>
      <div className="space-y-2">
        <Label>Alt Text</Label>
        <Input
          value={(config.alt as string) || ''}
          onChange={(e) => onChange('alt', e.target.value)}
          placeholder="Image description..."
        />
      </div>
    </div>
  );
}

