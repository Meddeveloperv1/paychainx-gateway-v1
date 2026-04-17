export type NormalizedProcessorFailure = {
  error_code: string;
  error_message: string;
  retryable: boolean;
  error_category: 'processor' | 'decline' | 'validation' | 'configuration' | 'internal';
};

function normalizeMessage(message?: string | null): string {
  return (message ?? '').trim();
}

export function normalizeProcessorFailure(message?: string | null): NormalizedProcessorFailure {
  const msg = normalizeMessage(message);
  const lower = msg.toLowerCase();

  if (!msg) {
    return {
      error_code: 'processor_failure',
      error_message: 'Processor request failed',
      retryable: false,
      error_category: 'processor'
    };
  }

  if (lower.includes('general system failure')) {
    return {
      error_code: 'processor_general_failure',
      error_message: 'Processor returned a general system failure',
      retryable: true,
      error_category: 'processor'
    };
  }

  if (lower.includes('timeout') || lower.includes('temporarily unavailable') || lower.includes('service unavailable')) {
    return {
      error_code: 'processor_unavailable',
      error_message: msg,
      retryable: true,
      error_category: 'processor'
    };
  }

  if (lower.includes('declined') || lower.includes('do not honor')) {
    return {
      error_code: 'processor_declined',
      error_message: msg,
      retryable: false,
      error_category: 'decline'
    };
  }

  if (lower.includes('invalid token') || lower.includes('token not found')) {
    return {
      error_code: 'processor_invalid_token',
      error_message: msg,
      retryable: false,
      error_category: 'validation'
    };
  }

  if (lower.includes('not implemented')) {
    return {
      error_code: 'processor_not_implemented',
      error_message: msg,
      retryable: false,
      error_category: 'configuration'
    };
  }

  return {
    error_code: 'processor_failure',
    error_message: msg,
    retryable: false,
    error_category: 'processor'
  };
}
