import { CyberSourceAdapter } from '../../adapters/cybersource/adapter.js';
import { BankRailAdapter } from '../../adapters/bank-rail/adapter.js';

export type SupportedProcessor = 'cybersource' | 'bank_rail';

export function resolveProcessor(preferred?: string) {
  const name = (preferred || 'cybersource') as SupportedProcessor;

  switch (name) {
    case 'cybersource':
      return {
        name: 'cybersource' as const,
        adapter: new CyberSourceAdapter()
      };

    case 'bank_rail':
      return {
        name: 'bank_rail' as const,
        adapter: new BankRailAdapter()
      };

    default:
      throw new Error(`Unsupported processor: ${preferred}`);
  }
}
