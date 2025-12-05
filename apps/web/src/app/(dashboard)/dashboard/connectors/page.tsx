'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  ShoppingBag,
  CreditCard,
  BarChart3,
  Plus,
  Check,
  AlertCircle,
  Loader2,
  X,
  RefreshCw,
  Webhook,
  Eye,
  EyeOff,
  Copy,
} from 'lucide-react';

interface Connector {
  id: string;
  type: string;
  name: string;
  status: 'pending' | 'connected' | 'active' | 'error' | 'disconnected';
  lastSyncAt: string | null;
  isEnabled: boolean;
}

interface WebhookEvent {
  id: string;
  provider: string;
  eventType: string;
  status: string;
  receivedAt: string;
  processedAt: string | null;
  attempts: number;
  lastError: string | null;
}

const availableConnectors = [
  {
    type: 'shopify',
    name: 'Shopify',
    description: 'Import orders, products, and customers from your Shopify store',
    icon: ShoppingBag,
    available: true,
    authType: 'oauth',
  },
  {
    type: 'stripe',
    name: 'Stripe',
    description: 'Import subscriptions, invoices, and customers from Stripe',
    icon: CreditCard,
    available: true,
    authType: 'api_key',
  },
  {
    type: 'ga4',
    name: 'Google Analytics 4',
    description: 'Import traffic and conversion data from GA4',
    icon: BarChart3,
    available: false,
    authType: 'oauth',
  },
];

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [shopifyShop, setShopifyShop] = useState('');
  const [showShopifyForm, setShowShopifyForm] = useState(false);
  const [showStripeForm, setShowStripeForm] = useState(false);
  const [stripeApiKey, setStripeApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [webhookEvents, setWebhookEvents] = useState<WebhookEvent[]>([]);
  const [syncing, setSyncing] = useState<string | null>(null);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Get workspace ID from session/context (simplified for now)
  const workspaceId = 'current-workspace'; // TODO: Get from context
  const webhookBaseUrl = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/webhooks` 
    : '';

  useEffect(() => {
    // Check for success/error messages from OAuth callback
    const success = searchParams.get('success');
    const error = searchParams.get('error');

    if (success === 'shopify') {
      toast({
        title: 'Shopify connected',
        description: 'Your Shopify store has been connected successfully.',
      });
    }

    if (error) {
      toast({
        title: 'Connection failed',
        description: `Failed to connect: ${error}`,
        variant: 'destructive',
      });
    }

    fetchConnectors();
  }, [searchParams]);

  const fetchConnectors = async () => {
    try {
      const response = await fetch(`/api/connectors?workspaceId=${workspaceId}`);
      if (response.ok) {
        const data = await response.json();
        setConnectors(data.connectors);
      }
    } catch (error) {
      console.error('Failed to fetch connectors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnectShopify = async () => {
    if (!shopifyShop.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your Shopify store name',
        variant: 'destructive',
      });
      return;
    }

    setConnecting('shopify');

    try {
      const response = await fetch(
        `/api/connectors/shopify?shop=${encodeURIComponent(shopifyShop)}&workspaceId=${workspaceId}`
      );

      if (!response.ok) {
        throw new Error('Failed to initiate connection');
      }

      const data = await response.json();

      // Redirect to Shopify OAuth
      window.location.href = data.authUrl;
    } catch (error) {
      toast({
        title: 'Connection failed',
        description: 'Failed to connect to Shopify. Please try again.',
        variant: 'destructive',
      });
      setConnecting(null);
    }
  };

  const handleConnectStripe = async () => {
    if (!stripeApiKey.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter your Stripe API key',
        variant: 'destructive',
      });
      return;
    }

    setConnecting('stripe');

    try {
      const response = await fetch('/api/connectors/stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspaceId,
          apiKey: stripeApiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to connect');
      }

      toast({
        title: 'Stripe connected',
        description: 'Your Stripe account has been connected successfully.',
      });

      setShowStripeForm(false);
      setStripeApiKey('');
      fetchConnectors();
    } catch (error) {
      toast({
        title: 'Connection failed',
        description: (error as Error).message || 'Failed to connect to Stripe.',
        variant: 'destructive',
      });
    } finally {
      setConnecting(null);
    }
  };

  const handleSync = async (connectorId: string, connectorType: string) => {
    setSyncing(connectorId);

    try {
      const endpoint = connectorType === 'stripe' 
        ? `/api/connectors/stripe/sync?workspaceId=${workspaceId}`
        : `/api/connectors/${connectorId}/sync`;

      const response = await fetch(endpoint, {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Sync failed');
      }

      toast({
        title: 'Sync completed',
        description: `Successfully synced data from ${connectorType}.`,
      });

      fetchConnectors();
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: (error as Error).message,
        variant: 'destructive',
      });
    } finally {
      setSyncing(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copied',
      description: 'Webhook URL copied to clipboard',
    });
  };

  const handleDisconnect = async (connectorId: string) => {
    try {
      const response = await fetch(`/api/connectors?id=${connectorId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setConnectors(connectors.filter((c) => c.id !== connectorId));
        toast({
          title: 'Connector removed',
          description: 'The connector has been disconnected.',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to disconnect connector.',
        variant: 'destructive',
      });
    }
  };

  const getConnectorStatus = (type: string) => {
    return connectors.find((c) => c.type === type);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Data Connectors</h1>
        <p className="text-muted-foreground mt-1">
          Connect your data sources to import and analyze your business data.
        </p>
      </div>

      {/* Connected connectors */}
      {connectors.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-medium">Connected</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {connectors.map((connector) => {
              const connectorInfo = availableConnectors.find(c => c.type === connector.type);
              const Icon = connectorInfo?.icon || CreditCard;
              
              return (
                <Card key={connector.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                          <Icon className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <CardTitle className="text-base">
                            {connector.name || connector.type.charAt(0).toUpperCase() + connector.type.slice(1)}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {connector.status === 'active' || connector.status === 'connected' 
                              ? 'Connected' 
                              : connector.status}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleSync(connector.id, connector.type)}
                          disabled={syncing === connector.id}
                          title="Sync data"
                        >
                          <RefreshCw className={`w-4 h-4 ${syncing === connector.id ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDisconnect(connector.id)}
                          title="Disconnect"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {connector.lastSyncAt
                        ? `Last synced: ${new Date(connector.lastSyncAt).toLocaleString()}`
                        : 'Not synced yet'}
                    </p>
                    {/* Webhook URL info */}
                    <div className="text-xs text-muted-foreground border-t pt-3">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1">
                          <Webhook className="w-3 h-3" />
                          Webhook URL
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2"
                          onClick={() => copyToClipboard(`${webhookBaseUrl}/${connector.type}`)}
                        >
                          <Copy className="w-3 h-3" />
                        </Button>
                      </div>
                      <code className="text-xs block mt-1 p-1 bg-muted rounded truncate">
                        {webhookBaseUrl}/{connector.type}
                      </code>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Available connectors */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Available Connectors</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableConnectors.map((connector) => {
            const existingConnector = getConnectorStatus(connector.type);
            const isConnected = existingConnector?.status === 'connected' || existingConnector?.status === 'active';

            return (
              <Card
                key={connector.type}
                className={!connector.available ? 'opacity-60' : undefined}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                      <connector.icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{connector.name}</CardTitle>
                      <CardDescription className="text-xs">
                        {!connector.available ? 'Coming soon' : isConnected ? 'Connected' : 'Not connected'}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{connector.description}</p>

                  {connector.type === 'shopify' && showShopifyForm && !isConnected && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="shopifyShop">Store name</Label>
                        <div className="flex gap-2">
                          <Input
                            id="shopifyShop"
                            placeholder="your-store"
                            value={shopifyShop}
                            onChange={(e) => setShopifyShop(e.target.value)}
                            disabled={connecting === 'shopify'}
                          />
                          <span className="text-sm text-muted-foreground self-center">.myshopify.com</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleConnectShopify}
                          disabled={connecting === 'shopify'}
                          className="flex-1"
                        >
                          {connecting === 'shopify' ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            'Connect'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => setShowShopifyForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {connector.type === 'shopify' && !showShopifyForm && !isConnected && connector.available && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowShopifyForm(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Connect Shopify
                    </Button>
                  )}

                  {connector.type === 'stripe' && showStripeForm && !isConnected && (
                    <div className="space-y-3 pt-2 border-t">
                      <div className="space-y-2">
                        <Label htmlFor="stripeApiKey">Stripe Secret Key</Label>
                        <div className="relative">
                          <Input
                            id="stripeApiKey"
                            type={showApiKey ? 'text' : 'password'}
                            placeholder="sk_live_..."
                            value={stripeApiKey}
                            onChange={(e) => setStripeApiKey(e.target.value)}
                            disabled={connecting === 'stripe'}
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Find this in your Stripe Dashboard under Developers {'>'} API keys
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          onClick={handleConnectStripe}
                          disabled={connecting === 'stripe'}
                          className="flex-1"
                        >
                          {connecting === 'stripe' ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Connecting...
                            </>
                          ) : (
                            'Connect'
                          )}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowStripeForm(false);
                            setStripeApiKey('');
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}

                  {connector.type === 'stripe' && !showStripeForm && !isConnected && connector.available && (
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => setShowStripeForm(true)}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Connect Stripe
                    </Button>
                  )}

                  {!connector.available && (
                    <Button variant="outline" className="w-full" disabled>
                      Coming Soon
                    </Button>
                  )}

                  {isConnected && (
                    <div className="flex items-center gap-2 text-sm text-green-600">
                      <Check className="w-4 h-4" />
                      Connected
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}


