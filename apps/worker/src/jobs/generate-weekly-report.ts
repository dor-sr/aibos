import { createLogger } from '@aibos/core';
import { db, workspaces, reports } from '@aibos/data-model';
import { eq } from 'drizzle-orm';
import { generateWeeklyReport as generateReport } from '@aibos/analytics-agent';
import { sendWeeklyReportNotification } from '../lib/notifications';
import type { VerticalType } from '@aibos/core';
import type { JobContext } from './index';

const logger = createLogger('jobs:generate-weekly-report');

/**
 * Generate weekly summary reports for workspaces
 * Includes key metrics, trends, and AI-generated insights
 */
export async function generateWeeklyReport(context: JobContext): Promise<void> {
  logger.info('Starting weekly report generation', { context });

  const { workspaceId } = context;

  if (workspaceId) {
    await generateWorkspaceReport(workspaceId);
  } else {
    await generateAllReports();
  }

  logger.info('Weekly report generation completed');
}

async function generateWorkspaceReport(workspaceId: string): Promise<void> {
  logger.info('Generating weekly report for workspace', { workspaceId });

  try {
    // Get workspace configuration
    const workspace = await db
      .select()
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);

    const workspaceData = workspace[0];
    if (!workspaceData) {
      logger.warn('Workspace not found', { workspaceId });
      return;
    }

    const verticalType = workspaceData.verticalType as VerticalType;

    // Generate the report using analytics-agent
    const reportData = await generateReport(workspaceId, verticalType);

    // Store report in database
    await db.insert(reports).values({
      id: `report_${Date.now()}_${workspaceId}`,
      workspaceId,
      type: 'weekly',
      title: `Weekly Report - ${formatDateRange(reportData.periodStart, reportData.periodEnd)}`,
      summary: reportData.summary,
      periodStart: reportData.periodStart,
      periodEnd: reportData.periodEnd,
      metrics: reportData.metrics,
      insights: reportData.insights,
      status: 'generated',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    logger.info('Workspace weekly report generated and stored', {
      workspaceId,
      insightsCount: reportData.insights.length,
    });

    // Send notification for the weekly report
    await sendWeeklyReportNotification({
      workspaceId,
      workspaceName: workspaceData.name,
      reportId: `report_${Date.now()}_${workspaceId}`,
      periodStart: reportData.periodStart,
      periodEnd: reportData.periodEnd,
      summary: reportData.summary,
      metrics: reportData.metrics,
      verticalType,
    });
  } catch (error) {
    logger.error('Failed to generate workspace report', error as Error, { workspaceId });
    throw error;
  }
}

async function generateAllReports(): Promise<void> {
  logger.info('Generating weekly reports for all workspaces');

  try {
    // Get all active workspaces
    const allWorkspaces = await db.select().from(workspaces);

    logger.info(`Found ${allWorkspaces.length} workspaces for report generation`);

    // Generate reports in batches of 5
    const batchSize = 5;
    for (let i = 0; i < allWorkspaces.length; i += batchSize) {
      const batch = allWorkspaces.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (ws) => {
          try {
            await generateWorkspaceReport(ws.id);
          } catch (error) {
            logger.error('Failed to generate report for workspace', error as Error, {
              workspaceId: ws.id,
            });
          }
        })
      );

      // Small delay between batches to avoid overloading
      if (i + batchSize < allWorkspaces.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    logger.info('All weekly reports generated');
  } catch (error) {
    logger.error('Failed to generate all reports', error as Error);
    throw error;
  }
}

function formatDateRange(start: Date, end: Date): string {
  const formatDate = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${formatDate(start)} - ${formatDate(end)}`;
}
