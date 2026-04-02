import { CyberSourceAdapter } from "../../adapters/cybersource/adapter.js";

export function resolveProcessor(preferred?: string, merchant?: any) {
  // 1. explicit request override
  if (preferred) {
    switch (preferred) {
      case "cybersource":
        return new CyberSourceAdapter();
    }
  }

  // 2. merchant config (future-ready)
  if (merchant?.processor === "cybersource") {
    return new CyberSourceAdapter();
  }

  // 3. default fallback
  return new CyberSourceAdapter();
}
