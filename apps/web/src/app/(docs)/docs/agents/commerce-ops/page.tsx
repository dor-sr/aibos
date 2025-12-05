import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Box,
  ChevronRight,
  DollarSign,
  Package,
  ShoppingCart,
  Store,
  TrendingUp,
} from 'lucide-react';

export default function CommerceOpsAgentPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/docs/agents/commerce-ops" className="hover:text-foreground">Agents</Link>
          <ChevronRight className="h-4 w-4" />
          <span>Commerce Ops Agent</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <ShoppingCart className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
              Commerce Ops Agent
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered inventory and operations management
            </p>
          </div>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Manage inventory levels, get stock alerts, analyze pricing and margins, and
          coordinate multi-channel operations with AI assistance.
        </p>
      </div>

      {/* Key Capabilities */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: 'Inventory Monitoring',
            description: 'Track stock levels across locations',
            icon: Box,
          },
          {
            title: 'Stock Alerts',
            description: 'Automated low stock and overstock warnings',
            icon: AlertTriangle,
          },
          {
            title: 'Demand Forecasting',
            description: 'Predict future inventory needs',
            icon: TrendingUp,
          },
          {
            title: 'Margin Analysis',
            description: 'Product and category profitability',
            icon: DollarSign,
          },
          {
            title: 'Multi-Channel View',
            description: 'Unified inventory across channels',
            icon: Store,
          },
          {
            title: 'Reorder Recommendations',
            description: 'When and how much to reorder',
            icon: Package,
          },
        ].map((capability) => {
          const Icon = capability.icon;
          return (
            <Card key={capability.title}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{capability.title}</h3>
                    <p className="text-xs text-muted-foreground">{capability.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Inventory Management */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Inventory Management
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Stock Monitoring</CardTitle>
              <CardDescription>Real-time inventory visibility</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Current stock levels by SKU</li>
                <li>- Inventory by location/warehouse</li>
                <li>- Available vs reserved stock</li>
                <li>- Incoming inventory tracking</li>
                <li>- Stock movement history</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Automated Alerts</CardTitle>
              <CardDescription>Never miss a stock issue</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Low stock warnings by threshold</li>
                <li>- Stockout risk predictions</li>
                <li>- Overstock alerts</li>
                <li>- Dead stock identification</li>
                <li>- Customizable alert rules</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Forecasting */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Demand Forecasting
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              The Commerce Ops Agent uses historical sales data to predict future demand:
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Days of Stock</h4>
                <p className="text-xs text-muted-foreground">
                  How many days until stockout at current velocity
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Reorder Point</h4>
                <p className="text-xs text-muted-foreground">
                  When to reorder based on lead time
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Optimal Quantity</h4>
                <p className="text-xs text-muted-foreground">
                  EOQ calculation with safety stock
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pricing & Margins */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Pricing & Margin Analysis
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Margin Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Gross margin by product/category</li>
                <li>- Margin trends over time</li>
                <li>- Cost vs price analysis</li>
                <li>- Underperforming products</li>
                <li>- Margin improvement opportunities</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Price Tracking</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Price history by SKU</li>
                <li>- Promotion impact analysis</li>
                <li>- Price vs volume correlation</li>
                <li>- Compare-at price usage</li>
                <li>- Discount frequency tracking</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Example Questions */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Example Questions
        </h2>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                'Which products are low on stock?',
                'What is the margin on our top sellers?',
                'When should we reorder Product X?',
                'Show me products with negative margin',
                'What is our inventory health score?',
                'Which SKUs have overstock?',
                'How many days of stock do we have?',
                'What products should we reorder this week?',
              ].map((question) => (
                <div
                  key={question}
                  className="flex items-center gap-2 p-3 bg-white rounded-lg border text-sm"
                >
                  <span className="text-primary font-medium">Q:</span>
                  {question}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Multi-Channel */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Multi-Channel Operations
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              If you sell across multiple platforms, the Commerce Ops Agent helps coordinate:
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Unified Inventory View</h4>
                <p className="text-xs text-muted-foreground">
                  See stock across Shopify, Tiendanube, MercadoLibre in one place
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Channel Performance</h4>
                <p className="text-xs text-muted-foreground">
                  Compare sales velocity and margins by channel
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Allocation Recommendations</h4>
                <p className="text-xs text-muted-foreground">
                  Optimize inventory distribution across channels
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Fee Analysis</h4>
                <p className="text-xs text-muted-foreground">
                  Understand net margins after marketplace fees
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Operations Dashboard */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Operations Dashboard
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              The Commerce Ops Agent powers a dedicated dashboard showing:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                'Inventory health score',
                'Products at risk of stockout',
                'Overstock alerts',
                'Margin analysis by category',
                'Reorder recommendations',
                'Stock trends over time',
                'Dead stock identification',
                'Channel inventory breakdown',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Best Practices */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Best Practices
        </h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h4 className="font-medium">Set realistic lead times</h4>
              <p className="text-sm text-muted-foreground">
                Configure accurate supplier lead times for better reorder recommendations.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Update cost data</h4>
              <p className="text-sm text-muted-foreground">
                Keep product costs current for accurate margin calculations.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Configure alert thresholds</h4>
              <p className="text-sm text-muted-foreground">
                Set appropriate low stock and overstock thresholds per SKU or category.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Review weekly</h4>
              <p className="text-sm text-muted-foreground">
                Check the Operations dashboard weekly to stay ahead of inventory issues.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Related */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/docs/agents/analytics">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardContent className="pt-4 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm">Analytics Agent</CardTitle>
                <CardDescription className="text-xs">Revenue, customers, trends</CardDescription>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/docs/connectors/shopify">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardContent className="pt-4 flex items-center gap-3">
              <ShoppingCart className="h-5 w-5 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm">Connect Shopify</CardTitle>
                <CardDescription className="text-xs">Sync inventory data</CardDescription>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
