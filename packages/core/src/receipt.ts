import { createHash } from "node:crypto";
import type { Evidence, SourceRef } from "./types.ts";
import type { Verdict } from "./labels.ts";
import { classify } from "./classify.ts";

export const QUITTANCE_VERSION = "0.1.0";

export type Receipt = {
  quittance: { version: string; generatedAt: string };
  input: Evidence["input"];
  verdict: Verdict;
  evidence: {
    fetchedAt: string;
    mode: Evidence["mode"];
    correlationId?: string;
    status?: string;
    statusUpdatedAt?: string;
    refundedAmount?: string;
    refundReason?: string | null;
    depositType?: string;
    recipientType?: string;
    originChainTxHashes: string[];
    destinationChainTxHashes: string[];
    nearTxHashes: string[];
    creditedTo?: { account: string; token: string; amount: string };
    recipientBalance?: { account: string; token: string; amount: string };
    refundTx?: string;
    delivery?: Evidence["chain"]["delivery"];
    origin?: Evidence["chain"]["origin"];
    deliveryUnreadable?: Evidence["chain"]["deliveryUnreadable"];
    candidates?: Evidence["candidates"];
    connector?: Evidence["connector"];
    notes: string[];
  };
  sources: SourceRef[];
  /** sha256 over the canonical evidence and verdict, so two runs can be compared. */
  fingerprint: string;
};

/** Deterministic JSON with sorted keys, so the fingerprint is reproducible. */
export function canonicalJson(value: unknown): string {
  const walk = (v: unknown): unknown => {
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object") {
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(v as Record<string, unknown>).sort()) {
        const inner = (v as Record<string, unknown>)[key];
        if (inner === undefined) continue;
        out[key] = walk(inner);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(walk(value));
}

export function buildReceipt(evidence: Evidence, generatedAt = new Date().toISOString()): Receipt {
  const { verdict } = classify(evidence);
  const st = evidence.status.available ? evidence.status : undefined;

  const body: Omit<Receipt, "fingerprint" | "quittance"> = {
    input: evidence.input,
    verdict,
    evidence: {
      fetchedAt: evidence.fetchedAt,
      mode: evidence.mode,
      correlationId: st?.correlationId,
      status: st?.status,
      statusUpdatedAt: st?.updatedAt,
      refundedAmount: st?.refundedAmount,
      refundReason: st?.refundReason,
      depositType: st?.depositType,
      recipientType: st?.recipientType,
      originChainTxHashes: st?.originChainTxHashes.map((t) => t.hash) ?? [],
      destinationChainTxHashes: st?.destinationChainTxHashes.map((t) => t.hash) ?? [],
      nearTxHashes: st?.nearTxHashes ?? [],
      creditedTo: evidence.chain.creditedTo,
      recipientBalance: evidence.chain.recipientBalance,
      refundTx: evidence.chain.refundTx?.hash,
      delivery: evidence.chain.delivery,
      origin: evidence.chain.origin,
      deliveryUnreadable: evidence.chain.deliveryUnreadable,
      candidates: evidence.candidates,
      connector: evidence.connector,
      notes: evidence.notes,
    },
    sources: evidence.sources,
  };

  const fingerprint = createHash("sha256").update(canonicalJson(body)).digest("hex");
  return { quittance: { version: QUITTANCE_VERSION, generatedAt }, ...body, fingerprint };
}

const WIDTH = 78;
const KEY_COL = 19;
const MAX_TOKEN = 80;

function line(char = "-"): string {
  return char.repeat(WIDTH);
}

function row(key: string, value: string): string {
  const wrapped = wrap(value, WIDTH - KEY_COL);
  return wrapped
    .map((part, i) => (i === 0 ? key.padEnd(KEY_COL) + part : " ".repeat(KEY_COL) + part))
    .join("\n");
}

function wrap(text: string, width: number): string[] {
  // A Solana signature runs to 88 characters. Fingerprints and hashes up to 80 overflow the
  // column but stay whole, so they can be copied; only longer tokens are cut.
  const words = text
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((w) => (w.length <= MAX_TOKEN ? [w] : (w.match(new RegExp(`.{1,${MAX_TOKEN}}`, "g")) ?? [w])));
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current.length === 0) current = word;
    else if (current.length + 1 + word.length <= width) current += " " + word;
    else {
      lines.push(current);
      current = word;
    }
  }
  if (current.length > 0) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function shorten(hash: string, keep = 8): string {
  return hash.length > keep * 2 + 2 ? `${hash.slice(0, keep)}..${hash.slice(-4)}` : hash;
}

