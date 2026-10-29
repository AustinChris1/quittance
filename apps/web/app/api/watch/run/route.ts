import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { runWatches, watchEnabled } from "../../../../lib/watch.ts";
import { loadRootEnv } from "../../../../lib/env.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(request: Request): boolean {
  loadRootEnv();
  const secret = process.env.WATCH_CRON_SECRET;
  const given = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!secret || !given || given.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(given), Buffer.from(secret));
}

/** The scheduled recheck. Only the scheduler holds the secret, so nobody can make it spam lookups. */
export async function POST(request: Request) {
  if (!authorised(request)) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  if (!watchEnabled()) return NextResponse.json({ error: "Watching is not set up on this deployment." }, { status: 503 });
  return NextResponse.json(await runWatches());
}
