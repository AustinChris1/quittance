import { NextResponse } from "next/server";
import { BAD_QUERY, receiptBody, validQuery } from "../../../lib/receipt-response.ts";
import { paid } from "../../../lib/x402.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** The paid door for agents: the same receipt as /api/check, for one x402 payment, with no account or key. */
async function respond(request: Request, raw: unknown) {
  // A malformed query is refused before any 402, so nobody is asked to pay for a lookup that cannot run.
  const query = validQuery(raw);
  if (!query) return NextResponse.json({ error: BAD_QUERY }, { status: 400 });
  return paid(request, async () => {
    try {
      return NextResponse.json(await receiptBody(query));
    } catch (err) {
      return NextResponse.json({ error: err instanceof Error ? err.message : "Unknown failure" }, { status: 502 });
    }
  });
}

export async function GET(request: Request) {
  return respond(request, new URL(request.url).searchParams.get("q"));
}

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = ((await request.clone().json()) as { query?: unknown }).query;
  } catch {
    return NextResponse.json({ error: "Send a JSON body with a query field, or use GET ?q=." }, { status: 400 });
  }
  return respond(request, raw);
}
