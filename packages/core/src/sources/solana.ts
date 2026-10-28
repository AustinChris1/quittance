// Reads a Solana transfer directly, from the balance changes the transaction itself records.
import { readJson, formatUnits } from "./http.ts";
import type { DeliveryProof, SourceRef } from "../types.ts";

export const SOLANA_RPCS = ["https://api.mainnet-beta.solana.com", "https://solana-rpc.publicnode.com"];

type TokenBalance = { accountIndex?: number; owner?: string; mint?: string; uiTokenAmount?: { amount?: string } };

type Tx = {
  slot?: number;
  blockTime?: number | null;
  meta?: {
    err?: unknown;
    preBalances?: number[];
    postBalances?: number[];
    preTokenBalances?: TokenBalance[];
    postTokenBalances?: TokenBalance[];
  } | null;
  transaction?: { message?: { accountKeys?: ({ pubkey?: string } | string)[] } };
};

/**
 * Confirms that one Solana transaction raised the expected address's balance of the expected
 * asset. SPL tokens are matched by mint and owner; native SOL by the account's lamport change.
 */
export async function verifySolanaTransfer(params: {
  txHash: string;
  /** SPL mint; omit for native SOL. */
  mint?: string;
  decimals: number;
  recipient?: string;
}): Promise<{ proof: DeliveryProof; sources: SourceRef[] }> {
  const sources: SourceRef[] = [];
  const base: DeliveryProof = { verified: false, chain: "Solana", tx: params.txHash };

  let tx: Tx | undefined;
  for (const url of SOLANA_RPCS) {
    const res = await readJson<{ result?: Tx | null }>({
      name: "solana.tx",
      url,
      method: "POST",
      body: {
        jsonrpc: "2.0",
        id: 1,
        method: "getTransaction",
        params: [params.txHash, { encoding: "jsonParsed", maxSupportedTransactionVersion: 0 }],
      },
      timeoutMs: 20_000,
    });
    sources.push(res.source);
    if (res.ok && res.data.result) {
      tx = res.data.result;
      break;
    }
  }
  if (!tx?.meta) {
    return {
      proof: { ...base, reason: `The transaction was not returned by any of the ${SOLANA_RPCS.length} Solana endpoints tried.` },
      sources,
    };
  }

  const ok = tx.meta.err === null || tx.meta.err === undefined;
  const settled: DeliveryProof = {
    ...base,
    receiptStatus: ok ? "success" : "failed",
    blockNumber: tx.slot,
    blockTimeIso: tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : undefined,
  };

  let delta = 0n;
  if (params.mint) {
    const match = (b: TokenBalance) => b.mint === params.mint && (!params.recipient || b.owner === params.recipient);
    const sum = (list: TokenBalance[] = []) =>
      list.filter(match).reduce((acc, b) => acc + BigInt(b.uiTokenAmount?.amount ?? "0"), 0n);
    delta = sum(tx.meta.postTokenBalances) - sum(tx.meta.preTokenBalances);
  } else if (params.recipient) {
    const keys = (tx.transaction?.message?.accountKeys ?? []).map((k) => (typeof k === "string" ? k : k.pubkey));
    const i = keys.indexOf(params.recipient);
    if (i >= 0) delta = BigInt((tx.meta.postBalances?.[i] ?? 0) - (tx.meta.preBalances?.[i] ?? 0));
  }

  if (delta > 0n) {
    return {
      proof: {
        ...settled,
        verified: ok,
        deliveredRaw: delta.toString(),
        deliveredFormatted: formatUnits(delta.toString(), params.decimals),
        decimals: params.decimals,
        recipientMatched: Boolean(params.recipient),
      },
      sources,
    };
  }
  return {
    proof: {
      ...settled,
      recipientMatched: false,
      reason: "The transaction does not raise the quoted address's balance of the expected asset.",
    },
    sources,
  };
}
