import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { classify } from "../src/classify.ts";
import { buildReceipt, canonicalJson, renderText } from "../src/receipt.ts";
import type { Evidence } from "../src/types.ts";
import { LABELS } from "../src/labels.ts";
import { tronToHex } from "../src/sources/tron.ts";

const FIXTURE_DIR = join(import.meta.dirname, "../../../fixtures");

type Fixture = {
  case: { id: string; expectedLabel: string; title: string; frozenAt: string };
  evidence: Evidence;
};

function loadFixtures(): Fixture[] {
  return readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(FIXTURE_DIR, f), "utf8")) as Fixture);
}

const fixtures = loadFixtures();

test("every fixture is classified as its recorded label", () => {
  assert.ok(fixtures.length >= 17, "expected the full frozen case set");
  for (const fixture of fixtures) {
    const { verdict } = classify(fixture.evidence);
    assert.equal(
      verdict.label,
      fixture.case.expectedLabel,
      `${fixture.case.id} expected ${fixture.case.expectedLabel} but got ${verdict.label}`,
    );
  }
});

test("every verdict states a basis, a limit and a next action", () => {
  for (const fixture of fixtures) {
    const { verdict } = classify(fixture.evidence);
    assert.ok(verdict.basis.length > 0, `${fixture.case.id} has no basis`);
    assert.ok(verdict.limits.length > 0, `${fixture.case.id} states no limits`);
    assert.ok(verdict.next.length > 10, `${fixture.case.id} has no next action`);
    assert.ok(LABELS.includes(verdict.label), `${fixture.case.id} used an unknown label`);
  }
});

test("the shielded case never asserts a loss", () => {
  const shielded = fixtures.find((f) => f.case.id === "04-shielded-unproven");
  assert.ok(shielded, "shielded fixture missing");
  const { verdict } = classify(shielded.evidence);
  const prose = [verdict.headline, ...verdict.basis, ...verdict.limits, verdict.next]
    .join(" ")
    .toLowerCase();
  for (const forbidden of ["stolen", "lost your", "funds are gone", "false success"]) {
    assert.ok(!prose.includes(forbidden), `shielded verdict must not claim: ${forbidden}`);
  }
  assert.ok(
    verdict.limits.some((l) => l.includes("not by itself evidence of loss")),
    "shielded verdict must state that a zero public balance is expected",
  );
});

test("an unreadable status is reported with the operator's own reason", () => {
  const unknown = fixtures.find((f) => f.case.id === "07-unknown-to-operator");
  assert.ok(unknown, "unknown-to-operator fixture missing");
  const { verdict } = classify(unknown.evidence);
  assert.ok(verdict.limits.some((l) => l.includes("The swap status was not read")));
  assert.ok(verdict.limits.some((l) => l.includes("no record of this deposit address")));
});

test("no verdict claims that reading a status needs a partner key", () => {
  for (const fixture of fixtures) {
    const { verdict } = classify(fixture.evidence);
    const prose = [verdict.headline, ...verdict.basis, ...verdict.limits, verdict.next].join(" ");
    assert.ok(
      !/partner key/i.test(prose),
      `${fixture.case.id} claims a partner key is needed; the endpoint answers without one`,
    );
  }
});

test("the long bitcoin timer only binds a deposit that set no refund address", () => {
  const delivered = fixtures.find((f) => f.case.id === "08-btc-delivered-not-locked-out");
  const refundSet = fixtures.find((f) => f.case.id === "09-btc-refund-address-set");
  assert.ok(delivered && refundSet, "bitcoin regression fixtures missing");

  // Both carry the 100 year connector config, so only the extra conditions can keep them apart.
  assert.equal(delivered.evidence.connector?.unsafeRefundTimelockSec, 3153600000);
  assert.equal(refundSet.evidence.connector?.unsafeRefundTimelockSec, 3153600000);
  assert.notEqual(classify(delivered.evidence).verdict.label, "LOCKED_OUT");
  assert.notEqual(classify(refundSet.evidence).verdict.label, "LOCKED_OUT");

  const locked = fixtures.find((f) => f.case.id === "03-locked-out-btc");
  assert.ok(locked);
  assert.equal(classify(locked.evidence).verdict.label, "LOCKED_OUT");
  assert.equal(locked.evidence.status.available ? locked.evidence.status.refundTo : "x", undefined);
});

test("fingerprints are stable across runs and change with the evidence", () => {
  const fixture = fixtures[0]!;
  const at = "2026-11-01T00:00:00.000Z";
  const a = buildReceipt(fixture.evidence, at);
  const b = buildReceipt(fixture.evidence, at);
  assert.equal(a.fingerprint, b.fingerprint);

  const mutated: Evidence = {
    ...fixture.evidence,
    notes: [...fixture.evidence.notes, "an extra observation"],
  };
  assert.notEqual(buildReceipt(mutated, at).fingerprint, a.fingerprint);
});

test("canonical json sorts keys so two orderings hash the same", () => {
  assert.equal(canonicalJson({ b: 1, a: 2 }), canonicalJson({ a: 2, b: 1 }));
  assert.equal(canonicalJson({ a: undefined, b: 1 }), '{"b":1}');
});

test("the rendered receipt carries the label, the rule and the fingerprint", () => {
  for (const fixture of fixtures) {
    const receipt = buildReceipt(fixture.evidence, "2026-11-01T00:00:00.000Z");
    const text = renderText(receipt);
    assert.ok(text.includes(receipt.verdict.label), `${fixture.case.id} receipt lacks its label`);
    assert.ok(text.includes(receipt.verdict.rule), `${fixture.case.id} receipt lacks its rule id`);
    assert.ok(text.includes(receipt.fingerprint), `${fixture.case.id} receipt lacks its fingerprint`);
    for (const line of text.split("\n")) {
      assert.ok(line.length <= 100, `${fixture.case.id} receipt line too wide: ${line.length}`);
    }
  }
});

test("tron addresses decode to the hex the chain logs carry", () => {
  // USDT on TRON, as the token list names it and as its Transfer logs record it.
  assert.equal(tronToHex("TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t"), "41a614f803b6fd780986a42c78ec9c7f77e6ded13c");
  assert.equal(tronToHex("not-base58-0OIl"), undefined);
});

test("the private middle is named only for swaps after the confidential switch", () => {
  const byId = (id: string) => fixtures.find((f) => f.case.id === id)!;
  const after = classify(byId("16-both-ends-proven-after-confidential-switch").evidence).verdict;
  const before = classify(byId("01-reported-stranded-actually-delivered").evidence).verdict;
  assert.ok(after.limits.some((l) => l.includes("NEAR Private Shard")), "a post-switch swap must name the private middle");
  assert.ok(!before.limits.some((l) => l.includes("NEAR Private Shard")), "a September swap predates the switch");
});

test("both ends are claimed only when both were read on their own chains", () => {
  for (const fixture of fixtures) {
    const v = classify(fixture.evidence).verdict;
    if (!v.summary.includes("Both ends proven")) continue;
    assert.ok(fixture.evidence.chain.origin?.verified, `${fixture.case.id} claims both ends without a proven deposit`);
    assert.ok(fixture.evidence.chain.delivery?.verified, `${fixture.case.id} claims both ends without a proven delivery`);
  }
});
