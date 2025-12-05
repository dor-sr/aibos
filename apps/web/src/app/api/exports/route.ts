import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@aibos/data-model';
import {
  workspaceMemberships,
  exportJobs,
  scheduledExports,
  customDashboards,
  activityLogs,
} from '@aibos/data-model/schema';
import { eq, and, desc, lt } from 'drizzle-orm';

function generateId(): string {
  return crypto.randomUUID();
}

// Calculate next run date for scheduled exports
function calculateNextRun(
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly',
  hour: number,
  timezone: string,
  dayOfWeek?: number,
  dayOfMonth?: number
): Date {
  const now = new Date();
  const next = new Date();

  // Set hour
  next.setHours(hour, 0, 0, 0);

  // If already past the hour today, move to next occurrence
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  switch (frequency) {
    case 'daily':
      // Already set
      break;
    case 'weekly':
      // Move to next occurrence of dayOfWeek (0 = Sunday)
      const currentDay = next.getDay();
      const targetDay = dayOfWeek ?? 1; // Default to Monday
      let daysUntilTarget = targetDay - currentDay;
      if (daysUntilTarget <= 0) daysUntilTarget += 7;
      next.setDate(next.getDate() + daysUntilTarget);
      break;
    case 'monthly':
      const targetDate = dayOfMonth ?? 1;
      next.setDate(targetDate);
      if (next <= now) {
        next.setMonth(next.getMonth() + 1);
      }
      break;
    case 'quarterly':
      const currentMonth = next.getMonth();
      const nextQuarterMonth = Math.ceil((currentMonth + 1) / 3) * 3;
      next.setMonth(nextQuarterMonth);
      next.setDate(dayOfMonth ?? 1);
      if (next <= now) {
        next.setMonth(next.getMonth() + 3);
      }
      break;
  }

  return next;
}

// GET /api/exports - Get export jobs or scheduled exports
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
    const type = searchParams.get('type'); // 'jobs' or 'scheduled'
    const status = searchParams.get('status');

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

    if (type === 'scheduled') {
      // Get scheduled exports
      const scheduled = await db.query.scheduledExports.findMany({
        where: eq(scheduledExports.workspaceId, workspaceId),
        orderBy: [desc(scheduledExports.nextRunAt)],
      });

      return NextResponse.json({
        scheduled: scheduled.map((s) => ({
          ...s,
          isOwn: s.createdBy === user.id,
        })),
      });
    }

    // Get export jobs
    const conditions = [
      eq(exportJobs.workspaceId, workspaceId),
      eq(exportJobs.requestedBy, user.id),
    ];

    if (status) {
      conditions.push(eq(exportJobs.status, status as 'pending' | 'processing' | 'completed' | 'failed'));
    }

    const jobs = await db.query.exportJobs.findMany({
      where: and(...conditions),
      orderBy: [desc(exportJobs.createdAt)],
      limit: 50, // Limit to recent jobs
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Error fetching exports:', error);
    return NextResponse.json({ error: 'Failed to fetch exports' }, { status: 500 });
  }
}

// POST /api/exports - Create export job or scheduled export
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
      type, // 'job' or 'scheduled'
      exportType, // 'dashboard', 'report', 'data_table', 'metric'
      resourceId,
      format,
      config,
      // For scheduled exports
      name,
      frequency,
      dayOfWeek,
      dayOfMonth,
      hour = 9,
      timezone = 'UTC',
      recipients,
      subject,
      message,
      whiteLabelConfig,
    } = body;

    if (!workspaceId || !exportType || !format) {
      return NextResponse.json(
        { error: 'Workspace ID, export type, and format are required' },
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

    // If resourceId is for a dashboard, verify access
    if (resourceId && exportType === 'dashboard') {
      const dashboard = await db.query.customDashboards.findFirst({
        where: and(
          eq(customDashboards.id, resourceId),
          eq(customDashboards.workspaceId, workspaceId)
        ),
      });

      if (!dashboard) {
        return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
      }
    }

    if (type === 'scheduled') {
      // Create scheduled export
      if (!name || !frequency || !recipients || recipients.length === 0) {
        return NextResponse.json(
          { error: 'Name, frequency, and recipients are required for scheduled exports' },
          { status: 400 }
        );
      }

      const scheduleId = generateId();
      const nextRunAt = calculateNextRun(frequency, hour, timezone, dayOfWeek, dayOfMonth);

      const insertedSchedules = await db
        .insert(scheduledExports)
        .values({
          id: scheduleId,
          workspaceId,
          createdBy: user.id,
          name,
          exportType,
          resourceId,
          format,
          frequency,
          dayOfWeek,
          dayOfMonth,
          hour,
          timezone,
          recipients,
          subject,
          message,
          whiteLabelConfig,
          nextRunAt,
        })
        .returning();

      return NextResponse.json({ scheduled: insertedSchedules[0] }, { status: 201 });
    }

    // Create export job (immediate)
    const jobId = generateId();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Export available for 7 days

    const insertedJobs = await db
      .insert(exportJobs)
      .values({
        id: jobId,
        workspaceId,
        requestedBy: user.id,
        exportType,
        resourceId,
        format,
        status: 'pending',
        config: config || {},
        expiresAt,
      })
      .returning();

    // Log the activity
    await db.insert(activityLogs).values({
      id: generateId(),
      workspaceId,
      userId: user.id,
      action: 'analytics.export_created',
      resourceType: 'export',
      resourceId: jobId,
      metadata: { exportType, format },
    });

    // In a real implementation, we would trigger the export job here
    // For now, we'll simulate processing
    await simulateExportProcessing(jobId);

    // Get updated job
    const updatedJob = await db.query.exportJobs.findFirst({
      where: eq(exportJobs.id, jobId),
    });

    return NextResponse.json({ job: updatedJob }, { status: 201 });
  } catch (error) {
    console.error('Error creating export:', error);
    return NextResponse.json({ error: 'Failed to create export' }, { status: 500 });
  }
}

