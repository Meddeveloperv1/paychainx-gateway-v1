import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dbPlugin from './plugins/db.js';
import authPlugin from './plugins/auth.js';
import idempotencyPlugin from './plugins/idempotency.js';
import timingPlugin from './plugins/timing.js';
import { registerSystemRoutes } from './modules/system/routes.js';
import { registerProofRoutes } from './modules/proofs/routes.js';
import { registerMerchantCapabilityRoutes } from './modules/payments/capability-routes.js';
import { registerWebhookRoutes } from './modules/webhooks/routes.js';
import { startWebhookWorker } from './modules/webhooks/worker.js';
import { startProofWorker } from './modules/proofs/worker.js';
import { healthRoutes } from './modules/health/routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { registerPaymentRoutes } from './modules/payments/routes.js';
import { adminRoutes } from './modules/admin/routes.js';
import { registerTokenRoutes } from './modules/tokens/routes.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: 'info'
    }
  });

  await app.register(swagger, {
    openapi: {
      info: {
        title: 'PaychainX Gateway API',
        version: '1.0.0',
        description: 'Token-first orchestration gateway for CyberSource day-one processing'
      },
      components: {
        securitySchemes: {
          apiKey: {
            type: 'apiKey',
            name: 'x-api-key',
            in: 'header'
          }
        }
      }
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs'
  });

  await app.register(dbPlugin);
  await app.register(authPlugin);
  await app.register(timingPlugin);
  await app.register(idempotencyPlugin);
  await registerSystemRoutes(app);
  await registerProofRoutes(app);
  await registerMerchantCapabilityRoutes(app);
  await registerWebhookRoutes(app);
  startProofWorker();
  startWebhookWorker();
  await app.register(healthRoutes, { prefix: '/v1' });
  await app.register(authRoutes, { prefix: '/v1' });
  await registerPaymentRoutes(app);
  await registerTokenRoutes(app);
  await app.register(adminRoutes, { prefix: '/v1' });

  return app;
}
