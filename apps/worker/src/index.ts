import { createLogger } from '@aibos/core';
import { startScheduler } from './scheduler';
import { jobRegistry } from './jobs';

const logger = createLogger('worker');

async function main() {
  logger.info('Starting AI Business OS Worker');

  // Register all jobs
  logger.info('Registering jobs', { count: Object.keys(jobRegistry).length });

  // Start the scheduler
  startScheduler();

  logger.info('Worker started successfully');

  // Keep the process running
  process.on('SIGINT', () => {
    logger.info('Received SIGINT, shutting down...');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    logger.info('Received SIGTERM, shutting down...');
    process.exit(0);
  });
}

main().catch((error) => {
  logger.error('Worker failed to start', error);
  process.exit(1);
});



