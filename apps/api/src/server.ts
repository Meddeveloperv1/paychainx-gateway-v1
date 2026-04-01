import { buildApp } from './app.js';
import { env } from './config/env.js';

const start = async () => {
  const app = await buildApp();

  try {
    await app.listen({
      host: '0.0.0.0',
      port: env.PORT
    });

    app.log.info(`PaychainX API listening on port ${env.PORT}`);
  } catch (error) {
    app.log.error(error);
    process.exit(1);
  }
};

start();
