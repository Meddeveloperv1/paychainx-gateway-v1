type NormalizedSaleInput = {
  merchantReference: string;
  amount: number;
  currency: string;
  paymentSourceType: 'bank_token';
  tokenRef: string;
  customerEmail?: string | null;
};

type NormalizedCaptureInput = {
  processorTransactionId: string;
  amount: number;
  currency: string;
};

type NormalizedVoidInput = {
  processorTransactionId: string;
};

type NormalizedRefundInput = {
  processorTransactionId: string;
  amount: number;
  currency: string;
};

type NormalizedPaymentResult = {
  processor: 'bank_rail';
  success: boolean;
  status: string;
  processorTransactionId?: string | null;
  processorStatus?: string | null;
  processorHttpStatus?: number | null;
  responsePayload?: unknown;
  errorMessage?: string | null;
};

export class BankRailAdapter {
  async sale(input: NormalizedSaleInput): Promise<NormalizedPaymentResult> {
    return {
      processor: 'bank_rail',
      success: false,
      status: 'failed',
      processorTransactionId: '',
      processorStatus: 'NOT_IMPLEMENTED',
      processorHttpStatus: null,
      responsePayload: {
        note: 'bank_rail adapter scaffolded',
        merchantReference: input.merchantReference
      },
      errorMessage: 'bank_rail adapter not implemented yet'
    };
  }

  async capture(input: NormalizedCaptureInput): Promise<NormalizedPaymentResult> {
    return {
      processor: 'bank_rail',
      success: false,
      status: 'failed',
      processorTransactionId: input.processorTransactionId,
      processorStatus: 'NOT_IMPLEMENTED',
      processorHttpStatus: null,
      responsePayload: null,
      errorMessage: 'bank_rail capture not implemented yet'
    };
  }

  async void(input: NormalizedVoidInput): Promise<NormalizedPaymentResult> {
    return {
      processor: 'bank_rail',
      success: false,
      status: 'failed',
      processorTransactionId: input.processorTransactionId,
      processorStatus: 'NOT_IMPLEMENTED',
      processorHttpStatus: null,
      responsePayload: null,
      errorMessage: 'bank_rail void not implemented yet'
    };
  }

  async refund(input: NormalizedRefundInput): Promise<NormalizedPaymentResult> {
    return {
      processor: 'bank_rail',
      success: false,
      status: 'failed',
      processorTransactionId: input.processorTransactionId,
      processorStatus: 'NOT_IMPLEMENTED',
      processorHttpStatus: null,
      responsePayload: null,
      errorMessage: 'bank_rail refund not implemented yet'
    };
  }
}
