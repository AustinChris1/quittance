// Watching a swap: the server rechecks on a schedule, and the browser only displays what changed.
import { createHash } from "node:crypto";
import webpush, { type PushSubscription } from "web-push";
import { evidenceState, isFinal, describeChange } from "../../../packages/core/src/watch.ts";
import { runCheck } from "./check.ts";
import { getStore } from "./store.ts";
import { loadRootEnv } from "./env.ts";

const INDEX = "watch:index";
const MAX_DAYS = 60;

type Subscriber = { id: string; subscription: PushSubscription; until: string; since: string };

/** One record per swap, however many people watch it, so a hundred watchers cost one lookup. */
type Watch = {
  key: string;
  query: string;
  label: string;
  summary: string;
  state: string;
  checkedAt: string;
  subscribers: Subscriber[];
};

export function pushConfig(): { publicKey: string; privateKey: string; subject: string } | undefined {
  loadRootEnv();
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return undefined;
  return { publicKey, privateKey, subject: process.env.VAPID_SUBJECT ?? "https://github.com/AustinChris1/quittance" };
}

export function watchEnabled(): boolean {
  return Boolean(pushConfig() && getStore());
}

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
// The push endpoint is a capability URL, so only its hash identifies a subscriber in logs and responses.
const subscriberId = (s: PushSubscription) => sha(s.endpoint).slice(0, 16);

async function send(subscription: PushSubscription, payload: object): Promise<"sent" | "gone" | "failed"> {
  const cfg = pushConfig()!;
  try {
    await webpush.sendNotification(subscription, JSON.stringify(payload), {
      vapidDetails: { subject: cfg.subject, publicKey: cfg.publicKey, privateKey: cfg.privateKey },
      TTL: 60 * 60 * 24,
    });
    return "sent";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    // 404 and 410 mean the browser dropped the subscription, so it is removed rather than retried forever.
    return status === 404 || status === 410 ? "gone" : "failed";
  }
}

async function load(key: string): Promise<Watch | undefined> {
  const raw = await getStore()!.get(`watch:${key}`);
  return raw ? (JSON.parse(raw) as Watch) : undefined;
}

async function save(w: Watch): Promise<void> {
  const store = getStore()!;
  await store.set(`watch:${w.key}`, JSON.stringify(w));
  await store.sadd(INDEX, w.key);
}

async function drop(key: string): Promise<void> {
  const store = getStore()!;
  await store.del(`watch:${key}`);
  await store.srem(INDEX, key);
}

export type StartResult =
  | { ok: true; until: string; label: string; summary: string; key: string }
  | { ok: false; status: number; error: string };

export async function startWatch(query: string, subscription: PushSubscription, days: number): Promise<StartResult> {
  const { evidence, receipt } = await runCheck(query);
  if (evidence.candidates) return { ok: false, status: 400, error: "A wallet is not one swap. Pick the swap first, then watch it." };
  if (isFinal(receipt)) return { ok: false, status: 409, error: "This receipt is final, so there is nothing left to watch." };

  // Every identifier for one swap shares one watch: the deposit address when there is one.
  const target = evidence.input.depositAddress ?? query;
  const key = sha(target).slice(0, 24);
  const span = Math.min(Math.max(Math.round(days), 1), MAX_DAYS);
  const until = new Date(Date.now() + span * 86_400_000).toISOString();
  const now = new Date().toISOString();

  const existing = await load(key);
  const id = subscriberId(subscription);
  const others = (existing?.subscribers ?? []).filter((s) => s.id !== id);
  await save({
    key,
    query: target,
    label: receipt.verdict.label,
    summary: receipt.verdict.summary,
    state: existing?.state ?? evidenceState(receipt),
    checkedAt: now,
    subscribers: [...others, { id, subscription, until, since: now }],
  });
  return { ok: true, until, label: receipt.verdict.label, summary: receipt.verdict.summary, key };
}

export async function stopWatch(key: string, endpoint: string): Promise<boolean> {
  const w = await load(key);
  if (!w) return false;
  const id = sha(endpoint).slice(0, 16);
  w.subscribers = w.subscribers.filter((s) => s.id !== id);
  if (w.subscribers.length === 0) await drop(key);
  else await save(w);
  return true;
}

/** Proves the path to this browser works, with the swap's current sentence. It changes nothing on the server. */
export async function sendTest(subscription: PushSubscription, query: string): Promise<boolean> {
  const { receipt } = await runCheck(query);
  const result = await send(subscription, {
    title: "Test from Quittance",
    body: `If this swap changes, the alert will look like this. Right now: ${receipt.verdict.summary}`,
    url: `/check?q=${encodeURIComponent(query)}`,
    tag: "quittance-test",
  });
  return result === "sent";
}

export type RunReport = { checked: number; changed: number; notified: number; finished: number; expired: number; skipped: number };

/** One scheduled pass. Stops early, before the function's time limit, and resumes next time. */
export async function runWatches(budgetMs = 45_000): Promise<RunReport> {
  const started = Date.now();
  const report: RunReport = { checked: 0, changed: 0, notified: 0, finished: 0, expired: 0, skipped: 0 };
  const keys = await getStore()!.smembers(INDEX);
  // Oldest check first, so a long list is covered across runs rather than starving its tail.
  const watches = (await Promise.all(keys.map(load))).filter((w): w is Watch => Boolean(w));
  watches.sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));

  for (const w of watches) {
    if (Date.now() - started > budgetMs) {
      report.skipped += 1;
      continue;
    }
    const now = new Date();
    const live = w.subscribers.filter((s) => new Date(s.until) > now);
    report.expired += w.subscribers.length - live.length;
    if (live.length === 0) {
      await drop(w.key);
      continue;
    }

    let receipt;
    try {
      receipt = (await runCheck(w.query)).receipt;
    } catch {
      // A failed lookup is not a change. Try again next run.
      continue;
    }
    report.checked += 1;
    const state = evidenceState(receipt);
    const final = isFinal(receipt);
    let keep = live;

    if (state !== w.state) {
      report.changed += 1;
      const { title, body } = describeChange(w.label, receipt);
      const payload = { title, body, url: `/check?q=${encodeURIComponent(w.query)}`, tag: `quittance-${w.key}` };
      const results = await Promise.all(live.map((s) => send(s.subscription, payload)));
      report.notified += results.filter((r) => r === "sent").length;
      keep = live.filter((_, i) => results[i] !== "gone");
    }

    if (final || keep.length === 0) {
      report.finished += final ? 1 : 0;
      await drop(w.key);
      continue;
    }
    await save({ ...w, label: receipt.verdict.label, summary: receipt.verdict.summary, state, checkedAt: now.toISOString(), subscribers: keep });
  }
  return report;
}
