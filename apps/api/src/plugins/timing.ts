import fp from 'fastify-plugin';

export default fp(async function timingPlugin(app) {
  app.addHook('onRequest', async (request) => {
    (request as any).__paychainxStartedAt = process.hrtime.bigint();
  });

  app.addHook('onSend', async (request, reply, payload) => {
    const startedAt = (request as any).__paychainxStartedAt;
    if (startedAt) {
      const elapsedMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000;
      reply.header('x-paychainx-gateway-ms', elapsedMs.toFixed(3));
    }
    return payload;
  });
});
