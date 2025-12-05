'use client';

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  CreditCard,
  BarChart3,
  Activity,
  Radio,
  RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRealtime, type RealtimeMetricUpdate } from '@/hooks/use-realtime';

interface Metric {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: string;
  isUpdating?: boolean;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign,
  ShoppingCart,
  Users,
  CreditCard,
  BarChart3,
  Activity,
};

// Map API metric names to display names
const metricNameMap: Record<string, string> = {
  revenue: 'Revenue',
  orders: 'Orders',
  customers: 'Customers',
  aov: 'Avg Order Value',
  mrr: 'MRR',
  activeSubscriptions: 'Active Subscriptions',
};

// Map display names back to metric keys for updates
const displayNameToKey: Record<string, string> = {
  'Revenue': 'revenue',
  'Orders': 'orders',
  'Customers': 'customers',
  'Avg Order Value': 'aov',
  'MRR': 'mrr',
  'Active Subscriptions': 'activeSubscriptions',
};

export function MetricCards() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);
  const [updatedMetrics, setUpdatedMetrics] = useState<Set<string>>(new Set());

  // Handle real-time metric updates
  const handleMetricUpdate = useCallback((update: RealtimeMetricUpdate) => {
    const displayName = metricNameMap[update.metricName];
    if (!displayName) return;

    // Mark metric as updating for visual feedback
    setUpdatedMetrics((prev) => new Set(prev).add(displayName));

    // Update the metric value
    setMetrics((prev) =>
      prev.map((metric) => {
        if (metric.title === displayName) {
          return {
            ...metric,
            value: formatMetricValue(update.currentValue, update.metricName, update.currency),
            change: Number(update.changePercent.toFixed(1)),
            isUpdating: true,
          };
        }
        return metric;
      })
    );

    // Remove updating indicator after animation
    setTimeout(() => {
      setUpdatedMetrics((prev) => {
        const next = new Set(prev);
        next.delete(displayName);
        return next;
      });
      setMetrics((prev) =>
        prev.map((metric) =>
          metric.title === displayName ? { ...metric, isUpdating: false } : metric
        )
      );
    }, 2000);
  }, []);

  // Use real-time hook
  const { isConnected } = useRealtime({
    onMetricUpdate: handleMetricUpdate,
    autoReconnect: true,
  });

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const response = await fetch('/api/analytics/metrics');
        if (!response.ok) throw new Error('Failed to fetch metrics');

        const data = await response.json();
        setMetrics(data.metrics || []);
        setIsDemo(data.demo || false);
      } catch (error) {
        console.error('Error fetching metrics:', error);
        // Set default demo metrics on error
        setMetrics([
          {
            title: 'Revenue',
            value: '$24,500',
            change: 12.5,
            changeLabel: 'vs last period',
            icon: 'DollarSign',
          },
          {
            title: 'Orders',
            value: '356',
            change: 8.2,
            changeLabel: 'vs last period',
            icon: 'ShoppingCart',
          },
          {
            title: 'Customers',
            value: '2,340',
            change: -2.4,
            changeLabel: 'vs last period',
            icon: 'Users',
          },
          {
            title: 'Avg Order Value',
            value: '$68.82',
            change: 4.1,
            changeLabel: 'vs last period',
            icon: 'CreditCard',
          },
        ]);
        setIsDemo(true);
      } finally {
        setLoading(false);
      }
    }

    fetchMetrics();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
              <div className="h-4 w-4 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-24 bg-muted animate-pulse rounded mb-2" />
              <div className="h-3 w-32 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        {isDemo && (
          <p className="text-xs text-muted-foreground">
            Demo data - Connect your store to see real metrics
          </p>
        )}
        <div className="flex items-center gap-2 text-xs text-muted-foreground ml-auto">
          {isConnected ? (
            <>
              <Radio className="h-3 w-3 text-green-500 animate-pulse" />
              <span className="text-green-600">Live</span>
            </>
          ) : (
            <>
              <RefreshCw className="h-3 w-3 text-muted-foreground" />
              <span>Connecting...</span>
            </>
          )}
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const IconComponent = iconMap[metric.icon] || DollarSign;
          const isUpdating = updatedMetrics.has(metric.title);
          return (
            <Card 
              key={metric.title}
              className={cn(
                'transition-all duration-300',
                isUpdating && 'ring-2 ring-primary/50 shadow-lg'
              )}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <div className="flex items-center gap-1">
                  {isUpdating && (
                    <RefreshCw className="h-3 w-3 text-primary animate-spin" />
                  )}
                  <IconComponent className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent>
                <div className={cn(
                  'text-2xl font-bold transition-colors duration-300',
                  isUpdating && 'text-primary'
                )}>
                  {metric.value}
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  {metric.change !== 0 && (
                    <>
                      {metric.change > 0 ? (
                        <TrendingUp className="h-3 w-3 text-green-500" />
                      ) : (
                        <TrendingDown className="h-3 w-3 text-red-500" />
                      )}
                      <span
                        className={cn(
                          'font-medium',
                          metric.change > 0 ? 'text-green-500' : 'text-red-500'
                        )}
                      >
                        {metric.change > 0 ? '+' : ''}
                        {metric.change}%
                      </span>
                    </>
                  )}
                  <span>{metric.changeLabel}</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// Helper function to format metric values
function formatMetricValue(
  value: number,
  metricName: string,
  currency?: string
): string {
  if (metricName.includes('revenue') || metricName === 'mrr' || metricName === 'aov') {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  return new Intl.NumberFormat('en-US').format(value);
}
