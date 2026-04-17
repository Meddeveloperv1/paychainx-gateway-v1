import { z } from 'zod';

export const saleRequestSchema = z.object({
  merchant_reference: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  requested_processor: z.string().optional(),
  payment_method: z.object({
    type: z.literal('card_token'),
    token_ref: z.string().min(1)
  }).optional(),
  payment_source: z.object({
    type: z.literal('sandbox_card')
  }).optional(),
  customer: z.object({
    customer_ref: z.string().optional(),
    email: z.string().email().optional()
  }).optional(),
  description: z.string().optional()
});

export const captureRequestSchema = z.object({
  payment_id: z.string().uuid(),
  processor_transaction_id: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.string().length(3)
});

export const voidRequestSchema = z.object({
  payment_id: z.string().uuid(),
  processor_transaction_id: z.string().min(1)
});

export const refundRequestSchema = z.object({
  payment_id: z.string().uuid(),
  processor_transaction_id: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.string().length(3)
});

export type SaleRequest = z.infer<typeof saleRequestSchema>;
export type CaptureRequest = z.infer<typeof captureRequestSchema>;
export type VoidRequest = z.infer<typeof voidRequestSchema>;
export type RefundRequest = z.infer<typeof refundRequestSchema>;

export const AuthRequestSchema = {
  type: 'object',
  required: ['merchant_reference', 'amount', 'currency', 'payment_source'],
  properties: {
    merchant_reference: { type: 'string' },
    amount: { type: 'integer' },
    currency: { type: 'string' },
    payment_source: {
      type: 'object',
      required: ['type'],
      properties: {
        type: { type: 'string' }
      }
    },
    customer_email: { type: 'string' },
    description: { type: 'string' },
    requested_processor: { type: 'string' }
  }
} as const;

export type AuthRequest = {
  merchant_reference: string;
  amount: number;
  currency: string;
  payment_source: {
    type: string;
  };
  customer_email?: string;
  description?: string;
  requested_processor?: string;
};
