'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import {
  Package,
  AlertTriangle,
  TrendingDown,
  DollarSign,
  Send,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  Warehouse,
  ShoppingCart,
  BarChart2,
  RefreshCw,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface InventorySummary {
  totalProducts: number;
  totalStockValue: number;
  healthyProducts: number;
  lowStockProducts: number;
  criticalProducts: number;
  outOfStockProducts: number;
  overstockProducts: number;
  totalLocations: number;
  activeAlerts: number;
  currency: string;
}

interface StockAlert {
  id: string;
  productId: string;
  sku: string | null;
  productName: string;
  type: string;
  severity: string;
  title: string;
  message: string;
  suggestedAction: string;
  currentStock: number;
  isResolved: boolean;
  createdAt: string;
}

interface ReorderRecommendation {
  id: string;
  productId: string;
  sku: string | null;
  productName: string;
  currentStock: number;
  recommendedQuantity: number;
  priority: string;
  reason: string;
}

interface MarginAnalysis {
  totalProducts: number;
  averageMarginPercent: number;
  productsWithMargin: number;
  totalRevenue: number;
  totalProfit: number;
  highMarginProducts: number;
  lowMarginProducts: number;
  negativeMarginProducts: number;
  currency: string;
}

export default function OperationsDashboard() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [inventory, setInventory] = useState<InventorySummary | null>(null);
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [recommendations, setRecommendations] = useState<ReorderRecommendation[]>([]);
  const [margins, setMargins] = useState<MarginAnalysis | null>(null);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [askingQuestion, setAskingQuestion] = useState(false);
  const [healthScore, setHealthScore] = useState<number>(0);

  // Get workspace ID from localStorage
  useEffect(() => {
    const storedWorkspaceId = localStorage.getItem('workspaceId');
    if (storedWorkspaceId) {
      setWorkspaceId(storedWorkspaceId);
    }
  }, []);

  // Fetch operations data
  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch inventory summary
        const inventoryRes = await fetch(
          `/api/operations/inventory?workspaceId=${workspaceId}&type=summary`
        );
        if (inventoryRes.ok) {
          const inventoryData = await inventoryRes.json();
          setInventory(inventoryData.data);
        }

        // Fetch alerts
        const alertsRes = await fetch(
          `/api/operations/alerts?workspaceId=${workspaceId}`
        );
        if (alertsRes.ok) {
          const alertsData = await alertsRes.json();
          setAlerts(alertsData.data || []);
        }

        // Fetch recommendations
        const recsRes = await fetch(
          `/api/operations/recommendations?workspaceId=${workspaceId}`
        );
        if (recsRes.ok) {
          const recsData = await recsRes.json();
          setRecommendations(recsData.data || []);
        }

        // Fetch margin analysis
        const marginsRes = await fetch(
          `/api/operations/margins?workspaceId=${workspaceId}`
        );
        if (marginsRes.ok) {
          const marginsData = await marginsRes.json();
          setMargins(marginsData.data);
        }

        // Fetch health score
        const healthRes = await fetch(
          `/api/operations/health?workspaceId=${workspaceId}`
        );
        if (healthRes.ok) {
          const healthData = await healthRes.json();
          setHealthScore(healthData.score || 0);
        }
      } catch (error) {
        console.error('Failed to fetch operations data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [workspaceId]);

  const handleAskQuestion = async () => {
    if (!question.trim() || !workspaceId) return;

    setAskingQuestion(true);
    setAnswer(null);

    try {
      const res = await fetch('/api/operations/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          workspaceId,
        }),
      });

      const data = await res.json();
      setAnswer(data.answer || 'No answer received.');
    } catch (error) {
      setAnswer('Sorry, I encountered an error. Please try again.');
    } finally {
      setAskingQuestion(false);
    }
  };

  const formatCurrency = (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-100 text-red-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getHealthScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  if (!workspaceId) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Warehouse className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No Workspace Selected</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Please select or create a workspace to view operations data.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Operations</h1>
          <p className="text-muted-foreground">
            AI-powered inventory management and operations insights
          </p>
        </div>
        <div className="flex items-center gap-4">
          {/* Health Score */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Health Score:</span>
            <span className={`text-2xl font-bold ${getHealthScoreColor(healthScore)}`}>
              {healthScore}
            </span>
          </div>
        </div>
      </div>

      {/* Ask Question */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Ask About Your Operations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="What products are running low? Show me reorder recommendations..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAskQuestion()}
            />
            <Button onClick={handleAskQuestion} disabled={askingQuestion}>
              {askingQuestion ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          {answer && (
            <div className="mt-4 rounded-lg bg-muted p-4">
              <p className="whitespace-pre-wrap text-sm">{answer}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          {/* Metrics Overview */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {inventory?.totalProducts.toLocaleString() || '0'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {inventory?.totalLocations || 1} location(s)
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Stock Value</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {inventory ? formatCurrency(inventory.totalStockValue, inventory.currency) : '$0'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Total inventory value
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {inventory?.activeAlerts || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {alerts.filter(a => a.severity === 'critical').length} critical
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Margin</CardTitle>
                <BarChart2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {margins ? formatPercent(margins.averageMarginPercent) : '0%'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {margins?.highMarginProducts || 0} high margin products
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Stock Status */}
          <Card>
            <CardHeader>
              <CardTitle>Inventory Status</CardTitle>
              <CardDescription>Stock health breakdown across all products</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-1">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        Healthy
                      </span>
                      <span>{inventory?.healthyProducts || 0}</span>
                    </div>
                    <Progress 
                      value={inventory ? (inventory.healthyProducts / inventory.totalProducts) * 100 : 0} 
                      className="h-2 bg-green-100 [&>div]:bg-green-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-1">
                        <TrendingDown className="h-4 w-4 text-yellow-500" />
                        Low Stock
                      </span>
                      <span>{inventory?.lowStockProducts || 0}</span>
                    </div>
                    <Progress 
                      value={inventory ? (inventory.lowStockProducts / inventory.totalProducts) * 100 : 0}
                      className="h-2 bg-yellow-100 [&>div]:bg-yellow-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="h-4 w-4 text-orange-500" />
                        Critical
                      </span>
                      <span>{inventory?.criticalProducts || 0}</span>
                    </div>
                    <Progress 
                      value={inventory ? (inventory.criticalProducts / inventory.totalProducts) * 100 : 0}
                      className="h-2 bg-orange-100 [&>div]:bg-orange-500"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="flex items-center gap-1">
                        <XCircle className="h-4 w-4 text-red-500" />
                        Out of Stock
                      </span>
                      <span>{inventory?.outOfStockProducts || 0}</span>
                    </div>
                    <Progress 
                      value={inventory ? (inventory.outOfStockProducts / inventory.totalProducts) * 100 : 0}
                      className="h-2 bg-red-100 [&>div]:bg-red-500"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alerts & Recommendations */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Stock Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Stock Alerts
                </CardTitle>
                <CardDescription>Products requiring attention</CardDescription>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No active alerts. All inventory levels are healthy.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {alerts.slice(0, 5).map((alert) => (
                      <div
                        key={alert.id}
                        className="p-3 rounded-lg border"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getSeverityColor(alert.severity)}>
                                {alert.severity}
                              </Badge>
                              <Badge variant="outline">{alert.type.replace('_', ' ')}</Badge>
                            </div>
                            <p className="font-medium text-sm">{alert.productName}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {alert.message}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Current stock: {alert.currentStock} units
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                    {alerts.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{alerts.length - 5} more alerts
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Reorder Recommendations */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Reorder Recommendations
                </CardTitle>
                <CardDescription>Products to reorder based on demand</CardDescription>
              </CardHeader>
              <CardContent>
                {recommendations.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No reorder recommendations. Inventory levels are sufficient.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recommendations.slice(0, 5).map((rec) => (
                      <div
                        key={rec.id}
                        className="p-3 rounded-lg border"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getPriorityColor(rec.priority)}>
                                {rec.priority}
                              </Badge>
                            </div>
                            <p className="font-medium text-sm">{rec.productName}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {rec.reason}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs">
                              <span>Current: {rec.currentStock}</span>
                              <span className="font-medium text-primary">
                                Order: {rec.recommendedQuantity} units
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                    {recommendations.length > 5 && (
                      <p className="text-xs text-muted-foreground text-center">
                        +{recommendations.length - 5} more recommendations
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Margin Analysis */}
          {margins && (
            <Card>
              <CardHeader>
                <CardTitle>Margin Analysis</CardTitle>
                <CardDescription>Product profitability breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(margins.totalRevenue, margins.currency)}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Total Profit</p>
                    <p className="text-xl font-bold">
                      {formatCurrency(margins.totalProfit, margins.currency)}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Avg Margin</p>
                    <p className="text-xl font-bold">
                      {formatPercent(margins.averageMarginPercent)}
                    </p>
                  </div>
                  <div className="text-center p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground">Products with Margin Data</p>
                    <p className="text-xl font-bold">
                      {margins.productsWithMargin} / {margins.totalProducts}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-3">
                  <div className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">High Margin (40%+)</span>
                    <Badge variant="outline" className="bg-green-50">
                      {margins.highMarginProducts}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">Low Margin (15-40%)</span>
                    <Badge variant="outline" className="bg-yellow-50">
                      {margins.lowMarginProducts}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded border">
                    <span className="text-sm">Negative Margin</span>
                    <Badge variant="outline" className="bg-red-50">
                      {margins.negativeMarginProducts}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
