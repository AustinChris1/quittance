import { readJson } from "./http.ts";
import type { SourceRef, StatusEvidence, TxRef } from "../types.ts";
import { ONECLICK_STATUSES, DEPOSIT_TYPES, RECIPIENT_TYPES } from "../types.ts";

export const DEFAULT_ONECLICK_BASE = "https://1click.chaindefuser.com";

type Raw = Record<string, unknown>;

function obj(value: unknown): Raw | undefined {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Raw) : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

/** The quote fields live under quoteResponse, whose exact nesting has moved between versions. */
function pickQuoteField(root: Raw, key: string): string | undefined {
  const quoteResponse = obj(root.quoteResponse);
  const candidates = [
    quoteResponse,
    obj(quoteResponse?.quoteRequest),
    obj(quoteResponse?.quote),
    root,
  ];
  for (const candidate of candidates) {
    const found = str(candidate?.[key]);
    if (found) return found;
  }
  return undefined;
}

function txRefs(value: unknown, chain: string): TxRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string") return [{ chain, hash: entry }];
    const record = obj(entry);
    const hash = str(record?.hash);
    if (!hash) return [];
    return [{ chain, hash, explorerUrl: str(record?.explorerUrl) }];
  });
}

function oneOf<T extends readonly string[]>(list: T, value: unknown): T[number] | undefined {
  return typeof value === "string" && (list as readonly string[]).includes(value)
    ? (value as T[number])
    : undefined;
}

export type StatusRead = { evidence: StatusEvidence; sources: SourceRef[] };

/** Records the rate-limit tier the server applied, which shows whether the call was authenticated. */
function annotate(source: SourceRef, headers?: Headers): SourceRef {
  if (!headers) return source;
  const unauth = headers.get("x-ratelimit-limit-unauth");
  const auth = headers.get("x-ratelimit-limit");
  const tier = unauth ? `unauthenticated, limit ${unauth}` : auth ? `authenticated, limit ${auth}` : undefined;
  return tier ? { ...source, detail: `${source.detail ?? ""} ${tier}`.trim() } : source;
}

export async function readOneClickStatus(params: {
  depositAddress: string;
  memo?: string;
  apiKey?: string;
  base?: string;
}): Promise<StatusRead> {
  const base = params.base ?? DEFAULT_ONECLICK_BASE;
  const url = new URL("/v0/status", base);
  url.searchParams.set("depositAddress", params.depositAddress);
  if (params.memo) url.searchParams.set("depositMemo", params.memo);

  // The status endpoint answers without a key. A key is for the fee schedule, not for read access.
  const call = (key?: string) =>
    readJson<Raw>({
      name: key ? "1click.status (authenticated)" : "1click.status (unauthenticated)",
      url: url.toString(),
      headers: key ? { "X-API-Key": key } : {},
    });

  const sources: SourceRef[] = [];
  let res = await call(params.apiKey);
  sources.push(annotate(res.source, res.headers));

  // A rejected key is worse than no key, so fall back rather than give up.
  if (!res.ok && res.status === 401 && params.apiKey) {
    const retry = await call(undefined);
    sources.push(annotate(retry.source, retry.headers));
    if (retry.ok) {
      res = retry;
    } else {
      return {
        evidence: {
          available: false,
          reason:
            "The supplied partner key was rejected with HTTP 401, and the unauthenticated retry also failed.",
        },
        sources,
      };
    }
  }

  if (!res.ok) {
    const reason =
      res.status === 404
        ? "The operator has no record of this deposit address. Either the quote was never created, or the address belongs to a different route."
        : `The 1Click status endpoint could not be read (${res.source.detail ?? "unknown error"}).`;
    return { evidence: { available: false, reason }, sources };
  }

  const root = res.data;
  const swapDetails = obj(root.swapDetails) ?? {};
  const status = oneOf(ONECLICK_STATUSES, root.status);

  if (!status) {
    return {
      evidence: {
        available: false,
        reason: `The status endpoint replied without a recognised status value (${String(root.status)}).`,
      },
      sources,
    };
  }

  return {
    evidence: {
      available: true,
      status,
      correlationId: str(root.correlationId) ?? "unknown",
      updatedAt: str(root.updatedAt) ?? "unknown",
      depositType: oneOf(DEPOSIT_TYPES, pickQuoteField(root, "depositType")),
      recipientType: oneOf(RECIPIENT_TYPES, pickQuoteField(root, "recipientType")),
      originAsset: pickQuoteField(root, "originAsset"),
      destinationAsset: pickQuoteField(root, "destinationAsset"),
      recipient: pickQuoteField(root, "recipient"),
      refundTo: pickQuoteField(root, "refundTo"),
      amountIn: str(swapDetails.amountIn),
      amountInFormatted: str(swapDetails.amountInFormatted),
      amountOut: str(swapDetails.amountOut),
      refundedAmount: str(swapDetails.refundedAmount),
      refundReason: str(swapDetails.refundReason) ?? null,
      originChainTxHashes: txRefs(swapDetails.originChainTxHashes, "origin"),
      destinationChainTxHashes: txRefs(swapDetails.destinationChainTxHashes, "destination"),
      nearTxHashes: Array.isArray(swapDetails.nearTxHashes)
        ? swapDetails.nearTxHashes.filter((h): h is string => typeof h === "string")
        : [],
      intentHashes: Array.isArray(swapDetails.intentHashes)
        ? swapDetails.intentHashes.filter((h): h is string => typeof h === "string")
        : [],
    },
    sources,
  };
}
