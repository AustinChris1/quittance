import { readJson, formatUnits } from "./http.ts";
import type { IntentTransfer, ObservedDeposit, SourceRef } from "../types.ts";

export const DEFAULT_NEARBLOCKS_BASE = "https://api.nearblocks.io";

type FtEvent = {
  affected_account_id?: string;
  involved_account_id?: string | null;
  delta_amount?: number | string;
  cause?: string;
  ft_meta?: { contract?: string; symbol?: string; decimals?: number };
};

type Action = { action?: string; method?: string; args?: unknown };

type Txn = {
  transaction_hash?: string;
  block_timestamp?: string;
  signer_account_id?: string;
  receiver_account_id?: string;
  outcomes?: { status?: boolean };
  actions?: Action[];
  receipts?: { fts?: FtEvent[] }[];
};

export type NearTxRead = {
  deposits: ObservedDeposit[];
  creditedTo?: { account: string; token: string; amount: string };
  intentTransfers: IntentTransfer[];
  blockTimestampIso?: string;
  confirmed?: boolean;
  source: SourceRef;
};

/** Decimals for the bridged assets that appear in intents; unknown ones stay raw. */
const KNOWN_DECIMALS: Record<string, { symbol: string; decimals: number }> = {
  "nep141:wrap.near": { symbol: "wNEAR", decimals: 24 },
  "nep141:eth.omft.near": { symbol: "ETH", decimals: 18 },
  "nep141:hood.omft.near": { symbol: "ETH (Robinhood Chain)", decimals: 18 },
  "nep141:base.omft.near": { symbol: "ETH (Base)", decimals: 18 },
  "nep141:arb.omft.near": { symbol: "ETH (Arbitrum)", decimals: 18 },
  "nep141:btc.omft.near": { symbol: "BTC", decimals: 8 },
  "nep141:tron.omft.near": { symbol: "TRX", decimals: 6 },
  "nep141:sol.omft.near": { symbol: "SOL", decimals: 9 },
};

function trimZeros(value: string): string {
  return value.includes(".") ? value.replace(/0+$/, "").replace(/\.$/, "") : value;
}

function nsToIso(ns?: string): string | undefined {
  if (!ns) return undefined;
  const ms = Number(BigInt(ns) / 1_000_000n);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : undefined;
}

/** NearBlocks returns arguments JSON-encoded, sometimes more than once. Unwrap until it is not a string. */
function unwrap(value: unknown): unknown {
  let current = value;
  for (let i = 0; i < 6 && typeof current === "string"; i += 1) {
    const text: string = current;
    try {
      current = JSON.parse(text);
    } catch {
      // Escaped quotes survive one parse; strip a layer and try again.
      const stripped = text.replace(/\\"/g, '"').replace(/\\\\/g, "\\");
      if (stripped === text) return text;
      current = stripped;
    }
  }
  return current;
}

/**
 * Reads the transfers out of an execute_intents call. Each signed intent is a NEP-413 payload whose
 * message is itself JSON naming the receiver and the tokens moved.
 */
function decodeIntentTransfers(actions: Action[] = []): IntentTransfer[] {
  const out: IntentTransfer[] = [];
  for (const action of actions) {
    if (action.method !== "execute_intents") continue;
    const args = unwrap(action.args) as { signed?: { payload?: { message?: unknown } }[] } | undefined;
    for (const signed of args?.signed ?? []) {
      const message = unwrap(signed.payload?.message) as
        | { signer_id?: string; deadline?: string; intents?: Record<string, unknown>[] }
        | undefined;
      for (const intent of message?.intents ?? []) {
        if (intent.intent !== "transfer" || typeof intent.receiver_id !== "string") continue;
        const tokens = (intent.tokens ?? {}) as Record<string, string>;
        for (const [token, amountRaw] of Object.entries(tokens)) {
          const known = KNOWN_DECIMALS[token];
          out.push({
            signer: message?.signer_id,
            receiver: intent.receiver_id,
            token: known?.symbol ?? token,
            amountRaw: String(amountRaw),
            amountFormatted: known ? trimZeros(formatUnits(String(amountRaw), known.decimals)) : undefined,
            deadline: message?.deadline,
          });
        }
      }
    }
  }
  return out;
}

/** Reads one NEAR transaction: ordinary token movements, and transfers inside signed intents. */
export async function readNearTx(params: { hash: string; base?: string }): Promise<NearTxRead> {
  const base = params.base ?? DEFAULT_NEARBLOCKS_BASE;
  const url = `${base}/v1/txns/${params.hash}`;
  const res = await readJson<{ txns?: Txn[] }>({ name: "nearblocks.txn", url });
  if (!res.ok) return { deposits: [], intentTransfers: [], source: res.source };

  const txn = res.data.txns?.[0];
  if (!txn) {
    return {
      deposits: [],
      intentTransfers: [],
      source: { ...res.source, ok: false, detail: "transaction not found" },
    };
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
    intentTransfers: decodeIntentTransfers(txn.actions),
    blockTimestampIso,
    confirmed,
    source: res.source,
  };
}
