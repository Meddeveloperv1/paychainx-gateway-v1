import { z } from 'zod';

export const saleRequestSchema = z.object({
  merchant_reference: z.string(),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  payment_source: z.object({
    type: z.enum(['sandbox_card', 'cybersource_transient_token']),
    token: z.string().nullable().optional()
  }),
  customer: z.object({
    customer_ref: z.string(),
    email: z.string().email()
  }).optional(),
  routing: z.object({
    preferred_processor: z.enum(['cybersource']).optional()
  }).optional()
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

export type SaleRequest = z.infer<typeof saleRequestSchema>;
export type CaptureRequest = z.infer<typeof captureRequestSchema>;
export type VoidRequest = z.infer<typeof voidRequestSchema>;
export type RefundRequest = z.infer<typeof refundRequestSchema>;
