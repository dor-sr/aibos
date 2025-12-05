'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Target,
  Zap,
  AlertTriangle,
  Send,
  Loader2,
  ArrowUpRight,
  ArrowDownRight,
  BarChart2,
} from 'lucide-react';

interface MetricsSummary {
  totalSpend: number;
  totalRevenue: number;
  totalConversions: number;
  totalImpressions: number;
  totalClicks: number;
  overallRoas: number;
  overallCpc: number;
  overallCpm: number;
  overallCtr: number;
  overallCpa: number;
  spendChange: number;
  revenueChange: number;
  roasChange: number;
  topPerformingChannel?: string;
  worstPerformingChannel?: string;
  period: string;
}

interface ChannelPerformance {
  channel: string;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  revenue: number;
  roas: number;
  cpc: number;
  cpm: number;
  ctr: number;
  cpa: number;
  period: string;
}

interface Suggestion {
  id: string;
  type: string;
  priority: string;
  title: string;
  description: string;
  impact: string;
  channel?: string;
  campaignName?: string;
}

export default function MarketingDashboard() {
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [period, setPeriod] = useState('30d');
  const [metrics, setMetrics] = useState<MetricsSummary | null>(null);
  const [channels, setChannels] = useState<ChannelPerformance[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [askingQuestion, setAskingQuestion] = useState(false);

  // Get workspace ID from localStorage or session
  useEffect(() => {
    const storedWorkspaceId = localStorage.getItem('workspaceId');
    if (storedWorkspaceId) {
      setWorkspaceId(storedWorkspaceId);
    }
  }, []);

  // Fetch marketing data
  useEffect(() => {
    if (!workspaceId) {
      setLoading(false);
      return;
    }

    async function fetchData() {
      setLoading(true);
      try {
        // Fetch metrics summary
        const metricsRes = await fetch(
          `/api/marketing/metrics?workspaceId=${workspaceId}&period=${period}&type=summary`
        );
        if (metricsRes.ok) {
          const metricsData = await metricsRes.json();
          setMetrics(metricsData.data);
        }

        // Fetch channel performance
        const channelsRes = await fetch(
          `/api/marketing/metrics?workspaceId=${workspaceId}&period=${period}&type=channels`
        );
        if (channelsRes.ok) {
          const channelsData = await channelsRes.json();
          setChannels(channelsData.data || []);
        }

        // Fetch suggestions
        const suggestionsRes = await fetch(
          `/api/marketing/recommendations?workspaceId=${workspaceId}&period=${period}&type=all`
        );
        if (suggestionsRes.ok) {
          const suggestionsData = await suggestionsRes.json();
          setSuggestions(suggestionsData.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch marketing data:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [workspaceId, period]);

  const handleAskQuestion = async () => {
    if (!question.trim() || !workspaceId) return;

    setAskingQuestion(true);
    setAnswer(null);

    try {
      const res = await fetch('/api/marketing/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question,
          workspaceId,
          currency: 'USD',
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

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercent = (value: number) => {
    const sign = value > 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const formatChannelName = (channel: string) => {
    const names: Record<string, string> = {
      meta_ads: 'Meta Ads',
      google_ads: 'Google Ads',
      tiktok_ads: 'TikTok Ads',
      linkedin_ads: 'LinkedIn Ads',
    };
    return names[channel] || channel;
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'low':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (!workspaceId) {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <BarChart2 className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No Workspace Selected</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Please select or create a workspace to view marketing data.
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
          <h1 className="text-3xl font-bold tracking-tight">Marketing</h1>
          <p className="text-muted-foreground">
            AI-powered marketing performance and insights
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={period} onValueChange={setPeriod}>
            <TabsList>
              <TabsTrigger value="7d">7D</TabsTrigger>
              <TabsTrigger value="30d">30D</TabsTrigger>
              <TabsTrigger value="90d">90D</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {/* Ask Question */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Ask About Your Marketing</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="How is my marketing performing? Which channel has the best ROAS?"
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
                <CardTitle className="text-sm font-medium">Total Spend</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics ? formatCurrency(metrics.totalSpend) : '$0'}
                </div>
                {metrics && metrics.spendChange !== 0 && (
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    {metrics.spendChange > 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    {formatPercent(metrics.spendChange)} from last period
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics ? formatCurrency(metrics.totalRevenue) : '$0'}
                </div>
                {metrics && metrics.revenueChange !== 0 && (
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    {metrics.revenueChange > 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    {formatPercent(metrics.revenueChange)} from last period
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">ROAS</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics ? `${metrics.overallRoas.toFixed(2)}x` : '0x'}
                </div>
                {metrics && metrics.roasChange !== 0 && (
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    {metrics.roasChange > 0 ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    {formatPercent(metrics.roasChange)} from last period
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversions</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {metrics ? metrics.totalConversions.toLocaleString() : '0'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {metrics ? formatCurrency(metrics.overallCpa) : '$0'} CPA
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Channel Performance & Suggestions */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Channel Performance */}
            <Card>
              <CardHeader>
                <CardTitle>Channel Performance</CardTitle>
                <CardDescription>Performance breakdown by advertising channel</CardDescription>
              </CardHeader>
              <CardContent>
                {channels.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No channel data available. Connect your ad accounts to see performance.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {channels.map((channel) => (
                      <div
                        key={channel.channel}
                        className="flex items-center justify-between p-3 rounded-lg border"
                      >
                        <div>
                          <p className="font-medium">{formatChannelName(channel.channel)}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(channel.spend)} spend
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">{channel.roas.toFixed(2)}x ROAS</p>
                          <p className="text-sm text-muted-foreground">
                            {channel.conversions.toLocaleString()} conversions
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* AI Suggestions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  AI Recommendations
                </CardTitle>
                <CardDescription>Actionable insights to improve performance</CardDescription>
              </CardHeader>
              <CardContent>
                {suggestions.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No recommendations yet. Keep running your campaigns to get insights.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {suggestions.slice(0, 5).map((suggestion) => (
                      <div
                        key={suggestion.id}
                        className="p-3 rounded-lg border"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className={getPriorityColor(suggestion.priority)}>
                                {suggestion.priority}
                              </Badge>
                              <Badge variant="outline">{suggestion.type}</Badge>
                            </div>
                            <p className="font-medium text-sm">{suggestion.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {suggestion.description}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
