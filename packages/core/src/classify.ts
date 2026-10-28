import type { Evidence } from "./types.ts";
import { CONFIDENTIAL_TREASURY, type DeliveryProof } from "./types.ts";
import { LABEL_HEADLINE, type Verdict, type Label } from "./labels.ts";
import { formatUnits } from "./sources/http.ts";

const ALWAYS_LIMIT =
  "Public data only. Solver internal state and private shard balances are not visible.";

// Quoted from docs.near-intents.org/integration/market-makers/confidential-intents, read 2026-10-27.
const FAR_LIMIT =
  "Private here means hidden from public indexers. NEAR's documentation describes FAR as a permissioned instance of the NEAR protocol run by a small validator set, with a private RPC, so those validators can see what the public cannot.";

function group(amount: string): string {
  const [whole, frac] = amount.split(".");
  const grouped = whole!.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const trimmed = frac?.replace(/0+$/, "");
  return trimmed ? `${grouped}.${trimmed}` : grouped;
}

// docs.near-intents.org/changelog/overview, entry of 27 October 2026.
const CONFIDENTIAL_ONLY_FROM = "2026-10-27T00:00:00.000Z";
const PRIVATE_MIDDLE_LIMIT =
  "NEAR's changelog says 1Click swaps roll out as confidential only from 27 October 2026, settling on the NEAR Private Shard. On such a swap the exchange itself has no public record. Only its two ends do, and those are what this receipt reads.";

/** The earliest public timestamp this swap left, used to place it before or after a change. */
function swapTime(e: Evidence): string | undefined {
  return e.chain.origin?.blockTimeIso ?? e.chain.nearTxTimeIso ?? e.chain.delivery?.blockTimeIso;
}

/** One line for a transfer read on its own chain. */
function proofLine(proof: DeliveryProof, to: string): string {
  const where = proof.blockNumber ? ` in block ${proof.blockNumber}` : "";
  const when = proof.blockTimeIso ? ` at ${proof.blockTimeIso}` : "";
  const amount = proof.deliveredFormatted
    ? `${group(proof.deliveredFormatted)}${proof.symbol ? " " + proof.symbol : ""}`
    : "the expected token";
  return `Read independently from ${proof.chain}: ${amount} reached ${to}${where}${when}, receipt status ${proof.receiptStatus ?? "unknown"}.`;
}

/** Names the public indexes that were asked and what they answered, and nothing more. */
function indexBasis(e: Evidence): string[] {
  const out: string[] = [];
  const explorer = e.sources.find((s) => s.name === "intents.explorer.search");
  if (explorer) {
    const empty = e.notes.some((n) => n.startsWith("The Explorer API returned no swap matching"));
    out.push(
      !explorer.ok
        ? "The Intents Explorer could not be searched."
        : empty
          ? "The Intents Explorer was searched and returned no record of this swap."
          : "The Intents Explorer was searched and did not resolve this swap to a deposit address.",
    );
  }
  if (!e.status.available) {
    const called = e.sources.some((s) => s.name.startsWith("1click.status"));
    out.push(
      called
        ? `The 1Click status endpoint was called and returned no status. ${e.status.reason}`
        : "The 1Click status endpoint was not called, because no deposit address was found.",
    );
  }
  return out;
}

/** True when the destination chain answered and its answer does not show the delivery. */
function contradicted(e: Evidence): boolean {
  const proof = e.chain.delivery;
  return proof !== undefined && !proof.verified && proof.receiptStatus !== undefined && !proof.inconclusive;
}

