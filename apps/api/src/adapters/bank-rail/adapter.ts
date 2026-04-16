export type BankRailSaleInput = {
  merchantReference: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  description?: string;
};

export type BankRailResult = {
  processor: 'bank_rail';
  success: boolean;
  status: 'pending' | 'failed';
  processorTransactionId?: string;
  processorStatus?: string;
  processorHttpStatus?: number;
  responsePayload?: unknown;
  errorMessage?: string;
};

export class BankRailAdapter {
  async sale(input: BankRailSaleInput): Promise<BankRailResult> {
    return {
      processor: 'bank_rail',
      success: false,
      status: 'failed',
      processorStatus: 'NOT_ENABLED',
      processorHttpStatus: 501,
      responsePayload: {
        message: 'Bank rail scaffold present but not enabled on production gateway yet',
        merchantReference: input.merchantReference,
        amount: input.amount,
        currency: input.currency
      },
      errorMessage: 'Bank rail not enabled yet'
    };
  }
}
