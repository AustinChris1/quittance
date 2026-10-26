import type { Evidence } from "./types.ts";
import { LABEL_HEADLINE, type Verdict } from "./labels.ts";

const ALWAYS_LIMIT =
  "Public data only. Solver internal state and private shard balances are not visible.";

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
  if (e.mode === "public-only") {
    limits.push("The 1Click status field was not read because no partner key was supplied.");
  }
  if (!e.chain.checked) {
    limits.push("Chain evidence was not gathered, so delivery could not be checked independently.");
  }
  return limits;
}

type Rule = {
  id: string;
  applies: (e: Evidence) => boolean;
  build: (e: Evidence) => Omit<Verdict, "rule" | "headline">;
};

// Ordered. First match wins, so narrow cases are declared before broad ones.
const RULES: Rule[] = [
  {
    id: "locked-out/refund-timelock-exceeds-docs",
    applies: (e) => {
      const c = e.connector;
      if (!c || c.unsafeRefundTimelockSec === undefined) return false;
      return c.unsafeRefundTimelockSec > c.documentedTimelockSec * 10;
    },
    build: (e) => {
      const c = e.connector!;
      const years = (c.unsafeRefundTimelockSec! / 31_536_000).toFixed(1);
      const docDays = (c.documentedTimelockSec / 86_400).toFixed(0);
      const basis = [
        `Connector ${c.contract} reports unsafe_refund_timelock_sec of ${c.unsafeRefundTimelockSec}, about ${years} years.`,
        `The published recovery guide for this path states ${docDays} days.`,
      ];
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
          "A zero public balance is expected on this route and is not by itself evidence of loss.",
          "Only an internal trace against the private shard can confirm or refute delivery.",
        ],
        next: "Do not treat this as a loss. Ask the operator for an internal trace, quoting the correlation id, and supply your own authenticated balance read as counter-evidence.",
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
      return {
        label: "DELIVERED",
        basis,
        limits: [ALWAYS_LIMIT, "The amount received was not reconciled against the quoted amount."],
        next: "Nothing to do. Keep this receipt if you need to evidence the settlement later.",
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

export function classify(evidence: Evidence): Classification {
  const evaluated: string[] = [];
  for (const rule of RULES) {
    evaluated.push(rule.id);
    if (!rule.applies(evidence)) continue;
    const partial = rule.build(evidence);
    return {
      verdict: { ...partial, rule: rule.id, headline: LABEL_HEADLINE[partial.label] },
      rulesEvaluated: evaluated,
    };
  }
  return {
    verdict: {
      label: "UNDETERMINED",
      headline: LABEL_HEADLINE.UNDETERMINED,
      rule: "fallback/no-rule-applied",
      basis: evidence.notes.length > 0 ? [...evidence.notes] : ["No rule matched the evidence gathered."],
      limits: [
        ...baseLimits(evidence),
        "An unclassified deposit is a gap in these rules, not proof that the swap is healthy.",
      ],
      next: "Re-run with a partner key if you have one. If the evidence still does not match a known pattern, file it as a new case.",
    },
    rulesEvaluated: evaluated,
  };
}

export const RULE_IDS = RULES.map((r) => r.id);