/** Compares what arrived on chain with what the quote promised, in the token's own units. */
function reconcile(e: Evidence): { line: string; belowMinimum: boolean } | undefined {
  const proof = e.chain.delivery;
  if (!e.status.available || !proof?.verified || !proof.deliveredRaw) return undefined;
  if (!e.status.quotedAmountOut || proof.decimals === undefined) return undefined;
  const quoted = BigInt(e.status.quotedAmountOut);
  if (quoted === 0n) return undefined;
  const delivered = BigInt(proof.deliveredRaw);
  const unit = proof.symbol ? ` ${proof.symbol}` : "";
  const fmt = (raw: bigint) => group(formatUnits(raw.toString(), proof.decimals!)) + unit;
  const gap = quoted - delivered;
  const pct = (Math.abs(Number((gap * 1_000_000n) / quoted)) / 10_000).toFixed(2);
  const min = e.status.minAmountOut ? BigInt(e.status.minAmountOut) : undefined;
  const belowMinimum = min !== undefined && delivered < min;
  const side = pct === "0.00" ? "matching the quote" : gap >= 0n ? `${pct}% under the quote` : `${pct}% over the quote`;
  const floor =
    min === undefined
      ? "."
      : belowMinimum
        ? `, and below its guaranteed minimum of ${fmt(min)}.`
        : `, within its guaranteed minimum of ${fmt(min)}.`;
  return {
    line: `The quote promised ${fmt(quoted)} and ${fmt(delivered)} arrived, ${side}${floor}`,
    belowMinimum,
  };
}

function isZero(amount?: string | null): boolean {
  if (amount === undefined || amount === null || amount.trim() === "") return true;
  const n = Number(amount);
  return Number.isFinite(n) ? n === 0 : /^0+(\.0+)?$/.test(amount.trim());
}

function depositLanded(e: Evidence): boolean {
  if (e.chain.deposits.length > 0) return true;
  if (e.chain.creditedTo) return true;
  return e.status.available && e.status.originChainTxHashes.length > 0;
}

function baseLimits(e: Evidence): string[] {
  const limits = [ALWAYS_LIMIT];
  if (!e.status.available) limits.push(`The swap status was not read. ${e.status.reason}`);
  if (!e.chain.checked) {
    limits.push("Chain evidence was not gathered, so delivery could not be checked independently.");
  }
  return limits;
}

type Rule = {
  id: string;
  applies: (e: Evidence) => boolean;
  /** A rule may word its own summary when the label alone would say too much. */
  build: (e: Evidence) => Omit<Verdict, "rule" | "headline" | "summary"> & { summary?: string };
};

