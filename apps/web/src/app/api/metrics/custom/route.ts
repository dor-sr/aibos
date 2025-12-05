import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import {
  workspaceMemberships,
  customMetrics,
  activityLogs,
} from '@aibos/data-model/schema';
import { eq, and, or, desc, ilike } from 'drizzle-orm';

function generateId(): string {
  return crypto.randomUUID();
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .substring(0, 50);
}

// Validate metric formula
function validateFormula(formula: {
  type: 'simple' | 'calculated' | 'sql';
  column?: string;
  table?: string;
  expression?: string;
  variables?: Record<string, string>;
  sql?: string;
}): { valid: boolean; error?: string } {
  if (!formula.type) {
    return { valid: false, error: 'Formula type is required' };
  }

  if (formula.type === 'simple') {
    if (!formula.column || !formula.table) {
      return { valid: false, error: 'Column and table are required for simple metrics' };
    }
    // Validate allowed tables
    const allowedTables = [
      'ecommerce_orders',
      'ecommerce_order_items',
      'ecommerce_customers',
      'ecommerce_products',
      'saas_subscriptions',
      'saas_invoices',
      'saas_customers',
      'saas_plans',
    ];
    if (!allowedTables.includes(formula.table)) {
      return { valid: false, error: `Table "${formula.table}" is not allowed` };
    }
  }

  if (formula.type === 'calculated') {
    if (!formula.expression) {
      return { valid: false, error: 'Expression is required for calculated metrics' };
    }
    // Basic validation - check for dangerous patterns
    const dangerousPatterns = ['DROP', 'DELETE', 'INSERT', 'UPDATE', 'ALTER', '--', ';'];
    const upperExpression = formula.expression.toUpperCase();
    for (const pattern of dangerousPatterns) {
      if (upperExpression.includes(pattern)) {
        return { valid: false, error: `Expression contains forbidden pattern: ${pattern}` };
      }
    }
    // Check that expression only uses allowed operators and functions
    const allowedPattern = /^[a-zA-Z0-9_\s\+\-\*\/\(\)\.\,]+$/;
    if (!allowedPattern.test(formula.expression)) {
      return { valid: false, error: 'Expression contains invalid characters' };
    }
  }

  if (formula.type === 'sql') {
    // SQL type is more restricted - only for advanced users
    if (!formula.sql) {
      return { valid: false, error: 'SQL is required for SQL-type metrics' };
    }
  }

  return { valid: true };
}

// GET /api/metrics/custom - List custom metrics
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
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const includeShared = searchParams.get('includeShared') !== 'false';

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

    // Build query conditions
    const conditions = [
      eq(customMetrics.workspaceId, workspaceId),
      eq(customMetrics.isActive, true),
    ];

    if (includeShared) {
      conditions.push(
        or(eq(customMetrics.createdBy, user.id), eq(customMetrics.isShared, true))!
      );
    } else {
      conditions.push(eq(customMetrics.createdBy, user.id));
    }

    if (category) {
      conditions.push(eq(customMetrics.category, category));
    }

    if (search) {
      conditions.push(
        or(
          ilike(customMetrics.name, `%${search}%`),
          ilike(customMetrics.slug, `%${search}%`)
        )!
      );
    }

    const metrics = await db.query.customMetrics.findMany({
      where: and(...conditions),
      orderBy: [desc(customMetrics.usageCount), desc(customMetrics.updatedAt)],
    });

    return NextResponse.json({
      metrics: metrics.map((m) => ({
        ...m,
        isOwn: m.createdBy === user.id,
      })),
    });
  } catch (error) {
    console.error('Error fetching custom metrics:', error);
    return NextResponse.json({ error: 'Failed to fetch metrics' }, { status: 500 });
  }
}

