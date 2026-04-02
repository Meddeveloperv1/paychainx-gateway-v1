import crypto from 'node:crypto';

export function createDigest(body: string): string {
  const hash = crypto.createHash('sha256').update(body, 'utf8').digest('base64');
  return `SHA-256=${hash}`;
}

export function signCyberSourceRequest(params: {
  keyId: string;
  secretKey: string;
  method: string;
  resourcePath: string;
  host: string;
  merchantId: string;
  body?: string;
  date: string;
}) {
  const { keyId, secretKey, method, resourcePath, host, merchantId, body, date } = params;

  const digest = body ? createDigest(body) : undefined;

  const headers = body
    ? 'host date (request-target) digest v-c-merchant-id'
    : 'host date (request-target) v-c-merchant-id';

  const signingLines = [
    `host: ${host}`,
    `date: ${date}`,
    `(request-target): ${method.toLowerCase()} ${resourcePath}`
  ];

  if (digest) signingLines.push(`digest: ${digest}`);
  signingLines.push(`v-c-merchant-id: ${merchantId}`);

  const signatureBase = signingLines.join('\n');

  const signature = crypto
    .createHmac('sha256', Buffer.from(secretKey, 'base64'))
    .update(signatureBase, 'utf8')
    .digest('base64');

  return {
    digest,
    signatureHeader: `keyid="${keyId}",algorithm="HmacSHA256",headers="${headers}",signature="${signature}"`
  };
}