// Ordered. First match wins, so narrow cases are declared before broad ones.
const RULES: Rule[] = [
  {
    id: "locked-out/refund-timelock-exceeds-docs",
    applies: (e) => {
      const c = e.connector;
      if (!c || c.unsafeRefundTimelockSec === undefined) return false;
      if (c.unsafeRefundTimelockSec <= c.documentedTimelockSec * 10) return false;
      // The long timer only binds a deposit that set no refund address.
      if (!e.status.available || e.status.refundTo) return false;
      // A settled swap, or one already refunded, needs no refund path at all.
      if (e.status.status === "SUCCESS") return false;
      if (e.status.status === "REFUNDED" && (!isZero(e.status.refundedAmount) || e.chain.refundTx)) {
        return false;
      }
      return true;
    },
    build: (e) => {
      const c = e.connector!;
      const years = (c.unsafeRefundTimelockSec! / 31_536_000).toFixed(1);
      const docDays = (c.documentedTimelockSec / 86_400).toFixed(0);
      const basis = [
        `A deposit with no refund address falls under unsafe_refund_timelock_sec on ${c.contract}, which reads ${c.unsafeRefundTimelockSec} seconds, about ${years} years.`,
        `The published recovery guide for this path states ${docDays} days.`,
      ];
      if (c.safeRefundTimelockSec !== undefined) {
        const safeDays = (c.safeRefundTimelockSec / 86_400).toFixed(0);
        basis.push(
          `The same contract refunds after ${safeDays} days when a refund address was set, so the long timer applies only to deposits without one.`,
        );
      }
      if (c.requiredRefundDepositNear) {
        basis.push(
          `Requesting the refund costs ${c.requiredRefundDepositNear} NEAR, which is not returned.`,
        );
      }
      return {
        label: "LOCKED_OUT",
        basis,
        limits: [
          ...baseLimits(e),
          "The timelock can be changed again by governance, so re-read it before acting.",
        ],
        next: "Do not pay the refund request fee expecting a quick return. Set a refund address on future deposits and raise this with the connector maintainers.",
      };
    },
  },
  {
    id: "wrong-door/asset-or-chain-mismatch",
    applies: (e) =>
      e.chain.assetMismatch !== undefined ||
      (e.status.available && e.status.status === "INCOMPLETE_DEPOSIT"),
    build: (e) => {
      const basis: string[] = [];
      const m = e.chain.assetMismatch;
      if (m) {
        basis.push(
          `The deposit address received ${m.observed} on ${m.chain} but the quote was issued for ${m.expected}.`,
        );
      }
      if (e.status.available && e.status.status === "INCOMPLETE_DEPOSIT") {
        basis.push(
          "The 1Click status reads INCOMPLETE_DEPOSIT, meaning the deposit did not match the quote.",
        );
      }
      if (e.chain.unspentAtDepositAddress) {
        const u = e.chain.unspentAtDepositAddress;
        basis.push(`${u.amount} ${u.token} is still unspent at the deposit address on ${u.chain}.`);
      }
      return {
        label: "WRONG_DOOR",
        basis,
        limits: [
          ...baseLimits(e),
          "Whether the operator can reach those funds is not observable from outside.",
        ],
        next: "This path is documented as a manual refund. Attach this receipt to a support request and do not retry the swap.",
      };
    },
  },
  {
    id: "stranded/terminal-with-no-refund",
    applies: (e) => {
      if (!e.status.available) return false;
      const terminal = e.status.status === "FAILED" || e.status.status === "REFUNDED";
      if (!terminal) return false;
      // A source that cannot report a refund amount proves nothing by its absence.
      if (e.status.status === "REFUNDED" && e.status.refundAmountKnown === false) return false;
      const refunded = !isZero(e.status.refundedAmount) || e.chain.refundTx !== undefined;
      return !refunded && depositLanded(e);
    },
    build: (e) => {
      const st = e.status.available ? e.status : undefined;
      const basis: string[] = [];
      const credited = e.chain.creditedTo;
      if (credited) {
        basis.push(
          `The deposit is confirmed on chain and ${credited.amount} ${credited.token} was credited to ${credited.account}.`,
        );
      } else if (e.chain.deposits.length > 0) {
        const d = e.chain.deposits[0]!;
        basis.push(`The deposit is confirmed on chain: ${d.amount} ${d.token} in ${d.tx.hash}.`);
      }
      if (st) {
        basis.push(`The 1Click status reads ${st.status}, last changed ${st.updatedAt}.`);
        basis.push(
          `The refund field reads ${st.refundedAmount ?? "0"} and the reason reads ${st.refundReason ?? "null"}.`,
        );
      }
      if (!e.chain.refundTx) basis.push("No refund transaction was observed on any public ledger.");
      return {
        label: "STRANDED",
        basis,
        limits: [
          ...baseLimits(e),
          "A refund issued off this path, or already in progress internally, would not be visible here.",
        ],
        next: "A manual refund is required. Attach this receipt to the existing support request, or open one, and keep the correlation id with it.",
      };
    },
  },
  {
    id: "refunded/returned-to-refund-address",
    applies: (e) =>
      e.status.available &&
      e.status.status === "REFUNDED" &&
      (!isZero(e.status.refundedAmount) || e.chain.refundTx !== undefined),
    build: (e) => {
      const st = e.status.available ? e.status : undefined;
      const basis: string[] = [];
      if (st) {
        basis.push(
          `The 1Click status reads REFUNDED with ${st.refundedAmount ?? "an unstated amount"} returned.`,
        );
        if (st.refundReason) basis.push(`The stated reason is ${st.refundReason}.`);
      }
      if (e.chain.refundTx) basis.push(`A refund transaction was observed: ${e.chain.refundTx.hash}.`);
      return {
        label: "REFUNDED_OK",
        basis,
        limits: [...baseLimits(e), "Network fees already spent are not returned and are not counted here."],
        next: "No action needed beyond confirming the amount landed at your refund address. Compare it against the quote before retrying.",
      };
    },
  },
  {
    id: "shielded/success-not-provable-from-public-data",
    applies: (e) => {
      if (!e.status.available) return false;
      const confidential =
        e.status.recipientType === "CONFIDENTIAL_INTENTS" ||
        e.status.depositType === "CONFIDENTIAL_INTENTS";
      return (
        confidential && e.status.status === "SUCCESS" && e.status.destinationChainTxHashes.length === 0
      );
    },
    build: (e) => {
      const basis: string[] = [
        "The 1Click status reads SUCCESS.",
        "The route is confidential, so settlement happens on a private shard rather than a public chain.",
        "No destination transaction is published, which is the documented behaviour for this route.",
      ];
      if (e.chain.recipientBalance) {
        const b = e.chain.recipientBalance;
        basis.push(`The publicly visible balance of ${b.account} reads ${b.amount} ${b.token}.`);
      }
      return {
        label: "SHIELDED_UNPROVEN",
        basis,
        limits: [
          ALWAYS_LIMIT,
          FAR_LIMIT,
          "A zero public balance is expected on this route and is not by itself evidence of loss.",
          "Only an internal trace against the private shard can confirm or refute delivery.",
        ],
        next: "Do not treat this as a loss. Ask the operator for an internal trace, quoting the correlation id, and supply your own authenticated balance read as counter-evidence.",
      };
    },
  },
  {
    // Confidential routes leave no record in the status endpoint or the Explorer, so the only
    // public evidence is the signed intent itself. Never fires over a proven delivery or refund.
    id: "shielded/transfer-to-confidential-treasury",
    applies: (e) => {
      const shielded = (e.chain.intentTransfers ?? []).some((t) => t.receiver === CONFIDENTIAL_TREASURY);
      if (!shielded) return false;
      if (e.chain.delivery?.verified) return false;
      if (e.status.available && e.status.status === "REFUNDED") return false;
      return true;
    },
    build: (e) => {
      const transfers = (e.chain.intentTransfers ?? []).filter((t) => t.receiver === CONFIDENTIAL_TREASURY);
      const basis = transfers.map(
        (t) =>
          `A signed intent transferred ${t.amountFormatted ?? t.amountRaw} ${t.token} to the documented Confidential Intents treasury${t.signer ? `, signed by ${t.signer}` : ""}.`,
      );
      basis.push(
        "That transfer is the public shield step: the bridge mints matching tokens on the private FAR chain.",
      );
      if (e.chain.nearTxTimeIso) basis.push(`The shield landed on NEAR at ${e.chain.nearTxTimeIso}.`);
      basis.push(...indexBasis(e));
      return {
        label: "SHIELDED_UNPROVEN",
        basis,
        limits: [
          ALWAYS_LIMIT,
          FAR_LIMIT,
          "What happens after the shield lives on the private FAR chain, which no public record can see.",
          "This proves the money was shielded. It does not prove it was delivered, and it does not prove it was lost.",
        ],
        next: "If you meant to send to a public destination, this may be a misroute: ask the operator for an internal trace, quoting this NEAR transaction. If you chose a confidential route, keep this receipt as evidence of the shield.",
      };
    },
  },
  {
    // The operator published a destination hash, but that chain's own receipt does not show the
    // quoted token reaching the quoted recipient. That is not a delivery, whatever the status says.
    id: "contradicted/destination-chain-disagrees",
    applies: (e) =>
      e.status.available &&
      e.status.status === "SUCCESS" &&
      e.status.destinationChainTxHashes.length > 0 &&
      contradicted(e),
    build: (e) => {
      const proof = e.chain.delivery!;
      const tx = e.status.available ? e.status.destinationChainTxHashes[0]! : undefined;
      const basis = ["The 1Click status reads SUCCESS."];
      if (tx) basis.push(`A destination transaction is published: ${tx.hash} on ${tx.chain}.`);
      basis.push(
        `Read independently from ${proof.chain}: receipt status ${proof.receiptStatus}. ${proof.reason ?? "The receipt does not show the quoted token reaching the quoted recipient."}`,
      );
      return {
        label: "UNDETERMINED",
        summary: `The operator reports this delivered, but ${titleCase(proof.chain)} does not show the money arriving.`,
        basis,
        limits: [
          ALWAYS_LIMIT,
          "A delivery made by a different transaction than the one published would not be seen here.",
        ],
        next: "Ask the operator for an internal trace and attach this receipt: the transaction they published does not move the quoted token to the quoted recipient.",
      };
    },
  },
  {
    id: "delivered/destination-transaction-observed",
    applies: (e) =>
      e.status.available && e.status.status === "SUCCESS" && e.status.destinationChainTxHashes.length > 0,
    build: (e) => {
      const basis: string[] = ["The 1Click status reads SUCCESS."];
      if (e.status.available) {
        const tx = e.status.destinationChainTxHashes[0]!;
        basis.push(`A destination transaction is published: ${tx.hash} on ${tx.chain}.`);
      }
      const limits = [ALWAYS_LIMIT];
      const origin = e.chain.origin;
      if (origin?.verified) basis.push(proofLine(origin, "the deposit address"));
      else if (origin?.reason) basis.push(`The deposit could not be confirmed on ${origin.chain}: ${origin.reason}`);
      const proof = e.chain.delivery;
      const unreadable = e.chain.deliveryUnreadable;
      if (proof?.verified) {
        basis.push(proofLine(proof, "the quoted recipient"));
      } else if (proof?.reason) {
        basis.push(
          proof.inconclusive
            ? `The destination receipt was read on ${proof.chain} but cannot show this payout: ${proof.reason}`
            : `The destination receipt could not be read on ${proof.chain}: ${proof.reason}`,
        );
        limits.push("Delivery rests on the operator record alone until the destination chain can show it.");
      } else if (unreadable) {
        limits.push(`${unreadable.reason} Delivery rests on the operator record alone.`);
      } else {
        limits.push("The destination receipt was not read, so delivery rests on the operator record alone.");
      }
      const at = swapTime(e);
      if (at && at >= CONFIDENTIAL_ONLY_FROM) limits.push(PRIVATE_MIDDLE_LIMIT);
      const amounts = reconcile(e);
      if (amounts) basis.push(amounts.line);
      else limits.push("The amount received was not reconciled against the quoted amount.");
      return {
        label: "DELIVERED",
        basis,
        limits,
        next: amounts?.belowMinimum
          ? "Less arrived than the quote guaranteed. Raise it with the operator and attach this receipt."
          : "Nothing to do. Keep this receipt if you need to evidence the settlement later.",
      };
    },
  },
  {
    id: "in-flight/not-yet-terminal",
    applies: (e) =>
      e.status.available &&
      ["PENDING_DEPOSIT", "KNOWN_DEPOSIT_TX", "PROCESSING"].includes(e.status.status),
    build: (e) => ({
      label: "IN_FLIGHT",
      basis: e.status.available
        ? [`The 1Click status reads ${e.status.status}, last changed ${e.status.updatedAt}.`]
        : [],
      limits: [
        ...baseLimits(e),
        "A swap that sits in this state for hours is worth re-checking, but it is not yet a failure.",
      ],
      next: "Re-run this check later. Note the deposit address and the time the status last changed.",
    }),
  },
];

