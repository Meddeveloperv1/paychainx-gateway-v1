export type NormalizedSaleInput = {
  merchantReference: string;
  amount: number;
  currency: string;
  tokenRef: string;
  customerEmail?: string;
  description?: string;
};

export type NormalizedPaymentResult = {
  processor: string;
  success: boolean;
  status: 'authorized' | 'captured' | 'failed';
  processorTransactionId?: string;
  processorStatus?: string;
  responsePayload: unknown;
  errorMessage?: string;
};

export interface ProcessorAdapter {
  sale(input: NormalizedSaleInput): Promise<NormalizedPaymentResult>;
};
