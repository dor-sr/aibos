import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { hasWorkspace } from '@/lib/workspace';

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // If user already has a workspace, redirect to dashboard
  const userHasWorkspace = await hasWorkspace(user.id);
  if (userHasWorkspace) {
    redirect('/dashboard');
  }

  return <>{children}</>;
}






