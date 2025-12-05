import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  ChevronRight,
  Code2,
  FileText,
  Globe,
  Key,
  Lock,
  Webhook,
  Zap,
} from 'lucide-react';

export default function ApiOverviewPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
          <ChevronRight className="h-4 w-4" />
          <span>API Reference</span>
        </div>
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
          API Reference
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Build integrations with the AI Business OS REST API. Access metrics, reports,
          insights, and more programmatically.
        </p>
        <div className="flex gap-3 pt-2">
          <Link href="/docs/api/authentication">
            <Button variant="outline" className="gap-2">
              <Key className="h-4 w-4" /> Authentication
            </Button>
          </Link>
          <Link href="/docs/api/endpoints">
            <Button variant="outline" className="gap-2">
              <Code2 className="h-4 w-4" /> Endpoints
            </Button>
          </Link>
        </div>
      </div>

      {/* Quick Start */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Quick Start
        </h2>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6 space-y-4">
            <div>
              <h4 className="font-medium mb-2">1. Get your API key</h4>
              <p className="text-sm text-muted-foreground">
                Go to Dashboard &gt; Developer &gt; API Keys and create a new key.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">2. Make your first request</h4>
              <pre className="p-4 bg-white rounded-lg border text-sm overflow-x-auto">
{`curl -X GET "https://app.aibusinessos.com/api/v1/metrics?period=30d" \\
  -H "Authorization: Bearer aibos_your_api_key_here" \\
  -H "Content-Type: application/json"`}
              </pre>
            </div>
            <div>
              <h4 className="font-medium mb-2">3. Parse the response</h4>
              <pre className="p-4 bg-white rounded-lg border text-sm overflow-x-auto">
{`{
  "success": true,
  "data": {
    "workspaceId": "ws_123",
    "vertical": "ecommerce",
    "metrics": {
      "revenue": { "total": 24500, "currency": "USD" },
      "orders": { "total": 156 }
    }
  }
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Sections */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          API Sections
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/docs/api/authentication">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Key className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Authentication</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Learn how to authenticate requests using API keys, manage scopes,
                  and handle rate limits.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/docs/api/endpoints">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Code2 className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Endpoints</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Full reference for all API endpoints including metrics, reports,
                  insights, connectors, and NLQ.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Link href="/docs/api/webhooks">
            <Card className="h-full transition-colors hover:border-primary/50">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Webhook className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle className="text-lg">Webhooks</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>
                  Receive real-time notifications for events like anomalies,
                  reports, and sync completions.
                </CardDescription>
              </CardContent>
            </Card>
          </Link>

          <Card className="h-full">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Globe className="h-5 w-5 text-primary" />
                </div>
                <CardTitle className="text-lg">Embeds</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription>
                Embed dashboards and charts in your own applications with
                customizable styling.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Base URL */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Base URL
        </h2>
        <Card>
          <CardContent className="pt-6">
            <code className="block p-4 bg-muted rounded-lg text-sm">
              https://app.aibusinessos.com/api/v1
            </code>
            <p className="text-sm text-muted-foreground mt-3">
              All API endpoints are versioned. The current version is <code className="bg-muted px-1 rounded">v1</code>.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Rate Limits */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Rate Limits
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              Rate limits are applied per API key based on your subscription plan:
            </p>
            <div className="grid gap-4 sm:grid-cols-4">
              {[
                { plan: 'Free', limit: '60 req/min' },
                { plan: 'Starter', limit: '300 req/min' },
                { plan: 'Pro', limit: '1,000 req/min' },
                { plan: 'Enterprise', limit: '5,000 req/min' },
              ].map((tier) => (
                <div key={tier.plan} className="p-4 bg-muted rounded-lg text-center">
                  <div className="font-medium">{tier.plan}</div>
                  <div className="text-sm text-muted-foreground">{tier.limit}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p className="font-medium">Response headers include:</p>
              <ul className="mt-1 space-y-1">
                <li><code className="bg-muted px-1 rounded">X-RateLimit-Limit</code> - Your rate limit</li>
                <li><code className="bg-muted px-1 rounded">X-RateLimit-Remaining</code> - Requests remaining</li>
                <li><code className="bg-muted px-1 rounded">X-RateLimit-Reset</code> - Unix timestamp when limit resets</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Endpoints */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Available Endpoints
        </h2>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[
                { method: 'GET', path: '/metrics', description: 'Fetch workspace metrics and analytics' },
                { method: 'GET', path: '/reports', description: 'List or fetch generated reports' },
                { method: 'GET', path: '/insights', description: 'List AI-generated insights' },
                { method: 'GET', path: '/anomalies', description: 'List detected anomalies' },
                { method: 'POST', path: '/nlq', description: 'Ask natural language questions' },
                { method: 'GET', path: '/workspace', description: 'Get workspace information' },
                { method: 'GET', path: '/connectors', description: 'List connected data sources' },
                { method: 'POST', path: '/connectors', description: 'Trigger a connector sync' },
                { method: 'GET', path: '/webhooks', description: 'List webhook endpoints' },
                { method: 'POST', path: '/webhooks', description: 'Create webhook endpoint' },
              ].map((endpoint) => (
                <div key={`${endpoint.method}-${endpoint.path}`} className="flex items-center gap-4">
                  <Badge variant={endpoint.method === 'GET' ? 'outline' : 'default'} className="w-16 justify-center">
                    {endpoint.method}
                  </Badge>
                  <code className="text-sm font-medium">/api/v1{endpoint.path}</code>
                  <span className="text-sm text-muted-foreground">{endpoint.description}</span>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Link href="/docs/api/endpoints">
                <Button variant="outline" className="gap-2">
                  View Full API Reference <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Handling */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Error Handling
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              All errors follow a consistent format:
            </p>
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Please retry after 60 seconds.",
    "details": { "retryAfter": 60 }
  }
}`}
            </pre>
            <div className="mt-4">
              <h4 className="font-medium mb-2">Common Error Codes</h4>
              <div className="grid gap-2 sm:grid-cols-2 text-sm">
                <div><code className="bg-muted px-1 rounded">401</code> - Invalid or missing API key</div>
                <div><code className="bg-muted px-1 rounded">403</code> - Insufficient permissions</div>
                <div><code className="bg-muted px-1 rounded">404</code> - Resource not found</div>
                <div><code className="bg-muted px-1 rounded">429</code> - Rate limit exceeded</div>
                <div><code className="bg-muted px-1 rounded">500</code> - Internal server error</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* SDKs */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          SDKs & Libraries
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              Official SDKs are coming soon. In the meantime, use any HTTP client:
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium text-sm">JavaScript/TypeScript</h4>
                <p className="text-xs text-muted-foreground mt-1">Use fetch or axios</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium text-sm">Python</h4>
                <p className="text-xs text-muted-foreground mt-1">Use requests library</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium text-sm">cURL</h4>
                <p className="text-xs text-muted-foreground mt-1">Direct HTTP requests</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Ready to build?</h3>
              <p className="text-primary-foreground/80">
                Create an API key and start integrating.
              </p>
            </div>
            <Link href="/dashboard/developer">
              <Button variant="secondary" size="lg">
                Go to Developer Settings
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
