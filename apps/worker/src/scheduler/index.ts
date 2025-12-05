import { CronJob } from 'cron';
import { createLogger } from '@aibos/core';
import { jobRegistry, runJob } from '../jobs';

const logger = createLogger('scheduler');

// Scheduled jobs configuration
const scheduledJobs = [
  {
    name: 'sync-connectors',
    cronTime: '0 */6 * * *', // Every 6 hours
    description: 'Sync data from all connected sources',
  },
  {
    name: 'detect-anomalies',
    cronTime: '0 8 * * *', // Daily at 8 AM
    description: 'Run anomaly detection on metrics',
  },
  {
    name: 'generate-weekly-report',
    cronTime: '0 9 * * 1', // Monday at 9 AM
    description: 'Generate weekly summary reports',
  },
];

export function startScheduler() {
  logger.info('Starting scheduler');

  for (const job of scheduledJobs) {
    if (!jobRegistry[job.name]) {
      logger.warn('Job not found in registry', { jobName: job.name });
      continue;
    }

    const cronJob = new CronJob(
      job.cronTime,
      async () => {
        logger.info('Running scheduled job', { jobName: job.name });
        try {
          await runJob(job.name);
          logger.info('Scheduled job completed', { jobName: job.name });
        } catch (error) {
          logger.error('Scheduled job failed', error as Error, { jobName: job.name });
        }
      },
      null, // onComplete
      true, // start immediately
      'UTC' // timezone
    );

    logger.info('Scheduled job registered', {
      jobName: job.name,
      cronTime: job.cronTime,
      description: job.description,
    });
  }

  logger.info('Scheduler started', { jobCount: scheduledJobs.length });
}

