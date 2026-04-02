import { z } from "zod";

export const paymentSourceSchema = z.object({
  type: z.enum(["sandbox_card", "cybersource_transient_token"]),
  token: z.string().optional(),
  token_ref: z.string().optional()
});

export const routingSchema = z.object({
  preferred_processor: z
    .enum(["cybersource", "freedompay", "propelr", "zerohash"])
    .optional()
}).optional();

export const saleRequestSchema = z.object({
  merchant_id: z.string(),
  merchant_reference: z.string(),
  amount: z.number().int().positive(),
  currency: z.string(),
  payment_source: paymentSourceSchema,
  routing: routingSchema.optional(),
  customer: z.object({
    customer_ref: z.string().optional(),
    email: z.string().email().optional()
  }).optional()
});

export const captureRequestSchema = z.object({
  merchant_id: z.string(),
  payment_id: z.string(),
  amount: z.number().int().positive().optional(),
  routing: routingSchema.optional()
});

export const voidRequestSchema = z.object({
  merchant_id: z.string(),
  payment_id: z.string(),
  routing: routingSchema.optional()
});

export const refundRequestSchema = z.object({
  merchant_id: z.string(),
  payment_id: z.string(),
  amount: z.number().int().positive().optional(),
  routing: routingSchema.optional()
});
