// What a watcher compares between two checks of the same swap. Pure, so it is tested like the rules.
import { createHash } from "node:crypto";
import type { DeliveryProof } from "./types.ts";
import { canonicalJson, type Receipt } from "./receipt.ts";

function proofState(p?: DeliveryProof) {
  return p ? { verified: p.verified, amount: p.deliveredFormatted, tx: p.tx, inconclusive: p.inconclusive === true } : null;
}

/**
 * A fingerprint of what the receipt says happened, leaving out read times and sources. The full
 * receipt fingerprint changes on every run because it covers when each source was read; this one
 * changes only when the evidence or the verdict does, so it is what a notification keys on.
 */
export function evidenceState(r: Receipt): string {
  const e = r.evidence;
  const state = {
    label: r.verdict.label,
    rule: r.verdict.rule,
    status: e.status ?? null,
    refundedAmount: e.refundedAmount ?? null,
    destinationTxs: e.destinationChainTxHashes,
    origin: proofState(e.origin),
    delivery: proofState(e.delivery),
  };
  return createHash("sha256").update(canonicalJson(state)).digest("hex");
}

/** True when nothing further can change the answer, so watching can stop. */
export function isFinal(r: Receipt): boolean {
  if (r.verdict.label === "REFUNDED_OK") return true;
  return r.verdict.label === "DELIVERED" && r.evidence.delivery?.verified === true;
}

/** The two lines a notification shows when a watched swap's evidence changes. */
export function describeChange(previousLabel: string | undefined, next: Receipt): { title: string; body: string } {
  const label = next.verdict.label.replace(/_/g, " ");
  const title =
    previousLabel && previousLabel !== next.verdict.label
      ? `${previousLabel.replace(/_/g, " ")} is now ${label}`
      : `New evidence: ${label}`;
  return { title, body: next.verdict.summary };
}
