import { getMerchantCapabilities } from './merchant-capabilities.js';

export type MerchantRoutingProfile = {
  merchantId: string;
  defaultProcessor: 'cybersource' | 'bank_rail';
  bankRailEnabled: boolean;
  pqEnabled: boolean;
  pqStrictMode: boolean;
  allowedCurrencies: string[];
  allowedChannels: string[];
  cybersourceEnabled: boolean;
};

export async function resolveMerchantRoutingProfile(merchantId: string): Promise<MerchantRoutingProfile> {
  const caps = await getMerchantCapabilities(merchantId);

  return {
    merchantId,
    defaultProcessor: caps.defaultProcessor,
    bankRailEnabled: caps.bankRailEnabled,
    pqEnabled: caps.pqEnabled,
    pqStrictMode: caps.pqStrictMode,
    allowedCurrencies: caps.allowedCurrencies,
    allowedChannels: caps.allowedChannels,
    cybersourceEnabled: caps.cybersourceEnabled
  };
}
