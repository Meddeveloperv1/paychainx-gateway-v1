import { FastifyRequest } from 'fastify';

export function getAuthMe(request: FastifyRequest) {
  if (!request.auth) {
    throw new Error('Missing auth context');
  }

  return {
    merchant: {
      id: request.auth.merchantId,
      name: request.auth.merchantName,
      status: request.auth.merchantStatus
    },
    apiKey: {
      id: request.auth.apiKeyId,
      label: request.auth.apiKeyLabel
    }
  };
}
