import { CyberSourceAdapter } from "../../adapters/cybersource/adapter.js";
import { resolveCredentials } from "./credential-resolver.js";

/**
 * Processor registry
 */
function getProcessor(type: string, merchant?: any) {
  const credentials = resolveCredentials(merchant);

  switch (type) {
    case "cybersource": {
      const adapter = new CyberSourceAdapter();

      // 🔥 SAFE INJECTION (no constructor change)
      (adapter as any).credentials = credentials;

      return adapter;
    }

    default: {
      const adapter = new CyberSourceAdapter();
      (adapter as any).credentials = credentials;
      return adapter;
    }
  }
}

/**
 * Resolve processor with credentials
 */
export function resolveProcessor(preferred?: string, merchant?: any) {
  if (preferred) {
    return getProcessor(preferred, merchant);
  }

  if (merchant?.processor) {
    return getProcessor(merchant.processor, merchant);
  }

  return getProcessor("cybersource", merchant);
}
