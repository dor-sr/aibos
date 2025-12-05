import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Check,
  ChevronRight,
  Key,
  Lock,
  Shield,
} from 'lucide-react';

export default function ApiAuthenticationPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/docs/api" className="hover:text-foreground">API Reference</Link>
          <ChevronRight className="h-4 w-4" />
          <span>Authentication</span>
        </div>
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
          API Authentication
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Learn how to authenticate your API requests using API keys and manage
          access scopes.
        </p>
      </div>

      {/* API Keys */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          API Keys
        </h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              All API requests require authentication using an API key. Keys are created
              in your Developer settings and are scoped to a specific workspace.
            </p>
            <div>
              <h4 className="font-medium mb-2">Key Format</h4>
              <code className="block p-3 bg-muted rounded-lg text-sm">
                aibos_sk_live_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
              </code>
              <p className="text-xs text-muted-foreground mt-2">
                Keys start with <code className="bg-muted px-1 rounded">aibos_sk_live_</code> for production
                or <code className="bg-muted px-1 rounded">aibos_sk_test_</code> for test mode.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Using the Key */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Using Your API Key
        </h2>
        <Card>
          <CardContent className="pt-6 space-y-6">
            <div>
              <h4 className="font-medium mb-2">Authorization Header (Recommended)</h4>
              <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`curl -X GET "https://app.aibusinessos.com/api/v1/metrics" \\
  -H "Authorization: Bearer aibos_sk_live_your_key_here"`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium mb-2">X-API-Key Header (Alternative)</h4>
              <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`curl -X GET "https://app.aibusinessos.com/api/v1/metrics" \\
  -H "X-API-Key: aibos_sk_live_your_key_here"`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Scopes */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          API Scopes
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              When creating an API key, you can limit its permissions by selecting specific scopes:
            </p>
            <div className="space-y-3">
              {[
                { scope: 'read:metrics', description: 'Access metrics and analytics data' },
                { scope: 'read:reports', description: 'Access generated reports' },
                { scope: 'read:insights', description: 'Access AI-generated insights' },
                { scope: 'read:anomalies', description: 'Access detected anomalies' },
                { scope: 'read:workspace', description: 'Access workspace information' },
                { scope: 'read:connectors', description: 'List connected data sources' },
                { scope: 'write:connectors', description: 'Trigger connector syncs' },
                { scope: 'nlq:query', description: 'Ask natural language questions' },
                { scope: 'write:webhooks', description: 'Manage webhook endpoints' },
              ].map((item) => (
                <div key={item.scope} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                  <code className="text-sm font-medium shrink-0 bg-white px-2 py-0.5 rounded">{item.scope}</code>
                  <span className="text-sm text-muted-foreground">{item.description}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Creating Keys */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Creating API Keys
        </h2>
        <div className="space-y-4">
          {[
            {
              step: 1,
              title: 'Go to Developer Settings',
              description: 'Navigate to Dashboard > Developer > API Keys',
            },
            {
              step: 2,
              title: 'Click "Create Key"',
              description: 'Choose a name and select the scopes you need',
            },
            {
              step: 3,
              title: 'Copy Your Key',
              description: 'The key is shown once. Copy and store it securely.',
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

      {/* Security Best Practices */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Security Best Practices
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Check className="h-5 w-5 text-green-600" />
                Do
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>- Store keys in environment variables</li>
                <li>- Use different keys for dev and production</li>
                <li>- Limit scopes to what you actually need</li>
                <li>- Rotate keys periodically</li>
                <li>- Revoke unused keys</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <AlertTriangle className="h-5 w-5 text-amber-600" />
                Don&apos;t
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>- Commit keys to version control</li>
                <li>- Share keys in public channels</li>
                <li>- Use production keys in client-side code</li>
                <li>- Use a single key for everything</li>
                <li>- Ignore leaked key alerts</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Key Management */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Managing Keys
        </h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h4 className="font-medium">Viewing Keys</h4>
              <p className="text-sm text-muted-foreground">
                You can view key metadata (name, scopes, created date, last used) in Developer settings.
                The full key is only shown once at creation.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Revoking Keys</h4>
              <p className="text-sm text-muted-foreground">
                Click the revoke button next to any key to immediately invalidate it.
                This cannot be undone.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Key Expiration</h4>
              <p className="text-sm text-muted-foreground">
                Optionally set an expiration date when creating keys. Expired keys are
                automatically revoked.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Error Responses */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Authentication Errors
        </h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h4 className="font-medium">401 Unauthorized</h4>
              <pre className="p-3 bg-muted rounded-lg text-sm mt-2 overflow-x-auto">
{`{
  "success": false,
  "error": {
    "code": "INVALID_API_KEY",
    "message": "Invalid or missing API key"
  }
}`}
              </pre>
            </div>

            <div>
              <h4 className="font-medium">403 Forbidden</h4>
              <pre className="p-3 bg-muted rounded-lg text-sm mt-2 overflow-x-auto">
{`{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_SCOPE",
    "message": "API key lacks required scope: read:metrics"
  }
}`}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