// Simulate export processing (in production, this would be a background job)
async function simulateExportProcessing(jobId: string) {
  try {
    // Mark as processing
    await db
      .update(exportJobs)
      .set({ status: 'processing', startedAt: new Date() })
      .where(eq(exportJobs.id, jobId));

    // Get job details
    const job = await db.query.exportJobs.findFirst({
      where: eq(exportJobs.id, jobId),
    });

    if (!job) return;

    // Generate mock file name and URL
    const timestamp = Date.now();
    const fileName = `export-${job.exportType}-${timestamp}.${job.format}`;
    const fileUrl = `/api/exports/download/${jobId}`; // In production, this would be a signed URL

    // Mark as completed
    await db
      .update(exportJobs)
      .set({
        status: 'completed',
        completedAt: new Date(),
        fileName,
        fileUrl,
        fileSize: Math.floor(Math.random() * 100000) + 1000, // Mock file size
      })
      .where(eq(exportJobs.id, jobId));
  } catch (error) {
    console.error('Error processing export:', error);
    await db
      .update(exportJobs)
      .set({ status: 'failed', error: 'Export processing failed' })
      .where(eq(exportJobs.id, jobId));
  }
}

// PATCH /api/exports - Update scheduled export
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
    const { workspaceId, scheduleId, ...updates } = body;

    if (!workspaceId || !scheduleId) {
      return NextResponse.json(
        { error: 'Workspace ID and schedule ID are required' },
        { status: 400 }
      );
    }

    // Get the schedule
    const schedule = await db.query.scheduledExports.findFirst({
      where: and(
        eq(scheduledExports.id, scheduleId),
        eq(scheduledExports.workspaceId, workspaceId)
      ),
    });

    if (!schedule) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    if (schedule.createdBy !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Build update object
    const updateData: Record<string, unknown> = { updatedAt: new Date() };
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.frequency !== undefined) updateData.frequency = updates.frequency;
    if (updates.dayOfWeek !== undefined) updateData.dayOfWeek = updates.dayOfWeek;
    if (updates.dayOfMonth !== undefined) updateData.dayOfMonth = updates.dayOfMonth;
    if (updates.hour !== undefined) updateData.hour = updates.hour;
    if (updates.timezone !== undefined) updateData.timezone = updates.timezone;
    if (updates.recipients !== undefined) updateData.recipients = updates.recipients;
    if (updates.subject !== undefined) updateData.subject = updates.subject;
    if (updates.message !== undefined) updateData.message = updates.message;
    if (updates.whiteLabelConfig !== undefined) updateData.whiteLabelConfig = updates.whiteLabelConfig;
    if (updates.isActive !== undefined) updateData.isActive = updates.isActive;

    // Recalculate next run if schedule changed
    if (updates.frequency || updates.hour || updates.dayOfWeek || updates.dayOfMonth) {
      updateData.nextRunAt = calculateNextRun(
        updates.frequency || schedule.frequency,
        updates.hour ?? schedule.hour,
        updates.timezone || schedule.timezone,
        updates.dayOfWeek ?? schedule.dayOfWeek ?? undefined,
        updates.dayOfMonth ?? schedule.dayOfMonth ?? undefined
      );
    }

    const updatedSchedules = await db
      .update(scheduledExports)
      .set(updateData)
      .where(eq(scheduledExports.id, scheduleId))
      .returning();

    return NextResponse.json({ scheduled: updatedSchedules[0] });
  } catch (error) {
    console.error('Error updating scheduled export:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
  }
}

// DELETE /api/exports - Delete export job or scheduled export
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
    const jobId = searchParams.get('jobId');
    const scheduleId = searchParams.get('scheduleId');

    if (!workspaceId || (!jobId && !scheduleId)) {
      return NextResponse.json(
        { error: 'Workspace ID and job ID or schedule ID are required' },
        { status: 400 }
      );
    }

    if (scheduleId) {
      // Delete scheduled export
      const schedule = await db.query.scheduledExports.findFirst({
        where: and(
          eq(scheduledExports.id, scheduleId),
          eq(scheduledExports.workspaceId, workspaceId)
        ),
      });

      if (!schedule) {
        return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
      }

      if (schedule.createdBy !== user.id) {
        return NextResponse.json({ error: 'Access denied' }, { status: 403 });
      }

      await db.delete(scheduledExports).where(eq(scheduledExports.id, scheduleId));
      return NextResponse.json({ success: true });
    }

    // Delete export job
    const job = await db.query.exportJobs.findFirst({
      where: and(
        eq(exportJobs.id, jobId!),
        eq(exportJobs.workspaceId, workspaceId)
      ),
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.requestedBy !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    await db.delete(exportJobs).where(eq(exportJobs.id, jobId!));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting export:', error);
    return NextResponse.json({ error: 'Failed to delete export' }, { status: 500 });
  }
}
