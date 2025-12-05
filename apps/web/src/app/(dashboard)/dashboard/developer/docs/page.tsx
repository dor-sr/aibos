'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Copy, ExternalLink } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_ENDPOINTS = [
  {
    category: 'Metrics',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/metrics',
        description: 'Fetch workspace metrics and analytics data',
        scopes: ['read:metrics'],
        parameters: [
          { name: 'type', type: 'string', description: 'Metric type: all, revenue, orders, customers, products, mrr, subscriptions' },
          { name: 'vertical', type: 'string', description: 'Vertical: ecommerce, saas' },
          { name: 'period', type: 'string', description: 'Time period: 7d, 30d, 90d, 1y' },
          { name: 'start_date', type: 'string', description: 'Start date (ISO 8601)' },
          { name: 'end_date', type: 'string', description: 'End date (ISO 8601)' },
        ],
        response: `{
  "success": true,
  "data": {
    "workspaceId": "uuid",
    "vertical": "ecommerce",
    "period": { "start": "...", "end": "..." },
    "metrics": {
      "revenue": { "total": 24500, "currency": "USD", ... },
      "orders": { "total": 156, ... }
    }
  }
}`,
      },
    ],
  },
  {
    category: 'Reports',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/reports',
        description: 'List generated reports or fetch a specific report',
        scopes: ['read:reports'],
        parameters: [
          { name: 'id', type: 'string', description: 'Report ID (optional, for single report)' },
          { name: 'type', type: 'string', description: 'Report type: weekly, monthly' },
          { name: 'page', type: 'number', description: 'Page number (default: 1)' },
          { name: 'page_size', type: 'number', description: 'Items per page (default: 20, max: 100)' },
        ],
        response: `{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "weekly",
      "period": { "start": "...", "end": "..." },
      "summary": "...",
      "createdAt": "..."
    }
  ],
  "meta": { "page": 1, "pageSize": 20, "total": 10 }
}`,
      },
    ],
  },
  {
    category: 'Insights',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/insights',
        description: 'List AI-generated insights',
        scopes: ['read:insights'],
        parameters: [
          { name: 'type', type: 'string', description: 'Insight type: opportunity, risk, general' },
          { name: 'category', type: 'string', description: 'Category: revenue, churn, growth' },
          { name: 'status', type: 'string', description: 'Status: active, dismissed, expired' },
          { name: 'priority', type: 'string', description: 'Priority: high, medium, low' },
        ],
        response: `{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "opportunity",
      "title": "...",
      "description": "...",
      "priority": "high",
      "createdAt": "..."
    }
  ]
}`,
      },
    ],
  },
  {
    category: 'Anomalies',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/anomalies',
        description: 'List detected anomalies',
        scopes: ['read:anomalies'],
        parameters: [
          { name: 'metric', type: 'string', description: 'Metric name: revenue, orders, mrr' },
          { name: 'severity', type: 'string', description: 'Severity: high, medium, low' },
          { name: 'resolved', type: 'boolean', description: 'Filter by resolved status' },
        ],
        response: `{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "metricName": "revenue",
      "expectedValue": 25000,
      "actualValue": 18000,
      "deviation": -7000,
      "severity": "high",
      "explanation": "..."
    }
  ]
}`,
      },
    ],
  },
  {
    category: 'Natural Language Query',
    endpoints: [
      {
        method: 'POST',
        path: '/api/v1/nlq',
        description: 'Ask natural language questions about your data',
        scopes: ['nlq:query'],
        body: `{
  "question": "What was our revenue last month?",
  "vertical": "ecommerce" // optional
}`,
        response: `{
  "success": true,
  "data": {
    "question": "What was our revenue last month?",
    "answer": "Your revenue last month was $24,500...",
    "data": { ... },
    "isDemo": false
  }
}`,
      },
    ],
  },
  {
    category: 'Webhooks',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/webhooks',
        description: 'List outbound webhook endpoints',
        scopes: ['write:webhooks'],
        response: `{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Production Webhook",
      "url": "https://...",
      "events": ["anomaly.detected", "report.generated"],
      "isActive": true
    }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/api/v1/webhooks',
        description: 'Create a new webhook endpoint',
        scopes: ['write:webhooks'],
        body: `{
  "name": "My Webhook",
  "url": "https://example.com/webhook",
  "events": ["anomaly.detected", "report.generated"],
  "custom_headers": { "X-Custom": "value" }
}`,
        response: `{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Webhook",
    "secret": "whsec_..." // Only shown once!
  }
}`,
      },
    ],
  },
  {
    category: 'Workspace',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/workspace',
        description: 'Get workspace information',
        scopes: ['read:workspace'],
        response: `{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "My Workspace",
    "verticalType": "ecommerce",
    "connectorCount": 3
  }
}`,
      },
    ],
  },
  {
    category: 'Connectors',
    endpoints: [
      {
        method: 'GET',
        path: '/api/v1/connectors',
        description: 'List connected data sources',
        scopes: ['read:connectors'],
        response: `{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "provider": "shopify",
      "status": "active",
      "lastSyncAt": "..."
    }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/api/v1/connectors',
        description: 'Trigger a connector sync',
        scopes: ['write:connectors'],
        body: `{
  "connector_id": "uuid",
  "sync_type": "incremental" // or "full"
}`,
        response: `{
  "success": true,
  "data": {
    "syncId": "uuid",
    "status": "pending"
  }
}`,
      },
    ],
  },
];

