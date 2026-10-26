import { NextResponse } from "next/server";
import { gatherEvidence } from "../../../../../packages/core/src/gather.ts";
import { buildReceipt, renderText } from "../../../../../packages/core/src/receipt.ts";
import { loadRootEnv } from "../../../lib/env.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Base58 of 32 bytes, which is what a NEAR transaction hash looks like. */
const NEAR_TX = /^[1-9A-HJ-NP-Za-km-z]{43,44}$/;
const EVM_TX = /^0x[a-fA-F0-9]{64}$/;

function classifyInput(raw: string): { kind: string; options: Record<string, string> } {
  const value = raw.trim();
  if (NEAR_TX.test(value)) return { kind: "NEAR transaction", options: { search: value } };
  if (EVM_TX.test(value)) return { kind: "transaction hash", options: { search: value } };
  if (value.startsWith("0x") && value.length === 42) {
    return { kind: "EVM address", options: { depositAddress: value } };
  }
  return { kind: "deposit address", options: { depositAddress: value } };
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
      { error: "Paste a deposit address or a transaction hash." },
      { status: 400 },
    );
  }

  const { kind, options } = classifyInput(query);
  loadRootEnv();

  try {
    const evidence = await gatherEvidence({
      ...options,
      // Credentials stay on the server. The browser never sees them.
      apiKey: process.env.QUITTANCE_ONECLICK_KEY,
      explorerToken: process.env.QUITTANCE_PARTNER_JWT ?? process.env.QUITTANCE_ONECLICK_KEY,
      rpc: process.env.QUITTANCE_NEAR_RPC,
    });
    const receipt = buildReceipt(evidence);
    return NextResponse.json({ inputKind: kind, receipt, text: renderText(receipt) });
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown failure";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
