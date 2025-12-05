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
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Key, 
  Webhook, 
  Plus, 
  Copy, 
  Trash2, 
  RefreshCw, 
  Check,
  AlertCircle,
  ExternalLink,
  Play,
  Eye,
  EyeOff,
  Code,
  FileJson,
  Loader2,
} from 'lucide-react';

// API Scopes definition
const API_SCOPES = {
  'read:metrics': 'Read metrics and analytics data',
  'read:reports': 'Read generated reports',
  'read:insights': 'Read AI-generated insights',
  'read:anomalies': 'Read detected anomalies',
  'read:workspace': 'Read workspace information',
  'read:connectors': 'Read connector configurations',
  'read:customers': 'Read customer data',
  'read:orders': 'Read order data',
  'read:products': 'Read product data',
  'read:subscriptions': 'Read subscription data',
  'write:webhooks': 'Create and manage outbound webhooks',
  'write:connectors': 'Trigger connector syncs',
  'nlq:query': 'Send natural language queries',
  'admin:api_keys': 'Manage API keys',
  'admin:workspace': 'Manage workspace settings',
};

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

export default function DeveloperPage() {
  const [activeTab, setActiveTab] = useState('api-keys');
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [workspaceId, setWorkspaceId] = useState<string>('');
  
  // API Key creation state
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyDescription, setNewKeyDescription] = useState('');
  const [newKeyTier, setNewKeyTier] = useState('starter');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([]);
  const [newKeyExpiry, setNewKeyExpiry] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  
  // Webhook creation state
  const [showCreateWebhook, setShowCreateWebhook] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState('');
  const [newWebhookUrl, setNewWebhookUrl] = useState('');
  const [newWebhookDescription, setNewWebhookDescription] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null);
  
  // Testing state
  const [testingWebhookId, setTestingWebhookId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    // Get workspace ID from localStorage or context
    const storedWorkspaceId = localStorage.getItem('currentWorkspaceId');
    if (storedWorkspaceId) {
      setWorkspaceId(storedWorkspaceId);
      loadData(storedWorkspaceId);
    } else {
      setLoading(false);
    }
  }, []);

  const loadData = async (wsId: string) => {
    setLoading(true);
    try {
      // Load API keys
      const keysResponse = await fetch(`/api/v1/api-keys?workspace_id=${wsId}`);
      if (keysResponse.ok) {
        const keysData = await keysResponse.json();
        if (keysData.success) {
          setApiKeys(keysData.data || []);
        }
      }
      
      // Note: Webhooks require API key auth, so we'd need to implement a session-based endpoint
      // For now, we'll show a placeholder
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim() || !workspaceId) return;
    
    try {
      const response = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: newKeyName,
          description: newKeyDescription || undefined,
          rate_limit_tier: newKeyTier,
          scopes: selectedScopes.length > 0 ? selectedScopes : undefined,
          expires_in_days: newKeyExpiry ? parseInt(newKeyExpiry) : undefined,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setCreatedKey(data.data.key);
        loadData(workspaceId);
      } else {
        alert(data.error?.message || 'Failed to create API key');
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      alert('Failed to create API key');
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/v1/api-keys?id=${keyId}`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        loadData(workspaceId);
      } else {
        alert('Failed to revoke API key');
      }
    } catch (error) {
      console.error('Error revoking API key:', error);
    }
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const resetCreateKeyForm = () => {
    setNewKeyName('');
    setNewKeyDescription('');
    setNewKeyTier('starter');
    setSelectedScopes([]);
    setNewKeyExpiry('');
    setCreatedKey(null);
    setShowCreateKey(false);
  };

  const resetCreateWebhookForm = () => {
    setNewWebhookName('');
    setNewWebhookUrl('');
    setNewWebhookDescription('');
    setSelectedEvents([]);
    setCreatedWebhookSecret(null);
    setShowCreateWebhook(false);
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes(prev =>
      prev.includes(scope)
        ? prev.filter(s => s !== scope)
        : [...prev, scope]
    );
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents(prev =>
      prev.includes(event)
        ? prev.filter(e => e !== event)
        : [...prev, event]
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Developer Platform</h1>
        <p className="text-muted-foreground">
          Manage API keys, webhooks, and integrate with external systems
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Webhook className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="docs" className="flex items-center gap-2">
            <FileJson className="h-4 w-4" />
            Documentation
          </TabsTrigger>
        </TabsList>

        {/* API Keys Tab */}
        <TabsContent value="api-keys" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>API Keys</CardTitle>
                <CardDescription>
                  Manage API keys for programmatic access to your workspace data
                </CardDescription>
              </div>
              <Dialog open={showCreateKey} onOpenChange={setShowCreateKey}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetCreateKeyForm(); setShowCreateKey(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create API Key
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  {createdKey ? (
                    <>
                      <DialogHeader>
                        <DialogTitle>API Key Created</DialogTitle>
                        <DialogDescription>
                          Copy your API key now. You won&apos;t be able to see it again.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center justify-between gap-2">
                            <code className="text-sm break-all flex-1">{createdKey}</code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(createdKey)}
                            >
                              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">Store this key securely. It will not be shown again.</span>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={resetCreateKeyForm}>Done</Button>
                      </DialogFooter>
                    </>
                  ) : (
                    <>
                      <DialogHeader>
                        <DialogTitle>Create API Key</DialogTitle>
                        <DialogDescription>
                          Create a new API key for programmatic access
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            placeholder="My API Key"
                            value={newKeyName}
                            onChange={(e) => setNewKeyName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            placeholder="Used for..."
                            value={newKeyDescription}
                            onChange={(e) => setNewKeyDescription(e.target.value)}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label>Rate Limit Tier</Label>
                            <Select value={newKeyTier} onValueChange={setNewKeyTier}>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="free">Free (60/min)</SelectItem>
                                <SelectItem value="starter">Starter (300/min)</SelectItem>
                                <SelectItem value="pro">Pro (1000/min)</SelectItem>
                                <SelectItem value="enterprise">Enterprise (5000/min)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label>Expires In (days)</Label>
                            <Input
                              type="number"
                              placeholder="Never"
                              value={newKeyExpiry}
                              onChange={(e) => setNewKeyExpiry(e.target.value)}
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>Scopes (optional - defaults based on tier)</Label>
                          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border rounded-md">
                            {Object.entries(API_SCOPES).map(([scope, description]) => (
                              <div key={scope} className="flex items-center space-x-2">
                                <Checkbox
                                  id={scope}
                                  checked={selectedScopes.includes(scope)}
                                  onCheckedChange={() => toggleScope(scope)}
                                />
                                <label
                                  htmlFor={scope}
                                  className="text-sm cursor-pointer"
                                  title={description}
                                >
                                  {scope}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={resetCreateKeyForm}>Cancel</Button>
                        <Button onClick={handleCreateApiKey} disabled={!newKeyName.trim()}>
                          Create Key
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {apiKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No API keys yet</p>
                  <p className="text-sm">Create an API key to get started with the API</p>
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
                      <TableHead>Created</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {apiKeys.map((key) => (
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
                          <Badge
                            variant={key.status === 'active' ? 'default' : 'destructive'}
                          >
                            {key.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {key.lastUsedAt
                            ? new Date(key.lastUsedAt).toLocaleDateString()
                            : 'Never'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(key.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeKey(key.id)}
                            disabled={key.status !== 'active'}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
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
        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Outbound Webhooks</CardTitle>
                <CardDescription>
                  Receive real-time notifications when events occur in your workspace
                </CardDescription>
              </div>
              <Dialog open={showCreateWebhook} onOpenChange={setShowCreateWebhook}>
                <DialogTrigger asChild>
                  <Button onClick={() => { resetCreateWebhookForm(); setShowCreateWebhook(true); }}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Webhook
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  {createdWebhookSecret ? (
                    <>
                      <DialogHeader>
                        <DialogTitle>Webhook Created</DialogTitle>
                        <DialogDescription>
                          Copy your webhook secret now. You won&apos;t be able to see it again.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="p-4 bg-muted rounded-lg">
                          <div className="flex items-center justify-between gap-2">
                            <code className="text-sm break-all flex-1">{createdWebhookSecret}</code>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => copyToClipboard(createdWebhookSecret)}
                            >
                              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-500">
                          <AlertCircle className="h-4 w-4" />
                          <span className="text-sm">Use this secret to verify webhook signatures.</span>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button onClick={resetCreateWebhookForm}>Done</Button>
                      </DialogFooter>
                    </>
                  ) : (
                    <>
                      <DialogHeader>
                        <DialogTitle>Create Webhook</DialogTitle>
                        <DialogDescription>
                          Set up a webhook endpoint to receive event notifications
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Name *</Label>
                          <Input
                            placeholder="Production Webhook"
                            value={newWebhookName}
                            onChange={(e) => setNewWebhookName(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Endpoint URL *</Label>
                          <Input
                            placeholder="https://example.com/webhooks/aibos"
                            value={newWebhookUrl}
                            onChange={(e) => setNewWebhookUrl(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Description</Label>
                          <Input
                            placeholder="Handles..."
                            value={newWebhookDescription}
                            onChange={(e) => setNewWebhookDescription(e.target.value)}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Events to Subscribe *</Label>
                          <div className="grid grid-cols-2 gap-2 p-2 border rounded-md">
                            {WEBHOOK_EVENTS.map((event) => (
                              <div key={event.value} className="flex items-center space-x-2">
                                <Checkbox
                                  id={event.value}
                                  checked={selectedEvents.includes(event.value)}
                                  onCheckedChange={() => toggleEvent(event.value)}
                                />
                                <label htmlFor={event.value} className="text-sm cursor-pointer">
                                  {event.label}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={resetCreateWebhookForm}>Cancel</Button>
                        <Button
                          onClick={() => alert('Webhook creation requires API key authentication. Use the API directly.')}
                          disabled={!newWebhookName.trim() || !newWebhookUrl.trim() || selectedEvents.length === 0}
                        >
                          Create Webhook
                        </Button>
                      </DialogFooter>
                    </>
                  )}
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {webhooks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Webhook className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No webhooks configured</p>
                  <p className="text-sm">Create a webhook to receive real-time event notifications</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>URL</TableHead>
                      <TableHead>Events</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Success/Fail</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {webhooks.map((webhook) => (
                      <TableRow key={webhook.id}>
                        <TableCell>
                          <p className="font-medium">{webhook.name}</p>
                        </TableCell>
                        <TableCell>
                          <code className="text-sm">{webhook.url}</code>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{webhook.events.length} events</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={webhook.isActive ? 'default' : 'secondary'}>
                            {webhook.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className="text-green-600">{webhook.successCount}</span>
                          {' / '}
                          <span className="text-red-600">{webhook.failureCount}</span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" title="Test webhook">
                              <Play className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" title="Delete">
                              <Trash2 className="h-4 w-4 text-destructive" />
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

          {/* Webhook Events Reference */}
          <Card>
            <CardHeader>
              <CardTitle>Available Events</CardTitle>
              <CardDescription>
                Events you can subscribe to for webhook notifications
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {WEBHOOK_EVENTS.map((event) => (
                  <div key={event.value} className="p-3 border rounded-lg">
                    <p className="font-mono text-sm">{event.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{event.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Documentation Tab */}
        <TabsContent value="docs" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API Documentation</CardTitle>
              <CardDescription>
                Learn how to integrate with the AI Business OS API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Quick Start */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Quick Start</h3>
                <div className="p-4 bg-muted rounded-lg space-y-4">
                  <p className="text-sm">1. Create an API key from the API Keys tab</p>
                  <p className="text-sm">2. Include your API key in requests using the Authorization header:</p>
                  <pre className="p-3 bg-background rounded border text-sm overflow-x-auto">
{`curl -X GET "https://your-domain.com/api/v1/metrics" \\
  -H "Authorization: Bearer aibos_your_api_key"`}
                  </pre>
                </div>
              </div>

              {/* Base URL */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Base URL</h3>
                <code className="p-2 bg-muted rounded">/api/v1</code>
              </div>

              {/* Authentication */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Authentication</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  All API requests require authentication using an API key. Include your key in the Authorization header:
                </p>
                <pre className="p-3 bg-muted rounded text-sm">
{`Authorization: Bearer aibos_your_api_key
# or
X-API-Key: aibos_your_api_key`}
                </pre>
              </div>

              {/* Rate Limiting */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Rate Limiting</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tier</TableHead>
                      <TableHead>Requests per Minute</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>Free</TableCell><TableCell>60</TableCell></TableRow>
                    <TableRow><TableCell>Starter</TableCell><TableCell>300</TableCell></TableRow>
                    <TableRow><TableCell>Pro</TableCell><TableCell>1,000</TableCell></TableRow>
                    <TableRow><TableCell>Enterprise</TableCell><TableCell>5,000</TableCell></TableRow>
                  </TableBody>
                </Table>
                <p className="text-sm text-muted-foreground mt-2">
                  Rate limit headers are included in all responses: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
                </p>
              </div>

              {/* Endpoints */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Available Endpoints</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Method</TableHead>
                      <TableHead>Endpoint</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Scope</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell><Badge>GET</Badge></TableCell>
                      <TableCell><code>/api/v1/metrics</code></TableCell>
                      <TableCell>Get workspace metrics</TableCell>
                      <TableCell><code>read:metrics</code></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge>GET</Badge></TableCell>
                      <TableCell><code>/api/v1/reports</code></TableCell>
                      <TableCell>List reports</TableCell>
                      <TableCell><code>read:reports</code></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge>GET</Badge></TableCell>
                      <TableCell><code>/api/v1/insights</code></TableCell>
                      <TableCell>List insights</TableCell>
                      <TableCell><code>read:insights</code></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge>GET</Badge></TableCell>
                      <TableCell><code>/api/v1/anomalies</code></TableCell>
                      <TableCell>List anomalies</TableCell>
                      <TableCell><code>read:anomalies</code></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge>GET</Badge></TableCell>
                      <TableCell><code>/api/v1/workspace</code></TableCell>
                      <TableCell>Get workspace info</TableCell>
                      <TableCell><code>read:workspace</code></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge>GET</Badge></TableCell>
                      <TableCell><code>/api/v1/connectors</code></TableCell>
                      <TableCell>List connectors</TableCell>
                      <TableCell><code>read:connectors</code></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge variant="secondary">POST</Badge></TableCell>
                      <TableCell><code>/api/v1/connectors</code></TableCell>
                      <TableCell>Trigger sync</TableCell>
                      <TableCell><code>write:connectors</code></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge variant="secondary">POST</Badge></TableCell>
                      <TableCell><code>/api/v1/nlq</code></TableCell>
                      <TableCell>Natural language query</TableCell>
                      <TableCell><code>nlq:query</code></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge>GET</Badge></TableCell>
                      <TableCell><code>/api/v1/webhooks</code></TableCell>
                      <TableCell>List webhooks</TableCell>
                      <TableCell><code>write:webhooks</code></TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell><Badge variant="secondary">POST</Badge></TableCell>
                      <TableCell><code>/api/v1/webhooks</code></TableCell>
                      <TableCell>Create webhook</TableCell>
                      <TableCell><code>write:webhooks</code></TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Response Format */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Response Format</h3>
                <p className="text-sm text-muted-foreground mb-2">All responses follow a consistent format:</p>
                <pre className="p-3 bg-muted rounded text-sm overflow-x-auto">
{`// Success response
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 100,
    "hasMore": true
  }
}

// Error response
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message"
  }
}`}
                </pre>
              </div>

              {/* Webhook Signatures */}
              <div>
                <h3 className="text-lg font-semibold mb-2">Webhook Signatures</h3>
                <p className="text-sm text-muted-foreground mb-2">
                  Verify webhook authenticity using the X-Webhook-Signature header:
                </p>
                <pre className="p-3 bg-muted rounded text-sm overflow-x-auto">
{`// Header format: t=timestamp,v1=signature
// Verify by computing:
const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(\`\${timestamp}.\${JSON.stringify(payload)}\`)
  .digest('hex');`}
                </pre>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