// POST /api/metrics/custom - Create custom metric
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
      category,
      formula,
      aggregation = 'sum',
      format = 'number',
      decimals = 2,
      prefix,
      suffix,
      nlqKeywords,
      nlqExamples,
      isShared = false,
    } = body;

    if (!workspaceId || !name || !formula) {
      return NextResponse.json(
        { error: 'Workspace ID, name, and formula are required' },
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

    // Validate formula
    const validation = validateFormula(formula);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error, field: 'formula' },
        { status: 400 }
      );
    }

    // Generate unique slug
    let baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await db.query.customMetrics.findFirst({
        where: and(
          eq(customMetrics.workspaceId, workspaceId),
          eq(customMetrics.slug, slug)
        ),
      });
      if (!existing) break;
      slug = `${baseSlug}_${counter}`;
      counter++;
    }

    // Create the metric
    const metricId = generateId();
    const insertedMetrics = await db
      .insert(customMetrics)
      .values({
        id: metricId,
        workspaceId,
        createdBy: user.id,
        name,
        slug,
        description,
        category,
        formula,
        aggregation,
        format,
        decimals,
        prefix,
        suffix,
        nlqKeywords: nlqKeywords || [],
        nlqExamples: nlqExamples || [],
        isShared,
        isValidated: true,
      })
      .returning();

    // Log the activity
    await db.insert(activityLogs).values({
      id: generateId(),
      workspaceId,
      userId: user.id,
      action: 'resource.dashboard_created', // Reusing for metric creation
      resourceType: 'metric',
      resourceId: metricId,
      resourceName: name,
      metadata: { formulaType: formula.type },
    });

    return NextResponse.json({ metric: insertedMetrics[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating custom metric:', error);
    return NextResponse.json({ error: 'Failed to create metric' }, { status: 500 });
  }
}

// PATCH /api/metrics/custom - Update custom metric
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
    const { workspaceId, metricId, ...updates } = body;

    if (!workspaceId || !metricId) {
      return NextResponse.json(
        { error: 'Workspace ID and metric ID are required' },
        { status: 400 }
      );
    }

    // Get the metric
    const metric = await db.query.customMetrics.findFirst({
      where: and(
        eq(customMetrics.id, metricId),
        eq(customMetrics.workspaceId, workspaceId)
      ),
    });

    if (!metric) {
      return NextResponse.json({ error: 'Metric not found' }, { status: 404 });
    }

    // Only owner can edit
    if (metric.createdBy !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // If formula is being updated, validate it
    if (updates.formula) {
      const validation = validateFormula(updates.formula);
      if (!validation.valid) {
        return NextResponse.json(
          { error: validation.error, field: 'formula' },
          { status: 400 }
        );
      }
    }

    // Build update object
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.formula !== undefined) updateData.formula = updates.formula;
    if (updates.aggregation !== undefined) updateData.aggregation = updates.aggregation;
    if (updates.format !== undefined) updateData.format = updates.format;
    if (updates.decimals !== undefined) updateData.decimals = updates.decimals;
    if (updates.prefix !== undefined) updateData.prefix = updates.prefix;
    if (updates.suffix !== undefined) updateData.suffix = updates.suffix;
    if (updates.nlqKeywords !== undefined) updateData.nlqKeywords = updates.nlqKeywords;
    if (updates.nlqExamples !== undefined) updateData.nlqExamples = updates.nlqExamples;
    if (updates.isShared !== undefined) updateData.isShared = updates.isShared;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    // Update
    const updatedMetrics = await db
      .update(customMetrics)
      .set(updateData)
      .where(eq(customMetrics.id, metricId))
      .returning();

    return NextResponse.json({ metric: updatedMetrics[0] });
  } catch (error) {
    console.error('Error updating custom metric:', error);
    return NextResponse.json({ error: 'Failed to update metric' }, { status: 500 });
  }
}

// DELETE /api/metrics/custom - Delete custom metric
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
    const metricId = searchParams.get('metricId');

    if (!workspaceId || !metricId) {
      return NextResponse.json(
        { error: 'Workspace ID and metric ID are required' },
        { status: 400 }
      );
    }

    // Get the metric
    const metric = await db.query.customMetrics.findFirst({
      where: and(
        eq(customMetrics.id, metricId),
        eq(customMetrics.workspaceId, workspaceId)
      ),
    });

    if (!metric) {
      return NextResponse.json({ error: 'Metric not found' }, { status: 404 });
    }

    // Only owner can delete
    if (metric.createdBy !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Soft delete (set inactive) to preserve historical data
    await db
      .update(customMetrics)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(customMetrics.id, metricId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting custom metric:', error);
    return NextResponse.json({ error: 'Failed to delete metric' }, { status: 500 });
  }
}
