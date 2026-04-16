export type MerchantRoutingProfile = {
  merchantId: string;
  defaultProcessor: 'cybersource' | 'bank_rail';
  bankRailEnabled: boolean;
  pqEnabled: boolean;
};

export async function resolveMerchantRoutingProfile(merchantId: string): Promise<MerchantRoutingProfile> {
  return {
    merchantId,
    defaultProcessor: 'cybersource',
    bankRailEnabled: false,
    pqEnabled: false
  };
}
