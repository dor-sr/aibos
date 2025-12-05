import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

// Demo data - in production this would come from the API
const metrics = [
  {
    title: 'Revenue',
    value: '$24,500',
    change: 12.5,
    changeLabel: 'vs last period',
    icon: DollarSign,
  },
  {
    title: 'Orders',
    value: '356',
    change: 8.2,
    changeLabel: 'vs last period',
    icon: ShoppingCart,
  },
  {
    title: 'Customers',
    value: '2,340',
    change: -2.4,
    changeLabel: 'vs last period',
    icon: Users,
  },
  {
    title: 'Avg Order Value',
    value: '$68.82',
    change: 4.1,
    changeLabel: 'vs last period',
    icon: CreditCard,
  },
];

export function MetricCards() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.title}
            </CardTitle>
            <metric.icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
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
              <span>{metric.changeLabel}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

