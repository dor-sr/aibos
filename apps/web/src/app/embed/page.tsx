'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

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

interface MetricData {
  label: string;
  value: string;
  change?: number;
  changeLabel?: string;
}

function EmbedContent() {
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [config, setConfig] = useState<EmbedConfig | null>(null);
  const [metrics, setMetrics] = useState<MetricData[]>([]);

  const token = searchParams.get('token');
  const type = searchParams.get('type') || 'dashboard';
  const metricKey = searchParams.get('metric');

  useEffect(() => {
    if (!token) {
      setError('Missing embed token');
      setLoading(false);
      return;
    }

    validateTokenAndLoad();
  }, [token, type, metricKey]);

  const validateTokenAndLoad = async () => {
    try {
      // Validate token and get config
      const response = await fetch('/api/embed/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error?.message || 'Invalid embed token');
        setLoading(false);
        return;
      }

      setConfig(data.data);

      // Load demo metrics
      setMetrics([
        {
          label: 'Revenue',
          value: '$24,500',
          change: 12.5,
          changeLabel: 'vs last period',
        },
        {
          label: 'Orders',
          value: '156',
          change: 8.2,
          changeLabel: 'vs last period',
        },
        {
          label: 'Customers',
          value: '1,234',
          change: -2.1,
          changeLabel: 'vs last period',
        },
        {
          label: 'AOV',
          value: '$157',
          change: 4.3,
          changeLabel: 'vs last period',
        },
      ]);

      setLoading(false);
    } catch (err) {
      setError('Failed to load embed');
      setLoading(false);
    }
  };

  // Apply custom styles
  const customStyles: React.CSSProperties = config?.customization ? {
    fontFamily: config.customization.fontFamily || 'inherit',
    '--primary-color': config.customization.primaryColor || '#6366f1',
  } as React.CSSProperties : {};

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
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-destructive">
              <AlertCircle className="h-5 w-5" />
              <p>{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const theme = config?.customization?.theme || 'light';

  return (
    <div 
      className={`min-h-screen p-4 ${theme === 'dark' ? 'dark bg-slate-950' : 'bg-slate-50'}`}
      style={customStyles}
    >
      {/* Header */}
      {!config?.customization?.hideHeader && (
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-foreground">Dashboard Overview</h2>
          <p className="text-sm text-muted-foreground">Key metrics for your workspace</p>
        </div>
      )}

      {/* Metrics Grid */}
      {type === 'dashboard' && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {metrics.map((metric, index) => (
            <Card key={index}>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
                {metric.change !== undefined && (
                  <div className="flex items-center gap-1 mt-1">
                    {metric.change >= 0 ? (
                      <TrendingUp className="h-3 w-3 text-green-500" />
                    ) : (
                      <TrendingDown className="h-3 w-3 text-red-500" />
                    )}
                    <span
                      className={`text-xs ${
                        metric.change >= 0 ? 'text-green-500' : 'text-red-500'
                      }`}
                    >
                      {metric.change >= 0 ? '+' : ''}{metric.change}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {metric.changeLabel}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Single Metric */}
      {type === 'metric' && metricKey && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metricKey}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">$24,500</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="h-4 w-4 text-green-500" />
              <span className="text-sm text-green-500">+12.5%</span>
              <span className="text-sm text-muted-foreground">vs last period</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chart placeholder */}
      {type === 'chart' && (
        <Card>
          <CardHeader>
            <CardTitle>Revenue Over Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-muted rounded-lg">
              <p className="text-muted-foreground">Chart visualization</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Branding */}
      {!config?.customization?.hideBranding && (
        <div className="mt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Powered by AI Business OS
          </p>
        </div>
      )}
    </div>
  );
}

export default function EmbedPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <EmbedContent />
    </Suspense>
  );
}
