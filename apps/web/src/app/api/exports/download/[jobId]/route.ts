import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import {
  workspaceMemberships,
  exportJobs,
  customDashboards,
  dashboardWidgets,
} from '@aibos/data-model/schema';
import { eq, and } from 'drizzle-orm';

interface RouteParams {
  params: Promise<{ jobId: string }>;
}

// GET /api/exports/download/[jobId] - Download export file
export async function GET(request: Request, context: RouteParams) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { jobId } = await context.params;

    // Get the export job
    const job = await db.query.exportJobs.findFirst({
      where: eq(exportJobs.id, jobId),
    });

    if (!job) {
      return NextResponse.json({ error: 'Export not found' }, { status: 404 });
    }

    // Verify user has access
    if (job.requestedBy !== user.id) {
      // Check workspace access
      const userMembership = await db.query.workspaceMemberships.findFirst({
        where: and(
          eq(workspaceMemberships.userId, user.id),
          eq(workspaceMemberships.workspaceId, job.workspaceId)
        ),
      });

      if (!userMembership) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }
    }

    // Check if export is completed
    if (job.status !== 'completed') {
      return NextResponse.json(
        { error: `Export is ${job.status}`, status: job.status },
        { status: 400 }
      );
    }

    // Check if expired
    if (job.expiresAt && new Date(job.expiresAt) < new Date()) {
      return NextResponse.json({ error: 'Export has expired' }, { status: 410 });
    }

    // Generate the actual export content based on format and type
    const content = await generateExportContent(job);

    // Set content type based on format
    const contentTypes: Record<string, string> = {
      pdf: 'application/pdf',
      csv: 'text/csv',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      png: 'image/png',
      json: 'application/json',
    };

    const contentType = contentTypes[job.format] || 'application/octet-stream';

    // Convert Buffer to Uint8Array for NextResponse compatibility
    const body = typeof content === 'string' ? content : new Uint8Array(content);
    
    return new NextResponse(body, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${job.fileName || `export-${job.id}.${job.format}`}"`,
      },
    });
  } catch (error) {
    console.error('Error downloading export:', error);
    return NextResponse.json({ error: 'Failed to download export' }, { status: 500 });
  }
}

// Generate export content based on job configuration
async function generateExportContent(job: typeof exportJobs.$inferSelect): Promise<string | Buffer> {
  const config = (job.config || {}) as Record<string, unknown>;

  switch (job.format) {
    case 'csv':
      return await generateCSVExport(job);
    case 'json':
      return await generateJSONExport(job);
    case 'xlsx':
      return await generateExcelExport(job);
    case 'pdf':
      return await generatePDFExport(job);
    default:
      throw new Error(`Unsupported format: ${job.format}`);
  }
}

async function generateCSVExport(job: typeof exportJobs.$inferSelect): Promise<string> {
  // Generate CSV based on export type
  switch (job.exportType) {
    case 'dashboard':
      if (!job.resourceId) return 'No dashboard selected';
      
      const dashboard = await db.query.customDashboards.findFirst({
        where: eq(customDashboards.id, job.resourceId),
      });

      if (!dashboard) return 'Dashboard not found';

      const widgets = await db.query.dashboardWidgets.findMany({
        where: eq(dashboardWidgets.dashboardId, job.resourceId),
      });

      // Generate CSV with dashboard info and widget configuration
      const rows = [
        ['Dashboard Export'],
        ['Name', dashboard.name],
        ['Description', dashboard.description || ''],
        ['Created', dashboard.createdAt.toISOString()],
        [''],
        ['Widgets'],
        ['Type', 'Title', 'Position X', 'Position Y', 'Width', 'Height'],
        ...widgets.map((w) => [
          w.widgetType,
          w.title || '',
          String(w.gridX),
          String(w.gridY),
          String(w.gridW),
          String(w.gridH),
        ]),
      ];

      return rows.map((row) => row.map(escapeCSV).join(',')).join('\n');

    case 'data_table':
      // Mock data table export
      const headers = ['Date', 'Revenue', 'Orders', 'Customers'];
      const data = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return [
          date.toISOString().split('T')[0],
          String(Math.floor(Math.random() * 10000)),
          String(Math.floor(Math.random() * 100)),
          String(Math.floor(Math.random() * 50)),
        ];
      });

      return [headers, ...data].map((row) => row.map(escapeCSV).join(',')).join('\n');

    default:
      return 'Export type not supported for CSV';
  }
}

async function generateJSONExport(job: typeof exportJobs.$inferSelect): Promise<string> {
  switch (job.exportType) {
    case 'dashboard':
      if (!job.resourceId) return JSON.stringify({ error: 'No dashboard selected' });

      const dashboard = await db.query.customDashboards.findFirst({
        where: eq(customDashboards.id, job.resourceId),
      });

      if (!dashboard) return JSON.stringify({ error: 'Dashboard not found' });

      const widgets = await db.query.dashboardWidgets.findMany({
        where: eq(dashboardWidgets.dashboardId, job.resourceId),
      });

      return JSON.stringify(
        {
          dashboard: {
            id: dashboard.id,
            name: dashboard.name,
            description: dashboard.description,
            layout: dashboard.layout,
            settings: dashboard.settings,
            createdAt: dashboard.createdAt,
          },
          widgets: widgets.map((w) => ({
            id: w.id,
            type: w.widgetType,
            title: w.title,
            position: { x: w.gridX, y: w.gridY, w: w.gridW, h: w.gridH },
            config: w.config,
          })),
          exportedAt: new Date().toISOString(),
        },
        null,
        2
      );

    case 'data_table':
      // Mock data export
      const data = Array.from({ length: 30 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return {
          date: date.toISOString().split('T')[0],
          revenue: Math.floor(Math.random() * 10000),
          orders: Math.floor(Math.random() * 100),
          customers: Math.floor(Math.random() * 50),
        };
      });

      return JSON.stringify({ data, exportedAt: new Date().toISOString() }, null, 2);

    default:
      return JSON.stringify({ error: 'Export type not supported' });
  }
}

async function generateExcelExport(job: typeof exportJobs.$inferSelect): Promise<Buffer> {
  // For Excel, we'd typically use a library like xlsx
  // For now, return CSV content that can be opened in Excel
  const csvContent = await generateCSVExport(job);
  return Buffer.from(csvContent, 'utf-8');
}

async function generatePDFExport(job: typeof exportJobs.$inferSelect): Promise<Buffer> {
  // For PDF, we'd typically use a library like puppeteer or pdfkit
  // For now, return a simple text content
  const content = `
AI Business OS - Export Report
=============================

Export Type: ${job.exportType}
Generated: ${new Date().toISOString()}
Workspace: ${job.workspaceId}

This is a placeholder PDF export.
In production, this would render a proper PDF document
with charts, tables, and formatted content.
  `.trim();

  return Buffer.from(content, 'utf-8');
}

function escapeCSV(value: string | undefined): string {
  if (!value) return '';
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
