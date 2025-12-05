import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import {
  workspaceMemberships,
  workspaceInvites,
  roles,
  users,
  userRoles,
  activityLogs,
} from '@aibos/data-model/schema';
import { eq, and, gt } from 'drizzle-orm';

function generateId(): string {
  return crypto.randomUUID();
}

// POST /api/team/invites/accept - Accept an invite
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Invite token is required' }, { status: 400 });
    }

    // Find the invite
    const invite = await db.query.workspaceInvites.findFirst({
      where: and(
        eq(workspaceInvites.token, token),
        eq(workspaceInvites.status, 'pending'),
        gt(workspaceInvites.expiresAt, new Date())
      ),
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite' },
        { status: 400 }
      );
    }

    // Verify the email matches (case-insensitive)
    if (user.email?.toLowerCase() !== invite.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'This invite was sent to a different email address' },
        { status: 400 }
      );
    }

    // Check if user is already a member
    const existingMembership = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.userId, user.id),
        eq(workspaceMemberships.workspaceId, invite.workspaceId)
      ),
    });

    if (existingMembership) {
      // Update invite status and return
      await db
        .update(workspaceInvites)
        .set({ status: 'accepted', acceptedAt: new Date(), acceptedBy: user.id })
        .where(eq(workspaceInvites.id, invite.id));

      return NextResponse.json(
        { error: 'You are already a member of this workspace' },
        { status: 400 }
      );
    }

    // Ensure user exists in our database
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!existingUser) {
      await db.insert(users).values({
        id: user.id,
        email: user.email!,
        fullName: user.user_metadata?.full_name || null,
        avatarUrl: user.user_metadata?.avatar_url || null,
      });
    }

    // Get the role to determine base membership role
    const role = await db.query.roles.findFirst({
      where: eq(roles.id, invite.roleId),
    });

    // Create the membership
    const membershipId = generateId();
    await db.insert(workspaceMemberships).values({
      id: membershipId,
      userId: user.id,
      workspaceId: invite.workspaceId,
      role: 'member', // Base role - custom permissions come from userRoles
      invitedBy: invite.invitedBy,
      invitedAt: invite.createdAt,
      joinedAt: new Date(),
    });

    // Assign the custom role
    await db.insert(userRoles).values({
      id: generateId(),
      userId: user.id,
      workspaceId: invite.workspaceId,
      roleId: invite.roleId,
      assignedBy: invite.invitedBy,
    });

    // Update invite status
    await db
      .update(workspaceInvites)
      .set({ status: 'accepted', acceptedAt: new Date(), acceptedBy: user.id })
      .where(eq(workspaceInvites.id, invite.id));

    // Log the activity
    await db.insert(activityLogs).values({
      id: generateId(),
      workspaceId: invite.workspaceId,
      userId: user.id,
      action: 'team.invite_accepted',
      resourceType: 'invite',
      resourceId: invite.id,
      resourceName: user.email || 'Unknown',
      metadata: {
        roleId: invite.roleId,
        roleName: role?.name,
        invitedBy: invite.invitedBy,
      },
    });

    // Get workspace details to return
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaceMemberships.workspaceId, invite.workspaceId),
    });

    return NextResponse.json({
      success: true,
      workspace: workspace
        ? { id: workspace.id, name: workspace.name, slug: workspace.slug }
        : null,
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ error: 'Failed to accept invite' }, { status: 500 });
  }
}

// GET /api/team/invites/accept - Get invite details (for preview)
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Invite token is required' }, { status: 400 });
    }

    // Find the invite
    const invite = await db.query.workspaceInvites.findFirst({
      where: and(
        eq(workspaceInvites.token, token),
        eq(workspaceInvites.status, 'pending'),
        gt(workspaceInvites.expiresAt, new Date())
      ),
    });

    if (!invite) {
      return NextResponse.json(
        { error: 'Invalid or expired invite', valid: false },
        { status: 400 }
      );
    }

    // Get workspace and inviter details
    const workspace = await db.query.workspaces.findFirst({
      where: eq(workspaceMemberships.workspaceId, invite.workspaceId),
    });

    const inviter = await db.query.users.findFirst({
      where: eq(users.id, invite.invitedBy),
    });

    const role = await db.query.roles.findFirst({
      where: eq(roles.id, invite.roleId),
    });

    return NextResponse.json({
      valid: true,
      invite: {
        email: invite.email,
        workspace: workspace ? { name: workspace.name } : null,
        invitedBy: inviter ? { name: inviter.fullName, email: inviter.email } : null,
        role: role ? { name: role.name } : null,
        message: invite.message,
        expiresAt: invite.expiresAt,
      },
    });
  } catch (error) {
    console.error('Error fetching invite details:', error);
    return NextResponse.json({ error: 'Failed to fetch invite' }, { status: 500 });
  }
}
