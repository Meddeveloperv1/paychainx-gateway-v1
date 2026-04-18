export type RetryDecision = {
  retryable: boolean;
  retry_rule: 'never' | 'safe_after_delay' | 'manual_review';
};

export type AvsResult = {
  avs_code: string | null;
  avs_normalized: 'match' | 'partial' | 'mismatch' | 'unavailable' | 'unknown';
};

export type CvvResult = {
  cvv_code: string | null;
  cvv_normalized: 'match' | 'mismatch' | 'unavailable' | 'unknown';
};

export type ProcessorFailureDetail = {
  decline_category: 'issuer_decline' | 'gateway_error' | 'processor_error' | 'config_error' | 'unknown';
  retry: RetryDecision;
};

function normalize(value?: string | null) {
  return (value ?? '').trim().toUpperCase();
}

export function normalizeAvs(code?: string | null): AvsResult {
  const c = normalize(code);

  if (!c) return { avs_code: null, avs_normalized: 'unavailable' };

  if (['Y', 'X', 'D', 'F', 'M'].includes(c)) {
    return { avs_code: c, avs_normalized: 'match' };
  }

  if (['A', 'W', 'Z', 'P'].includes(c)) {
    return { avs_code: c, avs_normalized: 'partial' };
  }

  if (['N', 'C'].includes(c)) {
    return { avs_code: c, avs_normalized: 'mismatch' };
  }

  if (['U', 'R', 'S', 'I', 'G'].includes(c)) {
    return { avs_code: c, avs_normalized: 'unavailable' };
  }

  return { avs_code: c, avs_normalized: 'unknown' };
}

export function normalizeCvv(code?: string | null): CvvResult {
  const c = normalize(code);

  if (!c) return { cvv_code: null, cvv_normalized: 'unavailable' };

  if (['M'].includes(c)) {
    return { cvv_code: c, cvv_normalized: 'match' };
  }

  if (['N', 'P'].includes(c)) {
    return { cvv_code: c, cvv_normalized: 'mismatch' };
  }

  if (['S', 'U', 'X'].includes(c)) {
    return { cvv_code: c, cvv_normalized: 'unavailable' };
  }

  return { cvv_code: c, cvv_normalized: 'unknown' };
}

export function classifyProcessorFailure(message?: string | null): ProcessorFailureDetail {
  const msg = (message ?? '').toLowerCase();

  if (!msg) {
    return {
      decline_category: 'unknown',
      retry: { retryable: false, retry_rule: 'never' }
    };
  }

  if (
    msg.includes('general system failure') ||
    msg.includes('timeout') ||
    msg.includes('temporarily unavailable') ||
    msg.includes('service unavailable') ||
    msg.includes('network')
  ) {
    return {
      decline_category: 'processor_error',
      retry: { retryable: true, retry_rule: 'safe_after_delay' }
    };
  }

  if (
    msg.includes('declined') ||
    msg.includes('do not honor') ||
    msg.includes('insufficient funds') ||
    msg.includes('pickup card')
  ) {
    return {
      decline_category: 'issuer_decline',
      retry: { retryable: false, retry_rule: 'manual_review' }
    };
  }

  if (
    msg.includes('not implemented') ||
    msg.includes('invalid token') ||
    msg.includes('configuration') ||
    msg.includes('credential')
  ) {
    return {
      decline_category: 'config_error',
      retry: { retryable: false, retry_rule: 'never' }
    };
  }

  return {
    decline_category: 'gateway_error',
    retry: { retryable: false, retry_rule: 'never' }
  };
}
