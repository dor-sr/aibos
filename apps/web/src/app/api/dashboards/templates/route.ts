import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import {
  workspaceMemberships,
  dashboardTemplates,
  customDashboards,
  dashboardWidgets,
} from '@aibos/data-model/schema';
import { eq, and, or, desc } from 'drizzle-orm';
import type { DashboardTemplateConfig } from '@aibos/data-model/schema';

function generateId(): string {
  return crypto.randomUUID();
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 50);
}

// System templates per vertical
const SYSTEM_TEMPLATES: Record<string, { name: string; description: string; config: DashboardTemplateConfig }[]> = {
  ecommerce: [
    {
      name: 'Ecommerce Overview',
      description: 'Key ecommerce metrics including revenue, orders, AOV, and customer insights',
      config: {
        layout: [
          { id: '1', type: 'metric', position: { x: 0, y: 0, w: 3, h: 2 }, config: { metricName: 'revenue', title: 'Revenue' } },
          { id: '2', type: 'metric', position: { x: 3, y: 0, w: 3, h: 2 }, config: { metricName: 'orders', title: 'Orders' } },
          { id: '3', type: 'metric', position: { x: 6, y: 0, w: 3, h: 2 }, config: { metricName: 'aov', title: 'AOV' } },
          { id: '4', type: 'metric', position: { x: 9, y: 0, w: 3, h: 2 }, config: { metricName: 'customers', title: 'Customers' } },
          { id: '5', type: 'chart', position: { x: 0, y: 2, w: 8, h: 4 }, config: { chartConfig: { xAxis: 'date', yAxis: ['revenue'] }, chartType: 'line' } },
          { id: '6', type: 'chart', position: { x: 8, y: 2, w: 4, h: 4 }, config: { chartConfig: { xAxis: 'product', yAxis: ['quantity'] }, chartType: 'bar' } },
        ],
      },
    },
    {
      name: 'Product Performance',
      description: 'Track product sales, inventory levels, and top performers',
      config: {
        layout: [
          { id: '1', type: 'table', position: { x: 0, y: 0, w: 12, h: 4 }, config: { tableConfig: { columns: [{ key: 'name', label: 'Product' }, { key: 'revenue', label: 'Revenue' }, { key: 'quantity', label: 'Sold' }] } } },
          { id: '2', type: 'chart', position: { x: 0, y: 4, w: 6, h: 3 }, config: { chartConfig: { xAxis: 'category', yAxis: ['revenue'] }, chartType: 'pie' } },
          { id: '3', type: 'chart', position: { x: 6, y: 4, w: 6, h: 3 }, config: { chartConfig: { xAxis: 'date', yAxis: ['revenue'] }, chartType: 'area' } },
        ],
      },
    },
  ],
  saas: [
    {
      name: 'SaaS Overview',
      description: 'Key SaaS metrics including MRR, subscribers, churn, and growth',
      config: {
        layout: [
          { id: '1', type: 'metric', position: { x: 0, y: 0, w: 3, h: 2 }, config: { metricName: 'mrr', title: 'MRR' } },
          { id: '2', type: 'metric', position: { x: 3, y: 0, w: 3, h: 2 }, config: { metricName: 'subscribers', title: 'Subscribers' } },
          { id: '3', type: 'metric', position: { x: 6, y: 0, w: 3, h: 2 }, config: { metricName: 'churn', title: 'Churn Rate' } },
          { id: '4', type: 'metric', position: { x: 9, y: 0, w: 3, h: 2 }, config: { metricName: 'arpu', title: 'ARPU' } },
          { id: '5', type: 'chart', position: { x: 0, y: 2, w: 8, h: 4 }, config: { chartConfig: { xAxis: 'date', yAxis: ['mrr'] }, chartType: 'area' } },
          { id: '6', type: 'chart', position: { x: 8, y: 2, w: 4, h: 4 }, config: { chartConfig: { xAxis: 'plan', yAxis: ['subscribers'] }, chartType: 'bar' } },
        ],
      },
    },
    {
      name: 'Subscription Analytics',
      description: 'Track subscription metrics, cohort retention, and LTV',
      config: {
        layout: [
          { id: '1', type: 'metric', position: { x: 0, y: 0, w: 4, h: 2 }, config: { metricName: 'new_mrr', title: 'New MRR' } },
          { id: '2', type: 'metric', position: { x: 4, y: 0, w: 4, h: 2 }, config: { metricName: 'expansion_mrr', title: 'Expansion MRR' } },
          { id: '3', type: 'metric', position: { x: 8, y: 0, w: 4, h: 2 }, config: { metricName: 'churned_mrr', title: 'Churned MRR' } },
          { id: '4', type: 'chart', position: { x: 0, y: 2, w: 12, h: 4 }, config: { chartConfig: { xAxis: 'cohort', yAxis: ['retention'] }, chartType: 'line' } },
        ],
      },
    },
  ],
};

// GET /api/dashboards/templates - Get dashboard templates
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
    const vertical = searchParams.get('vertical'); // 'ecommerce' or 'saas'

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

    // Get workspace templates (user-created)
    const workspaceTemplates = await db.query.dashboardTemplates.findMany({
      where: and(
        eq(dashboardTemplates.workspaceId, workspaceId),
        or(eq(dashboardTemplates.createdBy, user.id), eq(dashboardTemplates.isPublic, true))
      ),
      orderBy: [desc(dashboardTemplates.usageCount)],
    });

    // Get system templates for vertical
    const systemTemplates = vertical && SYSTEM_TEMPLATES[vertical]
      ? SYSTEM_TEMPLATES[vertical].map((t, index) => ({
          id: `system-${vertical}-${index}`,
          name: t.name,
          description: t.description,
          config: t.config,
          isSystem: true,
          isPublic: true,
          usageCount: 0,
        }))
      : [];

    return NextResponse.json({
      templates: [
        ...systemTemplates,
        ...workspaceTemplates.map((t) => ({
          ...t,
          isSystem: false,
          isOwn: t.createdBy === user.id,
        })),
      ],
    });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json({ error: 'Failed to fetch templates' }, { status: 500 });
  }
}