/** The human-readable artefact. Fixed width so it pastes into a ticket unchanged. */
export function renderText(receipt: Receipt): string {
  const e = receipt.evidence;
  const out: string[] = [];
  const header = "QUITTANCE RECEIPT";
  out.push(header + " ".repeat(Math.max(1, WIDTH - header.length - 30)) + `generated ${receipt.quittance.generatedAt.slice(0, 19)}Z`);
  out.push(line());

  if (receipt.input.depositAddress) out.push(row("deposit_address", receipt.input.depositAddress));
  if (receipt.input.memo) out.push(row("deposit_memo", receipt.input.memo));
  if (e.correlationId) out.push(row("correlation_id", e.correlationId));
  out.push(row("mode", e.mode === "authenticated" ? "with partner key" : "no partner key (endpoint answers anyway)"));
  out.push(
    row(
      "status",
      e.status
        ? `${e.status}${e.statusUpdatedAt ? `    last changed ${e.statusUpdatedAt.slice(0, 10)}` : ""}`
        : "not read, see LIMITS below",
    ),
  );
  if (e.depositType || e.recipientType) {
    out.push(row("route", `${e.depositType ?? "?"} -> ${e.recipientType ?? "?"}`));
  }
  out.push(row("refunded_amount", e.refundedAmount ?? "0"));
  out.push(row("refund_reason", e.refundReason ?? "null"));
  for (const c of e.candidates ?? []) {
    out.push(
      row(
        "swap",
        `${c.depositAddress}  ${c.status ?? "?"}  ${c.amountInFormatted ?? "?"} -> ${c.amountOutFormatted ?? "?"}  as ${c.role}  ${c.createdAt?.slice(0, 10) ?? ""}`,
      ),
    );
  }
  for (const h of e.originChainTxHashes) out.push(row("origin_chain_tx", shorten(h)));
  if (e.origin) {
    out.push(
      row(
        "deposit_proof",
        e.origin.verified
          ? `${e.origin.deliveredFormatted} ${e.origin.symbol ?? ""} on ${e.origin.chain}, block ${e.origin.blockNumber ?? "?"}`
          : `not confirmed on ${e.origin.chain}`,
      ),
    );
  }
  for (const h of e.nearTxHashes) out.push(row("near_tx", shorten(h)));
  if (e.creditedTo) {
    out.push(row("credited_to", `${e.creditedTo.account}    ${e.creditedTo.amount} ${e.creditedTo.token}`));
  }
  out.push(
    row(
      "destination_tx",
      e.destinationChainTxHashes.length > 0 ? e.destinationChainTxHashes.map(shorten).join(", ") : "none",
    ),
  );
  if (e.recipientBalance) {
    out.push(row("recipient_balance", `${e.recipientBalance.amount} ${e.recipientBalance.token}`));
  }
  if (e.refundTx) out.push(row("refund_tx", shorten(e.refundTx)));
  if (e.connector?.unsafeRefundTimelockSec !== undefined) {
    out.push(row("refund_timelock", `${e.connector.unsafeRefundTimelockSec} s on ${e.connector.contract}`));
  }

  out.push(line());
  out.push(row("LABEL", receipt.verdict.label));
  out.push(row("HEADLINE", receipt.verdict.headline));
  receipt.verdict.basis.forEach((b, i) => out.push(row(i === 0 ? "BASIS" : "", b)));
  out.push(row("NEXT", receipt.verdict.next));
  receipt.verdict.limits.forEach((l, i) => out.push(row(i === 0 ? "LIMITS" : "", l)));
  out.push(line());
  out.push(row("rule", receipt.verdict.rule));
  out.push(row("fingerprint", receipt.fingerprint));
  out.push(row("sources", String(receipt.sources.length) + " read, listed in the JSON receipt"));
  out.push(line());
  return out.join("\n");
}
