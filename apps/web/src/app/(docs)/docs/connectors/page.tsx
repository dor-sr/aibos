import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CreditCard,
  Globe,
  RefreshCw,
  ShoppingBag,
  ShoppingCart,
  Store,
  Target,
  Zap,
} from 'lucide-react';

export default function ConnectorsPage() {
  const connectors = [
    {
      name: 'Shopify',
      description: 'Connect your Shopify store to sync orders, products, and customers.',
      icon: ShoppingCart,
      status: 'Available',
      dataTypes: ['Orders', 'Products', 'Customers', 'Inventory'],
      vertical: 'Ecommerce',
      authType: 'OAuth 2.0',
      syncFrequency: 'Every 6 hours + real-time webhooks',
      href: '/docs/connectors/shopify',
    },
    {
      name: 'Stripe',
      description: 'Sync subscription data, invoices, and customers from Stripe.',
      icon: CreditCard,
      status: 'Available',
      dataTypes: ['Subscriptions', 'Invoices', 'Customers', 'Plans'],
      vertical: 'SaaS / Payments',
      authType: 'API Key',
      syncFrequency: 'Every 6 hours + real-time webhooks',
      href: '/docs/connectors/stripe',
    },
    {
      name: 'Google Analytics 4',
      description: 'Import sessions, pageviews, events, and traffic source data.',
      icon: BarChart3,
      status: 'Available',
      dataTypes: ['Sessions', 'Pageviews', 'Events', 'Traffic Sources', 'Conversions'],
      vertical: 'Analytics',
      authType: 'OAuth 2.0',
      syncFrequency: 'Daily',
      href: '/docs/connectors/google-analytics',
    },
    {
      name: 'Tiendanube',
      description: 'Connect your Tiendanube store for LatAm ecommerce data.',
      icon: Store,
      status: 'Available',
      dataTypes: ['Orders', 'Products', 'Customers'],
      vertical: 'Ecommerce (LatAm)',
      authType: 'OAuth 2.0',
      syncFrequency: 'Every 6 hours + real-time webhooks',
      href: '/docs/connectors',
    },
    {
      name: 'MercadoLibre',
      description: 'Sync marketplace sales, listings, and messages.',
      icon: ShoppingBag,
      status: 'Available',
      dataTypes: ['Orders', 'Listings', 'Questions', 'Shipping'],
      vertical: 'Marketplace',
      authType: 'OAuth 2.0',
      syncFrequency: 'Every 6 hours',
      href: '/docs/connectors',
    },
    {
      name: 'Meta Ads',
      description: 'Import Facebook and Instagram advertising data.',
      icon: Target,
      status: 'Available',
      dataTypes: ['Campaigns', 'Ad Sets', 'Ads', 'Performance Metrics'],
      vertical: 'Marketing',
      authType: 'OAuth 2.0',
      syncFrequency: 'Daily',
      href: '/docs/connectors',
    },
    {
      name: 'Google Ads',
      description: 'Sync campaign performance and keyword data.',
      icon: Globe,
      status: 'Available',
      dataTypes: ['Campaigns', 'Ad Groups', 'Keywords', 'Performance'],
      vertical: 'Marketing',
      authType: 'OAuth 2.0',
      syncFrequency: 'Daily',
      href: '/docs/connectors',
    },
  ];

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
          <ChevronRight className="h-4 w-4" />
          <span>Connectors</span>
        </div>
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
          Data Connectors
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Connect your business tools to AI Business OS. We support ecommerce platforms,
          payment processors, analytics tools, and advertising platforms.
        </p>
      </div>

      {/* How It Works */}
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">How Connectors Work</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  1
                </div>
                <h4 className="font-medium">Authorize</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Connect securely via OAuth or API key. We never store your credentials directly.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  2
                </div>
                <h4 className="font-medium">Sync</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Initial sync imports historical data. Ongoing syncs keep data fresh automatically.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                  3
                </div>
                <h4 className="font-medium">Query</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Ask questions about your data. The AI accesses normalized data for instant answers.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Available Connectors */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Available Connectors
        </h2>

        <div className="space-y-4">
          {connectors.map((connector) => {
            const Icon = connector.icon;
            return (
              <Card key={connector.name}>
                <CardContent className="pt-6">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{connector.name}</h3>
                          <Badge variant="default">{connector.status}</Badge>
                          <Badge variant="outline">{connector.vertical}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {connector.description}
                        </p>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {connector.dataTypes.map((type) => (
                            <Badge key={type} variant="secondary" className="text-xs">
                              {type}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="lg:text-right space-y-1 shrink-0">
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1 lg:justify-end">
                          <Zap className="h-3 w-3" /> {connector.authType}
                        </div>
                        <div className="flex items-center gap-1 lg:justify-end">
                          <RefreshCw className="h-3 w-3" /> {connector.syncFrequency}
                        </div>
                      </div>
                      <Link href={connector.href as '/docs/connectors' | '/docs/connectors/shopify' | '/docs/connectors/stripe' | '/docs/connectors/google-analytics'}>
                        <Button variant="outline" size="sm" className="mt-2 gap-1">
                          Learn more <ArrowRight className="h-3 w-3" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Data Sync Details */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Data Synchronization
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Initial Sync</CardTitle>
              <CardDescription>What happens when you first connect</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Historical data import (typically last 12 months)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Data normalization and validation</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Metric calculation and aggregation</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Duration: 2-15 minutes depending on data volume</span>
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ongoing Sync</CardTitle>
              <CardDescription>How data stays up to date</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Scheduled syncs every 6 hours (configurable)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Real-time webhooks for instant updates (where supported)</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Incremental syncs for efficiency</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <span>Manual sync available anytime from dashboard</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Data Security */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Data Security
        </h2>

        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  title: 'OAuth 2.0',
                  description: 'Secure authorization without sharing passwords',
                },
                {
                  title: 'Encrypted Storage',
                  description: 'All data encrypted at rest and in transit',
                },
                {
                  title: 'Access Control',
                  description: 'Minimal permissions requested per connector',
                },
                {
                  title: 'Data Isolation',
                  description: 'Workspace data completely isolated',
                },
              ].map((item) => (
                <div key={item.title} className="space-y-1">
                  <h4 className="font-medium text-sm">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.description}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Request Connector */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Need a different connector?</h3>
              <p className="text-primary-foreground/80">
                We&apos;re always adding new integrations. Let us know what you need.
              </p>
            </div>
            <Button variant="secondary" size="lg" className="gap-2">
              Request Connector <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
