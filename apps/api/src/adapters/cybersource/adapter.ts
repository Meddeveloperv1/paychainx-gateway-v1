import { cyberSourcePost } from './client.js';
import type { ProcessorAdapter, NormalizedSaleInput, NormalizedPaymentResult } from '../processor.interface.js';

export class CyberSourceAdapter implements ProcessorAdapter {
  async sale(input: NormalizedSaleInput): Promise<NormalizedPaymentResult> {
    const payload = {
      clientReferenceInformation: {
        code: input.merchantReference
      },
      processingInformation: {
        capture: true
      },
      paymentInformation: {
        tokenizedCard: {
          transientTokenJwt: input.tokenRef
        }
      },
      orderInformation: {
        amountDetails: {
          totalAmount: (input.amount / 100).toFixed(2),
          currency: input.currency
        }
      },
      billTo: input.customerEmail ? { email: input.customerEmail } : undefined
    };

    try {
      const response = await cyberSourcePost('/pts/v2/payments', payload);

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {
          processor: 'cybersource',
          success: true,
          status: 'captured',
          processorTransactionId: String((response.body as any).id ?? ''),
          processorStatus: String((response.body as any).status ?? 'AUTHORIZED'),
          responsePayload: response.body
        };
      }

      return {
        processor: 'cybersource',
        success: false,
        status: 'failed',
        processorTransactionId: String((response.body as any).id ?? ''),
        processorStatus: String((response.body as any).status ?? 'ERROR'),
        responsePayload: response.body,
        errorMessage: String((response.body as any).message ?? 'CyberSource request failed')
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
}
