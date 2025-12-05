import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import {
  workspaceMemberships,
  filterPresets,
  dateRangePresets,
  userViewPreferences,
} from '@aibos/data-model/schema';
import { eq, and, or, desc, asc } from 'drizzle-orm';

function generateId(): string {
  return crypto.randomUUID();
}

// System date range presets
const SYSTEM_DATE_PRESETS = [
  { name: 'Today', type: 'relative', value: { preset: 'today' }, sortOrder: 1 },
  { name: 'Yesterday', type: 'relative', value: { preset: 'yesterday' }, sortOrder: 2 },
  { name: 'Last 7 Days', type: 'relative', value: { preset: 'last_7_days' }, sortOrder: 3 },
  { name: 'Last 30 Days', type: 'relative', value: { preset: 'last_30_days' }, sortOrder: 4 },
  { name: 'This Week', type: 'relative', value: { preset: 'this_week' }, sortOrder: 5 },
  { name: 'Last Week', type: 'relative', value: { preset: 'last_week' }, sortOrder: 6 },
  { name: 'This Month', type: 'relative', value: { preset: 'this_month' }, sortOrder: 7 },
  { name: 'Last Month', type: 'relative', value: { preset: 'last_month' }, sortOrder: 8 },
  { name: 'This Quarter', type: 'relative', value: { preset: 'this_quarter' }, sortOrder: 9 },
  { name: 'Last Quarter', type: 'relative', value: { preset: 'last_quarter' }, sortOrder: 10 },
  { name: 'This Year', type: 'relative', value: { preset: 'this_year' }, sortOrder: 11 },
  { name: 'Last Year', type: 'relative', value: { preset: 'last_year' }, sortOrder: 12 },
];

// GET /api/views/filters - Get filter presets and date ranges
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
    const type = searchParams.get('type'); // 'filter' or 'dateRange'
    const presetType = searchParams.get('presetType');

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

    if (type === 'dateRange') {
      // Get date range presets (system + custom)
      const customPresets = await db.query.dateRangePresets.findMany({
        where: eq(dateRangePresets.workspaceId, workspaceId),
        orderBy: [asc(dateRangePresets.sortOrder)],
      });

      return NextResponse.json({
        dateRanges: [
          ...SYSTEM_DATE_PRESETS.map((p, i) => ({
            id: `system-${i}`,
            ...p,
            isSystem: true,
            workspaceId,
          })),
          ...customPresets.map((p) => ({ ...p, isSystem: false })),
        ],
      });
    }

    // Get filter presets
    const conditions = [eq(filterPresets.workspaceId, workspaceId)];

    // User can see their own and shared presets
    conditions.push(
      or(eq(filterPresets.createdBy, user.id), eq(filterPresets.isShared, true))!
    );

    if (presetType) {
      conditions.push(eq(filterPresets.presetType, presetType as 'date_range' | 'segment' | 'channel' | 'product' | 'customer' | 'custom'));
    }

    const presets = await db.query.filterPresets.findMany({
      where: and(...conditions),
      orderBy: [desc(filterPresets.isDefault), desc(filterPresets.usageCount)],
    });

    return NextResponse.json({
      presets: presets.map((p) => ({
        ...p,
        isOwn: p.createdBy === user.id,
      })),
    });
  } catch (error) {
    console.error('Error fetching filter presets:', error);
    return NextResponse.json({ error: 'Failed to fetch presets' }, { status: 500 });
  }
}

