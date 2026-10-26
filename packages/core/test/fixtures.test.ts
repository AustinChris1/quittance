import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { classify } from "../src/classify.ts";
import { buildReceipt, canonicalJson, renderText } from "../src/receipt.ts";
import type { Evidence } from "../src/types.ts";
import { LABELS } from "../src/labels.ts";

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
  assert.ok(fixtures.length >= 7, "expected the full frozen case set");
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

test("a verdict without a partner key says so in its limits", () => {
  const publicOnly = fixtures.find((f) => f.case.id === "07-public-only-undetermined");
  assert.ok(publicOnly, "public-only fixture missing");
  const { verdict } = classify(publicOnly.evidence);
  assert.ok(verdict.limits.some((l) => l.includes("partner key")));
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
