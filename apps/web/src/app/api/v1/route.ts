// Public API v1 - Root endpoint
import { NextResponse } from 'next/server';
import { API_VERSION } from '@/lib/api/response';

export async function GET() {
  return NextResponse.json({
    name: 'AI Business OS Public API',
    version: API_VERSION,
    documentation: '/api/docs',
    endpoints: {
      metrics: '/api/v1/metrics',
      reports: '/api/v1/reports',
      insights: '/api/v1/insights',
      anomalies: '/api/v1/anomalies',
      workspace: '/api/v1/workspace',
      connectors: '/api/v1/connectors',
      nlq: '/api/v1/nlq',
      webhooks: '/api/v1/webhooks',
    },
    authentication: {
      type: 'API Key',
      header: 'Authorization: Bearer <api_key>',
      alternative: 'X-API-Key: <api_key>',
    },
    rateLimit: {
      free: '60 requests/minute',
      starter: '300 requests/minute',
      pro: '1000 requests/minute',
      enterprise: '5000 requests/minute',
    },
  });
}

