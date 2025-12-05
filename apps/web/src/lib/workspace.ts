import { db } from '@aibos/data-model';
import { workspaceMemberships } from '@aibos/data-model/schema';
import { eq } from 'drizzle-orm';

/**
 * Check if a user has any workspace memberships
 */
export async function hasWorkspace(userId: string): Promise<boolean> {
  const membership = await db.query.workspaceMemberships.findFirst({
    where: eq(workspaceMemberships.userId, userId),
  });
  return !!membership;
}

/**
 * Get user's first workspace (for redirecting)
 */
export async function getFirstWorkspace(userId: string) {
  const membership = await db.query.workspaceMemberships.findFirst({
    where: eq(workspaceMemberships.userId, userId),
    with: {
      workspace: true,
    },
  });
  return membership?.workspace || null;
}



