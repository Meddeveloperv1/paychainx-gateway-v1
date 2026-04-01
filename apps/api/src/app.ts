import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dbPlugin from './plugins/db.js';
import authPlugin from './plugins/auth.js';
import { healthRoutes } from './modules/health/routes.js';
import { authRoutes } from './modules/auth/routes.js';
import { paymentRoutes } from './modules/payments/routes.js';
import { adminRoutes } from './modules/admin/routes.js';

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
  await app.register(healthRoutes, { prefix: '/v1' });
  await app.register(authRoutes, { prefix: '/v1' });
  await app.register(paymentRoutes, { prefix: '/v1' });
  await app.register(adminRoutes, { prefix: '/v1' });

  return app;
}
