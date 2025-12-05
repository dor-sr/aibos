import { createLogger } from '@aibos/core';
import { syncConnectors } from './sync-connectors';
import { detectAnomalies } from './detect-anomalies';
import { generateWeeklyReport } from './generate-weekly-report';

const logger = createLogger('jobs');

export interface JobContext {
  workspaceId?: string;
  connectorId?: string;
  params?: Record<string, unknown>;
}

export type JobHandler = (context: JobContext) => Promise<void>;

// Job registry
export const jobRegistry: Record<string, JobHandler> = {
  'sync-connectors': syncConnectors,
  'detect-anomalies': detectAnomalies,
  'generate-weekly-report': generateWeeklyReport,
};

/**
 * Run a job by name
 */
export async function runJob(jobName: string, context: JobContext = {}): Promise<void> {
  const handler = jobRegistry[jobName];

  if (!handler) {
    throw new Error(`Job not found: ${jobName}`);
  }

  logger.info('Starting job', { jobName, context });

  const startTime = Date.now();

  try {
    await handler(context);
    const duration = Date.now() - startTime;
    logger.info('Job completed', { jobName, durationMs: duration });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('Job failed', error as Error, { jobName, durationMs: duration });
    throw error;
  }
}

export { syncConnectors, detectAnomalies, generateWeeklyReport };

