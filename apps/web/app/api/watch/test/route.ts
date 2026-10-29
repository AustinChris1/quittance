import { NextResponse } from "next/server";
import type { PushSubscription } from "web-push";
import { sendTest, watchEnabled } from "../../../../lib/watch.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sends one notification to the caller's own subscription, so they can see the alert works before waiting for a change. */
export async function POST(request: Request) {
  if (!watchEnabled()) return NextResponse.json({ error: "Watching is not set up on this deployment." }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as { query?: unknown; subscription?: PushSubscription };
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (!query || !body.subscription?.endpoint?.startsWith("https://")) {
    return NextResponse.json({ error: "Send the swap and your push subscription." }, { status: 400 });
  }
  const sent = await sendTest(body.subscription, query);
  return sent ? NextResponse.json({ sent }) : NextResponse.json({ error: "The browser's push service refused the test." }, { status: 502 });
}
