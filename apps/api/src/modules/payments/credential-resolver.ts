export type ProcessorCredentialSet = {
  processor: 'cybersource' | 'bank_rail';
  merchantId: string;
  credentialSource: 'env' | 'merchant_profile';
  credentialsPresent: boolean;
};

export async function resolveProcessorCredentials(
  merchantId: string,
  processor: 'cybersource' | 'bank_rail'
): Promise<ProcessorCredentialSet> {
  return {
    processor,
    merchantId,
    credentialSource: 'env',
    credentialsPresent: true
  };
}
