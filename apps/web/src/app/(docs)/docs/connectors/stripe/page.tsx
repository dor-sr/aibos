import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Check,
  ChevronRight,
  CreditCard,
  RefreshCw,
  Zap,
} from 'lucide-react';

export default function StripeConnectorPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/docs/connectors" className="hover:text-foreground">Connectors</Link>
          <ChevronRight className="h-4 w-4" />
          <span>Stripe</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#635bff]/10 rounded-lg">
            <CreditCard className="h-8 w-8 text-[#635bff]" />
          </div>
          <div>
            <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
              Stripe Connector
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="default">Available</Badge>
              <Badge variant="outline">SaaS / Payments</Badge>
              <Badge variant="outline">API Key</Badge>
            </div>
          </div>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Connect your Stripe account to sync subscription data, invoices, customers, and
          payment information for SaaS analytics and MRR tracking.
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
            <div className="font-medium mt-1">Restricted API Key</div>
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
            <div className="font-medium mt-1">~3 minutes</div>
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
              <CardTitle className="text-lg">Subscriptions</CardTitle>
              <CardDescription>Active and historical subscriptions</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Subscription ID and status</li>
                <li>- Plan/price attached</li>
                <li>- Current period start/end</li>
                <li>- Trial information</li>
                <li>- Billing cycle details</li>
                <li>- Cancellation data</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Invoices</CardTitle>
              <CardDescription>Payment history and details</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Invoice ID, number, status</li>
                <li>- Line items breakdown</li>
                <li>- Amount due and paid</li>
                <li>- Payment date</li>
                <li>- Discounts and taxes</li>
                <li>- Related subscription</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Customers</CardTitle>
              <CardDescription>Customer profiles and metadata</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Customer ID, email, name</li>
                <li>- Created date</li>
                <li>- Default payment method</li>
                <li>- Custom metadata fields</li>
                <li>- Currency preference</li>
                <li>- Balance information</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plans & Prices</CardTitle>
              <CardDescription>Product and pricing configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Product ID and name</li>
                <li>- Price ID and amount</li>
                <li>- Billing interval</li>
                <li>- Currency</li>
                <li>- Active/inactive status</li>
                <li>- Tier information</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Calculated Metrics */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Calculated Metrics
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              We automatically calculate these key SaaS metrics from your Stripe data:
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { metric: 'MRR', description: 'Monthly Recurring Revenue from active subscriptions' },
                { metric: 'ARR', description: 'Annual Recurring Revenue (MRR x 12)' },
                { metric: 'Net New MRR', description: 'New MRR minus churned MRR' },
                { metric: 'Churn Rate', description: 'Percentage of subscriptions canceled' },
                { metric: 'Revenue Churn', description: 'MRR lost from cancellations' },
                { metric: 'Active Subscriptions', description: 'Count of active subscriptions' },
              ].map((item) => (
                <div key={item.metric} className="space-y-1">
                  <h4 className="font-medium text-sm">{item.metric}</h4>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
              title: 'Create a Restricted API Key in Stripe',
              description: 'Go to Stripe Dashboard > Developers > API keys > Create restricted key',
            },
            {
              step: 2,
              title: 'Set Required Permissions',
              description: 'Enable Read access for: Customers, Subscriptions, Invoices, Plans, Products, Prices',
            },
            {
              step: 3,
              title: 'Copy the API Key',
              description: 'Copy the restricted key (starts with rk_live_ or rk_test_)',
            },
            {
              step: 4,
              title: 'Connect in AI Business OS',
              description: 'Go to Dashboard > Connectors > Stripe > Connect and paste your API key',
            },
            {
              step: 5,
              title: 'Configure Webhooks (Optional)',
              description: 'Add our webhook URL in Stripe for real-time updates',
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
              When creating your restricted API key, enable Read access for:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                { resource: 'Customers', permission: 'Read' },
                { resource: 'Subscriptions', permission: 'Read' },
                { resource: 'Invoices', permission: 'Read' },
                { resource: 'Plans', permission: 'Read' },
                { resource: 'Products', permission: 'Read' },
                { resource: 'Prices', permission: 'Read' },
              ].map((perm) => (
                <div key={perm.resource} className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600" />
                  <span className="font-medium">{perm.resource}</span>
                  <Badge variant="outline" className="text-xs">{perm.permission}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Webhooks */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Webhook Events
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              For real-time updates, configure webhooks in Stripe with these events:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                'customer.created',
                'customer.updated',
                'subscription.created',
                'subscription.updated',
                'subscription.deleted',
                'invoice.paid',
                'invoice.payment_failed',
                'price.created',
              ].map((webhook) => (
                <div key={webhook} className="flex items-center gap-2 text-sm">
                  <Zap className="h-4 w-4 text-amber-500" />
                  <code className="bg-muted px-1 rounded text-xs">{webhook}</code>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <p className="text-sm font-medium">Webhook URL:</p>
              <code className="text-xs break-all">
                https://app.aibusinessos.com/api/webhooks/stripe
              </code>
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
                'What is our current MRR?',
                'How many subscriptions did we add this month?',
                'What is our churn rate?',
                'Which plan has the most subscribers?',
                'Show me failed payments this week',
                'What is our ARR?',
                'How many customers are on trial?',
                'What was our net new MRR last month?',
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

      {/* Test vs Live Mode */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Test vs Live Mode
        </h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h4 className="font-medium">Using Test Mode</h4>
              <p className="text-sm text-muted-foreground">
                You can connect a test mode API key (starts with rk_test_) to try out the
                integration without affecting live data. Great for initial setup and testing.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Switching to Live</h4>
              <p className="text-sm text-muted-foreground">
                When ready for production, disconnect the test connector and reconnect with
                a live mode API key (starts with rk_live_).
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
              <h3 className="text-lg font-semibold">Ready to connect Stripe?</h3>
              <p className="text-primary-foreground/80">
                Track your MRR, churn, and subscription metrics.
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
