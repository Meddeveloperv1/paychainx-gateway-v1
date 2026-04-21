import crypto from 'node:crypto';

export function signProof(payload: string, privateKeyB64: string, algorithm: string): string {
  if (algorithm !== 'ed25519') throw new Error(`unsupported_signature_suite:${algorithm}`);
  const privateKeyPem = Buffer.from(privateKeyB64, 'base64').toString('utf8');
  const signature = crypto.sign(null, Buffer.from(payload), privateKeyPem);
  return signature.toString('base64');
}

export function verifyProofSignature(payload: string, signatureB64: string, publicKeyPem: string, algorithm: string): boolean {
  if (algorithm !== 'ed25519') throw new Error(`unsupported_signature_suite:${algorithm}`);
  return crypto.verify(null, Buffer.from(payload), publicKeyPem, Buffer.from(signatureB64, 'base64'));
}


export function signPQPayload(payload: string, privateKeyB64: string, algorithm: string): string {
  return signProof(payload, privateKeyB64, algorithm);
}
