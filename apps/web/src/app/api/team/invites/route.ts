import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import {
  workspaceMemberships,
  workspaceInvites,
  roles,
  users,
  activityLogs,
  ROLE_TEMPLATES,
} from '@aibos/data-model/schema';
import { eq, and, gt, sql } from 'drizzle-orm';

function generateId(): string {
  return crypto.randomUUID();
}

function generateSecureToken(): string {
  // Generate a secure random token
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

// GET /api/team/invites - Get all pending invites for a workspace
export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ error: 'Workspace ID is required' }, { status: 400 });
    }

    // Verify user has access to this workspace
    const userMembership = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.userId, user.id),
        eq(workspaceMemberships.workspaceId, workspaceId)
      ),
    });

    if (!userMembership) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get all invites (active ones)
    const invites = await db.query.workspaceInvites.findMany({
      where: and(
        eq(workspaceInvites.workspaceId, workspaceId),
        eq(workspaceInvites.status, 'pending'),
        gt(workspaceInvites.expiresAt, new Date())
      ),
    });

    // Get inviter details and role names
    const inviterIds = [...new Set(invites.map((i) => i.invitedBy))];

    const inviters =
      inviterIds.length > 0
        ? await db.query.users.findMany({
            where: sql`${users.id} IN (${sql.join(
              inviterIds.map((id) => sql`${id}`),
              sql`, `
            )})`,
          })
        : [];

    const roleDetails = await db.query.roles.findMany({
      where: eq(roles.workspaceId, workspaceId),
    });

    const inviterMap = new Map(inviters.map((u) => [u.id, u]));
    const roleMap = new Map(roleDetails.map((r) => [r.id, r]));

    const formattedInvites = invites.map((invite) => ({
      id: invite.id,
      email: invite.email,
      role: roleMap.get(invite.roleId)?.name || 'Unknown',
      roleId: invite.roleId,
      invitedBy: inviterMap.get(invite.invitedBy)?.email || 'Unknown',
      invitedByName: inviterMap.get(invite.invitedBy)?.fullName || null,
      message: invite.message,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
    }));

    return NextResponse.json({ invites: formattedInvites });
  } catch (error) {
    console.error('Error fetching invites:', error);
    return NextResponse.json({ error: 'Failed to fetch invites' }, { status: 500 });
  }
}

// POST /api/team/invites - Send a new invite
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
    const { workspaceId, email, roleId, message, expiresInDays = 7 } = body;

    if (!workspaceId || !email) {
      return NextResponse.json(
        { error: 'Workspace ID and email are required' },
        { status: 400 }
      );
    }

    // Verify user has admin/owner access
    const userMembership = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.userId, user.id),
        eq(workspaceMemberships.workspaceId, workspaceId)
      ),
    });

    if (!userMembership || !['owner', 'admin'].includes(userMembership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if user is already a member
    const existingMember = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingMember) {
      const existingMembership = await db.query.workspaceMemberships.findFirst({
        where: and(
          eq(workspaceMemberships.userId, existingMember.id),
          eq(workspaceMemberships.workspaceId, workspaceId)
        ),
      });

      if (existingMembership) {
        return NextResponse.json(
          { error: 'User is already a member of this workspace' },
          { status: 400 }
        );
      }
    }

    // Check for existing pending invite
    const existingInvite = await db.query.workspaceInvites.findFirst({
      where: and(
        eq(workspaceInvites.workspaceId, workspaceId),
        eq(workspaceInvites.email, email.toLowerCase()),
        eq(workspaceInvites.status, 'pending'),
        gt(workspaceInvites.expiresAt, new Date())
      ),
    });

    if (existingInvite) {
      return NextResponse.json(
        { error: 'An invite has already been sent to this email' },
        { status: 400 }
      );
    }

    // Ensure a role exists for the invite
    let targetRoleId = roleId;
    if (!targetRoleId) {
      // Create or get the default "member" role
      let defaultRole = await db.query.roles.findFirst({
        where: and(
          eq(roles.workspaceId, workspaceId),
          eq(roles.name, 'Member')
        ),
      });

      if (!defaultRole) {
        // Create the default member role
        const newRoleId = generateId();
        const editorPermissions = ROLE_TEMPLATES.editor;
        if (!editorPermissions) {
          return NextResponse.json({ error: 'Role template not found' }, { status: 500 });
        }
        const insertedRoles = await db
          .insert(roles)
          .values({
            id: newRoleId,
            workspaceId,
            name: 'Member',
            description: 'Standard team member with basic permissions',
            permissions: editorPermissions,
            isSystem: true,
          })
          .returning();
        defaultRole = insertedRoles[0];
      }
      targetRoleId = defaultRole?.id;
    }

    if (!targetRoleId) {
      return NextResponse.json({ error: 'Failed to assign role' }, { status: 500 });
    }

    // Create the invite
    const inviteId = generateId();
    const token = generateSecureToken();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);

    const insertedInvites = await db
      .insert(workspaceInvites)
      .values({
        id: inviteId,
        workspaceId,
        email: email.toLowerCase(),
        roleId: targetRoleId,
        invitedBy: user.id,
        token,
        message,
        expiresAt,
      })
      .returning();

    const invite = insertedInvites[0];

    // Log the activity
    await db.insert(activityLogs).values({
      id: generateId(),
      workspaceId,
      userId: user.id,
      action: 'team.invite_sent',
      resourceType: 'invite',
      resourceId: inviteId,
      resourceName: email.toLowerCase(),
      metadata: {
        roleId: targetRoleId,
        expiresAt,
      },
    });

    // TODO: Send email notification
    // For now, we return the invite link that would be sent
    const inviteLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${token}`;

    return NextResponse.json(
      {
        invite: {
          id: invite?.id,
          email: invite?.email,
          expiresAt: invite?.expiresAt,
        },
        inviteLink,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating invite:', error);
    return NextResponse.json({ error: 'Failed to create invite' }, { status: 500 });
  }
}

// DELETE /api/team/invites - Revoke an invite
export async function DELETE(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, inviteId } = body;

    if (!workspaceId || !inviteId) {
      return NextResponse.json(
        { error: 'Workspace ID and invite ID are required' },
        { status: 400 }
      );
    }

    // Verify user has admin/owner access
    const userMembership = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.userId, user.id),
        eq(workspaceMemberships.workspaceId, workspaceId)
      ),
    });

    if (!userMembership || !['owner', 'admin'].includes(userMembership.role)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Get the invite
    const invite = await db.query.workspaceInvites.findFirst({
      where: and(
        eq(workspaceInvites.id, inviteId),
        eq(workspaceInvites.workspaceId, workspaceId)
      ),
    });

    if (!invite) {
      return NextResponse.json({ error: 'Invite not found' }, { status: 404 });
    }

    // Update invite status to revoked
    await db
      .update(workspaceInvites)
      .set({ status: 'revoked' })
      .where(eq(workspaceInvites.id, inviteId));

    // Log the activity
    await db.insert(activityLogs).values({
      id: generateId(),
      workspaceId,
      userId: user.id,
      action: 'team.invite_revoked',
      resourceType: 'invite',
      resourceId: inviteId,
      resourceName: invite.email,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error revoking invite:', error);
    return NextResponse.json({ error: 'Failed to revoke invite' }, { status: 500 });
  }
}
