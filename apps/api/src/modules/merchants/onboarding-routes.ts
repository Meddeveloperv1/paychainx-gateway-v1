import { FastifyInstance } from "fastify";
import { z } from "zod";
import {
  createMerchant,
  createMerchantProcessorAccount,
  createMerchantApiKey
} from "./onboarding-service.js";

const createMerchantSchema = z.object({
  name: z.string().min(1),
  status: z.string().optional()
});

const createProcessorAccountSchema = z.object({
  processor: z.enum(["cybersource", "freedompay", "propelr", "zerohash"]),
  environment: z.enum(["sandbox", "production"]).optional(),
  status: z.string().nullable().optional(),
  isDefault: z.boolean().optional(),
  isActive: z.boolean().optional(),
  credentials: z.record(z.any()).optional()
});

const createApiKeySchema = z.object({
  label: z.string().optional()
});

export async function onboardingRoutes(app: FastifyInstance) {
  app.post("/merchants", {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const parsed = createMerchantSchema.parse(request.body);
    const merchant = await createMerchant(parsed);
    return reply.send({ merchant });
  });

  app.post("/merchants/:merchantId/processors", {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const params = request.params as { merchantId: string };
    const parsed = createProcessorAccountSchema.parse(request.body);
    const processorAccount = await createMerchantProcessorAccount(params.merchantId, parsed);
    return reply.send({ processorAccount });
  });

  app.post("/merchants/:merchantId/api-keys", {
    preHandler: [app.authenticate]
  }, async (request, reply) => {
    const params = request.params as { merchantId: string };
    const parsed = createApiKeySchema.parse(request.body);
    const result = await createMerchantApiKey(params.merchantId, parsed);
    return reply.send(result);
  });
}
