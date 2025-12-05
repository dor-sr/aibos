import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BarChart3,
  Code2,
  Plug,
  Rocket,
  ShoppingCart,
  Target,
  Zap,
} from 'lucide-react';

export default function DocsPage() {
  return (
    <div className="space-y-12">
      {/* Hero */}
      <div className="space-y-4">
        <Badge variant="secondary" className="mb-4">Documentation</Badge>
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight lg:text-5xl">
          AI Business OS Documentation
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Learn how to connect your data sources, ask natural language questions, and get
          AI-powered insights for your business.
        </p>
        <div className="flex gap-3 pt-4">
          <Link href="/docs/getting-started">
            <Button size="lg" className="gap-2">
              Get Started <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/docs/api">
            <Button size="lg" variant="outline" className="gap-2">
              <Code2 className="h-4 w-4" /> API Reference
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/docs/getting-started" className="group">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Rocket className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Quick Start</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Get up and running in less than 5 minutes. Connect your first data source
                and ask your first question.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/docs/features" className="group">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Features</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Explore all the features including dashboards, NLQ, anomaly detection,
                reports, and more.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>

        <Link href="/docs/connectors" className="group">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Plug className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Connectors</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Connect Shopify, Stripe, Google Analytics, and more to unify your business data.
              </CardDescription>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* AI Agents Section */}
      <div className="space-y-6">
        <div>
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            AI Agents
          </h2>
          <p className="text-muted-foreground mt-1">
            Three specialized AI agents that work together to understand your business.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/docs/agents/analytics">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Analytics Agent</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Ask questions about revenue, customers, and trends in plain English.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/docs/agents/marketing">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Marketing Agent</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Understand campaign performance, get budget recommendations, generate ad copy.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/docs/agents/commerce-ops">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5 text-primary" />
                  <CardTitle className="text-base">Commerce Ops Agent</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm">
                  Inventory alerts, pricing analysis, and multi-channel coordination.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* Use Cases */}
      <div className="space-y-6">
        <div>
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            Built for Modern Businesses
          </h2>
          <p className="text-muted-foreground mt-1">
            Whether you run an ecommerce store or a SaaS product, AI Business OS adapts to your needs.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Ecommerce
              </CardTitle>
              <CardDescription>
                Perfect for Shopify stores, marketplaces, and D2C brands
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">-</span>
                  Revenue tracking and AOV analysis
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">-</span>
                  Customer segmentation (RFM analysis)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">-</span>
                  Inventory management and stock alerts
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">-</span>
                  Multi-channel sales tracking
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                SaaS
              </CardTitle>
              <CardDescription>
                Built for subscription businesses with Stripe integration
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <ul className="text-sm space-y-2 text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">-</span>
                  MRR/ARR tracking and forecasting
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">-</span>
                  Churn prediction and prevention
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">-</span>
                  Cohort analysis and LTV calculation
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">-</span>
                  Subscription health monitoring
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Example Questions */}
      <div className="space-y-6">
        <div>
          <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
            Ask in Plain English
          </h2>
          <p className="text-muted-foreground mt-1">
            No SQL required. Just ask what you want to know.
          </p>
        </div>

        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                'What was our revenue last month?',
                'Which products are selling best?',
                'Why did orders drop last week?',
                'Who are our top customers?',
                'What is our current MRR?',
                'Which campaigns have the best ROAS?',
                'Are any products running low on stock?',
                'What is the average order value trend?',
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

      {/* CTA */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Ready to get started?</h3>
              <p className="text-primary-foreground/80">
                Connect your first data source and see insights in minutes.
              </p>
            </div>
            <Link href="/signup">
              <Button variant="secondary" size="lg" className="gap-2">
                Start Free <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
