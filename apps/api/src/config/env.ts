import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(8080),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  API_KEY_SALT: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  CYBERSOURCE_ENV: z.enum(['sandbox', 'production']),
  CYBERSOURCE_BASE_URL: z.string().url(),
  CYBERSOURCE_MERCHANT_ID: z.string().min(1),
  CYBERSOURCE_KEY_ID: z.string().min(1),
  CYBERSOURCE_KEY_SECRET: z.string().min(1),
  AUDIT_SIGNING_PRIVATE_KEY: z.string().min(1),
  AUDIT_SIGNING_PUBLIC_KEY: z.string().min(1),
  DEFAULT_ALLOWED_CURRENCIES: z.string().default('USD')
});

export const env = envSchema.parse(process.env);
