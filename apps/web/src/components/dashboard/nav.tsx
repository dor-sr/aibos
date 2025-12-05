'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BarChart3, Settings, Plug, FileText, Megaphone, Package } from 'lucide-react';

const navItems = [
  {
    title: 'Overview',
    href: '/dashboard' as const,
    icon: BarChart3,
  },
  {
    title: 'Marketing',
    href: '/dashboard/marketing' as const,
    icon: Megaphone,
  },
  {
    title: 'Operations',
    href: '/dashboard/operations' as const,
    icon: Package,
  },
  {
    title: 'Connectors',
    href: '/dashboard/connectors' as const,
    icon: Plug,
  },
  {
    title: 'Reports',
    href: '/dashboard/reports' as const,
    icon: FileText,
  },
  {
    title: 'Settings',
    href: '/dashboard/settings' as const,
    icon: Settings,
  },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="w-64 border-r bg-white min-h-[calc(100vh-64px)] p-4">
      <ul className="space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.title}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}