// POST /api/dashboards/templates - Create template from dashboard or save as template
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
      config,
      dashboardId, // Optional: create template from existing dashboard
      isPublic = false,
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

    let templateConfig = config;

    // If dashboardId provided, extract config from existing dashboard
    if (dashboardId) {
      const dashboard = await db.query.customDashboards.findFirst({
        where: and(
          eq(customDashboards.id, dashboardId),
          eq(customDashboards.workspaceId, workspaceId)
        ),
      });

      if (!dashboard) {
        return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
      }

      // Get widgets
      const widgets = await db.query.dashboardWidgets.findMany({
        where: eq(dashboardWidgets.dashboardId, dashboardId),
      });

      // Convert to template config
      templateConfig = {
        layout: widgets.map((w) => ({
          id: generateId(),
          type: w.widgetType as 'metric' | 'chart' | 'table' | 'text' | 'question',
          position: { x: w.gridX, y: w.gridY, w: w.gridW, h: w.gridH },
          config: w.config,
        })),
      };
    }

    if (!templateConfig) {
      return NextResponse.json({ error: 'Config is required' }, { status: 400 });
    }

    // Create template
    const templateId = generateId();
    const insertedTemplates = await db
      .insert(dashboardTemplates)
      .values({
        id: templateId,
        workspaceId,
        createdBy: user.id,
        name,
        description,
        config: templateConfig,
        isPublic,
      })
      .returning();

    return NextResponse.json({ template: insertedTemplates[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json({ error: 'Failed to create template' }, { status: 500 });
  }
}

// PUT /api/dashboards/templates - Create dashboard from template
export async function PUT(request: Request) {
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
      templateId,
      name,
      vertical, // For system templates
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

    let templateConfig: DashboardTemplateConfig | null = null;

    // Check if it's a system template
    if (templateId.startsWith('system-') && vertical) {
      const [, , indexStr] = templateId.split('-');
      const index = parseInt(indexStr, 10);
      const systemTemplates = SYSTEM_TEMPLATES[vertical];
      if (systemTemplates && systemTemplates[index]) {
        templateConfig = systemTemplates[index].config;
      }
    } else {
      // Get workspace template
      const template = await db.query.dashboardTemplates.findFirst({
        where: eq(dashboardTemplates.id, templateId),
      });

      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }

      templateConfig = template.config;

      // Update usage count
      await db
        .update(dashboardTemplates)
        .set({ usageCount: (template.usageCount || 0) + 1 })
        .where(eq(dashboardTemplates.id, templateId));
    }

    if (!templateConfig) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Generate slug
    let baseSlug = generateSlug(name);
    let slug = baseSlug;
    let counter = 1;

    while (true) {
      const existing = await db.query.customDashboards.findFirst({
        where: and(
          eq(customDashboards.workspaceId, workspaceId),
          eq(customDashboards.slug, slug)
        ),
      });
      if (!existing) break;
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    // Create dashboard
    const dashboardId = generateId();
    const insertedDashboards = await db
      .insert(customDashboards)
      .values({
        id: dashboardId,
        workspaceId,
        createdBy: user.id,
        name,
        slug,
        status: 'draft',
        layout: {
          columns: 12,
          rowHeight: 60,
          margin: [16, 16],
          containerPadding: [16, 16],
        },
        settings: {},
      })
      .returning();

    // Create widgets from template
    if (templateConfig.layout && templateConfig.layout.length > 0) {
      const widgetInserts = templateConfig.layout.map((item, index) => ({
        id: generateId(),
        dashboardId,
        widgetType: mapTemplateTypeToWidget(item.type),
        title: (item.config as Record<string, unknown>)?.title as string || undefined,
        gridX: item.position.x,
        gridY: item.position.y,
        gridW: item.position.w,
        gridH: item.position.h,
        config: item.config,
        sortOrder: index,
      }));

      await db.insert(dashboardWidgets).values(widgetInserts);
    }

    return NextResponse.json({ dashboard: insertedDashboards[0] }, { status: 201 });
  } catch (error) {
    console.error('Error creating dashboard from template:', error);
    return NextResponse.json({ error: 'Failed to create dashboard' }, { status: 500 });
  }
}

function mapTemplateTypeToWidget(type: string): 'metric' | 'line_chart' | 'bar_chart' | 'area_chart' | 'pie_chart' | 'table' | 'text' | 'question' | 'image' | 'divider' {
  const mapping: Record<string, 'metric' | 'line_chart' | 'bar_chart' | 'area_chart' | 'pie_chart' | 'table' | 'text' | 'question' | 'image' | 'divider'> = {
    metric: 'metric',
    chart: 'line_chart',
    line_chart: 'line_chart',
    bar_chart: 'bar_chart',
    area_chart: 'area_chart',
    pie_chart: 'pie_chart',
    table: 'table',
    text: 'text',
    question: 'question',
    image: 'image',
    divider: 'divider',
  };
  return mapping[type] || 'metric';
}

