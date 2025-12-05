import { BarChart3 } from 'lucide-react';
import Link from 'next/link';

// Force dynamic rendering for auth pages to avoid SSR issues with supabase client
export const dynamic = 'force-dynamic';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="p-4">
        <Link href="/" className="flex items-center gap-2 w-fit">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-lg">AI Business OS</span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center p-4">{children}</main>
    </div>
  );
}


