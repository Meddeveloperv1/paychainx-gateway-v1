export function resolveCredentials(merchant?: any) {
  const processor = merchant?.processor || "cybersource";
  const account = merchant?.processorAccount || {};
  const cfg =
    account?.credentials ||
    account?.config ||
    account?.settings ||
    account?.credentialJson ||
    {};

  if (processor === "freedompay") {
    return {
      processor: "freedompay",
      baseUrl:
        cfg.baseUrl ||
        cfg.base_url ||
        process.env.FREEDOMPAY_BASE_URL ||
        "https://httpbin.org",
      apiKey:
        cfg.apiKey ||
        cfg.api_key ||
        process.env.FREEDOMPAY_API_KEY ||
        "test_key",
      secret:
        cfg.secret ||
        process.env.FREEDOMPAY_SECRET ||
        "test_secret",
      merchantId:
        cfg.merchantId ||
        cfg.merchant_id ||
        process.env.FREEDOMPAY_MERCHANT_ID ||
        "test_merchant",
      terminalId:
        cfg.terminalId ||
        cfg.terminal_id ||
        process.env.FREEDOMPAY_TERMINAL_ID ||
        "test_terminal",
      environment:
        cfg.environment ||
        process.env.FREEDOMPAY_ENV ||
        "sandbox",
      timeoutMs:
        cfg.timeoutMs ||
        process.env.FREEDOMPAY_TIMEOUT_MS ||
        15000,
      maxRetries:
        cfg.maxRetries ||
        process.env.FREEDOMPAY_MAX_RETRIES ||
        2
    };
  }

  return {
    processor: "cybersource",
    merchantId:
      cfg.merchantId ||
      cfg.merchant_id ||
      process.env.CYBERSOURCE_MERCHANT_ID ||
      "test",
    keyId:
      cfg.keyId ||
      cfg.key_id ||
      process.env.CYBERSOURCE_KEY_ID ||
      "test",
    secret:
      cfg.secret ||
      process.env.CYBERSOURCE_KEY_SECRET ||
      "test"
  };
}