export type Classification = {
  verdict: Verdict;
  rulesEvaluated: string[];
};

function titleCase(chain: string): string {
  return chain.charAt(0).toUpperCase() + chain.slice(1);
}

/** Whole days between two ISO timestamps, or null if either is missing. */
function daysBetween(from?: string, to?: string): number | null {
  if (!from || !to) return null;
  const ms = new Date(to).getTime() - new Date(from).getTime();
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms / 86_400_000) : null;
}

/**
 * One plain sentence a non-specialist can read. Built only from observed evidence, so it can never
 * say more than the verdict's basis supports.
 */
function summarize(label: Label, e: Evidence): string {
  const proof = e.chain.delivery;
  switch (label) {
    case "DELIVERED": {
      const origin = e.chain.origin;
      if (proof?.verified) {
        const started = origin?.blockTimeIso ?? e.chain.deposits[0]?.blockTimestampIso ?? e.chain.nearTxTimeIso;
        const days = daysBetween(started, proof.blockTimeIso);
        // Rounded to whole days, so say so: 15 days 19 hours reads as about 16.
        const when = days === null ? "" : days === 0 ? " the same day" : ` about ${days} day${days === 1 ? "" : "s"} after the deposit`;
        if (reconcile(e)?.belowMinimum) {
          return `Delivered on ${titleCase(proof.chain)}${when}, but less arrived than the quote guaranteed.`;
        }
        if (origin?.verified) {
          return `Delivered on ${titleCase(proof.chain)}${when}. Both ends proven on their own chains: the deposit on ${titleCase(origin.chain)}, the delivery on ${titleCase(proof.chain)}.`;
        }
        return `Delivered on ${titleCase(proof.chain)}${when}, and proven on that chain rather than taken on trust.`;
      }
      if (proof?.inconclusive) {
        return `The operator reports this delivered. The payout on ${titleCase(proof.chain)} was made inside a contract call, which public endpoints cannot show.`;
      }
      if (proof) {
        return `The operator reports this delivered. ${titleCase(proof.chain)} could not be reached to confirm it.`;
      }
      if (e.chain.deliveryUnreadable) {
        return `The operator reports this delivered. ${e.chain.deliveryUnreadable.reason}`;
      }
      return "The operator reports this delivered. The destination chain was not checked independently.";
    }
    case "REFUNDED_OK":
      return "The swap did not go through, and the money went back to the refund address.";
    case "STRANDED":
      return "The deposit arrived and the swap failed, but nothing has been refunded.";
    case "WRONG_DOOR":
      return "This was sent to the wrong chain or asset for its quote, so the refund is manual.";
    case "LOCKED_OUT":
      return "A refund exists on paper, but this deposit set no refund address and is behind a very long timer.";
    case "SHIELDED_UNPROVEN":
      return "The money was moved onto NEAR's private route. Public records cannot prove whether it arrived, or that it was lost.";
    case "IN_FLIGHT":
      return "Still in progress. Nothing has failed yet.";
    default:
      return "There is not enough public evidence to say what happened.";
  }
}

