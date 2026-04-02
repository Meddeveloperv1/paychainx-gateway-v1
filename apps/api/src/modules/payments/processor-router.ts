import { CyberSourceAdapter } from "../../adapters/cybersource/adapter.js";
import { FreedomPayAdapter } from "../../adapters/freedompay/adapter.js";
import { resolveCredentials } from "./credential-resolver.js";

function getProcessor(type: string, merchant?: any) {
  let adapter: any;

  switch (type) {
    case "freedompay":
      adapter = new FreedomPayAdapter();
      break;

    case "propelr":
    case "cybersource":
    default:
      adapter = new CyberSourceAdapter();
  }

  const credentials = resolveCredentials(merchant);
  adapter.credentials = credentials;

  return adapter;
}

export function resolveProcessor(preferred?: string, merchant?: any) {
  if (preferred) {
    return getProcessor(preferred, merchant);
  }

  if (merchant?.processor) {
    return getProcessor(merchant.processor, merchant);
  }

  return getProcessor("cybersource", merchant);
}
