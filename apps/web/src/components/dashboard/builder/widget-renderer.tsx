'use client';

import * as React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Settings,
  Trash2,
  GripVertical,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface WidgetData {
  id: string;
  widgetType: string;
  title?: string;
  gridX: number;
  gridY: number;
  gridW: number;
  gridH: number;
  config: Record<string, unknown>;
  style?: Record<string, unknown>;
}

interface WidgetRendererProps {
  widget: WidgetData;
  isEditing?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onConfigure?: () => void;
}

export function WidgetRenderer({
  widget,
  isEditing = false,
  onEdit,
  onDelete,
  onConfigure,
}: WidgetRendererProps) {
  const renderContent = () => {
    switch (widget.widgetType) {
      case 'metric':
        return <MetricWidget config={widget.config} title={widget.title} />;
      case 'line_chart':
      case 'bar_chart':
      case 'area_chart':
      case 'pie_chart':
        return <ChartWidget type={widget.widgetType} config={widget.config} title={widget.title} />;
      case 'table':
        return <TableWidget config={widget.config} title={widget.title} />;
      case 'text':
        return <TextWidget config={widget.config} />;
      case 'question':
        return <QuestionWidget config={widget.config} />;
      case 'image':
        return <ImageWidget config={widget.config} />;
      case 'divider':
        return <DividerWidget />;
      default:
        return <div className="p-4 text-muted-foreground">Unknown widget type</div>;
    }
  };

  return (
    <div className="relative h-full group">
      {isEditing && (
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-2 py-1 bg-accent/50 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="cursor-grab">
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="flex items-center gap-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6">
                  <Settings className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onConfigure}>
                  Configure
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit}>
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={onDelete} className="text-destructive">
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )}
      <Card className="h-full overflow-hidden">
        {renderContent()}
      </Card>
    </div>
  );
}

// Metric Widget
function MetricWidget({
  config,
  title,
}: {
  config: Record<string, unknown>;
  title?: string;
}) {
  const metricName = (config.metricName as string) || 'Metric';
  const displayTitle = title || metricName;
  
  // Mock data - in production, this would fetch real data
  const value = Math.floor(Math.random() * 100000);
  const change = (Math.random() - 0.5) * 30;
  const formattedValue = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(value);

  const TrendIcon = change > 0 ? TrendingUp : change < 0 ? TrendingDown : Minus;
  const trendColor = change > 0 ? 'text-green-600' : change < 0 ? 'text-red-600' : 'text-gray-500';

  return (
    <CardContent className="p-4 h-full flex flex-col justify-center">
      <p className="text-sm text-muted-foreground">{displayTitle}</p>
      <p className="text-2xl font-bold mt-1">{formattedValue}</p>
      <div className={`flex items-center gap-1 mt-1 ${trendColor}`}>
        <TrendIcon className="h-4 w-4" />
        <span className="text-sm font-medium">{Math.abs(change).toFixed(1)}%</span>
        <span className="text-xs text-muted-foreground">vs last period</span>
      </div>
    </CardContent>
  );
}

// Chart Widget
function ChartWidget({
  type,
  config,
  title,
}: {
  type: string;
  config: Record<string, unknown>;
  title?: string;
}) {
  const chartTypes: Record<string, string> = {
    line_chart: 'Line Chart',
    bar_chart: 'Bar Chart',
    area_chart: 'Area Chart',
    pie_chart: 'Pie Chart',
  };

  return (
    <>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-4 h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="w-full h-32 bg-accent/50 rounded-md flex items-center justify-center">
            <p className="text-sm">{chartTypes[type] || 'Chart'} Preview</p>
          </div>
          <p className="text-xs mt-2">Configure data source to display chart</p>
        </div>
      </CardContent>
    </>
  );
}

// Table Widget
function TableWidget({
  config,
  title,
}: {
  config: Record<string, unknown>;
  title?: string;
}) {
  const tableConfig = (config.tableConfig || {}) as {
    columns?: Array<{ key: string; label: string }>;
  };
  const columns = tableConfig.columns || [
    { key: 'name', label: 'Name' },
    { key: 'value', label: 'Value' },
  ];

  // Mock data
  const rows = [
    { name: 'Item 1', value: '$1,234' },
    { name: 'Item 2', value: '$2,345' },
    { name: 'Item 3', value: '$3,456' },
  ];

  return (
    <>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="p-4 h-full overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              {columns.map((col) => (
                <th key={col.key} className="text-left py-2 font-medium">
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className="border-b last:border-0">
                {columns.map((col) => (
                  <td key={col.key} className="py-2">
                    {row[col.key as keyof typeof row]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </>
  );
}

// Text Widget
function TextWidget({ config }: { config: Record<string, unknown> }) {
  const content = (config.content as string) || 'Click to add text...';

  return (
    <CardContent className="p-4 h-full">
      <div className="prose prose-sm dark:prose-invert">
        {content}
      </div>
    </CardContent>
  );
}

// Question Widget
function QuestionWidget({ config }: { config: Record<string, unknown> }) {
  const question = (config.question as string) || 'Ask a question...';

  return (
    <CardContent className="p-4 h-full">
      <div className="space-y-2">
        <p className="text-sm font-medium">{question}</p>
        <div className="text-sm text-muted-foreground bg-accent/50 rounded-md p-3">
          AI response will appear here when configured
        </div>
      </div>
    </CardContent>
  );
}

// Image Widget
function ImageWidget({ config }: { config: Record<string, unknown> }) {
  const src = config.src as string | undefined;
  const alt = (config.alt as string) || 'Image';

  return (
    <CardContent className="p-4 h-full flex items-center justify-center">
      {src ? (
        <img src={src} alt={alt} className="max-w-full max-h-full object-contain" />
      ) : (
        <div className="text-center text-muted-foreground">
          <div className="w-16 h-16 bg-accent rounded-md mx-auto mb-2" />
          <p className="text-sm">Add image URL</p>
        </div>
      )}
    </CardContent>
  );
}

// Divider Widget
function DividerWidget() {
  return (
    <div className="h-full flex items-center px-4">
      <div className="w-full border-t border-border" />
    </div>
  );
}

export type { WidgetData };


