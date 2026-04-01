import Fastify from 'fastify';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dbPlugin from './plugins/db.js';
import { healthRoutes } from './modules/health/routes.js';

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
      }
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs'
  });

  await app.register(dbPlugin);
  await app.register(healthRoutes, { prefix: '/v1' });

  return app;
}
