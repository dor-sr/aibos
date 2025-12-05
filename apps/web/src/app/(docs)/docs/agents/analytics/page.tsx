import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  BarChart3,
  Brain,
  ChevronRight,
  Lightbulb,
  MessageSquare,
  Search,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

export default function AnalyticsAgentPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/docs/agents/analytics" className="hover:text-foreground">Agents</Link>
          <ChevronRight className="h-4 w-4" />
          <span>Analytics Agent</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary/10 rounded-lg">
            <BarChart3 className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
              Analytics Agent
            </h1>
            <p className="text-muted-foreground mt-1">
              Your AI-powered business analyst
            </p>
          </div>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Ask questions about your business data in plain English. The Analytics Agent
          understands your intent, queries your data, and provides clear, actionable answers.
        </p>
      </div>

      {/* Key Capabilities */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: 'Natural Language Questions',
            description: 'Ask in plain English, get data-driven answers',
            icon: MessageSquare,
          },
          {
            title: 'Intent Detection',
            description: 'Understands what you\'re really asking for',
            icon: Brain,
          },
          {
            title: 'Metric Calculation',
            description: 'Automatically calculates KPIs from raw data',
            icon: TrendingUp,
          },
          {
            title: 'Anomaly Detection',
            description: 'Spots unusual patterns and alerts you',
            icon: Zap,
          },
          {
            title: 'Proactive Insights',
            description: 'Surfaces opportunities without asking',
            icon: Lightbulb,
          },
          {
            title: 'Customer Analysis',
            description: 'Segmentation, cohorts, and LTV prediction',
            icon: Users,
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

      {/* How It Works */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          How It Works
        </h2>
        <Card className="bg-slate-50 border-slate-200">
          <CardContent className="pt-6">
            <div className="grid gap-6 sm:grid-cols-4">
              {[
                { step: 1, title: 'You Ask', desc: 'Type a question in plain English' },
                { step: 2, title: 'Intent Detection', desc: 'AI identifies what data you need' },
                { step: 3, title: 'Query Execution', desc: 'Fetches and calculates metrics' },
                { step: 4, title: 'Response', desc: 'Formatted answer with context' },
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

      {/* Supported Metrics */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Supported Metrics
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <Badge className="w-fit">Ecommerce</Badge>
              <CardTitle className="text-lg mt-2">Ecommerce Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  'Revenue (total, by period)',
                  'Orders (count, trends)',
                  'Average Order Value',
                  'New vs Returning Customers',
                  'Customer Lifetime Value',
                  'Product Performance',
                  'Category Sales',
                  'Repeat Purchase Rate',
                  'Cart Abandonment',
                  'Fulfillment Status',
                ].map((metric) => (
                  <div key={metric} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {metric}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Badge variant="secondary" className="w-fit">SaaS</Badge>
              <CardTitle className="text-lg mt-2">SaaS Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-2 sm:grid-cols-2">
                {[
                  'MRR / ARR',
                  'Net New MRR',
                  'Churn Rate',
                  'Revenue Churn',
                  'Active Subscriptions',
                  'New Subscriptions',
                  'Canceled Subscriptions',
                  'Trial Conversions',
                  'Average Revenue Per User',
                  'Plan Distribution',
                ].map((metric) => (
                  <div key={metric} className="flex items-center gap-2 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                    {metric}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Question Examples */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Example Questions
        </h2>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-6">
              <div>
                <h4 className="font-medium mb-3">Revenue & Sales</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    'What was our revenue last month?',
                    'How much did we make today?',
                    'What is our revenue trend this quarter?',
                    'Compare revenue this month to last month',
                  ].map((q) => (
                    <div key={q} className="p-2 bg-muted rounded-lg text-sm">
                      <span className="text-primary font-medium">Q:</span> {q}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Customer Analysis</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    'Who are our top 10 customers?',
                    'How many new customers this week?',
                    'What is our customer retention rate?',
                    'Show me customers at risk of churning',
                  ].map((q) => (
                    <div key={q} className="p-2 bg-muted rounded-lg text-sm">
                      <span className="text-primary font-medium">Q:</span> {q}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Product Performance</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    'What are our best selling products?',
                    'Which products have the highest margin?',
                    'What products are low on stock?',
                    'Show product sales by category',
                  ].map((q) => (
                    <div key={q} className="p-2 bg-muted rounded-lg text-sm">
                      <span className="text-primary font-medium">Q:</span> {q}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-3">Diagnostic Questions</h4>
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    'Why did revenue drop last week?',
                    'What caused the spike in orders yesterday?',
                    'Why is our churn rate increasing?',
                    'What is driving the AOV change?',
                  ].map((q) => (
                    <div key={q} className="p-2 bg-muted rounded-lg text-sm">
                      <span className="text-primary font-medium">Q:</span> {q}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversational Features */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Conversational Features
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Follow-up Questions</CardTitle>
              <CardDescription>Continue the conversation naturally</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-muted rounded-lg">
                  <span className="text-primary font-medium">Q:</span> What was our revenue last month?
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <span className="font-medium">A:</span> Your revenue last month was $45,230...
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <span className="text-primary font-medium">Q:</span> How does that compare to the month before?
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <span className="font-medium">A:</span> Revenue increased by 12% compared to...
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Entity Memory</CardTitle>
              <CardDescription>Remembers context from the conversation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-muted rounded-lg">
                  <span className="text-primary font-medium">Q:</span> Show me sales for Product ABC
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <span className="font-medium">A:</span> Product ABC had 150 units sold...
                </div>
                <div className="p-2 bg-muted rounded-lg">
                  <span className="text-primary font-medium">Q:</span> What about its return rate?
                </div>
                <div className="p-2 bg-primary/10 rounded-lg">
                  <span className="font-medium">A:</span> Product ABC has a return rate of 2.3%...
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Advanced Analytics */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Advanced Analytics
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Cohort Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Track how customer groups behave over time.
              </p>
              <ul className="text-sm space-y-1">
                <li>- Retention by acquisition cohort</li>
                <li>- Revenue per cohort</li>
                <li>- Behavior patterns over time</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">RFM Segmentation</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Segment customers by value and engagement.
              </p>
              <ul className="text-sm space-y-1">
                <li>- Recency: Last purchase date</li>
                <li>- Frequency: Purchase count</li>
                <li>- Monetary: Total spend</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Attribution</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Understand which channels drive conversions.
              </p>
              <ul className="text-sm space-y-1">
                <li>- First-touch attribution</li>
                <li>- Last-touch attribution</li>
                <li>- Linear and time-decay</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tips for Better Results */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Tips for Better Results
        </h2>
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Be specific about time periods</h4>
                <p className="text-xs text-muted-foreground">
                  Instead of &quot;How is revenue?&quot; ask &quot;What was revenue last month?&quot;
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Use metric names</h4>
                <p className="text-xs text-muted-foreground">
                  Include terms like &quot;revenue,&quot; &quot;orders,&quot; &quot;MRR,&quot; &quot;churn&quot;
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Ask follow-ups</h4>
                <p className="text-xs text-muted-foreground">
                  The agent remembers context, so drill down naturally
                </p>
              </div>
              <div className="space-y-1">
                <h4 className="font-medium text-sm">Use comparisons</h4>
                <p className="text-xs text-muted-foreground">
                  Ask &quot;compare X to Y&quot; or &quot;how does X compare to last month&quot;
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Related */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Link href="/docs/agents/marketing">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardContent className="pt-4 flex items-center gap-3">
              <Search className="h-5 w-5 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm">Marketing Agent</CardTitle>
                <CardDescription className="text-xs">Ad performance and recommendations</CardDescription>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/docs/agents/commerce-ops">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardContent className="pt-4 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm">Commerce Ops Agent</CardTitle>
                <CardDescription className="text-xs">Inventory and pricing</CardDescription>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
