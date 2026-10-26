import { readJson } from "./http.ts";
import type { SourceRef, StatusEvidence, TxRef } from "../types.ts";
import { ONECLICK_STATUSES, RECIPIENT_TYPES, DEPOSIT_TYPES } from "../types.ts";

export const DEFAULT_EXPLORER_BASE = "https://explorer.near-intents.org";

type Raw = Record<string, unknown>;

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function txRefs(value: unknown, chain: string): TxRef[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((entry) => {
    if (typeof entry === "string") return [{ chain, hash: entry }];
    const hash = str((entry as Raw)?.hash);
    return hash ? [{ chain, hash, explorerUrl: str((entry as Raw)?.explorerUrl) }] : [];
  });
}

function oneOf<T extends readonly string[]>(list: T, value: unknown): T[number] | undefined {
  return typeof value === "string" && (list as readonly string[]).includes(value)
    ? (value as T[number])
    : undefined;
}

export type ExplorerRecord = {
  depositAddress?: string;
  depositMemo?: string;
  status?: string;
  recipient?: string;
  recipientType?: string;
  refundTo?: string;
  refundReason?: string;
  amountInFormatted?: string;
  amountOutFormatted?: string;
  originChainTxHashes: TxRef[];
  destinationChainTxHashes: TxRef[];
  raw: Raw;
};

export type ExplorerSearch = {
  records: ExplorerRecord[];
  sources: SourceRef[];
  /** True when the call was refused for lack of a token, which is a real gate here. */
  needsToken: boolean;
  note?: string;
};

/** Resolves an identifier to a swap. Unlike the status endpoint, this one really does need a token. */
export async function searchExplorer(params: {
  query: string;
  token?: string;
  base?: string;
  limit?: number;
}): Promise<ExplorerSearch> {
  const base = params.base ?? DEFAULT_EXPLORER_BASE;
  const url = new URL("/api/v0/transactions", base);
  url.searchParams.set("search", params.query);
  url.searchParams.set("numberOfTransactions", String(params.limit ?? 10));

  if (!params.token) {
    return {
      records: [],
      sources: [],
      needsToken: true,
      note: "The Explorer API rejects calls without a bearer token, so the deposit address could not be resolved from this identifier. A partner JWT from the Partner Dashboard unlocks search by transaction hash, recipient or sender.",
    };
  }

  const res = await readJson<Raw>({
    name: "intents.explorer.search",
    url: url.toString(),
    headers: { Authorization: `Bearer ${params.token}` },
  });

  if (!res.ok) {
    const note =
      res.status === 429
        ? "The Explorer API rate limit is one request every five seconds per partner id. Wait and retry."
        : res.status === 400 || res.status === 401
          ? "The Explorer API rejected the bearer token."
          : `The Explorer API could not be read (${res.source.detail ?? "unknown error"}).`;
    return { records: [], sources: [res.source], needsToken: res.status === 400 || res.status === 401, note };
  }

  // The endpoint replies with a bare array. The wrapper keys are tolerated in case that changes.
  const payload = res.data as unknown;
  const list: unknown[] = Array.isArray(payload)
    ? payload
    : Array.isArray((payload as Raw)?.transactions)
      ? ((payload as Raw).transactions as unknown[])
      : Array.isArray((payload as Raw)?.items)
        ? ((payload as Raw).items as unknown[])
        : [];

  const records: ExplorerRecord[] = list.flatMap((entry) => {
    const r = entry as Raw;
    if (!r || typeof r !== "object") return [];
    return [
      {
        depositAddress: str(r.depositAddress),
        depositMemo: str(r.depositMemo),
        status: str(r.status),
        recipient: str(r.recipient),
        recipientType: str(r.recipientType),
        refundTo: str(r.refundTo),
        refundReason: str(r.refundReason),
        amountInFormatted: str(r.amountInFormatted),
        amountOutFormatted: str(r.amountOutFormatted),
        originChainTxHashes: txRefs(r.originChainTxHashes, "origin"),
        destinationChainTxHashes: txRefs(r.destinationChainTxHashes, "destination"),
        raw: r,
      },
    ];
  });

  return { records, sources: [res.source], needsToken: false };
}

/** Builds status evidence from an explorer record, used when the status endpoint has no answer. */
export function statusFromExplorer(record: ExplorerRecord): StatusEvidence {
  const status = oneOf(ONECLICK_STATUSES, record.status);
  if (!status) {
    return {
      available: false,
      reason: `The explorer record carried an unrecognised status (${record.status ?? "none"}).`,
    };
  }
  const strings = (value: unknown): string[] =>
    Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];

  return {
    available: true,
    status,
    correlationId: str(record.raw.correlationId) ?? "not reported by the explorer",
    updatedAt: str(record.raw.updatedAt) ?? str(record.raw.createdAt) ?? "unknown",
    depositType: oneOf(DEPOSIT_TYPES, record.raw.depositType),
    recipientType: oneOf(RECIPIENT_TYPES, record.recipientType),
    originAsset: str(record.raw.originAsset),
    destinationAsset: str(record.raw.destinationAsset),
    recipient: record.recipient,
    refundTo: record.refundTo,
    amountInFormatted: record.amountInFormatted,
    refundedAmount: str(record.raw.refundedAmount),
    // The explorer reports a refund type and fee but never an amount.
    refundAmountKnown: false,
    refundReason: record.refundReason ?? null,
    originChainTxHashes: record.originChainTxHashes,
    destinationChainTxHashes: record.destinationChainTxHashes,
    nearTxHashes: strings(record.raw.nearTxHashes),
    intentHashes: strings(record.raw.intentHashes),
  };
}
