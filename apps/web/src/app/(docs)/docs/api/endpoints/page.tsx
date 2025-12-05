'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { ChevronRight, Copy } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_ENDPOINTS = [
  {
    category: 'Metrics',
    endpoints: [
      {
        method: 'GET',
        path: '/metrics',
        description: 'Fetch workspace metrics and analytics data',
        scopes: ['read:metrics'],
        parameters: [
          { name: 'type', type: 'string', required: false, description: 'Metric type: all, revenue, orders, customers, products, mrr, subscriptions' },
          { name: 'vertical', type: 'string', required: false, description: 'Vertical: ecommerce, saas' },
          { name: 'period', type: 'string', required: false, description: 'Time period: 7d, 30d, 90d, 1y' },
          { name: 'start_date', type: 'string', required: false, description: 'Start date (ISO 8601)' },
          { name: 'end_date', type: 'string', required: false, description: 'End date (ISO 8601)' },
        ],
        response: `{
  "success": true,
  "data": {
    "workspaceId": "ws_abc123",
    "vertical": "ecommerce",
    "period": { 
      "start": "2024-01-01", 
      "end": "2024-01-31" 
    },
    "metrics": {
      "revenue": { 
        "total": 24500, 
        "currency": "USD",
        "previousTotal": 21000,
        "changePercent": 16.67
      },
      "orders": { 
        "total": 156,
        "previousTotal": 142,
        "changePercent": 9.86
      },
      "aov": {
        "value": 157.05,
        "currency": "USD"
      }
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
        path: '/reports',
        description: 'List generated reports or fetch a specific report',
        scopes: ['read:reports'],
        parameters: [
          { name: 'id', type: 'string', required: false, description: 'Report ID (for single report)' },
          { name: 'type', type: 'string', required: false, description: 'Report type: weekly, monthly' },
          { name: 'page', type: 'number', required: false, description: 'Page number (default: 1)' },
          { name: 'page_size', type: 'number', required: false, description: 'Items per page (max: 100)' },
        ],
        response: `{
  "success": true,
  "data": [
    {
      "id": "rpt_xyz789",
      "type": "weekly",
      "period": { 
        "start": "2024-01-01", 
        "end": "2024-01-07" 
      },
      "summary": "Revenue increased 12% this week...",
      "highlights": [
        "Best day was Tuesday with $4,200 revenue",
        "New customer acquisition up 18%"
      ],
      "createdAt": "2024-01-08T00:00:00Z"
    }
  ],
  "meta": { 
    "page": 1, 
    "pageSize": 20, 
    "total": 10 
  }
}`,
      },
    ],
  },
  {
    category: 'Insights',
    endpoints: [
      {
        method: 'GET',
        path: '/insights',
        description: 'List AI-generated insights',
        scopes: ['read:insights'],
        parameters: [
          { name: 'type', type: 'string', required: false, description: 'Type: opportunity, risk, general' },
          { name: 'category', type: 'string', required: false, description: 'Category: revenue, churn, growth' },
          { name: 'status', type: 'string', required: false, description: 'Status: active, dismissed, expired' },
          { name: 'priority', type: 'string', required: false, description: 'Priority: high, medium, low' },
        ],
        response: `{
  "success": true,
  "data": [
    {
      "id": "ins_abc123",
      "type": "opportunity",
      "category": "growth",
      "title": "High-value segment growing",
      "description": "Customers in the 'VIP' segment increased 25%...",
      "priority": "high",
      "data": { "segmentGrowth": 0.25 },
      "recommendation": "Consider a targeted campaign...",
      "createdAt": "2024-01-15T10:00:00Z",
      "expiresAt": "2024-01-22T10:00:00Z"
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
        path: '/anomalies',
        description: 'List detected anomalies',
        scopes: ['read:anomalies'],
        parameters: [
          { name: 'metric', type: 'string', required: false, description: 'Metric: revenue, orders, mrr' },
          { name: 'severity', type: 'string', required: false, description: 'Severity: high, medium, low' },
          { name: 'resolved', type: 'boolean', required: false, description: 'Filter by resolved status' },
        ],
        response: `{
  "success": true,
  "data": [
    {
      "id": "ano_xyz789",
      "metricName": "revenue",
      "expectedValue": 25000,
      "actualValue": 18000,
      "deviation": -7000,
      "deviationPercent": -28,
      "severity": "high",
      "explanation": "Revenue dropped significantly due to...",
      "detectedAt": "2024-01-15T08:00:00Z",
      "resolved": false
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
        path: '/nlq',
        description: 'Ask natural language questions about your data',
        scopes: ['nlq:query'],
        body: `{
  "question": "What was our revenue last month?",
  "vertical": "ecommerce"
}`,
        response: `{
  "success": true,
  "data": {
    "question": "What was our revenue last month?",
    "answer": "Your revenue last month was $24,500, which is a 12% increase compared to the previous month.",
    "intent": "revenue_query",
    "data": {
      "revenue": 24500,
      "currency": "USD",
      "period": "last_month",
      "comparison": {
        "previousValue": 21875,
        "changePercent": 12
      }
    },
    "processingTimeMs": 342
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
        path: '/workspace',
        description: 'Get workspace information',
        scopes: ['read:workspace'],
        response: `{
  "success": true,
  "data": {
    "id": "ws_abc123",
    "name": "My Store",
    "verticalType": "ecommerce",
    "currency": "USD",
    "timezone": "America/New_York",
    "connectorCount": 3,
    "createdAt": "2024-01-01T00:00:00Z"
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
        path: '/connectors',
        description: 'List connected data sources',
        scopes: ['read:connectors'],
        response: `{
  "success": true,
  "data": [
    {
      "id": "con_abc123",
      "provider": "shopify",
      "status": "active",
      "lastSyncAt": "2024-01-15T08:00:00Z",
      "lastSyncStatus": "success",
      "recordsImported": 1524
    }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/connectors',
        description: 'Trigger a connector sync',
        scopes: ['write:connectors'],
        body: `{
  "connector_id": "con_abc123",
  "sync_type": "incremental"
}`,
        response: `{
  "success": true,
  "data": {
    "syncId": "sync_xyz789",
    "status": "pending",
    "startedAt": "2024-01-15T10:00:00Z"
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
        path: '/webhooks',
        description: 'List webhook endpoints',
        scopes: ['write:webhooks'],
        response: `{
  "success": true,
  "data": [
    {
      "id": "wh_abc123",
      "name": "Production Webhook",
      "url": "https://example.com/webhook",
      "events": ["anomaly.detected", "report.generated"],
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}`,
      },
      {
        method: 'POST',
        path: '/webhooks',
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
    "id": "wh_xyz789",
    "name": "My Webhook",
    "secret": "whsec_xxxxxxxxxxxxxxxx"
  }
}`,
      },
    ],
  },
];

export default function ApiEndpointsPage() {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied', description: 'Copied to clipboard' });
  };

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/docs/api" className="hover:text-foreground">API Reference</Link>
          <ChevronRight className="h-4 w-4" />
          <span>Endpoints</span>
        </div>
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
          API Endpoints
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Complete reference for all AI Business OS API endpoints.
        </p>
      </div>

      {/* Base URL */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Base URL</h4>
              <code className="text-sm text-muted-foreground">
                https://app.aibusinessos.com/api/v1
              </code>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => copyToClipboard('https://app.aibusinessos.com/api/v1')}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Endpoints */}
      <Accordion type="single" collapsible className="space-y-4">
        {API_ENDPOINTS.map((category) => (
          <AccordionItem key={category.category} value={category.category} className="border rounded-lg px-4">
            <AccordionTrigger className="hover:no-underline">
              <span className="font-semibold">{category.category}</span>
              <Badge variant="secondary" className="ml-2">
                {category.endpoints.length} endpoint{category.endpoints.length > 1 ? 's' : ''}
              </Badge>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-8 pt-4">
                {category.endpoints.map((endpoint, idx) => (
                  <div key={idx} className="border-t pt-4 first:border-t-0 first:pt-0">
                    <div className="flex items-center gap-3 mb-3">
                      <Badge variant={endpoint.method === 'GET' ? 'outline' : 'default'}>
                        {endpoint.method}
                      </Badge>
                      <code className="text-sm font-medium">/api/v1{endpoint.path}</code>
                    </div>
                    <p className="text-sm text-muted-foreground mb-4">
                      {endpoint.description}
                    </p>

                    <div className="text-xs text-muted-foreground mb-4">
                      Required scopes: {endpoint.scopes.map(s => (
                        <Badge key={s} variant="secondary" className="ml-1">{s}</Badge>
                      ))}
                    </div>

                    {'parameters' in endpoint && endpoint.parameters && (
                      <div className="mb-4">
                        <h5 className="text-sm font-medium mb-2">Query Parameters</h5>
                        <div className="space-y-2">
                          {endpoint.parameters.map((param) => (
                            <div key={param.name} className="text-sm flex items-start gap-2">
                              <code className="bg-muted px-1.5 py-0.5 rounded text-xs shrink-0">{param.name}</code>
                              <span className="text-muted-foreground text-xs">
                                ({param.type}) {param.description}
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
                      <div className="relative">
                        <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
                          {endpoint.response}
                        </pre>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(endpoint.response)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
