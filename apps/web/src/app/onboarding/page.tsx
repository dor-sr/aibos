'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, ShoppingCart, Cloud, Building2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

type Step = 'workspace' | 'vertical';

const verticals = [
  {
    id: 'ecommerce',
    name: 'Ecommerce',
    description: 'Online stores, retail, product sales',
    icon: ShoppingCart,
  },
  {
    id: 'saas',
    name: 'SaaS / Subscription',
    description: 'Software and subscription businesses',
    icon: Cloud,
  },
  {
    id: 'generic',
    name: 'Other / Generic',
    description: 'General business analytics',
    icon: Building2,
  },
];

export default function OnboardingPage() {
  const [step, setStep] = useState<Step>('workspace');
  const [workspaceName, setWorkspaceName] = useState('');
  const [selectedVertical, setSelectedVertical] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleCreateWorkspace = async () => {
    if (!workspaceName.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a workspace name',
        variant: 'destructive',
      });
      return;
    }
    setStep('vertical');
  };

  const handleCompleteOnboarding = async () => {
    if (!selectedVertical) {
      toast({
        title: 'Error',
        description: 'Please select a business type',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/workspaces', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: workspaceName,
          verticalType: selectedVertical,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to create workspace');
      }

      toast({
        title: 'Workspace created',
        description: 'Welcome to AI Business OS!',
      });

      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create workspace',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              step === 'workspace' ? 'bg-primary' : 'bg-primary/30'
            )}
          />
          <div className="w-16 h-0.5 bg-border" />
          <div
            className={cn(
              'w-3 h-3 rounded-full',
              step === 'vertical' ? 'bg-primary' : 'bg-primary/30'
            )}
          />
        </div>

        {step === 'workspace' && (
          <Card>
            <CardHeader className="text-center">
              <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl">Create your workspace</CardTitle>
              <CardDescription>
                A workspace represents your business. All your data and agents live here.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="workspaceName">Workspace Name</Label>
                <Input
                  id="workspaceName"
                  placeholder="My Business"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  This is typically your company or project name
                </p>
              </div>
              <Button onClick={handleCreateWorkspace} className="w-full gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {step === 'vertical' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">What type of business is this?</CardTitle>
              <CardDescription>
                This helps us configure the right metrics and insights for you
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3">
                {verticals.map((vertical) => (
                  <button
                    key={vertical.id}
                    onClick={() => setSelectedVertical(vertical.id)}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-lg border text-left transition-colors',
                      selectedVertical === vertical.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <div
                      className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        selectedVertical === vertical.id ? 'bg-primary/10' : 'bg-muted'
                      )}
                    >
                      <vertical.icon
                        className={cn(
                          'w-5 h-5',
                          selectedVertical === vertical.id
                            ? 'text-primary'
                            : 'text-muted-foreground'
                        )}
                      />
                    </div>
                    <div>
                      <div className="font-medium">{vertical.name}</div>
                      <div className="text-sm text-muted-foreground">{vertical.description}</div>
                    </div>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep('workspace')} className="flex-1">
                  Back
                </Button>
                <Button
                  onClick={handleCompleteOnboarding}
                  disabled={!selectedVertical || loading}
                  className="flex-1 gap-2"
                >
                  {loading ? 'Creating...' : 'Create Workspace'}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

