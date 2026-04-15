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

  console.log('\n--- CYBERSOURCE OUTBOUND REQUEST ---');
  console.log('URL:', url.toString());
  console.log('RESOURCE PATH:', resourcePath);
  console.log('BODY:', body);
  console.log('DATE:', date);
  console.log('DIGEST:', digest);
  console.log('SIGNATURE:', signatureHeader);

  const res = await request(url, {
    method: 'POST',
    body,
    headers: {
      'v-c-merchant-id': env.CYBERSOURCE_MERCHANT_ID,
      'Date': date,
      'Host': url.host,
      'Digest': digest!,
      'Signature': signatureHeader,
      'Content-Type': 'application/json',
      'User-Agent': 'Mozilla/5.0'
    }
  });

  const rawText = await res.body.text();
  let parsedBody: unknown = null;

  try {
    parsedBody = rawText ? JSON.parse(rawText) : null;
  } catch {
    parsedBody = { rawText };
  }

  console.log('\n--- CYBERSOURCE RESPONSE ---');
  console.log('STATUS:', res.statusCode);
  console.log('RAW BODY:', rawText);

  return {
    statusCode: res.statusCode,
    requestPayload: payload,
    body: parsedBody
  };
}
