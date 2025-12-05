import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import {
  workspaceMemberships,
  users,
  roles,
  userRoles,
  activityLogs,
} from '@aibos/data-model/schema';
import { eq, and, sql } from 'drizzle-orm';

function generateId(): string {
  return crypto.randomUUID();
}

// GET /api/team/members - Get all team members for a workspace
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

    // Get all members
    const memberships = await db.query.workspaceMemberships.findMany({
      where: eq(workspaceMemberships.workspaceId, workspaceId),
    });

    // Get user details for each membership
    const memberIds = memberships.map((m) => m.userId);
    const memberUsers = memberIds.length > 0
      ? await db.query.users.findMany({
          where: sql`${users.id} IN (${sql.join(
            memberIds.map((id) => sql`${id}`),
            sql`, `
          )})`,
        })
      : [];

    // Build user map
    const userMap = new Map(memberUsers.map((u) => [u.id, u]));

    // Get custom roles for members
    const memberRoles = await db.query.userRoles.findMany({
      where: eq(userRoles.workspaceId, workspaceId),
    });

    const roleIds = [...new Set(memberRoles.map((r) => r.roleId))];
    const roleDetails = roleIds.length > 0
      ? await db.query.roles.findMany({
          where: eq(roles.workspaceId, workspaceId),
        })
      : [];

    const roleMap = new Map(roleDetails.map((r) => [r.id, r]));
    const userRoleMap = new Map(memberRoles.map((ur) => [ur.userId, ur.roleId]));

    // Combine data
    const members = memberships.map((m) => {
      const memberUser = userMap.get(m.userId);
      const customRoleId = userRoleMap.get(m.userId);
      const customRole = customRoleId ? roleMap.get(customRoleId) : null;

      return {
        id: m.id,
        userId: m.userId,
        email: memberUser?.email || 'Unknown',
        fullName: memberUser?.fullName || null,
        avatarUrl: memberUser?.avatarUrl || null,
        role: m.role, // Base role from membership
        customRole: customRole
          ? { id: customRole.id, name: customRole.name }
          : null,
        joinedAt: m.joinedAt,
        invitedAt: m.invitedAt,
        invitedBy: m.invitedBy,
      };
    });

    return NextResponse.json({ members });
  } catch (error) {
    console.error('Error fetching team members:', error);
    return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 });
  }
}

// DELETE /api/team/members - Remove a member from workspace
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
    const { workspaceId, memberId } = body;

    if (!workspaceId || !memberId) {
      return NextResponse.json(
        { error: 'Workspace ID and member ID are required' },
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

    // Get the member to be removed
    const memberToRemove = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.id, memberId),
        eq(workspaceMemberships.workspaceId, workspaceId)
      ),
    });

    if (!memberToRemove) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot remove owners
    if (memberToRemove.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove workspace owner' }, { status: 400 });
    }

    // Cannot remove yourself
    if (memberToRemove.userId === user.id) {
      return NextResponse.json({ error: 'Cannot remove yourself' }, { status: 400 });
    }

    // Get member details for logging
    const memberUser = await db.query.users.findFirst({
      where: eq(users.id, memberToRemove.userId),
    });

    // Remove the member
    await db
      .delete(workspaceMemberships)
      .where(eq(workspaceMemberships.id, memberId));

    // Remove any custom role assignments
    await db
      .delete(userRoles)
      .where(
        and(
          eq(userRoles.userId, memberToRemove.userId),
          eq(userRoles.workspaceId, workspaceId)
        )
      );

    // Log the activity
    await db.insert(activityLogs).values({
      id: generateId(),
      workspaceId,
      userId: user.id,
      action: 'team.member_removed',
      resourceType: 'member',
      resourceId: memberToRemove.userId,
      resourceName: memberUser?.email || memberToRemove.userId,
      metadata: {
        removedUserId: memberToRemove.userId,
        removedUserEmail: memberUser?.email,
        removedRole: memberToRemove.role,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing team member:', error);
    return NextResponse.json({ error: 'Failed to remove team member' }, { status: 500 });
  }
}

// PATCH /api/team/members - Update member role
export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { workspaceId, memberId, role, customRoleId } = body;

    if (!workspaceId || !memberId) {
      return NextResponse.json(
        { error: 'Workspace ID and member ID are required' },
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

    // Get the member to update
    const memberToUpdate = await db.query.workspaceMemberships.findFirst({
      where: and(
        eq(workspaceMemberships.id, memberId),
        eq(workspaceMemberships.workspaceId, workspaceId)
      ),
    });

    if (!memberToUpdate) {
      return NextResponse.json({ error: 'Member not found' }, { status: 404 });
    }

    // Cannot change owner's base role
    if (memberToUpdate.role === 'owner' && role && role !== 'owner') {
      return NextResponse.json({ error: 'Cannot change owner role' }, { status: 400 });
    }

    // Only owners can promote to admin
    if (role === 'admin' && userMembership.role !== 'owner') {
      return NextResponse.json(
        { error: 'Only owners can promote to admin' },
        { status: 403 }
      );
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (role && ['admin', 'member', 'viewer'].includes(role)) {
      updates.role = role;
    }

    // Update base role if provided
    if (Object.keys(updates).length > 1) {
      await db
        .update(workspaceMemberships)
        .set(updates)
        .where(eq(workspaceMemberships.id, memberId));
    }

    // Handle custom role assignment
    if (customRoleId !== undefined) {
      // Remove existing custom role
      await db
        .delete(userRoles)
        .where(
          and(
            eq(userRoles.userId, memberToUpdate.userId),
            eq(userRoles.workspaceId, workspaceId)
          )
        );

      // Assign new custom role if provided
      if (customRoleId) {
        await db.insert(userRoles).values({
          id: generateId(),
          userId: memberToUpdate.userId,
          workspaceId,
          roleId: customRoleId,
          assignedBy: user.id,
        });
      }
    }

    // Log the activity
    const memberUser = await db.query.users.findFirst({
      where: eq(users.id, memberToUpdate.userId),
    });

    await db.insert(activityLogs).values({
      id: generateId(),
      workspaceId,
      userId: user.id,
      action: 'team.role_changed',
      resourceType: 'member',
      resourceId: memberToUpdate.userId,
      resourceName: memberUser?.email || memberToUpdate.userId,
      metadata: {
        previousRole: memberToUpdate.role,
        newRole: role || memberToUpdate.role,
        customRoleId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating team member:', error);
    return NextResponse.json({ error: 'Failed to update team member' }, { status: 500 });
  }
}
