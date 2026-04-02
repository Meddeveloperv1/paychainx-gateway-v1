import { request } from "undici";
import crypto from "crypto";

type FreedomPayCredentials = {
  baseUrl?: string;
  apiKey?: string;
  secret?: string;
  merchantId?: string;
  terminalId?: string;
  environment?: string;
  timeoutMs?: number;
  maxRetries?: number;
};

class FreedomPayAdapterError extends Error {
  statusCode?: number;
  details?: any;
  retryable?: boolean;

  constructor(message: string, opts?: { statusCode?: number; details?: any; retryable?: boolean }) {
    super(message);
    this.name = "FreedomPayAdapterError";
    this.statusCode = opts?.statusCode;
    this.details = opts?.details;
    this.retryable = opts?.retryable;
  }
}

export class FreedomPayAdapter {
  credentials: FreedomPayCredentials = {};

  private getConfig() {
    const baseUrl = this.credentials?.baseUrl;
    const apiKey = this.credentials?.apiKey;
    const secret = this.credentials?.secret;
    const merchantId = this.credentials?.merchantId;
    const terminalId = this.credentials?.terminalId;
    const timeoutMs = Number(this.credentials?.timeoutMs ?? process.env.FREEDOMPAY_TIMEOUT_MS ?? 15000);
    const maxRetries = Number(this.credentials?.maxRetries ?? process.env.FREEDOMPAY_MAX_RETRIES ?? 2);

    if (!baseUrl) throw new FreedomPayAdapterError("FreedomPay baseUrl missing");
    if (!apiKey) throw new FreedomPayAdapterError("FreedomPay apiKey missing");
    if (!merchantId) throw new FreedomPayAdapterError("FreedomPay merchantId missing");

    return {
      baseUrl,
      apiKey,
      secret,
      merchantId,
      terminalId,
      timeoutMs,
      maxRetries
    };
  }

  private buildHeaders(payload: any, requestId?: string) {
    const { apiKey, secret, merchantId, terminalId } = this.getConfig();
    const body = JSON.stringify(payload);
    const digest = crypto.createHash("sha256").update(body).digest("hex");

    const headers: Record<string, string> = {
      "content-type": "application/json",
      "accept": "application/json",
      "x-api-key": apiKey,
      "x-merchant-id": merchantId,
      "x-payload-digest": digest
    };

    if (terminalId) headers["x-terminal-id"] = terminalId;
    if (requestId) headers["x-request-id"] = requestId;

    if (secret) {
      headers["x-signature"] = crypto
        .createHmac("sha256", secret)
        .update(digest)
        .digest("hex");
    }

    return headers;
  }

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private isRetryableStatus(statusCode: number) {
    return statusCode === 408 || statusCode === 429 || (statusCode >= 500 && statusCode <= 599);
  }

  private normalizeStatus(raw: any, fallback = "authorized") {
    const candidate =
      raw?.status ||
      raw?.payment_status ||
      raw?.transaction_status ||
      raw?.result ||
      raw?.outcome ||
      fallback;

    const value = String(candidate).toLowerCase();

    if (["approved", "authorized", "auth", "pending_capture"].includes(value)) return "authorized";
    if (["captured", "settled", "sale", "completed"].includes(value)) return "captured";
    if (["voided", "reversed", "cancelled", "canceled"].includes(value)) return "voided";
    if (["refunded", "refund", "partial_refund"].includes(value)) return "refunded";
    if (["declined", "failed", "error", "denied"].includes(value)) return "failed";

    return fallback;
  }

  private getTransactionId(raw: any) {
    return (
      raw?.transaction_id ||
      raw?.id ||
      raw?.payment_id ||
      raw?.reference ||
      raw?.transactionId ||
      null
    );
  }

  private async post(path: string, payload: any) {
    const { baseUrl, timeoutMs, maxRetries } = this.getConfig();
    const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
    const requestId =
      payload?.merchant_reference ||
      payload?.payment_id ||
      `fp_${Date.now()}`;

    let lastError: any;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const body = JSON.stringify(payload);
        const headers = this.buildHeaders(payload, requestId);

        const response = await request(url, {
          method: "POST",
          headers,
          body,
          headersTimeout: timeoutMs,
          bodyTimeout: timeoutMs
        });

        const text = await response.body.text();
        let data: any = null;

        try {
          data = text ? JSON.parse(text) : {};
        } catch {
          data = { raw: text };
        }

        if (response.statusCode >= 400) {
          const retryable = this.isRetryableStatus(response.statusCode);

          if (retryable && attempt < maxRetries) {
            await this.sleep(250 * (attempt + 1));
            continue;
          }

          throw new FreedomPayAdapterError(
            `FreedomPay error ${response.statusCode}`,
            {
              statusCode: response.statusCode,
              details: data,
              retryable
            }
          );
        }

        return data;
      } catch (err: any) {
        lastError = err;

        const retryable =
          err?.retryable === true ||
          err?.code === "UND_ERR_HEADERS_TIMEOUT" ||
          err?.code === "UND_ERR_BODY_TIMEOUT" ||
          err?.code === "ECONNRESET" ||
          err?.code === "ETIMEDOUT" ||
          err?.code === "ECONNREFUSED";

        if (retryable && attempt < maxRetries) {
          await this.sleep(250 * (attempt + 1));
          continue;
        }

        break;
      }
    }

    if (lastError instanceof FreedomPayAdapterError) {
      throw lastError;
    }

    throw new FreedomPayAdapterError("FreedomPay request failed", {
      details: {
        message: lastError?.message || String(lastError),
        code: lastError?.code
      },
      retryable: false
    });
  }

  async sale(input: any) {
    const payload = {
      merchant_reference: input.merchant_reference,
      amount: input.amount,
      currency: input.currency,
      payment_source: input.payment_source,
      customer: input.customer,
      metadata: {
        merchant_id: input.merchant_id,
        processor: "freedompay"
      }
    };

    const raw = await this.post("/payments/sale", payload);

    return {
      status: this.normalizeStatus(raw, "authorized"),
      processor: "freedompay",
      amount: input.amount,
      transaction_id: this.getTransactionId(raw),
      raw
    };
  }

  async capture(input: any) {
    const payload = {
      payment_id: input.payment_id,
      amount: input.amount,
      metadata: {
        merchant_id: input.merchant_id,
        processor: "freedompay"
      }
    };

    const raw = await this.post("/payments/capture", payload);

    return {
      status: this.normalizeStatus(raw, "captured"),
      processor: "freedompay",
      transaction_id: this.getTransactionId(raw),
      raw
    };
  }

  async void(input: any) {
    const payload = {
      payment_id: input.payment_id,
      metadata: {
        merchant_id: input.merchant_id,
        processor: "freedompay"
      }
    };

    const raw = await this.post("/payments/void", payload);

    return {
      status: this.normalizeStatus(raw, "voided"),
      processor: "freedompay",
      transaction_id: this.getTransactionId(raw),
      raw
    };
  }

  async refund(input: any) {
    const payload = {
      payment_id: input.payment_id,
      amount: input.amount,
      metadata: {
        merchant_id: input.merchant_id,
        processor: "freedompay"
      }
    };

    const raw = await this.post("/payments/refund", payload);

    return {
      status: this.normalizeStatus(raw, "refunded"),
      processor: "freedompay",
      transaction_id: this.getTransactionId(raw),
      raw
    };
  }
}
