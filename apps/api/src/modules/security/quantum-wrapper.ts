import crypto from "crypto";

export function hashPayload(payload: any): string {
  const data = JSON.stringify(payload);
  return crypto.createHash("sha256").update(data).digest("hex");
}

export function signPayload(hash: string): string {
  const secret = process.env.GATEWAY_SIGNING_KEY || "dev_secret";

  return crypto
    .createHmac("sha256", secret)
    .update(hash)
    .digest("hex");
}

export function wrapExecution(input: any, result: any) {
  const requestHash = hashPayload(input);
  const responseHash = hashPayload(result);

  const signature = signPayload(requestHash + responseHash);

  return {
    request_hash: requestHash,
    response_hash: responseHash,
    signature,
    timestamp: Date.now()
  };
}
