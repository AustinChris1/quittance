import type { SourceRef } from "../types.ts";

export type Fetched<T> =
  | { ok: true; data: T; source: SourceRef; status: number; headers: Headers }
  | { ok: false; source: SourceRef; status?: number; headers?: Headers; body?: string };

export type FetchOptions = {
  name: string;
  url: string;
  method?: "GET" | "POST";
  headers?: Record<string, string>;
  body?: unknown;
  timeoutMs?: number;
};

/** Every outbound read returns a SourceRef so the receipt can cite what it looked at. */
export async function readJson<T>(opts: FetchOptions): Promise<Fetched<T>> {
  const readAt = new Date().toISOString();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 15_000);
  try {
    const res = await fetch(opts.url, {
      method: opts.method ?? "GET",
      headers: {
        accept: "application/json",
        ...(opts.body ? { "content-type": "application/json" } : {}),
        ...opts.headers,
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return {
        ok: false,
        status: res.status,
        headers: res.headers,
        body,
        source: { name: opts.name, url: opts.url, readAt, ok: false, detail: `HTTP ${res.status}` },
      };
    }
    const data = (await res.json()) as T;
    return {
      ok: true,
      data,
      status: res.status,
      headers: res.headers,
      source: { name: opts.name, url: opts.url, readAt, ok: true, detail: `HTTP ${res.status}` },
    };
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    return { ok: false, source: { name: opts.name, url: opts.url, readAt, ok: false, detail } };
  } finally {
    clearTimeout(timer);
  }
}

export function formatUnits(raw: string, decimals: number): string {
  const negative = raw.startsWith("-");
  const digits = (negative ? raw.slice(1) : raw).padStart(decimals + 1, "0");
  const whole = digits.slice(0, digits.length - decimals);
  const frac = decimals > 0 ? "." + digits.slice(digits.length - decimals) : "";
  return (negative ? "-" : "") + whole + frac;
}
