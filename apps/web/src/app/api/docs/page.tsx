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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Copy, Check, ExternalLink } from 'lucide-react';
import Link from 'next/link';

const endpoints = [
  {
    method: 'GET',
    path: '/api/v1/metrics',
    description: 'Get workspace metrics',
    scope: 'read:metrics',
    params: [
      { name: 'type', type: 'string', description: 'Metric type: all, revenue, orders, customers, products, mrr, subscriptions, invoices' },
      { name: 'vertical', type: 'string', description: 'Vertical type: ecommerce, saas' },
      { name: 'period', type: 'string', description: 'Time period: 7d, 30d, 3m, 1y' },
      { name: 'start_date', type: 'string', description: 'Start date (ISO 8601)' },
      { name: 'end_date', type: 'string', description: 'End date (ISO 8601)' },
      { name: 'granularity', type: 'string', description: 'Data granularity: hour, day, week, month' },
    ],
  },
  {
    method: 'GET',
    path: '/api/v1/reports',
    description: 'List or fetch reports',
    scope: 'read:reports',
    params: [
      { name: 'id', type: 'string', description: 'Report ID (for single report)' },
      { name: 'type', type: 'string', description: 'Report type: weekly, monthly' },
      { name: 'page', type: 'number', description: 'Page number (default: 1)' },
      { name: 'page_size', type: 'number', description: 'Items per page (default: 20, max: 100)' },
    ],
  },
  {
    method: 'GET',
    path: '/api/v1/insights',
    description: 'List AI-generated insights',
    scope: 'read:insights',
    params: [
      { name: 'type', type: 'string', description: 'Insight type: opportunity, risk, general' },
      { name: 'category', type: 'string', description: 'Category: revenue, churn, growth' },
      { name: 'status', type: 'string', description: 'Status: active, dismissed, expired' },
      { name: 'priority', type: 'string', description: 'Priority: high, medium, low' },
    ],
  },
  {
    method: 'GET',
    path: '/api/v1/anomalies',
    description: 'List detected anomalies',
    scope: 'read:anomalies',
    params: [
      { name: 'metric', type: 'string', description: 'Metric name' },
      { name: 'severity', type: 'string', description: 'Severity: high, medium, low' },
      { name: 'resolved', type: 'boolean', description: 'Filter by resolved status' },
    ],
  },
  {
    method: 'GET',
    path: '/api/v1/workspace',
    description: 'Get workspace information',
    scope: 'read:workspace',
    params: [],
  },
  {
    method: 'GET',
    path: '/api/v1/connectors',
    description: 'List connectors',
    scope: 'read:connectors',
    params: [
      { name: 'provider', type: 'string', description: 'Filter by provider: shopify, stripe, ga4' },
      { name: 'status', type: 'string', description: 'Filter by status: active, inactive, error' },
    ],
  },
  {
    method: 'POST',
    path: '/api/v1/connectors',
    description: 'Trigger connector sync',
    scope: 'write:connectors',
    params: [
      { name: 'connector_id', type: 'string', description: 'Connector ID (required)' },
      { name: 'sync_type', type: 'string', description: 'Sync type: full, incremental' },
    ],
  },
  {
    method: 'POST',
    path: '/api/v1/nlq',
    description: 'Natural language query',
    scope: 'nlq:query',
    params: [
      { name: 'question', type: 'string', description: 'Natural language question (required)' },
      { name: 'vertical', type: 'string', description: 'Vertical type override' },
    ],
  },
  {
    method: 'GET',
    path: '/api/v1/webhooks',
    description: 'List webhook endpoints',
    scope: 'write:webhooks',
    params: [
      { name: 'active', type: 'boolean', description: 'Filter by active status' },
    ],
  },
  {
    method: 'POST',
    path: '/api/v1/webhooks',
    description: 'Create webhook endpoint',
    scope: 'write:webhooks',
    params: [
      { name: 'name', type: 'string', description: 'Webhook name (required)' },
      { name: 'url', type: 'string', description: 'Endpoint URL (required)' },
      { name: 'events', type: 'string[]', description: 'Events to subscribe to (required)' },
      { name: 'description', type: 'string', description: 'Description' },
      { name: 'max_retries', type: 'number', description: 'Max retry attempts (default: 3)' },
    ],
  },
];

