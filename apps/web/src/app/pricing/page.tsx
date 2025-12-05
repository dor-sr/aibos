import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  BarChart3,
  Check,
  HelpCircle,
  X,
} from 'lucide-react';

const plans = [
  {
    name: 'Free',
    description: 'For individuals exploring AI analytics',
    price: '$0',
    period: 'forever',
    cta: 'Start Free',
    ctaVariant: 'outline' as const,
    features: [
      { name: '1 connector', included: true },
      { name: '10 NLQ questions/day', included: true },
      { name: 'Basic dashboard', included: true },
      { name: 'Weekly reports', included: true },
      { name: '1 team member', included: true },
      { name: 'Community support', included: true },
      { name: 'Custom dashboards', included: false },
      { name: 'Anomaly detection', included: false },
      { name: 'API access', included: false },
    ],
  },
  {
    name: 'Starter',
    description: 'For small businesses getting started',
    price: '$49',
    period: '/month',
    cta: 'Start Free Trial',
    ctaVariant: 'outline' as const,
    popular: false,
    features: [
      { name: '3 connectors', included: true },
      { name: '100 NLQ questions/day', included: true },
      { name: 'Full dashboard', included: true },
      { name: 'Weekly & monthly reports', included: true },
      { name: '3 team members', included: true },
      { name: 'Email support', included: true },
      { name: '1 custom dashboard', included: true },
      { name: 'Basic anomaly detection', included: true },
      { name: 'API access (60 req/min)', included: true },
    ],
  },
  {
    name: 'Pro',
    description: 'For growing businesses that need more',
    price: '$149',
    period: '/month',
    cta: 'Start Free Trial',
    ctaVariant: 'default' as const,
    popular: true,
    features: [
      { name: '10 connectors', included: true },
      { name: 'Unlimited NLQ questions', included: true },
      { name: 'Full dashboard + builder', included: true },
      { name: 'All report types', included: true },
      { name: '10 team members', included: true },
      { name: 'Priority support', included: true },
      { name: '10 custom dashboards', included: true },
      { name: 'Advanced anomaly detection', included: true },
      { name: 'API access (1000 req/min)', included: true },
      { name: 'Embeddable analytics', included: true },
      { name: 'Marketing Agent', included: true },
      { name: 'Commerce Ops Agent', included: true },
    ],
  },
  {
    name: 'Enterprise',
    description: 'For large organizations with custom needs',
    price: 'Custom',
    period: '',
    cta: 'Contact Sales',
    ctaVariant: 'outline' as const,
    features: [
      { name: 'Unlimited connectors', included: true },
      { name: 'Unlimited everything', included: true },
      { name: 'Custom integrations', included: true },
      { name: 'White-label reports', included: true },
      { name: 'Unlimited team members', included: true },
      { name: 'Dedicated support', included: true },
      { name: 'Unlimited dashboards', included: true },
      { name: 'Custom anomaly rules', included: true },
      { name: 'API access (5000 req/min)', included: true },
      { name: 'White-label embeds', included: true },
      { name: 'All agents', included: true },
      { name: 'SSO & SAML', included: true },
      { name: 'SLA guarantee', included: true },
    ],
  },
];

