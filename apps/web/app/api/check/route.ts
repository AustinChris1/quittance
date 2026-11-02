import { NextResponse } from "next/server";
import { BAD_QUERY, receiptBody, validQuery } from "../../../lib/receipt-response.ts";
import { allowFreeCheck, FREE_CHECKS, WINDOW_SECONDS } from "../../../lib/limit.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = ((await request.json()) as { query?: unknown }).query;
  } catch {
    return NextResponse.json({ error: "Send a JSON body with a query field." }, { status: 400 });
  }
  const query = validQuery(raw);
  if (!query) return NextResponse.json({ error: BAD_QUERY }, { status: 400 });

  if (!(await allowFreeCheck(request))) {
    return NextResponse.json(
      {
        error: `The free checker allows ${FREE_CHECKS} lookups every ${WINDOW_SECONDS / 60} minutes per visitor. Try again shortly, or pay per receipt at /api/receipt.`,
      },
      { status: 429, headers: { "Retry-After": String(WINDOW_SECONDS) } },
    );
  }

  try {
    return NextResponse.json(await receiptBody(query));
  } catch (err) {
    const detail = err instanceof Error ? err.message : "Unknown failure";
    return NextResponse.json({ error: detail }, { status: 500 });
  }
}