const webhookEvents = [
  { event: 'anomaly.detected', description: 'When an anomaly is detected in metrics' },
  { event: 'report.generated', description: 'When a new report is generated' },
  { event: 'sync.completed', description: 'When a connector sync completes successfully' },
  { event: 'sync.failed', description: 'When a connector sync fails' },
  { event: 'insight.created', description: 'When a new insight is generated' },
  { event: 'metric.threshold_exceeded', description: 'When a metric exceeds a threshold' },
  { event: 'connector.connected', description: 'When a new connector is connected' },
  { event: 'connector.disconnected', description: 'When a connector is disconnected' },
];

const errorCodes = [
  { code: 'UNAUTHORIZED', status: 401, description: 'API key required or invalid' },
  { code: 'INVALID_API_KEY', status: 401, description: 'API key format is invalid' },
  { code: 'API_KEY_EXPIRED', status: 401, description: 'API key has expired' },
  { code: 'INSUFFICIENT_SCOPE', status: 403, description: 'Missing required scope' },
  { code: 'RATE_LIMIT_EXCEEDED', status: 429, description: 'Too many requests' },
  { code: 'VALIDATION_ERROR', status: 400, description: 'Request validation failed' },
  { code: 'NOT_FOUND', status: 404, description: 'Resource not found' },
  { code: 'INTERNAL_ERROR', status: 500, description: 'Server error' },
];