const faqs = [
  {
    question: 'What is a connector?',
    answer: 'A connector is a connection to a data source like Shopify, Stripe, or Google Analytics. Each connected account counts as one connector.',
  },
  {
    question: 'What are NLQ questions?',
    answer: 'NLQ (Natural Language Query) questions are when you ask the AI agent questions about your data in plain English, like "What was my revenue last month?"',
  },
  {
    question: 'Can I change plans later?',
    answer: 'Yes, you can upgrade or downgrade your plan at any time. When upgrading, you\'ll be charged the prorated difference. When downgrading, you\'ll receive credit for unused time.',
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes, all paid plans include a 14-day free trial. No credit card required to start.',
  },
  {
    question: 'What payment methods do you accept?',
    answer: 'We accept all major credit cards (Visa, Mastercard, American Express) and can arrange invoicing for Enterprise customers.',
  },
  {
    question: 'Can I get a refund?',
    answer: 'We offer a 30-day money-back guarantee for annual plans. Monthly plans can be cancelled anytime with no refunds for partial months.',
  },
];

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">AI Business OS</span>
          </Link>
          <nav className="flex items-center gap-4">
            <Link href="/docs">
              <Button variant="ghost">Docs</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-slate-900 mb-4">
            Simple, transparent pricing
          </h1>
          <p className="text-xl text-slate-600">
            Start free and scale as you grow. All plans include core analytics features.
            No hidden fees.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid gap-6 lg:grid-cols-4 max-w-6xl mx-auto mb-20">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`relative ${plan.popular ? 'border-primary shadow-lg scale-105' : ''}`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Most Popular
                </Badge>
              )}
              <CardHeader>
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="pt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">{plan.period}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Link href="/signup">
                  <Button className="w-full" variant={plan.ctaVariant}>
                    {plan.cta}
                  </Button>
                </Link>
                <ul className="space-y-2">
                  {plan.features.map((feature) => (
                    <li key={feature.name} className="flex items-center gap-2 text-sm">
                      {feature.included ? (
                        <Check className="h-4 w-4 text-green-600 shrink-0" />
                      ) : (
                        <X className="h-4 w-4 text-muted-foreground shrink-0" />
                      )}
                      <span className={feature.included ? '' : 'text-muted-foreground'}>
                        {feature.name}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Feature Comparison */}
        <div className="max-w-5xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">Compare Plans</h2>
          <Card>
            <CardContent className="pt-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 font-medium">Feature</th>
                      <th className="text-center py-3 font-medium">Free</th>
                      <th className="text-center py-3 font-medium">Starter</th>
                      <th className="text-center py-3 font-medium">Pro</th>
                      <th className="text-center py-3 font-medium">Enterprise</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { feature: 'Connectors', free: '1', starter: '3', pro: '10', enterprise: 'Unlimited' },
                      { feature: 'NLQ Questions', free: '10/day', starter: '100/day', pro: 'Unlimited', enterprise: 'Unlimited' },
                      { feature: 'Team Members', free: '1', starter: '3', pro: '10', enterprise: 'Unlimited' },
                      { feature: 'Custom Dashboards', free: '-', starter: '1', pro: '10', enterprise: 'Unlimited' },
                      { feature: 'API Rate Limit', free: '-', starter: '60/min', pro: '1,000/min', enterprise: '5,000/min' },
                      { feature: 'Reports', free: 'Weekly', starter: 'Weekly + Monthly', pro: 'All', enterprise: 'All + Custom' },
                      { feature: 'Anomaly Detection', free: '-', starter: 'Basic', pro: 'Advanced', enterprise: 'Custom Rules' },
                      { feature: 'Marketing Agent', free: '-', starter: '-', pro: 'Yes', enterprise: 'Yes' },
                      { feature: 'Commerce Ops Agent', free: '-', starter: '-', pro: 'Yes', enterprise: 'Yes' },
                      { feature: 'Embeddable Analytics', free: '-', starter: '-', pro: 'Yes', enterprise: 'White-label' },
                      { feature: 'Support', free: 'Community', starter: 'Email', pro: 'Priority', enterprise: 'Dedicated' },
                      { feature: 'SSO/SAML', free: '-', starter: '-', pro: '-', enterprise: 'Yes' },
                    ].map((row) => (
                      <tr key={row.feature} className="border-b">
                        <td className="py-3">{row.feature}</td>
                        <td className="text-center py-3 text-muted-foreground">{row.free}</td>
                        <td className="text-center py-3">{row.starter}</td>
                        <td className="text-center py-3">{row.pro}</td>
                        <td className="text-center py-3">{row.enterprise}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQs */}
        <div className="max-w-3xl mx-auto mb-20">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.question}>
                <CardContent className="pt-4">
                  <h4 className="font-medium flex items-center gap-2">
                    <HelpCircle className="h-4 w-4 text-primary" />
                    {faq.question}
                  </h4>
                  <p className="text-sm text-muted-foreground mt-2 ml-6">
                    {faq.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center max-w-2xl mx-auto">
          <Card className="bg-primary text-primary-foreground">
            <CardContent className="pt-8 pb-8">
              <h2 className="text-2xl font-bold mb-2">Ready to get started?</h2>
              <p className="text-primary-foreground/80 mb-6">
                Start with our free plan and upgrade when you need more.
                No credit card required.
              </p>
              <Link href="/signup">
                <Button variant="secondary" size="lg" className="gap-2">
                  Create Free Account <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 mt-20">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                <BarChart3 className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">AI Business OS</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="/docs" className="hover:text-foreground">Documentation</Link>
              <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
              <Link href="/login" className="hover:text-foreground">Sign In</Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
