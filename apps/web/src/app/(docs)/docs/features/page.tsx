import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertCircle,
  ArrowRight,
  BarChart3,
  Bell,
  Brain,
  Calendar,
  ChevronRight,
  FileText,
  GitBranch,
  Globe,
  Layout,
  LineChart,
  MessageSquare,
  Plug,
  Search,
  Shield,
  Target,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';

export default function FeaturesPage() {
  const featureCategories = [
    {
      title: 'Natural Language Questions (NLQ)',
      description: 'Ask questions about your business data in plain English and get instant answers.',
      icon: MessageSquare,
      features: [
        {
          name: 'Conversational Interface',
          description: 'Type questions like you\'re talking to a colleague. No SQL or technical knowledge required.',
        },
        {
          name: 'Intent Detection',
          description: 'The AI understands what you\'re asking and maps it to the right data query.',
        },
        {
          name: 'Contextual Follow-ups',
          description: 'Ask follow-up questions that reference previous answers in the conversation.',
        },
        {
          name: 'Suggested Questions',
          description: 'Get smart suggestions based on your data and business vertical.',
        },
      ],
    },
    {
      title: 'Dashboards & Metrics',
      description: 'Real-time dashboards with key metrics tailored to your business type.',
      icon: BarChart3,
      features: [
        {
          name: 'Vertical-Specific Metrics',
          description: 'Ecommerce: Revenue, AOV, Orders. SaaS: MRR, Churn, Subscriptions.',
        },
        {
          name: 'Trend Analysis',
          description: 'See how metrics change over time with interactive charts.',
        },
        {
          name: 'Custom Dashboards',
          description: 'Build your own dashboards with drag-and-drop widgets.',
        },
        {
          name: 'Real-Time Updates',
          description: 'Metrics update automatically as new data comes in via webhooks.',
        },
      ],
    },
    {
      title: 'Automated Reports',
      description: 'Get regular summaries of your business performance delivered automatically.',
      icon: FileText,
      features: [
        {
          name: 'Weekly Reports',
          description: 'Comprehensive weekly summaries with key metrics and trends.',
        },
        {
          name: 'AI-Generated Summaries',
          description: 'Natural language explanations of what happened and why.',
        },
        {
          name: 'Email Delivery',
          description: 'Reports delivered to your inbox or Slack channel.',
        },
        {
          name: 'PDF Export',
          description: 'Export reports as professional PDFs for stakeholders.',
        },
      ],
    },
    {
      title: 'Anomaly Detection',
      description: 'Automatically detect unusual patterns in your metrics and get alerted.',
      icon: AlertCircle,
      features: [
        {
          name: 'Smart Detection',
          description: 'AI identifies significant deviations from expected values.',
        },
        {
          name: 'Severity Levels',
          description: 'Anomalies are classified as high, medium, or low severity.',
        },
        {
          name: 'Explanations',
          description: 'Get AI-generated explanations for why anomalies occurred.',
        },
        {
          name: 'Real-Time Alerts',
          description: 'Get notified immediately when anomalies are detected.',
        },
      ],
    },
    {
      title: 'Proactive Insights',
      description: 'AI-generated insights that surface opportunities and risks without you asking.',
      icon: Brain,
      features: [
        {
          name: 'Opportunity Detection',
          description: 'Identify growth opportunities like trending products or expanding segments.',
        },
        {
          name: 'Risk Alerts',
          description: 'Early warning for churn signals, declining metrics, and problems.',
        },
        {
          name: 'Prioritization',
          description: 'Insights are ranked by potential impact on your business.',
        },
        {
          name: 'Actionable Recommendations',
          description: 'Each insight includes suggested actions to take.',
        },
      ],
    },
    {
      title: 'Customer Intelligence',
      description: 'Deep understanding of your customers through segmentation and cohort analysis.',
      icon: Users,
      features: [
        {
          name: 'RFM Segmentation',
          description: 'Segment customers by Recency, Frequency, and Monetary value.',
        },
        {
          name: 'Cohort Analysis',
          description: 'Track retention and behavior by acquisition cohort.',
        },
        {
          name: 'LTV Prediction',
          description: 'Predict customer lifetime value using historical patterns.',
        },
        {
          name: 'Churn Prediction',
          description: 'Identify customers at risk of churning before they leave.',
        },
      ],
    },
  ];

  const additionalFeatures = [
    { name: 'Multi-Connector Sync', description: 'Connect multiple data sources simultaneously', icon: Plug },
    { name: 'Team Collaboration', description: 'Invite team members with role-based access', icon: Users },
    { name: 'Notifications', description: 'Email, Slack, and in-app notifications', icon: Bell },
    { name: 'API Access', description: 'Full REST API for custom integrations', icon: Globe },
    { name: 'Embeddable Charts', description: 'Embed analytics in your own apps', icon: Layout },
    { name: 'Attribution Modeling', description: '5 attribution models for marketing analysis', icon: GitBranch },
    { name: 'Custom Metrics', description: 'Create calculated metrics with formulas', icon: TrendingUp },
    { name: 'Saved Views', description: 'Save and share filtered dashboard views', icon: Search },
  ];

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
          <ChevronRight className="h-4 w-4" />
          <span>Features</span>
        </div>
        <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
          Features Overview
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl">
          AI Business OS is packed with features to help you understand and grow your business.
          Here&apos;s everything you can do.
        </p>
      </div>

      {/* Main Features */}
      <div className="space-y-8">
        {featureCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.title}>
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">{category.title}</CardTitle>
                    <CardDescription className="mt-1">{category.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 sm:grid-cols-2">
                  {category.features.map((feature) => (
                    <div key={feature.name} className="space-y-1">
                      <h4 className="font-medium text-sm">{feature.name}</h4>
                      <p className="text-sm text-muted-foreground">{feature.description}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Additional Features Grid */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          And Much More
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {additionalFeatures.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.name}>
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-primary shrink-0" />
                    <div>
                      <div className="font-medium text-sm">{feature.name}</div>
                      <div className="text-xs text-muted-foreground">{feature.description}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Verticals Comparison */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Metrics by Business Type
        </h2>
        <div className="grid gap-6 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge>Ecommerce</Badge>
                <CardTitle className="text-lg">Key Metrics</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { metric: 'Revenue', desc: 'Total, by period, by channel' },
                  { metric: 'Orders', desc: 'Count, trends, fulfillment status' },
                  { metric: 'AOV', desc: 'Average order value with trends' },
                  { metric: 'Customers', desc: 'New vs returning, segmentation' },
                  { metric: 'Products', desc: 'Best sellers, inventory levels' },
                  { metric: 'Cart Abandonment', desc: 'Rate and recovery tracking' },
                ].map((item) => (
                  <div key={item.metric} className="flex items-baseline gap-2">
                    <span className="font-medium text-sm">{item.metric}</span>
                    <span className="text-xs text-muted-foreground">{item.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">SaaS</Badge>
                <CardTitle className="text-lg">Key Metrics</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { metric: 'MRR/ARR', desc: 'Monthly and annual recurring revenue' },
                  { metric: 'Churn', desc: 'Customer and revenue churn rates' },
                  { metric: 'Subscriptions', desc: 'Active, new, canceled' },
                  { metric: 'NRR', desc: 'Net revenue retention rate' },
                  { metric: 'LTV', desc: 'Customer lifetime value' },
                  { metric: 'CAC', desc: 'Customer acquisition cost' },
                ].map((item) => (
                  <div key={item.metric} className="flex items-baseline gap-2">
                    <span className="font-medium text-sm">{item.metric}</span>
                    <span className="text-xs text-muted-foreground">{item.desc}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feature Availability */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Feature Availability
        </h2>
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Feature</th>
                    <th className="text-center py-2 font-medium">Free</th>
                    <th className="text-center py-2 font-medium">Starter</th>
                    <th className="text-center py-2 font-medium">Pro</th>
                    <th className="text-center py-2 font-medium">Enterprise</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { feature: 'Natural Language Questions', free: '10/day', starter: '100/day', pro: 'Unlimited', enterprise: 'Unlimited' },
                    { feature: 'Connectors', free: '1', starter: '3', pro: '10', enterprise: 'Unlimited' },
                    { feature: 'Dashboard', free: 'Yes', starter: 'Yes', pro: 'Yes', enterprise: 'Yes' },
                    { feature: 'Custom Dashboards', free: '-', starter: '1', pro: '10', enterprise: 'Unlimited' },
                    { feature: 'Weekly Reports', free: 'Yes', starter: 'Yes', pro: 'Yes', enterprise: 'Yes' },
                    { feature: 'Anomaly Detection', free: '-', starter: 'Basic', pro: 'Advanced', enterprise: 'Advanced' },
                    { feature: 'Team Members', free: '1', starter: '3', pro: '10', enterprise: 'Unlimited' },
                    { feature: 'API Access', free: '-', starter: '60 req/min', pro: '1000 req/min', enterprise: '5000 req/min' },
                    { feature: 'Embeddable Analytics', free: '-', starter: '-', pro: 'Yes', enterprise: 'White-label' },
                    { feature: 'Support', free: 'Community', starter: 'Email', pro: 'Priority', enterprise: 'Dedicated' },
                  ].map((row) => (
                    <tr key={row.feature} className="border-b">
                      <td className="py-2">{row.feature}</td>
                      <td className="text-center py-2 text-muted-foreground">{row.free}</td>
                      <td className="text-center py-2">{row.starter}</td>
                      <td className="text-center py-2">{row.pro}</td>
                      <td className="text-center py-2">{row.enterprise}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground">
          <Link href="/pricing" className="text-primary hover:underline">
            View full pricing details
          </Link>
        </p>
      </div>

      {/* Next Steps */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href="/docs/connectors">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardContent className="pt-4 flex items-center gap-3">
              <Plug className="h-5 w-5 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm">Connect Data Sources</CardTitle>
                <CardDescription className="text-xs">Set up your first connector</CardDescription>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/docs/agents/analytics">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardContent className="pt-4 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm">Analytics Agent</CardTitle>
                <CardDescription className="text-xs">Learn to ask questions</CardDescription>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/docs/api">
          <Card className="h-full transition-colors hover:border-primary/50">
            <CardContent className="pt-4 flex items-center gap-3">
              <Globe className="h-5 w-5 text-primary shrink-0" />
              <div>
                <CardTitle className="text-sm">API Reference</CardTitle>
                <CardDescription className="text-xs">Build integrations</CardDescription>
              </div>
              <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
