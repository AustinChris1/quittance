import { NextResponse } from "next/server";
import { renderText } from "../../../../../packages/core/src/receipt.ts";
import { loadTokens, chainName } from "../../../../../packages/core/src/sources/tokens.ts";
import type { Evidence } from "../../../../../packages/core/src/types.ts";
import { runCheck } from "../../../lib/check.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  try {
    const { evidence, receipt, inputKind } = await runCheck(query);
    const swaps = evidence.candidates ? await describeSwaps(evidence) : undefined;
    return NextResponse.json({ inputKind, receipt, swaps, text: renderText(receipt) });
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
