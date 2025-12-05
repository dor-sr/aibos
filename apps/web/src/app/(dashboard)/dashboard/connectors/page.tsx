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
} from 'lucide-react';

interface Connector {
  id: string;
  type: string;
  name: string;
  status: 'pending' | 'connected' | 'error' | 'disconnected';
  lastSyncAt: string | null;
  isEnabled: boolean;
}

const availableConnectors = [
  {
    type: 'shopify',
    name: 'Shopify',
    description: 'Import orders, products, and customers from your Shopify store',
    icon: ShoppingBag,
    available: true,
  },
  {
    type: 'stripe',
    name: 'Stripe',
    description: 'Import subscriptions, invoices, and customers from Stripe',
    icon: CreditCard,
    available: false,
  },
  {
    type: 'ga4',
    name: 'Google Analytics 4',
    description: 'Import traffic and conversion data from GA4',
    icon: BarChart3,
    available: false,
  },
];

export default function ConnectorsPage() {
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [shopifyShop, setShopifyShop] = useState('');
  const [showShopifyForm, setShowShopifyForm] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Get workspace ID from session/context (simplified for now)
  const workspaceId = 'current-workspace'; // TODO: Get from context

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
            {connectors.map((connector) => (
              <Card key={connector.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                        <Check className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <CardTitle className="text-base">{connector.name}</CardTitle>
                        <CardDescription className="text-xs">
                          {connector.status === 'connected' ? 'Connected' : connector.status}
                        </CardDescription>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDisconnect(connector.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {connector.lastSyncAt
                      ? `Last synced: ${new Date(connector.lastSyncAt).toLocaleString()}`
                      : 'Not synced yet'}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Available connectors */}
      <div className="space-y-4">
        <h2 className="text-lg font-medium">Available Connectors</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {availableConnectors.map((connector) => {
            const existingConnector = getConnectorStatus(connector.type);
            const isConnected = existingConnector?.status === 'connected';

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


