'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

interface EmbedConfig {
  workspaceId: string;
  permissions: {
    dashboards?: string[];
    metrics?: string[];
    charts?: string[];
  };
  customization?: {
    hideHeader?: boolean;
    hideBranding?: boolean;
    theme?: 'light' | 'dark' | 'auto';
    primaryColor?: string;
    fontFamily?: string;
  };
}

// Demo metric data
const DEMO_METRICS = {
  revenue: { value: '$24,500', change: '+12.5%', label: 'Total Revenue' },
  orders: { value: '156', change: '+8.2%', label: 'Orders' },
  aov: { value: '$157', change: '+3.8%', label: 'Average Order Value' },
  customers: { value: '1,234', change: '+15.1%', label: 'Customers' },
  mrr: { value: '$12,500', change: '+6.3%', label: 'Monthly Recurring Revenue' },
  churn: { value: '2.5%', change: '-0.5%', label: 'Churn Rate' },
};

export default function EmbedPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<EmbedConfig | null>(null);
  const [data, setData] = useState<unknown>(null);

  const token = searchParams.get('token');
  const embedType = params.type as string;

  useEffect(() => {
    async function validateAndFetch() {
      if (!token) {
        setError('Missing embed token');
        setLoading(false);
        return;
      }

      try {
        // Validate token and get config
        const response = await fetch(`/api/embed/validate?token=${token}&type=${embedType}`);
        
        if (!response.ok) {
          const err = await response.json();
          setError(err.error?.message || 'Invalid embed token');
          setLoading(false);
          return;
        }

        const result = await response.json();
        setConfig(result.data.config);
        setData(result.data.data);
      } catch (err) {
        // For demo, use mock data
        setConfig({
          workspaceId: 'demo',
          permissions: { metrics: Object.keys(DEMO_METRICS) },
          customization: { theme: 'light' },
        });
        setData(DEMO_METRICS);
      } finally {
        setLoading(false);
      }
    }

    validateAndFetch();
  }, [token, embedType]);

  // Apply customization styles
  useEffect(() => {
    if (config?.customization) {
      const { theme, primaryColor, fontFamily } = config.customization;
      
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      }
      
      if (primaryColor) {
        document.documentElement.style.setProperty('--primary', primaryColor);
      }
      
      if (fontFamily) {
        document.documentElement.style.setProperty('--font-sans', fontFamily);
      }
    }
  }, [config]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Card className="max-w-md">
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render based on embed type
  switch (embedType) {
    case 'metrics':
      return <MetricsEmbed data={data} config={config} />;
    case 'chart':
      return <ChartEmbed data={data} config={config} />;
    case 'dashboard':
      return <DashboardEmbed data={data} config={config} />;
    default:
      return (
        <div className="flex items-center justify-center min-h-screen bg-background">
          <Card className="max-w-md">
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                Unknown embed type: {embedType}
              </p>
            </CardContent>
          </Card>
        </div>
      );
  }
}

// Metrics embed component
function MetricsEmbed({ data, config }: { data: unknown; config: EmbedConfig | null }) {
  const metrics = data as typeof DEMO_METRICS || DEMO_METRICS;
  const showHeader = !config?.customization?.hideHeader;
  const showBranding = !config?.customization?.hideBranding;

  return (
    <div className="p-4 bg-background min-h-screen">
      {showHeader && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Key Metrics</h2>
        </div>
      )}
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(metrics).map(([key, metric]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className={`text-xs ${
                metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.change} from last period
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {showBranding && (
        <div className="mt-4 text-center text-xs text-muted-foreground">
          Powered by AI Business OS
        </div>
      )}
    </div>
  );
}

// Chart embed component
function ChartEmbed({ data, config }: { data: unknown; config: EmbedConfig | null }) {
  const showHeader = !config?.customization?.hideHeader;
  const showBranding = !config?.customization?.hideBranding;

  // Demo chart data
  const chartData = [
    { name: 'Mon', value: 2400 },
    { name: 'Tue', value: 1398 },
    { name: 'Wed', value: 9800 },
    { name: 'Thu', value: 3908 },
    { name: 'Fri', value: 4800 },
    { name: 'Sat', value: 3800 },
    { name: 'Sun', value: 4300 },
  ];

  const maxValue = Math.max(...chartData.map(d => d.value));

  return (
    <div className="p-4 bg-background min-h-screen">
      {showHeader && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold">Revenue Trend</h2>
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          <div className="h-64 flex items-end justify-between gap-2">
            {chartData.map((item, index) => (
              <div key={index} className="flex flex-col items-center flex-1">
                <div 
                  className="w-full bg-primary rounded-t transition-all"
                  style={{ 
                    height: `${(item.value / maxValue) * 100}%`,
                    minHeight: '4px'
                  }}
                />
                <span className="text-xs mt-2 text-muted-foreground">{item.name}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {showBranding && (
        <div className="mt-4 text-center text-xs text-muted-foreground">
          Powered by AI Business OS
        </div>
      )}
    </div>
  );
}

// Dashboard embed component
function DashboardEmbed({ data, config }: { data: unknown; config: EmbedConfig | null }) {
  const showHeader = !config?.customization?.hideHeader;
  const showBranding = !config?.customization?.hideBranding;
  const metrics = (data as typeof DEMO_METRICS) || DEMO_METRICS;

  return (
    <div className="p-4 bg-background min-h-screen">
      {showHeader && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Real-time business analytics</p>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {Object.entries(metrics).slice(0, 4).map(([key, metric]) => (
          <Card key={key}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold">{metric.value}</div>
              <p className={`text-xs ${
                metric.change.startsWith('+') ? 'text-green-600' : 'text-red-600'
              }`}>
                {metric.change}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Chart */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Revenue Over Time</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-48 flex items-end justify-between gap-1">
            {Array.from({ length: 14 }).map((_, i) => (
              <div 
                key={i}
                className="flex-1 bg-primary/80 rounded-t transition-all hover:bg-primary"
                style={{ 
                  height: `${30 + Math.random() * 70}%`,
                }}
              />
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-muted-foreground">
            <span>2 weeks ago</span>
            <span>Today</span>
          </div>
        </CardContent>
      </Card>

      {showBranding && (
        <div className="text-center text-xs text-muted-foreground">
          Powered by AI Business OS
        </div>
      )}
    </div>
  );
}
