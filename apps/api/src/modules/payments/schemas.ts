import { z } from 'zod';

export const saleRequestSchema = z.object({
  merchant_reference: z.string(),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  payment_method: z.object({
    type: z.enum(['card_token']),
    token_ref: z.string()
  }),
  customer: z.object({
    customer_ref: z.string(),
    email: z.string().email()
  }).optional(),
  description: z.string().optional()
});

export const captureRequestSchema = z.object({
  payment_id: z.string().uuid(),
  processor_transaction_id: z.string(),
  amount: z.number().int().positive(),
  currency: z.string().length(3)
});

export const voidRequestSchema = z.object({
  payment_id: z.string().uuid(),
  processor_transaction_id: z.string()
});

export const refundRequestSchema = z.object({
  payment_id: z.string().uuid(),
  processor_transaction_id: z.string(),
  amount: z.number().int().positive(),
  currency: z.string().length(3)
});
