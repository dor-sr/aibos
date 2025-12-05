import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import { workspaces, users, workspaceMemberships } from '@aibos/data-model/schema';
import { eq } from 'drizzle-orm';

// Generate a URL-friendly slug from workspace name
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

// Generate a unique ID
function generateId(): string {
  return crypto.randomUUID();
}

// POST /api/workspaces - Create a new workspace
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
    const { name, verticalType } = body;

    if (!name || !verticalType) {
      return NextResponse.json(
        { error: 'Name and vertical type are required' },
        { status: 400 }
      );
    }

    // Ensure user exists in our database
    const existingUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!existingUser) {
      // Create the user in our database if they don't exist
      await db.insert(users).values({
        id: user.id,
        email: user.email!,
        fullName: user.user_metadata?.full_name || null,
        avatarUrl: user.user_metadata?.avatar_url || null,
      });
    }

    // Generate unique slug
    const baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    // Check for slug uniqueness
    while (true) {
      const existingWorkspace = await db.query.workspaces.findFirst({
        where: eq(workspaces.slug, slug),
      });
      if (!existingWorkspace) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create workspace
    const workspaceId = generateId();
    const [workspace] = await db
      .insert(workspaces)
      .values({
        id: workspaceId,
        name,
        slug,
        verticalType,
        activeAgents: ['analytics'],
      })
      .returning();

    // Create membership for the owner
    await db.insert(workspaceMemberships).values({
      id: generateId(),
      userId: user.id,
      workspaceId: workspace.id,
      role: 'owner',
      joinedAt: new Date(),
    });

    return NextResponse.json({ workspace }, { status: 201 });
  } catch (error) {
    console.error('Error creating workspace:', error);
    return NextResponse.json(
      { error: 'Failed to create workspace' },
      { status: 500 }
    );
  }
}

// GET /api/workspaces - Get user's workspaces
export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all workspaces the user is a member of
    const memberships = await db.query.workspaceMemberships.findMany({
      where: eq(workspaceMemberships.userId, user.id),
      with: {
        workspace: true,
      },
    });

    const userWorkspaces = memberships.map((m) => ({
      ...m.workspace,
      role: m.role,
    }));

    return NextResponse.json({ workspaces: userWorkspaces });
  } catch (error) {
    console.error('Error fetching workspaces:', error);
    return NextResponse.json(
      { error: 'Failed to fetch workspaces' },
      { status: 500 }
    );
  }
}