export function classify(evidence: Evidence): Classification {
  const evaluated: string[] = [];
  for (const rule of RULES) {
    evaluated.push(rule.id);
    if (!rule.applies(evidence)) continue;
    const partial = rule.build(evidence);
    return {
      verdict: {
        ...partial,
        rule: rule.id,
        headline: LABEL_HEADLINE[partial.label],
        summary: partial.summary ?? summarize(partial.label, evidence),
      },
      rulesEvaluated: evaluated,
    };
  }
  return {
    verdict: {
      label: "UNDETERMINED",
      headline: LABEL_HEADLINE.UNDETERMINED,
      summary: evidence.candidates
        ? `This is a wallet, not a swap. It appears in ${evidence.candidates.length} swap${evidence.candidates.length === 1 ? "" : "s"}.`
        : summarize("UNDETERMINED", evidence),
      rule: evidence.candidates ? "lookup/wallet-not-swap" : "fallback/no-rule-applied",
      basis: evidence.notes.length > 0 ? [...evidence.notes] : ["No rule matched the evidence gathered."],
      limits: [
        ...baseLimits(evidence),
        "An unclassified deposit is a gap in these rules, not proof that the swap is healthy.",
      ],
      next: evidence.candidates
        ? "Pick the swap you mean from the list. Quittance checks one swap at a time, by its deposit address or any of its transactions."
        : !evidence.status.available && !evidence.chain.checked
          ? "No public index has a record of this. The usual reasons are a quote that expired before any deposit, a mistyped address, or a confidential route, which public indexers do not show. If the money left a NEAR account, paste that NEAR transaction hash instead; Quittance can read a shield from it."
          : "Confirm the deposit address is the one the quote issued, and supply the NEAR transaction hash if you have it. If the evidence still does not match a known pattern, file it as a new case.",
    },
    rulesEvaluated: evaluated,
  };
}

export const RULE_IDS = RULES.map((r) => r.id);
