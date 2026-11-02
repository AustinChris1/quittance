// The receipt JSON both doors return: the free /api/check and the paid /api/receipt answer identically.
import { renderText } from "../../../packages/core/src/receipt.ts";
import { loadTokens, chainName } from "../../../packages/core/src/sources/tokens.ts";
import type { Evidence } from "../../../packages/core/src/types.ts";
import { runCheck } from "./check.ts";

/** A transaction hash, a deposit address or a wallet, by length. Checked before any lookup or charge. */
export function validQuery(query: unknown): string | undefined {
  const q = typeof query === "string" ? query.trim() : "";
  return q.length >= 8 && q.length <= 128 ? q : undefined;
}

export const BAD_QUERY = "Paste a transaction hash, a deposit address or a wallet address.";

export async function receiptBody(query: string) {
  const { evidence, receipt, inputKind } = await runCheck(query);
  const swaps = evidence.candidates ? await describeSwaps(evidence) : undefined;
  return { inputKind, receipt, swaps, text: renderText(receipt) };
}

/** Gives each swap a wallet appears in readable asset names, from the public token list. */
async function describeSwaps(evidence: Evidence) {
  const { tokens } = await loadTokens();
  const name = (assetId?: string) => {
    const t = assetId ? tokens.get(assetId) : undefined;
    return t ? { symbol: t.symbol, chain: chainName(t.blockchain), blockchain: t.blockchain } : undefined;
  };
  return (evidence.candidates ?? []).map((c) => ({
    ...c,
    origin: name(c.originAsset),
    destination: name(c.destinationAsset),
  }));
}
