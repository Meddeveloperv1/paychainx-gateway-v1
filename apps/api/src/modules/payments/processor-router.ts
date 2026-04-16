export type ProcessorName = 'cybersource' | 'bank_rail' | 'propelr' | 'zerohash' | 'freedompay';

export type ProcessorRouteInput = {
  currency: string;
  amount: number;
  merchantId?: string;
  requestedProcessor?: string | null;
};

export function resolveProcessor(input: ProcessorRouteInput): ProcessorName {
  if (input.requestedProcessor === 'bank_rail') return 'bank_rail';
  if (input.requestedProcessor === 'cybersource') return 'cybersource';
  return 'cybersource';
}
