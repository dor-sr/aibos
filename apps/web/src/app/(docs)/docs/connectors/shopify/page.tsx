import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Check,
  ChevronRight,
  Copy,
  RefreshCw,
  ShoppingCart,
  Zap,
} from 'lucide-react';

export default function ShopifyConnectorPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/docs/connectors" className="hover:text-foreground">Connectors</Link>
          <ChevronRight className="h-4 w-4" />
          <span>Shopify</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#96bf48]/10 rounded-lg">
            <ShoppingCart className="h-8 w-8 text-[#96bf48]" />
          </div>
          <div>
            <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
              Shopify Connector
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="default">Available</Badge>
              <Badge variant="outline">Ecommerce</Badge>
              <Badge variant="outline">OAuth 2.0</Badge>
            </div>
          </div>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Connect your Shopify store to sync orders, products, customers, and inventory data
          for AI-powered ecommerce analytics.
        </p>
      </div>

      {/* Quick Info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Auth Type</span>
            </div>
            <div className="font-medium mt-1">OAuth 2.0</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sync Frequency</span>
            </div>
            <div className="font-medium mt-1">Every 6 hours + Webhooks</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Setup Time</span>
            </div>
            <div className="font-medium mt-1">~2 minutes</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Synced */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Data Synced
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Orders</CardTitle>
              <CardDescription>Complete order history and details</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Order ID, date, status</li>
                <li>- Line items with products and quantities</li>
                <li>- Customer information</li>
                <li>- Shipping and fulfillment status</li>
                <li>- Discounts and totals</li>
                <li>- Payment status</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Products</CardTitle>
              <CardDescription>Product catalog and variants</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Product ID, title, description</li>
                <li>- Variants with SKUs</li>
                <li>- Pricing and compare-at prices</li>
                <li>- Inventory levels by location</li>
                <li>- Categories and tags</li>
                <li>- Product status (active/draft/archived)</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customers</CardTitle>
              <CardDescription>Customer profiles and history</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Customer ID, email, name</li>
                <li>- Total orders and spend</li>
                <li>- First and last order dates</li>
                <li>- Tags and notes</li>
                <li>- Marketing consent status</li>
                <li>- Default address</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inventory</CardTitle>
              <CardDescription>Stock levels across locations</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Inventory item ID</li>
                <li>- Available quantity per location</li>
                <li>- Incoming inventory</li>
                <li>- Committed inventory</li>
                <li>- Cost per item (if set)</li>
                <li>- Location details</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Setup Steps */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Setup Instructions
        </h2>

        <div className="space-y-4">
          {[
            {
              step: 1,
              title: 'Navigate to Connectors',
              description: 'Go to Dashboard > Connectors in your AI Business OS workspace.',
            },
            {
              step: 2,
              title: 'Click Connect on Shopify',
              description: 'Find the Shopify card and click the Connect button.',
            },
            {
              step: 3,
              title: 'Enter your store URL',
              description: 'Enter your Shopify store URL (e.g., mystore.myshopify.com).',
            },
            {
              step: 4,
              title: 'Authorize Access',
              description: 'You\'ll be redirected to Shopify. Log in and click "Install app" to authorize.',
            },
            {
              step: 5,
              title: 'Wait for Initial Sync',
              description: 'Initial data sync takes 2-10 minutes depending on your store size.',
            },
          ].map((item) => (
            <Card key={item.step}>
              <CardContent className="pt-4 flex items-start gap-4">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold shrink-0">
                  {item.step}
                </div>
                <div>
                  <h4 className="font-medium">{item.title}</h4>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Permissions */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Required Permissions
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              The Shopify connector requests these read-only permissions:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { scope: 'read_orders', description: 'Access order data' },
                { scope: 'read_products', description: 'Access product catalog' },
                { scope: 'read_customers', description: 'Access customer profiles' },
                { scope: 'read_inventory', description: 'Access inventory levels' },
                { scope: 'read_locations', description: 'Access store locations' },
                { scope: 'read_analytics', description: 'Access store analytics' },
              ].map((perm) => (
                <div key={perm.scope} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  <code className="bg-muted px-1 rounded text-xs">{perm.scope}</code>
                  <span className="text-muted-foreground">- {perm.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhooks */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Real-Time Webhooks
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              We automatically subscribe to these Shopify webhooks for real-time updates:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                'orders/create',
                'orders/updated',
                'orders/fulfilled',
                'orders/cancelled',
                'products/create',
                'products/update',
                'customers/create',
                'customers/update',
              ].map((webhook) => (
                <div key={webhook} className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <code className="bg-muted px-1 rounded text-xs">{webhook}</code>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
                'What was my revenue this month?',
                'Which products are selling best?',
                'How many orders did we get last week?',
                'What is our average order value?',
                'Who are my top customers by spend?',
                'Which products are low on stock?',
                'How many new vs returning customers?',
                'What are my best selling categories?',
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

      {/* Troubleshooting */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Troubleshooting
        </h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h4 className="font-medium">OAuth authorization failed</h4>
              <p className="text-sm text-muted-foreground">
                Make sure you&apos;re logged in as a Shopify store owner or staff member with
                sufficient permissions. Partner accounts need explicit store access.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Data not updating</h4>
              <p className="text-sm text-muted-foreground">
                Check the connector status in Dashboard &gt; Connectors. You can trigger a
                manual sync if needed. Webhook updates happen within seconds of changes.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Missing historical data</h4>
              <p className="text-sm text-muted-foreground">
                Initial sync imports up to 12 months of historical data by default. For more
                history, contact support for a custom import.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Ready to connect Shopify?</h3>
              <p className="text-primary-foreground/80">
                Start syncing your store data in just a few clicks.
              </p>
            </div>
            <Link href="/dashboard/connectors">
              <Button variant="secondary" size="lg">
                Go to Connectors
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
