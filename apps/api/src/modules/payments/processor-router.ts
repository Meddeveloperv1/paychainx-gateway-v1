import { CyberSourceAdapter } from "../../adapters/cybersource/adapter.js";
import { resolveCredentials } from "./credential-resolver.js";

/**
 * Processor registry
 */
function getProcessor(type: string, merchant?: any) {
  let adapter: any;

  switch (type) {
    case "propelr":
      // 🔥 Propelr = CyberSource with merchant credentials
      adapter = new CyberSourceAdapter();
      break;

    case "cybersource":
    default:
      adapter = new CyberSourceAdapter();
  }

  // inject credentials (important)
  const credentials = resolveCredentials(merchant);
  adapter.credentials = credentials;

  return adapter;
}

/**
 * Resolve processor
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
