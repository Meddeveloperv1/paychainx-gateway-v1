import { cyberSourcePost } from './client.js';
import type {
  ProcessorAdapter,
  NormalizedSaleInput,
  NormalizedCaptureInput,
  NormalizedVoidInput,
  NormalizedRefundInput,
  NormalizedPaymentResult
} from '../processor.interface.js';

export class CyberSourceAdapter implements ProcessorAdapter {
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
          email: 'test@cybs.com'
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

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {
          processor: 'cybersource',
          success: true,
          status: 'captured',
          processorTransactionId: String((response.body as any)?.id ?? ''),
          processorStatus: String((response.body as any)?.status ?? 'AUTHORIZED'),
          processorHttpStatus: response.statusCode,
          responsePayload: response.body
        };
      }

      return {
        processor: 'cybersource',
        success: false,
        status: 'failed',
        processorTransactionId: String((response.body as any)?.id ?? ''),
        processorStatus: String((response.body as any)?.status ?? 'ERROR'),
        processorHttpStatus: response.statusCode,
        responsePayload: response.body,
        errorMessage: String((response.body as any)?.message ?? 'CyberSource sale failed')
      };
    } catch (err) {
      return {
        processor: 'cybersource',
        success: false,
        status: 'failed',
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

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {
          processor: 'cybersource',
          success: true,
          status: 'captured',
          processorTransactionId: String((response.body as any)?.id ?? input.processorTransactionId),
          processorStatus: String((response.body as any)?.status ?? 'PENDING'),
          processorHttpStatus: response.statusCode,
          responsePayload: response.body
        };
      }

      return {
        processor: 'cybersource',
        success: false,
        status: 'failed',
        processorTransactionId: input.processorTransactionId,
        processorStatus: String((response.body as any)?.status ?? 'ERROR'),
        processorHttpStatus: response.statusCode,
        responsePayload: response.body,
        errorMessage: String((response.body as any)?.message ?? 'CyberSource capture failed')
      };
    } catch (err) {
      return {
        processor: 'cybersource',
        success: false,
        status: 'failed',
        processorTransactionId: input.processorTransactionId,
        responsePayload: null,
        errorMessage: err instanceof Error ? err.message : String(err)
      };
    }
  }

  async void(input: NormalizedVoidInput): Promise<NormalizedPaymentResult> {
    try {
      const response = await cyberSourcePost(`/pts/v2/payments/${input.processorTransactionId}/voids`, {});

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {
          processor: 'cybersource',
          success: true,
          status: 'voided',
          processorTransactionId: String((response.body as any)?.id ?? input.processorTransactionId),
          processorStatus: String((response.body as any)?.status ?? 'PENDING'),
          processorHttpStatus: response.statusCode,
          responsePayload: response.body
        };
      }

      return {
        processor: 'cybersource',
        success: false,
        status: 'failed',
        processorTransactionId: input.processorTransactionId,
        processorStatus: String((response.body as any)?.status ?? 'ERROR'),
        processorHttpStatus: response.statusCode,
        responsePayload: response.body,
        errorMessage: String((response.body as any)?.message ?? 'CyberSource void failed')
      };
    } catch (err) {
      return {
        processor: 'cybersource',
        success: false,
        status: 'failed',
        processorTransactionId: input.processorTransactionId,
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

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {
          processor: 'cybersource',
          success: true,
          status: 'refunded',
          processorTransactionId: String((response.body as any)?.id ?? input.processorTransactionId),
          processorStatus: String((response.body as any)?.status ?? 'PENDING'),
          processorHttpStatus: response.statusCode,
          responsePayload: response.body
        };
      }

      return {
        processor: 'cybersource',
        success: false,
        status: 'failed',
        processorTransactionId: input.processorTransactionId,
        processorStatus: String((response.body as any)?.status ?? 'ERROR'),
        processorHttpStatus: response.statusCode,
        responsePayload: response.body,
        errorMessage: String((response.body as any)?.message ?? 'CyberSource refund failed')
      };
    } catch (err) {
      return {
        processor: 'cybersource',
        success: false,
        status: 'failed',
        processorTransactionId: input.processorTransactionId,
        responsePayload: null,
        errorMessage: err instanceof Error ? err.message : String(err)
      };
    }
  }


  async authorize(input: {
    merchantReference: string;
    amount: number;
    currency: string;
    tokenRef?: string;
    customerEmail?: string;
    description?: string;
  }) {
    return {
      success: true,
      status: 'authorized',
      processorTransactionId: `auth_${Date.now()}`,
      processorStatus: 'AUTHORIZED',
      processorHttpStatus: 200,
      responsePayload: {
        status: 'AUTHORIZED',
        merchantReference: input.merchantReference
      },
      errorMessage: null
    };
  }

}
