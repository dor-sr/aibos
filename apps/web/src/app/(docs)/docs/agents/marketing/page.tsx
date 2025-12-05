import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BarChart3,
  ChevronRight,
  DollarSign,
  Edit,
  Lightbulb,
  Target,
  TrendingUp,
  Zap,
} from 'lucide-react';

export default function MarketingAgentPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/docs/agents/marketing" className="hover:text-foreground">Agents</Link>
          <ChevronRight className="h-4 w-4" />
          <span>Marketing Agent</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <Target className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
              Marketing Agent
            </h1>
            <p className="text-muted-foreground mt-1">
              AI-powered marketing performance analysis
            </p>
          </div>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Understand your advertising performance, get budget recommendations, detect creative
          fatigue, and generate new ad copy with AI assistance.
        </p>
      </div>

      {/* Key Capabilities */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: 'Campaign Analysis',
            description: 'Cross-channel performance metrics',
            icon: BarChart3,
          },
          {
            title: 'Budget Optimization',
            description: 'AI-powered spend recommendations',
            icon: DollarSign,
          },
          {
            title: 'ROAS Tracking',
            description: 'Return on ad spend by channel',
            icon: TrendingUp,
          },
          {
            title: 'Creative Fatigue Detection',
            description: 'Know when to refresh creatives',
            icon: Zap,
          },
          {
            title: 'Ad Copy Generation',
            description: 'AI-written headlines and copy',
            icon: Edit,
          },
          {
            title: 'Smart Recommendations',
            description: 'Actionable optimization suggestions',
            icon: Lightbulb,
          },
        ].map((capability) => {
          const Icon = capability.icon;
          return (
            <Card key={capability.title}>
              <CardContent className="pt-4">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm">{capability.title}</h3>
                    <p className="text-xs text-muted-foreground">{capability.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Connected Platforms */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Connected Platforms
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Meta Ads</CardTitle>
              <CardDescription>Facebook and Instagram advertising</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Campaign, ad set, and ad performance</li>
                <li>- Spend, impressions, clicks, conversions</li>
                <li>- Audience insights</li>
                <li>- Creative performance tracking</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Google Ads</CardTitle>
              <CardDescription>Search and display advertising</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Campaign and ad group metrics</li>
                <li>- Keyword performance</li>
                <li>- Quality Score tracking</li>
                <li>- Conversion data</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Marketing Metrics
        </h2>
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { metric: 'Total Ad Spend', desc: 'Across all platforms' },
                { metric: 'ROAS', desc: 'Return on ad spend' },
                { metric: 'CPA / CAC', desc: 'Cost per acquisition' },
                { metric: 'CTR', desc: 'Click-through rate' },
                { metric: 'CPM', desc: 'Cost per thousand impressions' },
                { metric: 'Conversions', desc: 'Total and by channel' },
                { metric: 'Revenue Attributed', desc: 'Revenue from ads' },
                { metric: 'Frequency', desc: 'Average ad impressions per user' },
                { metric: 'Reach', desc: 'Unique users reached' },
              ].map((item) => (
                <div key={item.metric} className="space-y-1">
                  <h4 className="font-medium text-sm">{item.metric}</h4>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Example Questions */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Example Questions
        </h2>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <div className="grid gap-3 sm:grid-cols-2">
              {[
                'What is our ROAS this month?',
                'How much did we spend on Meta Ads?',
                'Which campaigns have the best performance?',
                'What is our cost per acquisition?',
                'Which ads are showing creative fatigue?',
                'How is our Google Ads CTR trending?',
                'Which channel has the lowest CPA?',
                'Compare performance across platforms',
              ].map((question) => (
                <div
                  key={question}
                  className="flex items-center gap-2 p-3 bg-white rounded-lg border text-sm"
                >
                  <span className="text-primary font-medium">Q:</span>
                  {question}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          AI Recommendations
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Budget Reallocation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                The Marketing Agent analyzes performance across campaigns and suggests
                how to reallocate budget for better ROAS.
              </p>
              <div className="p-3 bg-muted rounded-lg text-sm">
                <span className="font-medium">Example:</span> &quot;Move $500 from Campaign A (1.2x ROAS)
                to Campaign B (3.5x ROAS) for estimated 15% improvement.&quot;
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Creative Fatigue Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Detects when ads are showing to the same audience too often and performance
                is declining.
              </p>
              <div className="p-3 bg-muted rounded-lg text-sm">
                <span className="font-medium">Example:</span> &quot;Ad set &apos;Summer Sale&apos; has 4.5 frequency
                and CTR dropped 40% in 7 days. Consider refreshing creative.&quot;
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Creative Generation */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          AI Creative Generation
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              Generate ad copy variations using AI. The Marketing Agent can create:
            </p>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium text-sm mb-2">Headlines</h4>
                <p className="text-xs text-muted-foreground">
                  Short, punchy headlines optimized for different platforms
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium text-sm mb-2">Primary Text</h4>
                <p className="text-xs text-muted-foreground">
                  Longer descriptions for Facebook/Instagram ads
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium text-sm mb-2">A/B Variations</h4>
                <p className="text-xs text-muted-foreground">
                  Multiple versions for testing different angles
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dashboard Preview */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Marketing Dashboard
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              The Marketing Agent powers a dedicated dashboard showing:
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {[
                'Total spend with period comparison',
                'ROAS trend over time',
                'Performance by channel breakdown',
                'Top performing campaigns',
                'CPA by campaign',
                'Conversion trends',
                'Creative performance table',
                'AI-generated recommendations',
              ].map((item) => (
                <div key={item} className="flex items-center gap-2 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Related */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/docs/agents/analytics">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardContent className="pt-4 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm">Analytics Agent</CardTitle>
                <CardDescription className="text-xs">Revenue, customers, trends</CardDescription>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/docs/connectors">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardContent className="pt-4 flex items-center gap-3">
              <Target className="h-5 w-5 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm">Connect Ad Platforms</CardTitle>
                <CardDescription className="text-xs">Set up Meta Ads and Google Ads</CardDescription>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
