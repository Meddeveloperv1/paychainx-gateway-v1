import { request } from 'undici';
import { env } from '../../config/env.js';
import { signCyberSourceRequest } from './signer.js';

export async function cyberSourcePost(resourcePath: string, payload: unknown) {
  const url = new URL(resourcePath, env.CYBERSOURCE_BASE_URL);
  const body = JSON.stringify(payload);
  const date = new Date().toUTCString();

  const { digest, signatureHeader } = signCyberSourceRequest({
    keyId: env.CYBERSOURCE_KEY_ID,
    secretKey: env.CYBERSOURCE_KEY_SECRET,
    method: 'POST',
    resourcePath,
    host: url.host,
    merchantId: env.CYBERSOURCE_MERCHANT_ID,
    body,
    date
  });

  const res = await request(url, {
    method: 'POST',
    body,
    headers: {
      'content-type': 'application/json',
      'accept': 'application/json',
      'date': date,
      'host': url.host,
      'v-c-merchant-id': env.CYBERSOURCE_MERCHANT_ID,
      'digest': digest!,
      'signature': signatureHeader
    }
  });

  const rawText = await res.body.text();
  let parsedBody: unknown = null;

  try {
    parsedBody = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsedBody = { rawText };
  }

  return {
    statusCode: res.statusCode,
    requestPayload: payload,
    body: parsedBody
  };
}
