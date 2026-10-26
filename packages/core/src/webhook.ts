import { createHmac } from "node:crypto";
import type { Receipt } from "./receipt.ts";
import { canonicalJson } from "./receipt.ts";

export type WebhookResult = {
  delivered: boolean;
  url: string;
  attempts: number;
  statusCode?: number;
  ack?: string;
  error?: string;
};

/** The only write Quittance performs, and it goes to an endpoint the operator controls. */
export async function postReceipt(params: {
  url: string;
  receipt: Receipt;
  secret?: string;
  attempts?: number;
  timeoutMs?: number;
}): Promise<WebhookResult> {
  const maxAttempts = Math.max(1, params.attempts ?? 3);
  const payload = canonicalJson(params.receipt);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "user-agent": "quittance/0.1",
    "x-quittance-fingerprint": params.receipt.fingerprint,
  };
  if (params.secret) {
    headers["x-quittance-signature"] =
      "sha256=" + createHmac("sha256", params.secret).update(payload).digest("hex");
  }

  let lastError = "";
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), params.timeoutMs ?? 10_000);
    try {
      const res = await fetch(params.url, {
        method: "POST",
        headers,
        body: payload,
        signal: controller.signal,
      });
      const ack = (await res.text()).slice(0, 400);
      if (res.ok) {
        return { delivered: true, url: params.url, attempts: attempt, statusCode: res.status, ack };
      }
      lastError = `HTTP ${res.status}`;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    } finally {
      clearTimeout(timer);
    }
    if (attempt < maxAttempts) await new Promise((r) => setTimeout(r, 400 * attempt));
  }

  return { delivered: false, url: params.url, attempts: maxAttempts, error: lastError };
}