const WEBHOOK_EVENTS = [
  { event: 'anomaly.detected', description: 'Triggered when an anomaly is detected in your metrics' },
  { event: 'report.generated', description: 'Triggered when a new report is generated' },
  { event: 'sync.completed', description: 'Triggered when a connector sync completes successfully' },
  { event: 'sync.failed', description: 'Triggered when a connector sync fails' },
  { event: 'insight.created', description: 'Triggered when a new insight is generated' },
  { event: 'metric.threshold_exceeded', description: 'Triggered when a metric exceeds a configured threshold' },
  { event: 'connector.connected', description: 'Triggered when a new connector is connected' },
  { event: 'connector.disconnected', description: 'Triggered when a connector is disconnected' },
];

export default function ApiDocsPage() {
  const { toast } = useToast();
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Copied to clipboard' });
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-5xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">API Documentation</h1>
        <p className="text-muted-foreground mt-2">
          Complete reference for the AI Business OS public API.
        </p>
      </div>

      <Tabs defaultValue="getting-started">
        <TabsList className="mb-6">
          <TabsTrigger value="getting-started">Getting Started</TabsTrigger>
          <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
          <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
          <TabsTrigger value="embeds">Embeds</TabsTrigger>
        </TabsList>

        {/* Getting Started */}
        <TabsContent value="getting-started">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>
                  All API requests require authentication using an API key.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">API Key Header</h4>
                  <p className="text-sm text-muted-foreground mb-2">
                    Include your API key in the Authorization header:
                  </p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-3 bg-muted rounded-lg text-sm">
                      Authorization: Bearer aibos_your_api_key_here
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard('Authorization: Bearer aibos_your_api_key_here')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Alternative Header</h4>
                  <code className="block p-3 bg-muted rounded-lg text-sm">
                    X-API-Key: aibos_your_api_key_here
                  </code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Base URL</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <code className="flex-1 p-3 bg-muted rounded-lg text-sm">
                    {baseUrl}/api/v1
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(`${baseUrl}/api/v1`)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Rate Limits</CardTitle>
                <CardDescription>
                  Rate limits are applied per API key based on your plan tier.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { tier: 'Free', limit: '60 req/min' },
                    { tier: 'Starter', limit: '300 req/min' },
                    { tier: 'Pro', limit: '1,000 req/min' },
                    { tier: 'Enterprise', limit: '5,000 req/min' },
                  ].map(({ tier, limit }) => (
                    <div key={tier} className="p-4 bg-muted rounded-lg text-center">
                      <div className="font-medium">{tier}</div>
                      <div className="text-sm text-muted-foreground">{limit}</div>
                    </div>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Rate limit headers are included in every response: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Example Request</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`curl -X GET "${baseUrl}/api/v1/metrics?period=30d" \\
  -H "Authorization: Bearer aibos_your_api_key_here" \\
  -H "Content-Type: application/json"`}
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Endpoints */}
        <TabsContent value="endpoints">
          <Accordion type="single" collapsible className="space-y-4">
            {API_ENDPOINTS.map((category) => (
              <AccordionItem key={category.category} value={category.category} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <span className="font-semibold">{category.category}</span>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-6 pt-4">
                    {category.endpoints.map((endpoint, idx) => (
                      <div key={idx} className="border-t pt-4 first:border-t-0 first:pt-0">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant={endpoint.method === 'GET' ? 'outline' : 'default'}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm">{endpoint.path}</code>
                        </div>
                        <p className="text-sm text-muted-foreground mb-4">
                          {endpoint.description}
                        </p>

                        <div className="text-xs text-muted-foreground mb-2">
                          Required scopes: {endpoint.scopes.map(s => (
                            <Badge key={s} variant="secondary" className="ml-1">{s}</Badge>
                          ))}
                        </div>

                        {'parameters' in endpoint && endpoint.parameters && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium mb-2">Parameters</h5>
                            <div className="space-y-1">
                              {endpoint.parameters.map((param) => (
                                <div key={param.name} className="text-sm">
                                  <code className="text-xs bg-muted px-1 rounded">{param.name}</code>
                                  <span className="text-muted-foreground ml-2">
                                    ({param.type}) - {param.description}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {'body' in endpoint && endpoint.body && (
                          <div className="mb-4">
                            <h5 className="text-sm font-medium mb-2">Request Body</h5>
                            <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                              {endpoint.body}
                            </pre>
                          </div>
                        )}

                        <div>
                          <h5 className="text-sm font-medium mb-2">Response</h5>
                          <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                            {endpoint.response}
                          </pre>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </TabsContent>

        {/* Webhooks */}
        <TabsContent value="webhooks">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Webhook Events</CardTitle>
                <CardDescription>
                  Subscribe to these events to receive real-time notifications.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {WEBHOOK_EVENTS.map((item) => (
                    <div key={item.event} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                      <code className="text-sm font-medium shrink-0">{item.event}</code>
                      <span className="text-sm text-muted-foreground">{item.description}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Webhook Payload</CardTitle>
                <CardDescription>
                  All webhook events follow this payload structure.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`{
  "event": "anomaly.detected",
  "timestamp": "2024-01-15T10:30:00Z",
  "workspace_id": "uuid",
  "data": {
    "anomaly_id": "uuid",
    "metric_name": "revenue",
    "severity": "high",
    "deviation_percent": -28.5
  }
}`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Signature Verification</CardTitle>
                <CardDescription>
                  Verify webhook authenticity using the signature header.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  Each webhook includes an X-Webhook-Signature header with format: t=timestamp,v1=signature
                </p>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`// Node.js verification example
const crypto = require('crypto');

function verifyWebhook(payload, signature, secret) {
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const sig = parts.find(p => p.startsWith('v1='))?.slice(3);
  
  const expected = crypto
    .createHmac('sha256', secret)
    .update(\`\${timestamp}.\${payload}\`)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(sig, 'hex'),
    Buffer.from(expected, 'hex')
  );
}`}
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Embeds */}
        <TabsContent value="embeds">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Embeddable Analytics</CardTitle>
                <CardDescription>
                  Embed AI Business OS dashboards and charts in your own applications.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Embed Types</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted rounded-lg">
                      <code className="text-sm">/embed/metrics</code>
                      <p className="text-sm text-muted-foreground mt-1">Key metric cards</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <code className="text-sm">/embed/chart</code>
                      <p className="text-sm text-muted-foreground mt-1">Single chart visualization</p>
                    </div>
                    <div className="p-4 bg-muted rounded-lg">
                      <code className="text-sm">/embed/dashboard</code>
                      <p className="text-sm text-muted-foreground mt-1">Full dashboard view</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Embed URL Format</h4>
                  <code className="block p-3 bg-muted rounded-lg text-sm">
                    {baseUrl}/embed/[type]?token=embed_your_token_here
                  </code>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>iframe Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`<iframe
  src="${baseUrl}/embed/dashboard?token=embed_your_token"
  width="100%"
  height="600"
  frameborder="0"
  allow="clipboard-write"
></iframe>`}
                </pre>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Customization Options</CardTitle>
                <CardDescription>
                  Configure embed appearance when creating tokens.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`{
  "customization": {
    "hideHeader": false,      // Hide embed header
    "hideBranding": false,    // Hide "Powered by" branding
    "theme": "light",         // "light", "dark", or "auto"
    "primaryColor": "#6366f1", // Custom primary color
    "fontFamily": "Inter"     // Custom font family
  }
}`}
                </pre>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
