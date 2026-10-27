export const LABELS = [
  "DELIVERED",
  "REFUNDED_OK",
  "IN_FLIGHT",
  "STRANDED",
  "WRONG_DOOR",
  "LOCKED_OUT",
  "SHIELDED_UNPROVEN",
  "UNDETERMINED",
] as const;
export type Label = (typeof LABELS)[number];

/** The four headline failure states from the project brief. */
export const PROBLEM_LABELS: Label[] = ["STRANDED", "WRONG_DOOR", "LOCKED_OUT", "SHIELDED_UNPROVEN"];

export const LABEL_HEADLINE: Record<Label, string> = {
  DELIVERED: "Delivered. The destination transaction is on a public ledger.",
  REFUNDED_OK: "Refunded. The money went back to the refund address.",
  IN_FLIGHT: "Still moving. No failure to report yet.",
  STRANDED: "Your deposit arrived, the swap is marked failed, and nothing came back.",
  WRONG_DOOR: "Right idea, wrong place. The deposit does not match the quote it was made for.",
  LOCKED_OUT:
    "This deposit set no refund address, so recovering it falls behind a timer far longer than the guide states.",
  SHIELDED_UNPROVEN: "This swap is private. Public records cannot prove delivery either way.",
  UNDETERMINED: "Not enough evidence to classify this deposit.",
};

export type Verdict = {
  label: Label;
  headline: string;
  /** One plain sentence built from the evidence, never from a model. Nothing in it is inferred. */
  summary: string;
  rule: string;
  /** Facts that were actually observed, each one checkable. */
  basis: string[];
  /** What this verdict is not able to see. Always populated. */
  limits: string[];
  next: string;
};
