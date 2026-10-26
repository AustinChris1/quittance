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

  if (!params.apiKey) {
    return {
      evidence: {
        available: false,
        reason:
          "No partner key supplied. The 1Click status endpoint requires X-API-Key, so an ordinary user cannot read their own swap.",
      },
      sources: [],
    };
  }

  const res = await readJson<Raw>({
    name: "1click.status",
    url: url.toString(),
    headers: { "X-API-Key": params.apiKey },
  });

  if (!res.ok) {
    const detail = res.source.detail ?? "unknown error";
    return {
      evidence: {
        available: false,
        reason: `The 1Click status endpoint could not be read (${detail}). A 404 here means the deposit address is unknown to the API.`,
      },
      sources: [res.source],
    };
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
      sources: [res.source],
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
    sources: [res.source],
  };
}
