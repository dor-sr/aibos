'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertCircle,
  Check,
  Copy,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  Send,
  Trash2,
  Webhook,
  ExternalLink,
  Code,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ApiKey {
  id: string;
  name: string;
  description?: string;
  keyPrefix: string;
  scopes: string[];
  rateLimitTier: string;
  status: string;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

interface WebhookEndpoint {
  id: string;
  name: string;
  description?: string;
  url: string;
  events: string[];
  isActive: boolean;
  maxRetries: number;
  lastTriggeredAt?: string;
  successCount: number;
  failureCount: number;
  createdAt: string;
}

const WEBHOOK_EVENTS = [
  { value: 'anomaly.detected', label: 'Anomaly Detected' },
  { value: 'report.generated', label: 'Report Generated' },
  { value: 'sync.completed', label: 'Sync Completed' },
  { value: 'sync.failed', label: 'Sync Failed' },
  { value: 'insight.created', label: 'Insight Created' },
  { value: 'metric.threshold_exceeded', label: 'Metric Threshold Exceeded' },
  { value: 'connector.connected', label: 'Connector Connected' },
  { value: 'connector.disconnected', label: 'Connector Disconnected' },
];

const RATE_LIMIT_TIERS = [
  { value: 'free', label: 'Free (60 req/min)' },
  { value: 'starter', label: 'Starter (300 req/min)' },
  { value: 'pro', label: 'Pro (1000 req/min)' },
  { value: 'enterprise', label: 'Enterprise (5000 req/min)' },
];

export default function DeveloperPage() {
  const [activeTab, setActiveTab] = useState('api-keys');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingKey, setCreatingKey] = useState(false);
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showWebhookDialog, setShowWebhookDialog] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const { toast } = useToast();

  // Form states
  const [keyName, setKeyName] = useState('');
  const [keyDescription, setKeyDescription] = useState('');
  const [keyTier, setKeyTier] = useState('free');
  const [webhookName, setWebhookName] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvents, setWebhookEvents] = useState<string[]>([]);

  // Get workspace ID from cookie/context (simplified for demo)
  const workspaceId = typeof window !== 'undefined' 
    ? document.cookie.match(/workspace_id=([^;]+)/)?.[1] || 'demo-workspace'
    : 'demo-workspace';

  useEffect(() => {
    fetchApiKeys();
    fetchWebhooks();
  }, []);

  const fetchApiKeys = async () => {
    try {
      const response = await fetch(`/api/v1/api-keys?workspace_id=${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWebhooks = async () => {
    // This would need authentication - for now we show empty state
    setWebhooks([]);
  };

  const createApiKey = async () => {
    if (!keyName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a name for the API key',
        variant: 'destructive',
      });
      return;
    }

    setCreatingKey(true);
    try {
      const response = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: keyName,
          description: keyDescription,
          rate_limit_tier: keyTier,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setNewApiKey(data.data.key);
        setApiKeys(prev => [data.data, ...prev]);
        toast({
          title: 'API Key Created',
          description: 'Your new API key has been created. Make sure to copy it now!',
        });
      } else {
        const error = await response.json();
        toast({
          title: 'Error',
          description: error.error?.message || 'Failed to create API key',
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create API key',
        variant: 'destructive',
      });
    } finally {
      setCreatingKey(false);
    }
  };

  const revokeApiKey = async (keyId: string) => {
    try {
      const response = await fetch(`/api/v1/api-keys?id=${keyId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setApiKeys(prev => prev.filter(k => k.id !== keyId));
        toast({
          title: 'API Key Revoked',
          description: 'The API key has been revoked and can no longer be used.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to revoke API key',
        variant: 'destructive',
      });
    }
  };

  const testWebhook = async (webhookId: string) => {
    setTestingWebhook(webhookId);
    try {
      // This would need API key authentication
      toast({
        title: 'Test Webhook',
        description: 'Webhook test feature requires API authentication.',
      });
    } finally {
      setTestingWebhook(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Copied to clipboard',
    });
  };

  const resetKeyForm = () => {
    setKeyName('');
    setKeyDescription('');
    setKeyTier('free');
    setNewApiKey(null);
  };

  const resetWebhookForm = () => {
    setWebhookName('');
    setWebhookUrl('');
    setWebhookEvents([]);
    setNewWebhookSecret(null);
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Developer Platform</h1>
        <p className="text-muted-foreground mt-2">
          Manage API keys, webhooks, and integrations for your workspace.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            Documentation
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Create and manage API keys to access the public API.
                </CardDescription>
              </div>
              <Dialog open={showApiKeyDialog} onOpenChange={(open) => {
                setShowApiKeyDialog(open);
                if (!open) resetKeyForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Create API Key
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      {newApiKey ? 'API Key Created' : 'Create New API Key'}
                    </DialogTitle>
                    <DialogDescription>
                      {newApiKey 
                        ? 'Copy your API key now. It will not be shown again.'
                        : 'Create a new API key to access the public API.'
                      }
                    </DialogDescription>
                  </DialogHeader>

                  {newApiKey ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <div className="flex items-center justify-between">
                          <code className="text-sm break-all">{newApiKey}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(newApiKey)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">
                          Store this key securely. It will not be shown again.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="key-name">Name *</Label>
                        <Input
                          id="key-name"
                          placeholder="My API Key"
                          value={keyName}
                          onChange={(e) => setKeyName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="key-description">Description</Label>
                        <Input
                          id="key-description"
                          placeholder="Used for..."
                          value={keyDescription}
                          onChange={(e) => setKeyDescription(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="key-tier">Rate Limit Tier</Label>
                        <Select value={keyTier} onValueChange={setKeyTier}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RATE_LIMIT_TIERS.map(tier => (
                              <SelectItem key={tier.value} value={tier.value}>
                                {tier.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <DialogFooter>
                    {newApiKey ? (
                      <Button onClick={() => {
                        setShowApiKeyDialog(false);
                        resetKeyForm();
                      }}>
                        Done
                      </Button>
                    ) : (
                      <Button onClick={createApiKey} disabled={creatingKey}>
                        {creatingKey && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Create Key
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No API keys yet.</p>
                  <p className="text-sm">Create your first API key to get started.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Used</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map(key => (
                      <TableRow key={key.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{key.name}</p>
                            {key.description && (
                              <p className="text-sm text-muted-foreground">{key.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm">{key.keyPrefix}...</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{key.rateLimitTier}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={key.status === 'active' ? 'default' : 'secondary'}>
                            {key.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {key.lastUsedAt 
                            ? new Date(key.lastUsedAt).toLocaleDateString()
                            : 'Never'
                          }
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => revokeApiKey(key.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Webhooks Tab */}
        <TabsContent value="webhooks">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Outbound Webhooks</CardTitle>
                <CardDescription>
                  Configure webhooks to receive real-time notifications.
                </CardDescription>
              </div>
              <Dialog open={showWebhookDialog} onOpenChange={(open) => {
                setShowWebhookDialog(open);
                if (!open) resetWebhookForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle>
                      {newWebhookSecret ? 'Webhook Created' : 'Create Webhook'}
                    </DialogTitle>
                    <DialogDescription>
                      {newWebhookSecret
                        ? 'Copy your webhook secret to verify signatures.'
                        : 'Configure a webhook endpoint to receive events.'
                      }
                    </DialogDescription>
                  </DialogHeader>

                  {newWebhookSecret ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-muted rounded-lg">
                        <Label className="text-xs text-muted-foreground">Signing Secret</Label>
                        <div className="flex items-center justify-between mt-1">
                          <code className="text-sm break-all">{newWebhookSecret}</code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(newWebhookSecret)}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-amber-600">
                        <AlertCircle className="h-4 w-4" />
                        <span className="text-sm">
                          Store this secret securely. It will not be shown again.
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="webhook-name">Name *</Label>
                        <Input
                          id="webhook-name"
                          placeholder="Production Webhook"
                          value={webhookName}
                          onChange={(e) => setWebhookName(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label htmlFor="webhook-url">Endpoint URL *</Label>
                        <Input
                          id="webhook-url"
                          placeholder="https://example.com/webhook"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                        />
                      </div>
                      <div>
                        <Label>Events to Subscribe</Label>
                        <div className="grid grid-cols-2 gap-2 mt-2">
                          {WEBHOOK_EVENTS.map(event => (
                            <label
                              key={event.value}
                              className="flex items-center gap-2 text-sm cursor-pointer"
                            >
                              <input
                                type="checkbox"
                                checked={webhookEvents.includes(event.value)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setWebhookEvents(prev => [...prev, event.value]);
                                  } else {
                                    setWebhookEvents(prev => prev.filter(v => v !== event.value));
                                  }
                                }}
                                className="rounded"
                              />
                              {event.label}
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <DialogFooter>
                    {newWebhookSecret ? (
                      <Button onClick={() => {
                        setShowWebhookDialog(false);
                        resetWebhookForm();
                      }}>
                        Done
                      </Button>
                    ) : (
                      <Button onClick={() => {
                        toast({
                          title: 'Create Webhook',
                          description: 'Webhook creation requires API authentication.',
                        });
                      }} disabled={creatingWebhook}>
                        {creatingWebhook && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                        Create Webhook
                      </Button>
                    )}
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No webhooks configured yet.</p>
                  <p className="text-sm">Add a webhook to receive real-time event notifications.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Success Rate</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map(webhook => (
                      <TableRow key={webhook.id}>
                        <TableCell>
                          <p className="font-medium">{webhook.name}</p>
                        </TableCell>
                        <TableCell>
                          <code className="text-xs">{webhook.url}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{webhook.events.length} events</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                            {webhook.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {webhook.successCount + webhook.failureCount > 0
                            ? `${Math.round(webhook.successCount / (webhook.successCount + webhook.failureCount) * 100)}%`
                            : '-'
                          }
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => testWebhook(webhook.id)}
                              disabled={testingWebhook === webhook.id}
                            >
                              {testingWebhook === webhook.id 
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : <Send className="h-4 w-4" />
                              }
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="docs">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>API Documentation</CardTitle>
                <CardDescription>
                  Learn how to integrate with the AI Business OS API.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Base URL</h3>
                  <code className="block p-3 bg-muted rounded-lg text-sm">
                    {typeof window !== 'undefined' ? window.location.origin : ''}/api/v1
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Authentication</h3>
                  <p className="text-sm text-muted-foreground mb-2">
                    Include your API key in the Authorization header:
                  </p>
                  <code className="block p-3 bg-muted rounded-lg text-sm">
                    Authorization: Bearer aibos_your_api_key_here
                  </code>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Available Endpoints</h3>
                  <div className="space-y-2">
                    {[
                      { method: 'GET', path: '/metrics', description: 'Fetch workspace metrics' },
                      { method: 'GET', path: '/reports', description: 'List generated reports' },
                      { method: 'GET', path: '/insights', description: 'List AI insights' },
                      { method: 'GET', path: '/anomalies', description: 'List detected anomalies' },
                      { method: 'GET', path: '/workspace', description: 'Get workspace info' },
                      { method: 'GET', path: '/connectors', description: 'List connectors' },
                      { method: 'POST', path: '/nlq', description: 'Natural language query' },
                      { method: 'GET', path: '/webhooks', description: 'List webhooks' },
                      { method: 'POST', path: '/webhooks', description: 'Create webhook' },
                    ].map(endpoint => (
                      <div key={endpoint.path} className="flex items-center gap-3 p-2 rounded hover:bg-muted">
                        <Badge variant={endpoint.method === 'GET' ? 'outline' : 'default'} className="w-16 justify-center">
                          {endpoint.method}
                        </Badge>
                        <code className="text-sm">/api/v1{endpoint.path}</code>
                        <span className="text-sm text-muted-foreground ml-auto">
                          {endpoint.description}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Example Request</h3>
                  <pre className="p-4 bg-muted rounded-lg text-sm overflow-x-auto">
{`curl -X GET "${typeof window !== 'undefined' ? window.location.origin : ''}/api/v1/metrics?period=30d" \\
  -H "Authorization: Bearer aibos_your_api_key_here" \\
  -H "Content-Type: application/json"`}
                  </pre>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Rate Limits</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tier</TableHead>
                        <TableHead>Requests/Minute</TableHead>
                        <TableHead>Requests/Second</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Free</TableCell>
                        <TableCell>60</TableCell>
                        <TableCell>1</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Starter</TableCell>
                        <TableCell>300</TableCell>
                        <TableCell>5</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Pro</TableCell>
                        <TableCell>1,000</TableCell>
                        <TableCell>~17</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Enterprise</TableCell>
                        <TableCell>5,000</TableCell>
                        <TableCell>~83</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                <Button variant="outline" asChild>
                  <a href="/api/v1" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Full API Reference
                  </a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
