import { CyberSourceAdapter } from "../../adapters/cybersource/adapter.js";

/**
 * Processor registry (expand here)
 */
function getProcessor(type: string) {
  switch (type) {
    case "cybersource":
      return new CyberSourceAdapter();

    // 🔜 future rails
    case "freedompay":
    case "propelr":
    case "zerohash":
      throw new Error(`${type} not implemented yet`);

    default:
      return new CyberSourceAdapter();
  }
}

/**
 * Resolve processor (multi-source routing)
 */
export function resolveProcessor(preferred?: string, merchant?: any) {
  // 1. explicit override (request-level)
  if (preferred) {
    return getProcessor(preferred);
  }

  // 2. merchant config (future DB)
  if (merchant?.processor) {
    return getProcessor(merchant.processor);
  }

  // 3. default fallback
  return getProcessor("cybersource");
}
