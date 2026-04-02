export function resolveCredentials(merchant?: any) {
  const processor = merchant?.processor || "cybersource";

  if (processor === "freedompay") {
    return {
      processor: "freedompay",
      baseUrl: process.env.FREEDOMPAY_BASE_URL,
      apiKey: process.env.FREEDOMPAY_API_KEY,
      secret: process.env.FREEDOMPAY_SECRET,
      merchantId: process.env.FREEDOMPAY_MERCHANT_ID,
      terminalId: process.env.FREEDOMPAY_TERMINAL_ID,
      environment: process.env.FREEDOMPAY_ENV || "sandbox"
    };
  }

  return {
    processor: "cybersource",
    merchantId: process.env.CYBERSOURCE_MERCHANT_ID,
    keyId: process.env.CYBERSOURCE_KEY_ID,
    secret: process.env.CYBERSOURCE_SECRET
  };
}
