import Link from 'next/link';
import { ArrowRight, BarChart3, Zap, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-lg">AI Business OS</span>
          </div>
          <nav className="flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/signup">
              <Button>Get Started</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold tracking-tight text-slate-900 mb-6">
            Understand your business with AI
          </h1>
          <p className="text-xl text-slate-600 mb-8">
            AI Business OS connects to your data sources and gives you clear insights, 
            answers to natural language questions, and automated reports. 
            Stop drowning in dashboards.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="gap-2">
                Start Free <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link href="/login">
              <Button size="lg" variant="outline">
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        {/* Features */}
        <div className="mt-32 grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          <div className="p-6 rounded-xl border bg-white shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Analytics Agent</h3>
            <p className="text-slate-600">
              Ask questions in plain English. Get answers about revenue, customers, 
              and trends without touching a spreadsheet.
            </p>
          </div>
          <div className="p-6 rounded-xl border bg-white shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <Zap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Marketing Agent</h3>
            <p className="text-slate-600">
              Understand which campaigns work, get suggestions for improvement, 
              and generate better ads and copy.
            </p>
          </div>
          <div className="p-6 rounded-xl border bg-white shadow-sm">
            <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <ShoppingCart className="w-6 h-6 text-primary" />
            </div>
            <h3 className="font-semibold text-lg mb-2">Commerce Ops Agent</h3>
            <p className="text-slate-600">
              Stock alerts, pricing recommendations, and marketplace optimization 
              for ecommerce businesses.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t mt-32 py-8">
        <div className="container mx-auto px-4 text-center text-slate-500 text-sm">
          AI Business OS - Built for founders and operators
        </div>
      </footer>
    </div>
  );
}


