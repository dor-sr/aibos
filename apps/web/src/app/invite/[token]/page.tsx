'use client';

import * as React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, XCircle, Building, User, Shield } from 'lucide-react';
import { createBrowserClient } from '@supabase/ssr';

interface InviteDetails {
  email: string;
  workspace: { name: string } | null;
  invitedBy: { name: string | null; email: string } | null;
  role: { name: string } | null;
  message: string | null;
  expiresAt: string;
}

export default function InvitePage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [isLoading, setIsLoading] = React.useState(true);
  const [isAccepting, setIsAccepting] = React.useState(false);
  const [invite, setInvite] = React.useState<InviteDetails | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState(false);
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [userEmail, setUserEmail] = React.useState<string | null>(null);

  // Check authentication status
  React.useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setIsAuthenticated(true);
        setUserEmail(user.email || null);
      }
    });
  }, []);

  // Fetch invite details
  React.useEffect(() => {
    const fetchInvite = async () => {
      try {
        const response = await fetch(`/api/team/invites/accept?token=${token}`);
        const data = await response.json();

        if (data.valid) {
          setInvite(data.invite);
        } else {
          setError(data.error || 'Invalid or expired invitation');
        }
      } catch (err) {
        setError('Failed to load invitation details');
      } finally {
        setIsLoading(false);
      }
    };

    if (token) {
      fetchInvite();
    }
  }, [token]);

  const handleAccept = async () => {
    if (!isAuthenticated) {
      // Redirect to login with return URL
      router.push(`/login?redirect=/invite/${token}`);
      return;
    }

    setIsAccepting(true);
    try {
      const response = await fetch('/api/team/invites/accept', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          if (data.workspace) {
            localStorage.setItem('currentWorkspaceId', data.workspace.id);
          }
          router.push('/dashboard');
        }, 2000);
      } else {
        setError(data.error || 'Failed to accept invitation');
      }
    } catch (err) {
      setError('Failed to accept invitation');
    } finally {
      setIsAccepting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            <p className="mt-4 text-muted-foreground">Loading invitation...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <XCircle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">Invalid Invitation</h2>
            <p className="mt-2 text-muted-foreground">{error}</p>
            <Button onClick={() => router.push('/login')} className="mt-6">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 flex flex-col items-center justify-center text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
              <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
            </div>
            <h2 className="mt-4 text-xl font-semibold">Welcome to the Team!</h2>
            <p className="mt-2 text-muted-foreground">
              You&apos;ve successfully joined {invite?.workspace?.name || 'the workspace'}.
              Redirecting to dashboard...
            </p>
            <Loader2 className="mt-4 h-5 w-5 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const emailMismatch =
    isAuthenticated && userEmail && invite?.email && userEmail.toLowerCase() !== invite.email.toLowerCase();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">You&apos;re Invited!</CardTitle>
          <CardDescription>
            Join {invite?.workspace?.name || 'a workspace'} on AI Business OS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Workspace info */}
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <Building className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-medium">{invite?.workspace?.name || 'Workspace'}</p>
              <p className="text-sm text-muted-foreground">
                Invited by {invite?.invitedBy?.name || invite?.invitedBy?.email || 'team member'}
              </p>
            </div>
          </div>

          {/* Role info */}
          {invite?.role && (
            <div className="flex items-center gap-4 p-4 rounded-lg border">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                <Shield className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Your role</p>
                <p className="font-medium">{invite.role.name}</p>
              </div>
            </div>
          )}

          {/* Personal message */}
          {invite?.message && (
            <div className="p-4 rounded-lg border bg-muted/30">
              <p className="text-sm italic">&ldquo;{invite.message}&rdquo;</p>
            </div>
          )}

          {/* Email mismatch warning */}
          {emailMismatch && (
            <div className="p-4 rounded-lg border border-amber-500/50 bg-amber-50 dark:bg-amber-950/30">
              <p className="text-sm text-amber-700 dark:text-amber-400">
                This invitation was sent to <strong>{invite?.email}</strong>, but you&apos;re
                signed in as <strong>{userEmail}</strong>. Please sign in with the correct
                account.
              </p>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-3">
            {!isAuthenticated ? (
              <>
                <Button className="w-full" onClick={handleAccept}>
                  <User className="mr-2 h-4 w-4" />
                  Sign in to Accept
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  You&apos;ll need to sign in or create an account using{' '}
                  <strong>{invite?.email}</strong>
                </p>
              </>
            ) : emailMismatch ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push(`/login?redirect=/invite/${token}`)}
              >
                Sign in with Different Account
              </Button>
            ) : (
              <Button className="w-full" onClick={handleAccept} disabled={isAccepting}>
                {isAccepting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Accept Invitation
                  </>
                )}
              </Button>
            )}

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => router.push('/')}
            >
              Decline
            </Button>
          </div>

          {/* Expiry notice */}
          {invite?.expiresAt && (
            <p className="text-xs text-center text-muted-foreground">
              This invitation expires on{' '}
              {new Date(invite.expiresAt).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
