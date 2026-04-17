type GatewayErrorShape = {
  statusCode: number;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    category: 'validation' | 'configuration' | 'processor' | 'security' | 'internal';
  };
};

function makeError(
  statusCode: number,
  code: string,
  message: string,
  retryable: boolean,
  category: GatewayErrorShape['error']['category']
): GatewayErrorShape {
  return {
    statusCode,
    error: { code, message, retryable, category }
  };
}

export function normalizeGatewayError(err: unknown): GatewayErrorShape {
  const message = err instanceof Error ? err.message : 'Internal server error';

  if (message === 'payment_method or payment_source required') {
    return makeError(400, 'payment_method_required', 'payment_method or payment_source required', false, 'validation');
  }

  if (message.startsWith('UNSUPPORTED_CURRENCY_FOR_MERCHANT:')) {
    const currency = message.split(':').slice(1).join(':').trim();
    return makeError(400, 'unsupported_currency_for_merchant', `Unsupported currency for merchant: ${currency}`, false, 'validation');
  }

  if (message.startsWith('PROCESSOR_DISABLED_FOR_MERCHANT:')) {
    const processor = message.split(':').slice(1).join(':').trim();
    return makeError(403, 'processor_disabled_for_merchant', `Processor disabled for merchant: ${processor}`, false, 'configuration');
  }

  if (message.startsWith('PQ_STRICT_MODE_FAILED:')) {
    const detail = message.split(':').slice(1).join(':').trim() || 'proof submission failed';
    return makeError(502, 'pq_strict_mode_failed', `PQ strict mode failed: ${detail}`, true, 'processor');
  }

  if (message === 'TOKEN_NOT_FOUND') {
    return makeError(404, 'token_not_found', 'Stored payment token was not found', false, 'validation');
  }

  if (message === 'TOKEN_NOT_ACTIVE') {
    return makeError(400, 'token_not_active', 'Stored payment token is not active', false, 'validation');
  }

  if (message === 'BANK_RAIL_AUTH_NOT_IMPLEMENTED') {
    return makeError(501, 'bank_rail_auth_not_implemented', 'Bank rail auth is not implemented', false, 'configuration');
  }

  if (message === 'PROCESSOR_AUTH_NOT_IMPLEMENTED') {
    return makeError(501, 'processor_auth_not_implemented', 'Processor auth is not implemented', false, 'configuration');
  }

  if (message.includes('timeout') || message.includes('ECONNRESET') || message.includes('fetch failed')) {
    return makeError(502, 'processor_unavailable', 'Temporary processor or network failure', true, 'processor');
  }

  return makeError(500, 'internal_error', message || 'Internal server error', false, 'internal');
}
