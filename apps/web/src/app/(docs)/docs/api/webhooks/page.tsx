import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  ChevronRight,
  Webhook,
  Zap,
} from 'lucide-react';

export default function ApiWebhooksPage() {
  const webhookEvents = [
    { event: 'anomaly.detected', description: 'Triggered when an anomaly is detected in your metrics' },
    { event: 'report.generated', description: 'Triggered when a new report is generated' },
    { event: 'sync.completed', description: 'Triggered when a connector sync completes successfully' },
    { event: 'sync.failed', description: 'Triggered when a connector sync fails' },
    { event: 'insight.created', description: 'Triggered when a new insight is generated' },
    { event: 'metric.threshold_exceeded', description: 'Triggered when a metric exceeds a configured threshold' },
    { event: 'connector.connected', description: 'Triggered when a new connector is connected' },
    { event: 'connector.disconnected', description: 'Triggered when a connector is disconnected' },
  ];

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/docs/api" className="hover:text-foreground">API Reference</Link>
          <ChevronRight className="h-4 w-4" />
          <span>Webhooks</span>
        </div>
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
          Webhooks
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Receive real-time notifications when events happen in your workspace.
          Set up webhook endpoints to integrate AI Business OS with your systems.
        </p>
      </div>

      {/* How It Works */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          How Webhooks Work
        </h2>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <div className="grid gap-6 sm:grid-cols-4">
              {[
                { step: 1, title: 'Register', desc: 'Create webhook endpoint via API or UI' },
                { step: 2, title: 'Event Occurs', desc: 'Something happens in your workspace' },
                { step: 3, title: 'We POST', desc: 'JSON payload sent to your URL' },
                { step: 4, title: 'You Process', desc: 'Your server handles the event' },
              ].map((item) => (
                <div key={item.step} className="text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold mb-2">
                    {item.step}
                  </div>
                  <h4 className="font-medium text-sm">{item.title}</h4>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Available Events */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Available Events
        </h2>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              {webhookEvents.map((item) => (
                <div key={item.event} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <Zap className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                  <div>
                    <code className="text-sm font-medium">{item.event}</code>
                    <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payload Structure */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Payload Structure
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              All webhook events follow this consistent payload structure:
            </p>
            <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`{
  "id": "evt_abc123xyz",
  "event": "anomaly.detected",
  "timestamp": "2024-01-15T10:30:00Z",
  "workspace_id": "ws_abc123",
  "data": {
    "anomaly_id": "ano_xyz789",
    "metric_name": "revenue",
    "severity": "high",
    "expected_value": 25000,
    "actual_value": 18000,
    "deviation_percent": -28,
    "explanation": "Revenue dropped significantly..."
  }
}`}
            </pre>
          </CardContent>
        </Card>
      </div>

      {/* Event-Specific Payloads */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Event-Specific Payloads
        </h2>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <code className="bg-muted px-2 py-0.5 rounded text-sm">anomaly.detected</code>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`"data": {
  "anomaly_id": "ano_xyz789",
  "metric_name": "revenue",
  "severity": "high",        // high, medium, low
  "expected_value": 25000,
  "actual_value": 18000,
  "deviation_percent": -28,
  "explanation": "...",
  "detected_at": "2024-01-15T10:30:00Z"
}`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <code className="bg-muted px-2 py-0.5 rounded text-sm">report.generated</code>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`"data": {
  "report_id": "rpt_abc123",
  "type": "weekly",          // weekly, monthly
  "period": {
    "start": "2024-01-08",
    "end": "2024-01-14"
  },
  "summary": "Revenue increased 12% this week...",
  "url": "https://app.aibusinessos.com/reports/rpt_abc123"
}`}
              </pre>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <code className="bg-muted px-2 py-0.5 rounded text-sm">sync.completed</code>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="p-3 bg-muted rounded-lg text-xs overflow-x-auto">
{`"data": {
  "sync_id": "sync_xyz789",
  "connector_id": "con_abc123",
  "provider": "shopify",
  "sync_type": "incremental",
  "records_imported": 47,
  "duration_ms": 3240,
  "completed_at": "2024-01-15T10:30:00Z"
}`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Signature Verification */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Signature Verification
        </h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              Every webhook request includes a signature in the <code className="bg-muted px-1 rounded">X-Webhook-Signature</code> header.
              Always verify this signature to ensure the request is from AI Business OS.
            </p>
            <div>
              <h4 className="font-medium mb-2">Signature Format</h4>
              <code className="block p-3 bg-muted rounded-lg text-sm">
                t=1705312200,v1=5257a869e7ecebeda32affa62cdca3fa51cad7e77a0e56ff536d0ce8e108d8bd
              </code>
            </div>
            <div>
              <h4 className="font-medium mb-2">Verification Code (Node.js)</h4>
              <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`const crypto = require('crypto');

function verifyWebhookSignature(payload, signature, secret) {
  // Parse the signature header
  const parts = signature.split(',');
  const timestamp = parts.find(p => p.startsWith('t='))?.slice(2);
  const sig = parts.find(p => p.startsWith('v1='))?.slice(3);
  
  // Compute expected signature
  const signedPayload = \`\${timestamp}.\${payload}\`;
  const expected = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  // Constant-time comparison
  return crypto.timingSafeEqual(
    Buffer.from(sig, 'hex'),
    Buffer.from(expected, 'hex')
  );
}

// Usage
const isValid = verifyWebhookSignature(
  req.body,              // Raw request body string
  req.headers['x-webhook-signature'],
  'whsec_your_secret'    // From webhook creation
);

if (!isValid) {
  return res.status(401).send('Invalid signature');
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Retry Policy */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Retry Policy
        </h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              If your endpoint returns a non-2xx status code or times out, we retry with exponential backoff:
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="font-medium">Retry 1</div>
                <div className="text-sm text-muted-foreground">After 1 minute</div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="font-medium">Retry 2</div>
                <div className="text-sm text-muted-foreground">After 5 minutes</div>
              </div>
              <div className="p-3 bg-muted rounded-lg text-center">
                <div className="font-medium">Retry 3</div>
                <div className="text-sm text-muted-foreground">After 30 minutes</div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              After 3 failed attempts, the event is marked as failed. You can view failed
              deliveries in the Developer dashboard.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Best Practices */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Best Practices
        </h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h4 className="font-medium">Respond quickly</h4>
              <p className="text-sm text-muted-foreground">
                Return a 200 status immediately, then process the event asynchronously.
                Webhook requests timeout after 30 seconds.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Handle duplicates</h4>
              <p className="text-sm text-muted-foreground">
                Use the <code className="bg-muted px-1 rounded">id</code> field to deduplicate events.
                The same event may be delivered multiple times.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Verify signatures</h4>
              <p className="text-sm text-muted-foreground">
                Always verify the webhook signature to ensure requests are from AI Business OS.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Use HTTPS</h4>
              <p className="text-sm text-muted-foreground">
                Webhook endpoints must use HTTPS. HTTP endpoints are rejected.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Testing */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Testing Webhooks
        </h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              You can test your webhook endpoint from the Developer dashboard:
            </p>
            <ol className="text-sm space-y-2 list-decimal list-inside">
              <li>Go to Dashboard &gt; Developer &gt; Webhooks</li>
              <li>Click on your webhook endpoint</li>
              <li>Click &quot;Send Test Event&quot;</li>
              <li>Select the event type to test</li>
              <li>View the request and response in the delivery log</li>
            </ol>
            <p className="text-sm text-muted-foreground">
              For local development, use a tool like ngrok to expose your local server.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
