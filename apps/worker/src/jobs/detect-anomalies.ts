import { createLogger } from '@aibos/core';
import { db, workspaces, anomalies as anomaliesTable } from '@aibos/data-model';
import { eq } from 'drizzle-orm';
import { detectAnomalies as detectWorkspaceAnomalies } from '@aibos/analytics-agent';
import type { VerticalType } from '@aibos/core';
import type { JobContext } from './index';

const logger = createLogger('jobs:detect-anomalies');

/**
 * Detect anomalies in business metrics
 * Compares current period to previous period and flags significant changes
 */
export async function detectAnomalies(context: JobContext): Promise<void> {
  logger.info('Starting anomaly detection', { context });

  const { workspaceId } = context;

  if (workspaceId) {
    await detectForWorkspace(workspaceId);
  } else {
    await detectAllAnomalies();
  }

  logger.info('Anomaly detection completed');
}

async function detectForWorkspace(workspaceId: string): Promise<void> {
  logger.info('Detecting anomalies for workspace', { workspaceId });

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

    // Detect anomalies using analytics-agent
    const detected = await detectWorkspaceAnomalies({
      workspaceId,
      verticalType,
    });

    if (detected.length === 0) {
      logger.info('No anomalies detected', { workspaceId });
      return;
    }

    // Store anomalies in database
    for (const anomaly of detected) {
      await db.insert(anomaliesTable).values({
        id: anomaly.id,
        workspaceId,
        metricName: anomaly.metricName,
        severity: anomaly.severity,
        title: anomaly.title,
        description: anomaly.description,
        explanation: anomaly.explanation,
        currentValue: String(anomaly.currentValue),
        previousValue: String(anomaly.previousValue),
        changePercent: String(anomaly.changePercent),
        detectedAt: anomaly.detectedAt,
        periodStart: anomaly.periodStart,
        periodEnd: anomaly.periodEnd,
        isAcknowledged: 'false',
        createdAt: new Date(),
      });
    }

    logger.info('Anomalies detected and stored', {
      workspaceId,
      anomalyCount: detected.length,
      severities: detected.map((a) => a.severity),
    });
  } catch (error) {
    logger.error('Failed to detect anomalies for workspace', error as Error, { workspaceId });
    throw error;
  }
}

async function detectAllAnomalies(): Promise<void> {
  logger.info('Detecting anomalies for all workspaces');

  try {
    // Get all active workspaces
    const allWorkspaces = await db.select().from(workspaces);

    logger.info(`Found ${allWorkspaces.length} workspaces for anomaly detection`);

    // Process workspaces in batches of 5
    const batchSize = 5;
    let totalAnomalies = 0;

    for (let i = 0; i < allWorkspaces.length; i += batchSize) {
      const batch = allWorkspaces.slice(i, i + batchSize);

      const results = await Promise.allSettled(
        batch.map((ws) => detectForWorkspace(ws.id))
      );

      // Count successes
      const successes = results.filter((r) => r.status === 'fulfilled').length;
      totalAnomalies += successes;

      // Log failures
      results.forEach((result, idx) => {
        if (result.status === 'rejected') {
          const ws = batch[idx];
          logger.error('Failed to detect anomalies', result.reason as Error, {
            workspaceId: ws?.id ?? 'unknown',
          });
        }
      });

      // Small delay between batches
      if (i + batchSize < allWorkspaces.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    logger.info('All workspace anomaly detection completed', {
      workspaceCount: allWorkspaces.length,
    });
  } catch (error) {
    logger.error('Failed to detect all anomalies', error as Error);
    throw error;
  }
}
