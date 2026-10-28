import { NextResponse } from "next/server";
import { gatherEvidence, type GatherOptions } from "../../../../../packages/core/src/gather.ts";
import { buildReceipt, renderText } from "../../../../../packages/core/src/receipt.ts";
import { loadTokens, chainName } from "../../../../../packages/core/src/sources/tokens.ts";
import type { Evidence } from "../../../../../packages/core/src/types.ts";
import { loadRootEnv } from "../../../lib/env.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Base58 of 32 bytes: a NEAR transaction hash, or equally a Solana address. */
const BASE58_32 = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;
/** Base58 of 64 bytes: a Solana transaction signature. */
const SOL_TX = /^[1-9A-HJ-NP-Za-km-z]{80,90}$/;
const EVM_TX = /^0x[a-fA-F0-9]{64}$/;
/** Bare 32-byte hex: TRON, Bitcoin and Zcash transaction ids. */
const HEX_TX = /^[a-fA-F0-9]{64}$/;

function looksTransaction(value: string): boolean {
  return BASE58_32.test(value) || SOL_TX.test(value) || EVM_TX.test(value) || HEX_TX.test(value);
}

/** Names what the input turned out to be, from what resolved rather than from its shape alone. */
function describe(value: string, evidence: Evidence): string {
  if (evidence.candidates) return "wallet address";
  if (evidence.input.depositAddress === value) return "deposit address";
  if (EVM_TX.test(value)) return "EVM transaction";
  if (SOL_TX.test(value)) return "Solana transaction";
  if (HEX_TX.test(value)) return "transaction hash";
  if (BASE58_32.test(value)) return "NEAR transaction";
  return "deposit address";
}

export async function POST(request: Request) {
  let query = "";
  try {
    const body = (await request.json()) as { query?: unknown };
    query = typeof body.query === "string" ? body.query.trim() : "";
  } catch {
    return NextResponse.json({ error: "Send a JSON body with a query field." }, { status: 400 });
  }

  if (query.length < 8 || query.length > 128) {
    return NextResponse.json(
      { error: "Paste a transaction hash, a deposit address or a wallet address." },
      { status: 400 },
    );
  }

  loadRootEnv();
  // Credentials stay on the server. The browser never sees them.
  const keys: Partial<GatherOptions> = {
    apiKey: process.env.QUITTANCE_ONECLICK_KEY,
    explorerToken: process.env.QUITTANCE_PARTNER_JWT ?? process.env.QUITTANCE_ONECLICK_KEY,
    rpc: process.env.QUITTANCE_NEAR_RPC,
  };

  try {
    let evidence: Evidence;
    if (looksTransaction(query)) {
      evidence = await gatherEvidence({ ...keys, search: query });
    } else {
      // An address is tried as the quote's deposit address first, which needs no token and has no rate limit.
      evidence = await gatherEvidence({ ...keys, depositAddress: query });
      if (!evidence.status.available) {
        // Not a deposit address the operator knows. It may be a wallet that sent or received swaps.
        const searched = await gatherEvidence({ ...keys, search: query });
        if (searched.candidates || searched.status.available) evidence = searched;
      }
    }

    const receipt = buildReceipt(evidence);
    const swaps = evidence.candidates ? await describeSwaps(evidence) : undefined;
    return NextResponse.json({ inputKind: describe(query, evidence), receipt, swaps, text: renderText(receipt) });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown failure";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
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
