import { readJson, formatUnits } from "./http.ts";
import type { ObservedDeposit, SourceRef } from "../types.ts";

export const DEFAULT_NEARBLOCKS_BASE = "https://api.nearblocks.io";

type FtEvent = {
  affected_account_id?: string;
  involved_account_id?: string | null;
  delta_amount?: number | string;
  cause?: string;
  ft_meta?: { contract?: string; symbol?: string; decimals?: number };
};

type Txn = {
  transaction_hash?: string;
  block_timestamp?: string;
  signer_account_id?: string;
  receiver_account_id?: string;
  outcomes?: { status?: boolean };
  receipts?: { fts?: FtEvent[] }[];
};

export type NearTxRead = {
  deposits: ObservedDeposit[];
  creditedTo?: { account: string; token: string; amount: string };
  blockTimestampIso?: string;
  confirmed?: boolean;
  source: SourceRef;
};

function nsToIso(ns?: string): string | undefined {
  if (!ns) return undefined;
  const ms = Number(BigInt(ns) / 1_000_000n);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}

/** Reads one NEAR transaction and reports the token movements it caused. */
export async function readNearTx(params: {
  hash: string;
  base?: string;
}): Promise<NearTxRead> {
  const base = params.base ?? DEFAULT_NEARBLOCKS_BASE;
  const url = `${base}/v1/txns/${params.hash}`;
  const res = await readJson<{ txns?: Txn[] }>({ name: "nearblocks.txn", url });
  if (!res.ok) return { deposits: [], source: res.source };

  const txn = res.data.txns?.[0];
  if (!txn) {
    return { deposits: [], source: { ...res.source, ok: false, detail: "transaction not found" } };
  }

  const events = (txn.receipts ?? []).flatMap((r) => r.fts ?? []);
  const positive = events
    .map((e) => {
      const delta = Number(e.delta_amount ?? 0);
      const decimals = e.ft_meta?.decimals ?? 0;
      return {
        account: e.affected_account_id ?? "unknown",
        cause: e.cause ?? "UNKNOWN",
        symbol: e.ft_meta?.symbol ?? e.ft_meta?.contract ?? "unknown",
        contract: e.ft_meta?.contract ?? "unknown",
        raw: delta,
        amount: formatUnits(String(Math.trunc(delta)), decimals),
      };
    })
    .filter((e) => e.raw > 0);

  const blockTimestampIso = nsToIso(txn.block_timestamp);
  const confirmed = txn.outcomes?.status === true;

  // The settlement credit is the largest positive transfer, not the bridge mint that precedes it.
  const transfers = positive.filter((e) => e.cause === "TRANSFER");
  const credit = transfers.sort((a, b) => b.raw - a.raw)[0];
  const minted = positive.filter((e) => e.cause === "MINT").sort((a, b) => b.raw - a.raw)[0];
  const observed = credit ?? minted;

  const deposits: ObservedDeposit[] = observed
    ? [
        {
          chain: "near",
          tx: {
            chain: "near",
            hash: params.hash,
            explorerUrl: `https://nearblocks.io/txns/${params.hash}`,
            confirmed,
          },
          token: observed.symbol,
          amount: observed.amount,
          creditedTo: observed.account,
          blockTimestampIso,
        },
      ]
    : [];

  return {
    deposits,
    creditedTo: credit ? { account: credit.account, token: credit.symbol, amount: credit.amount } : undefined,
    blockTimestampIso,
    confirmed,
    source: res.source,
  };
}
