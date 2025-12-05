import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronRight,
  CircleDot,
  Plug,
  Settings,
  UserPlus,
} from 'lucide-react';

export default function GettingStartedPage() {
  const steps = [
    {
      number: 1,
      title: 'Create Your Account',
      description: 'Sign up with your email or Google account. No credit card required to start.',
      icon: UserPlus,
      details: [
        'Go to the sign up page',
        'Enter your email and create a password',
        'Verify your email address',
        'You\'re in! Time to set up your workspace.',
      ],
    },
    {
      number: 2,
      title: 'Set Up Your Workspace',
      description: 'Create a workspace and choose your business vertical (Ecommerce or SaaS).',
      icon: Settings,
      details: [
        'Choose a name for your workspace',
        'Select your vertical: Ecommerce or SaaS',
        'This determines which metrics and dashboards you see',
        'You can have multiple workspaces for different businesses',
      ],
    },
    {
      number: 3,
      title: 'Connect Your Data',
      description: 'Link your data sources like Shopify, Stripe, or Google Analytics.',
      icon: Plug,
      details: [
        'Navigate to Dashboard > Connectors',
        'Click "Connect" on the data source you want to add',
        'Follow the OAuth flow to authorize access',
        'Data sync begins automatically (usually takes a few minutes)',
      ],
    },
    {
      number: 4,
      title: 'Ask Your First Question',
      description: 'Use natural language to get insights from your data.',
      icon: BarChart3,
      details: [
        'Go to your Dashboard',
        'Type a question in the Ask Box',
        'Example: "What was my revenue last month?"',
        'Get an instant AI-powered response with data',
      ],
    },
  ];

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
          <ChevronRight className="h-4 w-4" />
          <span>Getting Started</span>
        </div>
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
          Quick Start Guide
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Get AI-powered business insights in less than 5 minutes. Follow these steps to
          connect your data and start asking questions.
        </p>
      </div>

      {/* Prerequisites */}
      <Card className="bg-slate-50 border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Prerequisites</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              A business with data in Shopify, Stripe, or Google Analytics
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              Admin access to your data sources for OAuth authorization
            </li>
            <li className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600" />
              5 minutes of your time
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Steps */}
      <div className="space-y-8">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Step-by-Step Setup
        </h2>

        <div className="space-y-6">
          {steps.map((step) => {
            const Icon = step.icon;
            return (
              <Card key={step.number} className="relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold text-lg shrink-0">
                      {step.number}
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-primary" />
                        {step.title}
                      </CardTitle>
                      <CardDescription>{step.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="ml-14">
                  <ul className="space-y-2">
                    {step.details.map((detail, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <CircleDot className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                        <span>{detail}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Supported Data Sources */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Supported Data Sources
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { name: 'Shopify', type: 'Ecommerce', status: 'Available' },
            { name: 'Stripe', type: 'Payments/SaaS', status: 'Available' },
            { name: 'Google Analytics 4', type: 'Analytics', status: 'Available' },
            { name: 'Tiendanube', type: 'Ecommerce (LatAm)', status: 'Available' },
            { name: 'MercadoLibre', type: 'Marketplace', status: 'Available' },
            { name: 'Meta Ads', type: 'Marketing', status: 'Available' },
            { name: 'Google Ads', type: 'Marketing', status: 'Available' },
            { name: 'More coming', type: 'Various', status: 'Soon' },
          ].map((source) => (
            <Card key={source.name} className="text-center">
              <CardContent className="pt-4 pb-4">
                <div className="font-medium">{source.name}</div>
                <div className="text-xs text-muted-foreground">{source.type}</div>
                <Badge
                  variant={source.status === 'Available' ? 'default' : 'secondary'}
                  className="mt-2"
                >
                  {source.status}
                </Badge>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          <Link href="/docs/connectors" className="text-primary hover:underline">
            View full connector documentation
          </Link>
        </p>
      </div>

      {/* Example Questions by Vertical */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          What Can You Ask?
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ecommerce Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {[
                  'What was our revenue this month?',
                  'Which products are selling best?',
                  'What is our average order value?',
                  'How many new customers did we get?',
                  'Which products are low on stock?',
                  'What is our customer retention rate?',
                ].map((q) => (
                  <li key={q} className="flex items-start gap-2">
                    <span className="text-primary font-medium">Q:</span>
                    {q}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">SaaS Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {[
                  'What is our current MRR?',
                  'How many customers churned last month?',
                  'What is our net revenue retention?',
                  'Which plan has the most subscribers?',
                  'What is our average customer LTV?',
                  'Show me the MRR trend over time',
                ].map((q) => (
                  <li key={q} className="flex items-start gap-2">
                    <span className="text-primary font-medium">Q:</span>
                    {q}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Troubleshooting */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Common Issues
        </h2>

        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium">Data not showing after connecting?</h4>
                <p className="text-sm text-muted-foreground">
                  Initial sync can take a few minutes depending on data volume. Check the
                  Connectors page to see sync status. If it&apos;s been more than 10 minutes,
                  try triggering a manual sync.
                </p>
              </div>
              <div>
                <h4 className="font-medium">OAuth authorization failed?</h4>
                <p className="text-sm text-muted-foreground">
                  Make sure you have admin access to the data source. For Shopify, you need
                  to be a store owner or have sufficient permissions.
                </p>
              </div>
              <div>
                <h4 className="font-medium">Agent gives unexpected answers?</h4>
                <p className="text-sm text-muted-foreground">
                  Try rephrasing your question to be more specific. Include time periods
                  (e.g., &quot;last month&quot;, &quot;in 2024&quot;) and metric names
                  (e.g., &quot;revenue&quot;, &quot;orders&quot;) for better results.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Next Steps */}
      <div className="space-y-4">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Next Steps
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Link href="/docs/features">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardContent className="pt-4">
                <CardTitle className="text-sm mb-1">Explore Features</CardTitle>
                <CardDescription className="text-xs">
                  Learn about dashboards, reports, and anomaly detection.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
          <Link href="/docs/agents/analytics">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardContent className="pt-4">
                <CardTitle className="text-sm mb-1">Analytics Agent Guide</CardTitle>
                <CardDescription className="text-xs">
                  Deep dive into natural language queries.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
          <Link href="/docs/api">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardContent className="pt-4">
                <CardTitle className="text-sm mb-1">API Reference</CardTitle>
                <CardDescription className="text-xs">
                  Build integrations with our REST API.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>

      {/* CTA */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Ready to start?</h3>
              <p className="text-primary-foreground/80">
                Create your free account and connect your first data source.
              </p>
            </div>
            <Link href="/signup">
              <Button variant="secondary" size="lg" className="gap-2">
                Create Account <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
