'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BarChart3,
  Book,
  ChevronRight,
  Code2,
  FileText,
  Home,
  Menu,
  Plug,
  Rocket,
  ShoppingCart,
  Target,
  X,
  Zap,
  LucideIcon,
} from 'lucide-react';

type DocsRoute =
  | '/docs'
  | '/docs/getting-started'
  | '/docs/features'
  | '/docs/connectors'
  | '/docs/connectors/shopify'
  | '/docs/connectors/stripe'
  | '/docs/connectors/google-analytics'
  | '/docs/agents/analytics'
  | '/docs/agents/marketing'
  | '/docs/agents/commerce-ops'
  | '/docs/api'
  | '/docs/api/authentication'
  | '/docs/api/endpoints'
  | '/docs/api/webhooks';

interface NavItem {
  title: string;
  href: DocsRoute;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navigation: NavSection[] = [
  {
    title: 'Getting Started',
    items: [
      { title: 'Introduction', href: '/docs', icon: Book },
      { title: 'Quick Start', href: '/docs/getting-started', icon: Rocket },
      { title: 'Features', href: '/docs/features', icon: Zap },
    ],
  },
  {
    title: 'Data Sources',
    items: [
      { title: 'Connectors Overview', href: '/docs/connectors', icon: Plug },
      { title: 'Shopify', href: '/docs/connectors/shopify', icon: ShoppingCart },
      { title: 'Stripe', href: '/docs/connectors/stripe', icon: FileText },
      { title: 'Google Analytics', href: '/docs/connectors/google-analytics', icon: BarChart3 },
    ],
  },
  {
    title: 'AI Agents',
    items: [
      { title: 'Analytics Agent', href: '/docs/agents/analytics', icon: BarChart3 },
      { title: 'Marketing Agent', href: '/docs/agents/marketing', icon: Target },
      { title: 'Commerce Ops Agent', href: '/docs/agents/commerce-ops', icon: ShoppingCart },
    ],
  },
  {
    title: 'API Reference',
    items: [
      { title: 'API Overview', href: '/docs/api', icon: Code2 },
      { title: 'Authentication', href: '/docs/api/authentication', icon: FileText },
      { title: 'Endpoints', href: '/docs/api/endpoints', icon: FileText },
      { title: 'Webhooks', href: '/docs/api/webhooks', icon: FileText },
    ],
  },
];

export default function DocsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="font-semibold">AI Business OS</span>
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link href="/docs" className="text-muted-foreground hover:text-foreground">
              Docs
            </Link>
          </div>
          <nav className="flex items-center gap-2">
            <Link href="/pricing">
              <Button variant="ghost" size="sm">Pricing</Button>
            </Link>
            <Link href="/login">
              <Button variant="ghost" size="sm">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-10">
        {/* Sidebar */}
        <aside
          className={cn(
            'fixed top-14 z-30 -ml-2 h-[calc(100vh-3.5rem)] w-full shrink-0 md:sticky md:block',
            sidebarOpen ? 'block' : 'hidden'
          )}
        >
          <ScrollArea className="h-full py-6 pr-6 lg:py-8">
            <div className="space-y-6">
              <div className="flex items-center gap-2 md:hidden">
                <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
                  <Home className="h-4 w-4" />
                  Back to Home
                </Link>
              </div>
              {navigation.map((section) => (
                <div key={section.title} className="space-y-2">
                  <h4 className="font-semibold text-sm text-foreground px-2">
                    {section.title}
                  </h4>
                  <div className="space-y-1">
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setSidebarOpen(false)}
                          className={cn(
                            'flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm transition-colors',
                            isActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                          )}
                        >
                          <Icon className="h-4 w-4" />
                          {item.title}
                          {isActive && <ChevronRight className="ml-auto h-4 w-4" />}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </aside>

        {/* Main Content */}
        <main className="relative py-6 lg:gap-10 lg:py-8 xl:grid xl:grid-cols-[1fr_200px]">
          <div className="mx-auto w-full min-w-0">
            {children}
          </div>
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t py-6 md:py-0">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
          <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
            Built by{' '}
            <Link href="/" className="font-medium underline underline-offset-4">
              AI Business OS
            </Link>
            . The source code is available on{' '}
            <Link
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="font-medium underline underline-offset-4"
            >
              GitHub
            </Link>
            .
          </p>
        </div>
      </footer>
    </div>
  );
}
