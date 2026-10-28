// The 1Click token list maps every Intents asset id to its real chain, contract and decimals.
import { readJson } from "./http.ts";
import type { SourceRef } from "../types.ts";

export const TOKENS_URL = "https://1click.chaindefuser.com/v0/tokens";

export type TokenInfo = {
  assetId: string;
  blockchain: string;
  symbol: string;
  decimals: number;
  /** Absent for a chain's native coin. */
  contractAddress?: string;
};

const TTL_MS = 10 * 60 * 1000;
let cache: { at: number; tokens: Map<string, TokenInfo>; source: SourceRef } | undefined;

/** Reads the token list once per ten minutes. The list is public and needs no key. */
export async function loadTokens(): Promise<{ tokens: Map<string, TokenInfo>; source?: SourceRef }> {
  if (cache && Date.now() - cache.at < TTL_MS) return { tokens: cache.tokens };
  const res = await readJson<unknown[]>({ name: "1click.tokens", url: TOKENS_URL });
  if (!res.ok || !Array.isArray(res.data)) return { tokens: cache?.tokens ?? new Map(), source: res.source };
  const tokens = new Map<string, TokenInfo>();
  for (const entry of res.data) {
    const t = entry as Record<string, unknown>;
    if (typeof t.assetId !== "string" || typeof t.blockchain !== "string") continue;
    tokens.set(t.assetId, {
      assetId: t.assetId,
      blockchain: t.blockchain,
      symbol: typeof t.symbol === "string" ? t.symbol : t.assetId,
      decimals: typeof t.decimals === "number" ? t.decimals : 0,
      contractAddress: typeof t.contractAddress === "string" && t.contractAddress ? t.contractAddress : undefined,
    });
  }
  cache = { at: Date.now(), tokens, source: res.source };
  return { tokens, source: res.source };
}

export async function resolveToken(assetId?: string): Promise<{ token?: TokenInfo; source?: SourceRef }> {
  if (!assetId) return {};
  const { tokens, source } = await loadTokens();
  return { token: tokens.get(assetId), source };
}

/** Human names for the chains Quittance can read, keyed by the token list's blockchain field. */
export const CHAIN_NAMES: Record<string, string> = {
  eth: "Ethereum",
  base: "Base",
  arb: "Arbitrum",
  op: "Optimism",
  pol: "Polygon",
  bsc: "BNB Chain",
  gnosis: "Gnosis",
  avax: "Avalanche",
  hood: "Robinhood Chain",
  tron: "TRON",
  sol: "Solana",
  near: "NEAR",
  btc: "Bitcoin",
  zec: "Zcash",
};

export function chainName(blockchain: string): string {
  return CHAIN_NAMES[blockchain] ?? blockchain;
}
