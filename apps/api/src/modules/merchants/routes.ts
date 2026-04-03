import { FastifyInstance } from "fastify";
import { getMerchantProcessors } from "./service.js";

export async function merchantRoutes(app: FastifyInstance) {
  app.get("/merchants/:merchantId/processors", {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const params = request.params as { merchantId: string };
    const items = await getMerchantProcessors(params.merchantId);
    return reply.send({ items });
  });
}
