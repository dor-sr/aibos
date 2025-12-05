import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import {
  workspaceMemberships,
  roles,
  activityLogs,
  ROLE_TEMPLATES,
} from '@aibos/data-model/schema';
import type { RolePermissions } from '@aibos/data-model/schema';
import { eq, and } from 'drizzle-orm';

function generateId(): string {
  return crypto.randomUUID();
}

// GET /api/team/roles - Get all roles for a workspace
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

    // Get all roles for the workspace
    const workspaceRoles = await db.query.roles.findMany({
      where: eq(roles.workspaceId, workspaceId),
    });

    // Also return the default role templates for reference
    return NextResponse.json({
      roles: workspaceRoles,
      templates: Object.entries(ROLE_TEMPLATES).map(([name, permissions]) => ({
        name,
        permissions,
      })),
    });
  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({ error: 'Failed to fetch roles' }, { status: 500 });
  }
}

// POST /api/team/roles - Create a new custom role
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
    const { workspaceId, name, description, permissions, templateName } = body;

    if (!workspaceId || !name) {
      return NextResponse.json(
        { error: 'Workspace ID and name are required' },
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

    // Get permissions from template or use provided permissions
    let rolePermissions: RolePermissions;
    if (templateName && ROLE_TEMPLATES[templateName]) {
      rolePermissions = ROLE_TEMPLATES[templateName] as RolePermissions;
    } else if (permissions) {
      rolePermissions = permissions;
    } else {
      // Default to viewer permissions
      const viewerPerms = ROLE_TEMPLATES.viewer;
      if (!viewerPerms) {
        return NextResponse.json({ error: 'Default role template not found' }, { status: 500 });
      }
      rolePermissions = viewerPerms;
    }

    // Create the role
    const roleId = generateId();
    const insertedRoles = await db
      .insert(roles)
      .values({
        id: roleId,
        workspaceId,
        name,
        description,
        permissions: rolePermissions,
        isSystem: false,
      })
      .returning();

    const role = insertedRoles[0];

    // Log the activity
    await db.insert(activityLogs).values({
      id: generateId(),
      workspaceId,
      userId: user.id,
      action: 'team.role_created',
      resourceType: 'role',
      resourceId: roleId,
      resourceName: name,
      metadata: {
        templateName,
        permissions: rolePermissions,
      },
    });

    return NextResponse.json({ role }, { status: 201 });
  } catch (error) {
    console.error('Error creating role:', error);
    return NextResponse.json({ error: 'Failed to create role' }, { status: 500 });
  }
}

// PATCH /api/team/roles - Update a role
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
    const { workspaceId, roleId, name, description, permissions, status } = body;

    if (!workspaceId || !roleId) {
      return NextResponse.json(
        { error: 'Workspace ID and role ID are required' },
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

    // Get the role
    const existingRole = await db.query.roles.findFirst({
      where: and(eq(roles.id, roleId), eq(roles.workspaceId, workspaceId)),
    });

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Cannot modify system roles
    if (existingRole.isSystem) {
      return NextResponse.json({ error: 'Cannot modify system roles' }, { status: 400 });
    }

    // Build update object
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (permissions) updates.permissions = permissions;
    if (status) updates.status = status;

    // Update the role
    const updatedRoles = await db
      .update(roles)
      .set(updates)
      .where(eq(roles.id, roleId))
      .returning();

    const role = updatedRoles[0];

    // Log the activity
    await db.insert(activityLogs).values({
      id: generateId(),
      workspaceId,
      userId: user.id,
      action: 'team.role_updated',
      resourceType: 'role',
      resourceId: roleId,
      resourceName: role?.name || existingRole.name,
      metadata: {
        previousName: existingRole.name,
        updates,
      },
    });

    return NextResponse.json({ role });
  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({ error: 'Failed to update role' }, { status: 500 });
  }
}

// DELETE /api/team/roles - Delete a role
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
    const { workspaceId, roleId } = body;

    if (!workspaceId || !roleId) {
      return NextResponse.json(
        { error: 'Workspace ID and role ID are required' },
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

    // Get the role
    const existingRole = await db.query.roles.findFirst({
      where: and(eq(roles.id, roleId), eq(roles.workspaceId, workspaceId)),
    });

    if (!existingRole) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 });
    }

    // Cannot delete system roles
    if (existingRole.isSystem) {
      return NextResponse.json({ error: 'Cannot delete system roles' }, { status: 400 });
    }

    // Delete the role (this will cascade to userRoles)
    await db.delete(roles).where(eq(roles.id, roleId));

    // Log the activity
    await db.insert(activityLogs).values({
      id: generateId(),
      workspaceId,
      userId: user.id,
      action: 'team.role_deleted',
      resourceType: 'role',
      resourceId: roleId,
      resourceName: existingRole.name,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting role:', error);
    return NextResponse.json({ error: 'Failed to delete role' }, { status: 500 });
  }
}
