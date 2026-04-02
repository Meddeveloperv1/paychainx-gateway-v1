import { CyberSourceAdapter } from "../../adapters/cybersource/adapter.js";
import { FreedomPayAdapter } from "../../adapters/freedompay/adapter.js";
import { PropelrAdapter } from "../../adapters/propelr/adapter.js";
import { ZeroHashAdapter } from "../../adapters/zerohash/adapter.js";
import { resolveCredentials } from "./credential-resolver.js";

function getProcessor(type: string, merchant?: any) {
  const credentials = resolveCredentials(merchant);

  let adapter: any;

  switch (type) {
    case "cybersource":
      adapter = new CyberSourceAdapter();
      break;

    case "freedompay":
      adapter = new FreedomPayAdapter();
      break;

    case "propelr":
      adapter = new PropelrAdapter();
      break;

    case "zerohash":
      adapter = new ZeroHashAdapter();
      break;

    default:
      adapter = new CyberSourceAdapter();
  }

  // inject credentials safely
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
