'use client';

import * as React from 'react';
import {
  BarChart3,
  LineChart,
  PieChart,
  Table2,
  Type,
  MessageSquare,
  Image,
  Minus,
  TrendingUp,
  AreaChart,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface WidgetType {
  id: string;
  type: 'metric' | 'line_chart' | 'bar_chart' | 'area_chart' | 'pie_chart' | 'table' | 'text' | 'question' | 'image' | 'divider';
  name: string;
  description: string;
  icon: React.ReactNode;
  defaultSize: { w: number; h: number };
  category: 'metrics' | 'charts' | 'content';
}

const WIDGET_TYPES: WidgetType[] = [
  // Metrics
  {
    id: 'metric',
    type: 'metric',
    name: 'Metric Card',
    description: 'Display a single KPI with comparison',
    icon: <TrendingUp className="h-5 w-5" />,
    defaultSize: { w: 3, h: 2 },
    category: 'metrics',
  },
  // Charts
  {
    id: 'line_chart',
    type: 'line_chart',
    name: 'Line Chart',
    description: 'Time series and trends',
    icon: <LineChart className="h-5 w-5" />,
    defaultSize: { w: 6, h: 4 },
    category: 'charts',
  },
  {
    id: 'bar_chart',
    type: 'bar_chart',
    name: 'Bar Chart',
    description: 'Compare values across categories',
    icon: <BarChart3 className="h-5 w-5" />,
    defaultSize: { w: 6, h: 4 },
    category: 'charts',
  },
  {
    id: 'area_chart',
    type: 'area_chart',
    name: 'Area Chart',
    description: 'Show cumulative trends over time',
    icon: <AreaChart className="h-5 w-5" />,
    defaultSize: { w: 6, h: 4 },
    category: 'charts',
  },
  {
    id: 'pie_chart',
    type: 'pie_chart',
    name: 'Pie Chart',
    description: 'Show proportions and percentages',
    icon: <PieChart className="h-5 w-5" />,
    defaultSize: { w: 4, h: 4 },
    category: 'charts',
  },
  // Content
  {
    id: 'table',
    type: 'table',
    name: 'Data Table',
    description: 'Display tabular data with sorting',
    icon: <Table2 className="h-5 w-5" />,
    defaultSize: { w: 8, h: 4 },
    category: 'content',
  },
  {
    id: 'text',
    type: 'text',
    name: 'Text Block',
    description: 'Add titles, descriptions, or notes',
    icon: <Type className="h-5 w-5" />,
    defaultSize: { w: 4, h: 2 },
    category: 'content',
  },
  {
    id: 'question',
    type: 'question',
    name: 'AI Question',
    description: 'Embed an AI-answered question',
    icon: <MessageSquare className="h-5 w-5" />,
    defaultSize: { w: 6, h: 3 },
    category: 'content',
  },
  {
    id: 'image',
    type: 'image',
    name: 'Image',
    description: 'Add images or logos',
    icon: <Image className="h-5 w-5" />,
    defaultSize: { w: 4, h: 3 },
    category: 'content',
  },
  {
    id: 'divider',
    type: 'divider',
    name: 'Divider',
    description: 'Visual separator between sections',
    icon: <Minus className="h-5 w-5" />,
    defaultSize: { w: 12, h: 1 },
    category: 'content',
  },
];

interface WidgetLibraryProps {
  onAddWidget: (widget: WidgetType) => void;
}

export function WidgetLibrary({ onAddWidget }: WidgetLibraryProps) {
  const categories = [
    { id: 'metrics', name: 'Metrics' },
    { id: 'charts', name: 'Charts' },
    { id: 'content', name: 'Content' },
  ];

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Widget Library</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {categories.map((category) => (
          <div key={category.id}>
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              {category.name}
            </h4>
            <div className="space-y-1">
              {WIDGET_TYPES.filter((w) => w.category === category.id).map((widget) => (
                <button
                  key={widget.id}
                  onClick={() => onAddWidget(widget)}
                  className="w-full flex items-center gap-3 p-2 rounded-md hover:bg-accent text-left transition-colors"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('widget-type', JSON.stringify(widget));
                  }}
                >
                  <div className="flex-shrink-0 text-muted-foreground">
                    {widget.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{widget.name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {widget.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export { WIDGET_TYPES };
export type { WidgetType };


