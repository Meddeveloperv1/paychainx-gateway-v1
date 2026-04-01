import { z } from 'zod';

export const saleRequestSchema = z.object({
  merchant_reference: z.string().min(1),
  amount: z.number().int().positive(),
  currency: z.string().length(3),
  payment_method: z.object({
    type: z.literal('card_token'),
    token_ref: z.string().min(1)
  }),
  customer: z.object({
    customer_ref: z.string().optional(),
    email: z.string().email().optional()
  }).optional(),
  description: z.string().optional()
});

export type SaleRequest = z.infer<typeof saleRequestSchema>;
