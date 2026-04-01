export type NormalizedSaleInput = {
  merchantReference: string;
  amount: number;
  currency: string;
  tokenRef: string;
  customerEmail?: string;
  description?: string;
};

export type NormalizedCaptureInput = {
  processorTransactionId: string;
  amount: number;
  currency: string;
};

export type NormalizedVoidInput = {
  processorTransactionId: string;
};

export type NormalizedRefundInput = {
  processorTransactionId: string;
  amount: number;
  currency: string;
};

export type NormalizedPaymentResult = {
  processor: string;
  success: boolean;
  status: 'authorized' | 'captured' | 'voided' | 'refunded' | 'failed';
  processorTransactionId?: string;
  processorStatus?: string;
  responsePayload: unknown;
  errorMessage?: string;
};

export interface ProcessorAdapter {
  sale(input: NormalizedSaleInput): Promise<NormalizedPaymentResult>;
  capture(input: NormalizedCaptureInput): Promise<NormalizedPaymentResult>;
  void(input: NormalizedVoidInput): Promise<NormalizedPaymentResult>;
  refund(input: NormalizedRefundInput): Promise<NormalizedPaymentResult>;
}
