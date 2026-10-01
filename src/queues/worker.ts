import { logger } from '../lib/logger.js';
import { connectRedis } from '../lib/redis.js';
import { cleanupQueue, notificationQueue, tenantExpirationQueue } from './queue.js';

import './workers/notification.worker.js';
import './workers/email.worker.js';
import './workers/tenant.expiration.worker.js';
import './workers/cleanup.worker.js';
import './workers/report.worker.js';

let hasStarted = false;

export async function startNotificationWorker(): Promise<void> {
  if (hasStarted) {
    return;
  }

  await connectRedis();

  // Run notification scan immediately when the worker starts.
  await notificationQueue.add(
    'scanner',
    {
      startedAt: new Date().toISOString(),
    },
    {
      jobId: 'notification-scan-immediate',
      removeOnComplete: {
        count: 10,
      },
      removeOnFail: {
        count: 20,
      },
    },
  );

  // Run notification scan every day at 06:00.
  await notificationQueue.upsertJobScheduler(
    'daily-notification-scan',
    {
      pattern: '0 6 * * *',
    },
    {
      name: 'scanner',
      data: {},
      opts: {
        removeOnComplete: {
          count: 10,
        },
        removeOnFail: {
          count: 20,
        },
      },
    },
  );

  // Expire tenants every day at 06:00.
  await tenantExpirationQueue.upsertJobScheduler(
    'daily-tenant-expiration',
    {
      pattern: '0 6 * * *',
    },
    {
      name: 'expire-tenants',
      data: {},
      opts: {
        removeOnComplete: {
          count: 10,
        },
        removeOnFail: {
          count: 20,
        },
      },
    },
  );

  // Clean up pending signups every day at 06:00.
  await cleanupQueue.upsertJobScheduler(
    'daily-cleanup-pending-signups',
    {
      pattern: '0 6 * * *',
    },
    {
      name: 'expire-pending-signups',
      data: {},
      opts: {
        removeOnComplete: {
          count: 10,
        },
        removeOnFail: {
          count: 20,
        },
      },
    },
  );

  // Clean up expired reports every day at 06:30.
  await cleanupQueue.upsertJobScheduler(
    'daily-cleanup-expired-reports',
    {
      pattern: '30 6 * * *',
    },
    {
      name: 'cleanup-expired-reports',
      data: {},
      opts: {
        removeOnComplete: {
          count: 10,
        },
        removeOnFail: {
          count: 20,
        },
      },
    },
  );

  hasStarted = true;

  logger.info('BullMQ workers have been started');
}