export default function ApiDocsPage() {
  const [copied, setCopied] = useState<string | null>(null);

  const copyCode = async (code: string, id: string) => {
    await navigator.clipboard.writeText(code);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">AI Business OS API</h1>
              <p className="text-muted-foreground mt-1">
                REST API documentation for programmatic access
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Badge variant="outline">v1</Badge>
              <Link href="/dashboard/developer">
                <Button>Get API Key</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="quickstart" className="space-y-8">
          <TabsList>
            <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
            <TabsTrigger value="authentication">Authentication</TabsTrigger>
            <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
            <TabsTrigger value="webhooks">Webhooks</TabsTrigger>
            <TabsTrigger value="errors">Errors</TabsTrigger>
          </TabsList>

          {/* Quick Start */}
          <TabsContent value="quickstart" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Getting Started</CardTitle>
                <CardDescription>
                  Start using the AI Business OS API in minutes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">1. Create an API Key</h3>
                  <p className="text-muted-foreground mb-4">
                    Go to the{' '}
                    <Link href="/dashboard/developer" className="text-primary underline">
                      Developer Settings
                    </Link>{' '}
                    page to create your first API key.
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">2. Make Your First Request</h3>
                  <div className="relative">
                    <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`curl -X GET "https://your-domain.com/api/v1/metrics" \\
  -H "Authorization: Bearer aibos_your_api_key"`}
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-2 right-2"
                      onClick={() => copyCode(`curl -X GET "https://your-domain.com/api/v1/metrics" \\\n  -H "Authorization: Bearer aibos_your_api_key"`, 'quickstart')}
                    >
                      {copied === 'quickstart' ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">3. Example Response</h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`{
  "success": true,
  "data": {
    "workspaceId": "ws_123...",
    "vertical": "ecommerce",
    "period": {
      "start": "2024-01-01T00:00:00Z",
      "end": "2024-01-31T23:59:59Z"
    },
    "metrics": {
      "revenue": {
        "total": 24500.00,
        "currency": "USD",
        "orderCount": 156,
        "averageOrderValue": 157.05
      }
    }
  }
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Base URL</h3>
                  <code className="p-2 bg-muted rounded">/api/v1</code>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Authentication */}
          <TabsContent value="authentication" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Authentication</CardTitle>
                <CardDescription>
                  All API requests require authentication using an API key
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">API Key Format</h3>
                  <p className="text-muted-foreground mb-2">
                    API keys start with <code className="bg-muted px-1 rounded">aibos_</code> followed by 64 hexadecimal characters.
                  </p>
                  <code className="block p-2 bg-muted rounded text-sm">aibos_a1b2c3d4...</code>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Authentication Methods</h3>
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">Authorization Header (recommended)</p>
                      <code className="block p-2 bg-muted rounded text-sm">
                        Authorization: Bearer aibos_your_api_key
                      </code>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground mb-1">X-API-Key Header</p>
                      <code className="block p-2 bg-muted rounded text-sm">
                        X-API-Key: aibos_your_api_key
                      </code>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Rate Limiting</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tier</TableHead>
                        <TableHead>Requests/Minute</TableHead>
                        <TableHead>Requests/Second</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow><TableCell>Free</TableCell><TableCell>60</TableCell><TableCell>1</TableCell></TableRow>
                      <TableRow><TableCell>Starter</TableCell><TableCell>300</TableCell><TableCell>5</TableCell></TableRow>
                      <TableRow><TableCell>Pro</TableCell><TableCell>1,000</TableCell><TableCell>17</TableCell></TableRow>
                      <TableRow><TableCell>Enterprise</TableCell><TableCell>5,000</TableCell><TableCell>83</TableCell></TableRow>
                    </TableBody>
                  </Table>
                  <p className="text-sm text-muted-foreground mt-2">
                    Rate limit headers: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Scopes</h3>
                  <p className="text-muted-foreground mb-4">
                    API keys have scopes that control what actions they can perform:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {['read:metrics', 'read:reports', 'read:insights', 'read:anomalies', 'read:workspace', 'read:connectors', 'write:connectors', 'write:webhooks', 'nlq:query'].map((scope) => (
                      <code key={scope} className="p-2 bg-muted rounded text-sm">{scope}</code>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Endpoints */}
          <TabsContent value="endpoints" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>API Endpoints</CardTitle>
                <CardDescription>
                  Complete reference for all available endpoints
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="w-full">
                  {endpoints.map((endpoint, index) => (
                    <AccordionItem key={index} value={`endpoint-${index}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3">
                          <Badge variant={endpoint.method === 'GET' ? 'default' : 'secondary'}>
                            {endpoint.method}
                          </Badge>
                          <code className="text-sm">{endpoint.path}</code>
                          <span className="text-muted-foreground text-sm">{endpoint.description}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent>
                        <div className="space-y-4 pt-4">
                          <div>
                            <p className="text-sm font-medium mb-1">Required Scope</p>
                            <code className="text-sm bg-muted px-2 py-1 rounded">{endpoint.scope}</code>
                          </div>
                          {endpoint.params.length > 0 && (
                            <div>
                              <p className="text-sm font-medium mb-2">Parameters</p>
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Description</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {endpoint.params.map((param, pIndex) => (
                                    <TableRow key={pIndex}>
                                      <TableCell><code>{param.name}</code></TableCell>
                                      <TableCell>{param.type}</TableCell>
                                      <TableCell className="text-muted-foreground">{param.description}</TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Webhooks */}
          <TabsContent value="webhooks" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Webhooks</CardTitle>
                <CardDescription>
                  Receive real-time notifications when events occur
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Available Events</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Event</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {webhookEvents.map((event, index) => (
                        <TableRow key={index}>
                          <TableCell><code>{event.event}</code></TableCell>
                          <TableCell className="text-muted-foreground">{event.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Webhook Payload</h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`{
  "event": "anomaly.detected",
  "timestamp": "2024-01-15T10:30:00Z",
  "workspace_id": "ws_123...",
  "data": {
    "id": "anom_456...",
    "metric_name": "revenue",
    "severity": "high",
    "expected_value": 5000,
    "actual_value": 2500,
    "deviation_percent": -50
  }
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Signature Verification</h3>
                  <p className="text-muted-foreground mb-4">
                    Verify webhook authenticity using the X-Webhook-Signature header:
                  </p>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`// Header format: t=timestamp,v1=signature
const signature = headers['x-webhook-signature'];
const [timestamp, hash] = signature.split(',').map(p => p.split('=')[1]);

const expected = crypto
  .createHmac('sha256', webhookSecret)
  .update(\`\${timestamp}.\${JSON.stringify(payload)}\`)
  .digest('hex');

const isValid = crypto.timingSafeEqual(
  Buffer.from(hash),
  Buffer.from(expected)
);`}
                  </pre>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Errors */}
          <TabsContent value="errors" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Error Handling</CardTitle>
                <CardDescription>
                  Error codes and troubleshooting guide
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Error Response Format</h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": {}  // Optional additional info
  }
}`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Error Codes</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Code</TableHead>
                        <TableHead>HTTP Status</TableHead>
                        <TableHead>Description</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {errorCodes.map((error, index) => (
                        <TableRow key={index}>
                          <TableCell><code>{error.code}</code></TableCell>
                          <TableCell>{error.status}</TableCell>
                          <TableCell className="text-muted-foreground">{error.description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
