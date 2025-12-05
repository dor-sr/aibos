import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  Check,
  ChevronRight,
  RefreshCw,
  Zap,
} from 'lucide-react';

export default function GoogleAnalyticsConnectorPage() {
  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href="/docs" className="hover:text-foreground">Docs</Link>
          <ChevronRight className="h-4 w-4" />
          <Link href="/docs/connectors" className="hover:text-foreground">Connectors</Link>
          <ChevronRight className="h-4 w-4" />
          <span>Google Analytics 4</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-[#F9AB00]/10 rounded-lg">
            <BarChart3 className="h-8 w-8 text-[#F9AB00]" />
          </div>
          <div>
            <h1 className="scroll-m-20 text-4xl font-bold tracking-tight">
              Google Analytics 4 Connector
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="default">Available</Badge>
              <Badge variant="outline">Analytics</Badge>
              <Badge variant="outline">OAuth 2.0</Badge>
            </div>
          </div>
        </div>
        <p className="text-xl text-muted-foreground max-w-2xl">
          Connect Google Analytics 4 to import sessions, pageviews, traffic sources, and
          conversion data for a complete view of your website performance.
        </p>
      </div>

      {/* Quick Info */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Auth Type</span>
            </div>
            <div className="font-medium mt-1">Google OAuth 2.0</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Sync Frequency</span>
            </div>
            <div className="font-medium mt-1">Daily (after GA4 processing)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Check className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Setup Time</span>
            </div>
            <div className="font-medium mt-1">~2 minutes</div>
          </CardContent>
        </Card>
      </div>

      {/* Data Synced */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Data Synced
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sessions</CardTitle>
              <CardDescription>Website visit data</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Total sessions by date</li>
                <li>- Engaged sessions</li>
                <li>- Average session duration</li>
                <li>- Engagement rate</li>
                <li>- New vs returning users</li>
                <li>- Sessions by device category</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pageviews</CardTitle>
              <CardDescription>Page-level analytics</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Views by page path</li>
                <li>- Unique pageviews</li>
                <li>- Average time on page</li>
                <li>- Bounce rate by page</li>
                <li>- Entry and exit pages</li>
                <li>- Page scroll depth</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Traffic Sources</CardTitle>
              <CardDescription>Acquisition data</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Traffic by source/medium</li>
                <li>- Campaign performance</li>
                <li>- Referral sources</li>
                <li>- Organic search data</li>
                <li>- Social traffic breakdown</li>
                <li>- Default channel grouping</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Conversions</CardTitle>
              <CardDescription>Goal and event tracking</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>- Conversion events count</li>
                <li>- Conversion rate by source</li>
                <li>- Ecommerce transactions</li>
                <li>- Revenue by channel</li>
                <li>- Goal completions</li>
                <li>- Event parameters</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Setup Steps */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Setup Instructions
        </h2>

        <div className="space-y-4">
          {[
            {
              step: 1,
              title: 'Navigate to Connectors',
              description: 'Go to Dashboard > Connectors in your AI Business OS workspace.',
            },
            {
              step: 2,
              title: 'Click Connect on Google Analytics',
              description: 'Find the Google Analytics 4 card and click Connect.',
            },
            {
              step: 3,
              title: 'Sign in with Google',
              description: 'You\'ll be redirected to Google. Sign in with the account that has access to your GA4 property.',
            },
            {
              step: 4,
              title: 'Select Properties',
              description: 'Choose which GA4 properties you want to connect.',
            },
            {
              step: 5,
              title: 'Grant Permissions',
              description: 'Allow AI Business OS read-only access to your analytics data.',
            },
            {
              step: 6,
              title: 'Wait for Initial Sync',
              description: 'Data import takes 5-15 minutes. Historical data from the last 90 days is imported.',
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

      {/* Permissions */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Required Permissions
        </h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-4">
              The Google Analytics connector requests these read-only OAuth scopes:
            </p>
            <div className="space-y-2">
              {[
                { scope: 'analytics.readonly', description: 'View your Google Analytics data' },
                { scope: 'userinfo.email', description: 'View your email address (for identification)' },
              ].map((perm) => (
                <div key={perm.scope} className="flex items-start gap-2 text-sm">
                  <Check className="h-4 w-4 text-green-600 mt-0.5 shrink-0" />
                  <div>
                    <code className="bg-muted px-1 rounded text-xs">{perm.scope}</code>
                    <span className="text-muted-foreground ml-2">- {perm.description}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Data Freshness */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Data Freshness
        </h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h4 className="font-medium">GA4 Processing Delay</h4>
              <p className="text-sm text-muted-foreground">
                Google Analytics 4 data has a processing delay of 24-48 hours. Data you see
                reflects completed sessions, not real-time activity.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Sync Schedule</h4>
              <p className="text-sm text-muted-foreground">
                We sync once daily after GA4 finishes processing. Syncs run in the early
                morning (UTC) to capture the previous day&apos;s complete data.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Historical Data</h4>
              <p className="text-sm text-muted-foreground">
                Initial sync imports the last 90 days of data. Contact support if you need
                more historical data imported.
              </p>
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
                'How many sessions did we get last week?',
                'What are our top traffic sources?',
                'Which pages have the highest bounce rate?',
                'What is our conversion rate from organic search?',
                'How much revenue came from paid ads?',
                'What is our average session duration?',
                'Which campaigns are driving the most conversions?',
                'How are mobile vs desktop sessions trending?',
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

      {/* Troubleshooting */}
      <div className="space-y-6">
        <h2 className="scroll-m-20 text-2xl font-semibold tracking-tight">
          Troubleshooting
        </h2>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h4 className="font-medium">Can&apos;t see my GA4 property</h4>
              <p className="text-sm text-muted-foreground">
                Make sure you&apos;re signed in with a Google account that has at least Viewer
                access to the GA4 property. Check your GA4 admin settings.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Data doesn&apos;t match GA4 dashboard</h4>
              <p className="text-sm text-muted-foreground">
                Slight differences may occur due to sampling in large datasets. Our queries
                use the GA4 Data API which may use different aggregation than the GA4 UI.
              </p>
            </div>
            <div>
              <h4 className="font-medium">Missing recent data</h4>
              <p className="text-sm text-muted-foreground">
                Remember that GA4 has a 24-48 hour processing delay. Data from today and
                yesterday may not be complete yet.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CTA */}
      <Card className="bg-primary text-primary-foreground">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">Ready to connect Google Analytics?</h3>
              <p className="text-primary-foreground/80">
                Get insights from your website traffic and conversions.
              </p>
            </div>
            <Link href="/dashboard/connectors">
              <Button variant="secondary" size="lg">
                Go to Connectors
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
