import { FastifyInstance } from "fastify";

export async function systemRoutes(app: FastifyInstance) {
  app.get("/health", async () => {
    return {
      status: "ok",
      service: "paychainx",
      version: "v1",
      pq_mode: process.env.PQ_MODE || "unknown"
    };
  });

  app.get("/status", async () => {
    return {
      uptime: process.uptime(),
      timestamp: Date.now(),
      env: process.env.NODE_ENV || "production",
      pq_mode: process.env.PQ_MODE || "unknown"
    };
  });
}
