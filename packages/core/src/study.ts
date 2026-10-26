// Measures how many deposits landed and then went nowhere. Aggregates only, no per-user data.
import { readJson } from "./sources/http.ts";
import type { SourceRef } from "./types.ts";
import { DEFAULT_EXPLORER_BASE } from "./sources/explorer.ts";

export type Cohort = {
  status: string;
  sampled: number;
  /** True when the sample hit the page cap, so the real population is larger. */
  capped: boolean;
  depositLanded: number;
  /** Landed, no destination transaction, and no refund fee charged. */
  unresolved: number;
  unresolvedNotionalUsd: number;
  largestUnresolvedUsd: number;
  ageDaysP50: number | null;
  ageDaysMax: number | null;
};

export type Study = {
  at: string;
  windowNote: string;
  cohorts: Cohort[];
  sources: SourceRef[];
  caveats: string[];
};

type Raw = Record<string, unknown>;

const PAGE_CAP = 1000;

function num(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function hashes(value: unknown): number {
  return Array.isArray(value) ? value.length : 0;
}

function percentile(sorted: number[], p: number): number | null {
  if (sorted.length === 0) return null;
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] ?? null;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function runStudy(params: {
  token: string;
  statuses?: string[];
  base?: string;
  limit?: number;
  /** The documented explorer limit is one request every five seconds. */
  pauseMs?: number;
}): Promise<Study> {
  const base = params.base ?? DEFAULT_EXPLORER_BASE;
  const statuses = params.statuses ?? ["FAILED", "PROCESSING"];
  const limit = params.limit ?? PAGE_CAP;
  const sources: SourceRef[] = [];
  const cohorts: Cohort[] = [];
  const now = Date.now();

  for (const [index, status] of statuses.entries()) {
    if (index > 0) await sleep(params.pauseMs ?? 5500);

    const url = new URL("/api/v0/transactions", base);
    url.searchParams.set("numberOfTransactions", String(limit));
    url.searchParams.set("statuses", status);

    const res = await readJson<unknown>({
      name: `intents.explorer.cohort:${status}`,
      url: url.toString(),
      headers: { Authorization: `Bearer ${params.token}` },
      timeoutMs: 45_000,
    });
    sources.push(res.source);
    if (!res.ok) continue;

    const rows: Raw[] = Array.isArray(res.data) ? (res.data as Raw[]) : [];
    const landed = rows.filter((r) => hashes(r.originChainTxHashes) > 0);
    const unresolved = landed.filter(
      (r) => hashes(r.destinationChainTxHashes) === 0 && (!r.refundFee || r.refundFee === "0"),
    );
    const ages = unresolved
      .map((r) => (now - new Date(String(r.createdAt)).getTime()) / 86_400_000)
      .filter((d) => Number.isFinite(d))
      .sort((a, b) => a - b);

    cohorts.push({
      status,
      sampled: rows.length,
      capped: rows.length >= limit,
      depositLanded: landed.length,
      unresolved: unresolved.length,
      unresolvedNotionalUsd: unresolved.reduce((s, r) => s + num(r.amountInUsd), 0),
      largestUnresolvedUsd: unresolved.reduce((m, r) => Math.max(m, num(r.amountInUsd)), 0),
      ageDaysP50: percentile(ages, 0.5),
      ageDaysMax: ages.at(-1) ?? null,
    });
  }

  return {
    at: new Date().toISOString(),
    windowNote:
      "Cohorts are the most recent transactions the explorer returns for each status, newest first.",
    cohorts,
    sources,
    caveats: [
      "A cohort marked capped hit the page limit, so the real population is at least this large.",
      "Notional is the quoted USD value at creation time, not a realised loss.",
      "A deposit counts as landed only when an origin-chain transaction is recorded. Most failed quotes never received one and are excluded.",
      "Unresolved means no destination transaction and no refund fee charged. Some may still settle, as one case in this repo did after sixteen days.",
      "No addresses, amounts per user, or identifiers are retained. Only counts and aggregates.",
    ],
  };
}

export function renderStudy(study: Study): string {
  const out: string[] = [];
  out.push(`Intents swap cohorts, measured ${study.at.slice(0, 19)}Z`);
  out.push("-".repeat(78));
  out.push(
    "status".padEnd(12) +
      "sampled".padEnd(10) +
      "landed".padEnd(9) +
      "unresolved".padEnd(12) +
      "notional".padEnd(12) +
      "age p50",
  );
  for (const c of study.cohorts) {
    out.push(
      (c.status + (c.capped ? "*" : "")).padEnd(12) +
        String(c.sampled).padEnd(10) +
        String(c.depositLanded).padEnd(9) +
        String(c.unresolved).padEnd(12) +
        ("$" + Math.round(c.unresolvedNotionalUsd).toLocaleString("en-US")).padEnd(12) +
        (c.ageDaysP50 === null ? "n/a" : c.ageDaysP50.toFixed(0) + "d"),
    );
  }
  out.push("-".repeat(78));
  if (study.cohorts.some((c) => c.capped)) out.push("* hit the page cap, so the population is larger");
  for (const caveat of study.caveats) out.push("note  " + caveat);
  return out.join("\n");
}
