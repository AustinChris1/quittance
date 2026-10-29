import { NextResponse } from "next/server";
import type { PushSubscription } from "web-push";
import { pushConfig, startWatch, stopWatch, watchEnabled } from "../../../lib/watch.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isSubscription(v: unknown): v is PushSubscription {
  const s = v as PushSubscription;
  return Boolean(s && typeof s.endpoint === "string" && s.endpoint.startsWith("https://") && s.keys?.p256dh && s.keys?.auth);
}

/** Whether watching is available on this deployment, and the public key a browser subscribes with. */
export async function GET() {
  const cfg = pushConfig();
  return NextResponse.json({ enabled: watchEnabled(), publicKey: cfg?.publicKey ?? null });
}

export async function POST(request: Request) {
  if (!watchEnabled()) return NextResponse.json({ error: "Watching is not set up on this deployment." }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as { query?: unknown; subscription?: unknown; days?: unknown };
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (query.length < 8 || query.length > 128) return NextResponse.json({ error: "Send the swap you want watched." }, { status: 400 });
  if (!isSubscription(body.subscription)) return NextResponse.json({ error: "Send a browser push subscription." }, { status: 400 });
  const days = typeof body.days === "number" ? body.days : 14;
  try {
    const result = await startWatch(query, body.subscription, days);
    return result.ok ? NextResponse.json(result) : NextResponse.json({ error: result.error }, { status: result.status });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Could not start watching." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  if (!watchEnabled()) return NextResponse.json({ error: "Watching is not set up on this deployment." }, { status: 503 });
  const body = (await request.json().catch(() => ({}))) as { key?: unknown; endpoint?: unknown };
  if (typeof body.key !== "string" || typeof body.endpoint !== "string") {
    return NextResponse.json({ error: "Send the watch key and the subscription endpoint." }, { status: 400 });
  }
  return NextResponse.json({ stopped: await stopWatch(body.key, body.endpoint) });
}
