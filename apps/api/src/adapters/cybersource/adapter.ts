import { cyberSourcePost } from './client.js';

type NormalizedSaleInput = {
  merchantReference: string;
  amount: number;
  currency: string;
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
  processor: 'cybersource';
  success: boolean;
  status: string;
  processorTransactionId?: string | null;
  processorStatus?: string | null;
  processorHttpStatus?: number | null;
  responsePayload?: unknown;
  errorMessage?: string | null;
};

function mapCyberSourceResult(
  response: { statusCode: number; requestPayload: unknown; body: unknown },
  successStatus: string,
  failureMessage: string
): NormalizedPaymentResult {
  const body = (response.body ?? {}) as Record<string, unknown>;
  const statusCode = response.statusCode;
  const success = statusCode >= 200 && statusCode < 300;

  return {
    processor: 'cybersource',
    success,
    status: success ? successStatus : 'failed',
    processorTransactionId: typeof body.id === 'string' ? body.id : '',
    processorStatus: typeof body.status === 'string' ? body.status : (success ? successStatus.toUpperCase() : 'ERROR'),
    processorHttpStatus: statusCode,
    responsePayload: response.body,
    errorMessage: success ? null : (typeof body.message === 'string' ? body.message : failureMessage)
  };
}

export class CyberSourceAdapter {
  async sale(input: NormalizedSaleInput): Promise<NormalizedPaymentResult> {
    const payload = {
      clientReferenceInformation: {
        code: input.merchantReference
      },
      processingInformation: {
        commerceIndicator: 'internet'
      },
      orderInformation: {
        billTo: {
          firstName: 'Rick',
          lastName: 'James',
          address1: '245 Market St',
          postalCode: '94105',
          locality: 'san francisco',
          administrativeArea: 'CA',
          country: 'US',
          phoneNumber: '4158880000',
          company: 'Visa',
          email: input.customerEmail || 'test@cybs.com'
        },
        amountDetails: {
          totalAmount: (input.amount / 100).toFixed(2),
          currency: input.currency
        }
      },
      paymentInformation: {
        card: {
          expirationYear: '2031',
          number: '4111111111111111',
          securityCode: '123',
          expirationMonth: '12'
        }
      }
    };

    try {
      const response = await cyberSourcePost('/pts/v2/payments', payload);
      return mapCyberSourceResult(response, 'captured', 'CyberSource sale failed');
    } catch (err) {
      return {
        processor: 'cybersource',
        success: false,
        status: 'failed',
        processorTransactionId: '',
        processorStatus: 'ERROR',
        processorHttpStatus: null,
        responsePayload: null,
        errorMessage: err instanceof Error ? err.message : String(err)
      };
    }
  }

  async capture(input: NormalizedCaptureInput): Promise<NormalizedPaymentResult> {
    const payload = {
      orderInformation: {
        amountDetails: {
          totalAmount: (input.amount / 100).toFixed(2),
          currency: input.currency
        }
      }
    };

    try {
      const response = await cyberSourcePost(`/pts/v2/payments/${input.processorTransactionId}/captures`, payload);
      return mapCyberSourceResult(response, 'captured', 'CyberSource capture failed');
    } catch (err) {
      return {
        processor: 'cybersource',
        success: false,
        status: 'failed',
        processorTransactionId: input.processorTransactionId,
        processorStatus: 'ERROR',
        processorHttpStatus: null,
        responsePayload: null,
        errorMessage: err instanceof Error ? err.message : String(err)
      };
    }
  }

  async void(input: NormalizedVoidInput): Promise<NormalizedPaymentResult> {
    try {
      const response = await cyberSourcePost(`/pts/v2/payments/${input.processorTransactionId}/voids`, {});
      return mapCyberSourceResult(response, 'voided', 'CyberSource void failed');
    } catch (err) {
      return {
        processor: 'cybersource',
        success: false,
        status: 'failed',
        processorTransactionId: input.processorTransactionId,
        processorStatus: 'ERROR',
        processorHttpStatus: null,
        responsePayload: null,
        errorMessage: err instanceof Error ? err.message : String(err)
      };
    }
  }

  async refund(input: NormalizedRefundInput): Promise<NormalizedPaymentResult> {
    const payload = {
      orderInformation: {
        amountDetails: {
          totalAmount: (input.amount / 100).toFixed(2),
          currency: input.currency
        }
      }
    };

    try {
      const response = await cyberSourcePost(`/pts/v2/payments/${input.processorTransactionId}/refunds`, payload);
      return mapCyberSourceResult(response, 'refunded', 'CyberSource refund failed');
    } catch (err) {
      return {
        processor: 'cybersource',
        success: false,
        status: 'failed',
        processorTransactionId: input.processorTransactionId,
        processorStatus: 'ERROR',
        processorHttpStatus: null,
        responsePayload: null,
        errorMessage: err instanceof Error ? err.message : String(err)
      };
    }
  }
}
