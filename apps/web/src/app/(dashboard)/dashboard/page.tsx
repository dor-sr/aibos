import { Suspense } from 'react';
import { MetricCards } from '@/components/dashboard/metric-cards';
import { RevenueChart } from '@/components/dashboard/revenue-chart';
import { AskBox } from '@/components/dashboard/ask-box';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
        <p className="text-muted-foreground">Your business at a glance</p>
      </div>

      {/* Ask Box */}
      <AskBox />

      {/* Metric Cards */}
      <Suspense fallback={<MetricCardsSkeleton />}>
        <MetricCards />
      </Suspense>

      {/* Main Chart */}
      <Suspense fallback={<ChartSkeleton />}>
        <RevenueChart />
      </Suspense>
    </div>
  );
}

function MetricCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="h-32 rounded-lg border bg-card animate-pulse" />
      ))}
    </div>
  );
}

function ChartSkeleton() {
  return <div className="h-80 rounded-lg border bg-card animate-pulse" />;
}






