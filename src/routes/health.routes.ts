import { Router } from 'express';
import { checkDatabaseConnection } from '../lib/prisma.js';
import { checkRedisConnection } from '../lib/redis.js';
import { checkNotificationQueueConnection } from '../queues/workers/notification.worker.js';
import { checkReportQueueConnection } from '../queues/workers/report.worker.js';
import { checkEmailQueueConnection } from '../queues/workers/email.worker.js';
import { checkTenantExpirationQueueConnection } from '../queues/workers/tenant.expiration.worker.js';

export const healthRouter = Router();

healthRouter.get('/', async (_req, res) => {
  const [database, redis, notification, email, report, tenantExpiration] = await Promise.all([
    checkDatabaseConnection(),
    checkRedisConnection(),
    checkNotificationQueueConnection(),
    checkReportQueueConnection(),
    checkEmailQueueConnection(),
    checkTenantExpirationQueueConnection(),
  ]);

  const healthy = database === 'connected' && redis === 'connected' && notification === 'connected';

  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'ok' : 'degraded',
    database,
    redis,
    queues: {
      notification,
      email,
      report,
      tenantExpiration,
    },
    uptime: process.uptime(),
  });
});
