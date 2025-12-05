'use client';

import { useEffect, useState } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface Metric {
  title: string;
  value: string;
  change: number;
  changeLabel: string;
  icon: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  DollarSign,
  ShoppingCart,
  Users,
  CreditCard,
  BarChart3,
  Activity,
};

export function MetricCards() {
  const [metrics, setMetrics] = useState<Metric[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

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
      {isDemo && (
        <p className="text-xs text-muted-foreground text-right">
          Demo data - Connect your store to see real metrics
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {metrics.map((metric) => {
          const IconComponent = iconMap[metric.icon] || DollarSign;
          return (
            <Card key={metric.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {metric.title}
                </CardTitle>
                <IconComponent className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metric.value}</div>
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