// POST /api/views/filters - Create filter preset
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
    const {
      workspaceId,
      name,
      description,
      presetType,
      filters,
      applicableTo,
      isDefault = false,
      isShared = false,
      // For date range presets
      type: dateRangeType,
      value: dateRangeValue,
    } = body;

    if (!workspaceId || !name) {
      return NextResponse.json(
        { error: 'Workspace ID and name are required' },
        { status: 400 }
      );
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

    // Creating a date range preset
    if (dateRangeType && dateRangeValue) {
      const existingPresets = await db.query.dateRangePresets.findMany({
        where: eq(dateRangePresets.workspaceId, workspaceId),
      });
      const maxSortOrder = existingPresets.reduce((max, p) => Math.max(max, p.sortOrder), 100);

      const presetId = generateId();
      const insertedPresets = await db
        .insert(dateRangePresets)
        .values({
          id: presetId,
          workspaceId,
          name,
          type: dateRangeType,
          value: dateRangeValue,
          sortOrder: maxSortOrder + 1,
        })
        .returning();

      return NextResponse.json({ preset: insertedPresets[0] }, { status: 201 });
    }

    // Creating a filter preset
    if (!presetType || !filters) {
      return NextResponse.json(
        { error: 'Preset type and filters are required' },
        { status: 400 }
      );
    }

    // If setting as default, unset other defaults for this type
    if (isDefault) {
      await db
        .update(filterPresets)
        .set({ isDefault: false })
        .where(
          and(
            eq(filterPresets.workspaceId, workspaceId),
            eq(filterPresets.createdBy, user.id),
            eq(filterPresets.presetType, presetType)
          )
        );
    }

    const presetId = generateId();
    const insertedPresets = await db
      .insert(filterPresets)
      .values({
        id: presetId,
        workspaceId,
        createdBy: user.id,
        name,
        description,
        presetType,
        filters,
        applicableTo: applicableTo || ['dashboard', 'analytics', 'reports'],
        isDefault,
        isShared,
      })
      .returning();

    return NextResponse.json({ preset: insertedPresets[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating filter preset:', error);
    return NextResponse.json({ error: 'Failed to create preset' }, { status: 500 });
  }
}

// PATCH /api/views/filters - Update filter preset
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
    const { workspaceId, presetId, ...updates } = body;

    if (!workspaceId || !presetId) {
      return NextResponse.json(
        { error: 'Workspace ID and preset ID are required' },
        { status: 400 }
      );
    }

    // Get the preset
    const preset = await db.query.filterPresets.findFirst({
      where: and(
        eq(filterPresets.id, presetId),
        eq(filterPresets.workspaceId, workspaceId)
      ),
    });

    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    // Only owner can edit
    if (preset.createdBy !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If setting as default, unset other defaults
    if (updates.isDefault && !preset.isDefault) {
      await db
        .update(filterPresets)
        .set({ isDefault: false })
        .where(
          and(
            eq(filterPresets.workspaceId, workspaceId),
            eq(filterPresets.createdBy, user.id),
            eq(filterPresets.presetType, preset.presetType)
          )
        );
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.filters !== undefined) updateData.filters = updates.filters;
    if (updates.applicableTo !== undefined) updateData.applicableTo = updates.applicableTo;
    if (updates.isDefault !== undefined) updateData.isDefault = updates.isDefault;
    if (updates.isShared !== undefined) updateData.isShared = updates.isShared;

    const updatedPresets = await db
      .update(filterPresets)
      .set(updateData)
      .where(eq(filterPresets.id, presetId))
      .returning();

    return NextResponse.json({ preset: updatedPresets[0] });
  } catch (error) {
    console.error('Error updating filter preset:', error);
    return NextResponse.json({ error: 'Failed to update preset' }, { status: 500 });
  }
}

// DELETE /api/views/filters - Delete filter preset
export async function DELETE(request: Request) {
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
    const presetId = searchParams.get('presetId');
    const type = searchParams.get('type'); // 'filter' or 'dateRange'

    if (!workspaceId || !presetId) {
      return NextResponse.json(
        { error: 'Workspace ID and preset ID are required' },
        { status: 400 }
      );
    }

    if (type === 'dateRange') {
      // Check if system preset
      if (presetId.startsWith('system-')) {
        return NextResponse.json(
          { error: 'Cannot delete system presets' },
          { status: 400 }
        );
      }

      const preset = await db.query.dateRangePresets.findFirst({
        where: and(
          eq(dateRangePresets.id, presetId),
          eq(dateRangePresets.workspaceId, workspaceId)
        ),
      });

      if (!preset) {
        return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
      }

      if (preset.isSystem) {
        return NextResponse.json(
          { error: 'Cannot delete system presets' },
          { status: 400 }
        );
      }

      await db.delete(dateRangePresets).where(eq(dateRangePresets.id, presetId));
      return NextResponse.json({ success: true });
    }

    // Delete filter preset
    const preset = await db.query.filterPresets.findFirst({
      where: and(
        eq(filterPresets.id, presetId),
        eq(filterPresets.workspaceId, workspaceId)
      ),
    });

    if (!preset) {
      return NextResponse.json({ error: 'Preset not found' }, { status: 404 });
    }

    if (preset.createdBy !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.delete(filterPresets).where(eq(filterPresets.id, presetId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting filter preset:', error);
    return NextResponse.json({ error: 'Failed to delete preset' }, { status: 500 });
  }
}
