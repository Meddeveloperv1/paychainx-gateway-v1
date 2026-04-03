import fp from "fastify-plugin";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientIp(request: FastifyRequest) {
  const xf = request.headers["x-forwarded-for"];
  if (typeof xf === "string" && xf.length > 0) {
    return xf.split(",")[0].trim();
  }
  return request.ip || "unknown";
}

export default fp(async function securityPlugin(app: FastifyInstance) {
  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("X-Frame-Options", "DENY");
    reply.header("Referrer-Policy", "no-referrer");
    reply.header("X-Robots-Tag", "noindex, nofollow");
    reply.header("Cache-Control", "no-store");
    reply.header("Permissions-Policy", "geolocation=(), microphone=(), camera=()");
    reply.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none';");
  });

  app.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const limit = Number(process.env.RATE_LIMIT_MAX || 120);
    const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60_000);

    const ip = getClientIp(request);
    const routeKey = request.url.split("?")[0];
    const key = `${ip}:${request.method}:${routeKey}`;
    const now = Date.now();

    const existing = buckets.get(key);
    if (!existing || existing.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return;
    }

    existing.count += 1;
    buckets.set(key, existing);

    const remaining = Math.max(0, limit - existing.count);
    reply.header("X-RateLimit-Limit", String(limit));
    reply.header("X-RateLimit-Remaining", String(remaining));
    reply.header("X-RateLimit-Reset", String(Math.ceil(existing.resetAt / 1000)));

    if (existing.count > limit) {
      return reply.code(429).send({
        error: {
          code: "RATE_LIMITED",
          message: "Too many requests"
        }
      });
    }
  });
});
