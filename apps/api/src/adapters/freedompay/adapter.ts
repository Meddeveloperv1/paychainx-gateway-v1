import { request } from "undici";
import crypto from "crypto";

type FreedomPayCredentials = {
  baseUrl?: string;
  apiKey?: string;
  secret?: string;
  merchantId?: string;
  terminalId?: string;
  environment?: string;
};

export class FreedomPayAdapter {
  credentials: FreedomPayCredentials = {};

  private getConfig() {
    const baseUrl = this.credentials?.baseUrl;
    const apiKey = this.credentials?.apiKey;
    const secret = this.credentials?.secret;
    const merchantId = this.credentials?.merchantId;
    const terminalId = this.credentials?.terminalId;

    if (!baseUrl) throw new Error("FreedomPay baseUrl missing");
    if (!apiKey) throw new Error("FreedomPay apiKey missing");
    if (!merchantId) throw new Error("FreedomPay merchantId missing");

    return { baseUrl, apiKey, secret, merchantId, terminalId };
  }

  private buildHeaders(payload: any) {
    const { apiKey, secret, merchantId, terminalId } = this.getConfig();
    const body = JSON.stringify(payload);
    const digest = crypto.createHash("sha256").update(body).digest("hex");

    const headers: Record<string, string> = {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "x-merchant-id": merchantId,
      "x-payload-digest": digest
    };

    if (terminalId) headers["x-terminal-id"] = terminalId;

    if (secret) {
      headers["x-signature"] = crypto
        .createHmac("sha256", secret)
        .update(digest)
        .digest("hex");
    }

    return headers;
  }

  private async post(path: string, payload: any) {
    const { baseUrl } = this.getConfig();
    const url = `${baseUrl.replace(/\/+$/, "")}${path}`;
    const body = JSON.stringify(payload);
    const headers = this.buildHeaders(payload);

    const response = await request(url, {
      method: "POST",
      headers,
      body
    });

    const text = await response.body.text();
    let data: any = null;

    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = { raw: text };
    }

    if (response.statusCode >= 400) {
      throw new Error(
        `FreedomPay error ${response.statusCode}: ${JSON.stringify(data)}`
      );
    }

    return data;
  }

  private normalizeStatus(raw: any, fallback = "authorized") {
    const candidate =
      raw?.status ||
      raw?.payment_status ||
      raw?.transaction_status ||
      raw?.result ||
      fallback;

    const value = String(candidate).toLowerCase();

    if (["approved", "authorized", "auth"].includes(value)) return "authorized";
    if (["captured", "settled", "sale"].includes(value)) return "captured";
    if (["voided", "reversed"].includes(value)) return "voided";
    if (["refunded", "refund"].includes(value)) return "refunded";
    if (["declined", "failed", "error"].includes(value)) return "failed";

    return fallback;
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
      transaction_id:
        raw?.transaction_id ||
        raw?.id ||
        raw?.payment_id ||
        raw?.reference ||
        null,
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
      transaction_id:
        raw?.transaction_id ||
        raw?.id ||
        raw?.payment_id ||
        raw?.reference ||
        null,
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
      transaction_id:
        raw?.transaction_id ||
        raw?.id ||
        raw?.payment_id ||
        raw?.reference ||
        null,
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
      transaction_id:
        raw?.transaction_id ||
        raw?.id ||
        raw?.payment_id ||
        raw?.reference ||
        null,
      raw
    };
  }
}
