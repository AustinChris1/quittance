#!/usr/bin/env node
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { join, isAbsolute } from "node:path";
import { classify } from "../../../packages/core/src/classify.ts";
import { buildReceipt, renderText, verifyReceipt, type Receipt } from "../../../packages/core/src/receipt.ts";
import { gatherEvidence } from "../../../packages/core/src/gather.ts";
import { postReceipt } from "../../../packages/core/src/webhook.ts";
import { RULE_IDS } from "../../../packages/core/src/classify.ts";
import { runStudy, renderStudy } from "../../../packages/core/src/study.ts";
import { runCoverage, renderCoverage } from "../../../packages/core/src/coverage.ts";
import type { Evidence } from "../../../packages/core/src/types.ts";
import { txUrl } from "../../../packages/core/src/sources/explorers.ts";

const ROOT = join(import.meta.dirname, "../../..");
const FIXTURE_DIR = join(ROOT, "fixtures");

// Secrets live in .env, which is gitignored. Absent is fine; most reads need no credentials.
try {
  process.loadEnvFile(join(ROOT, ".env"));
} catch {
  // no .env present
}

type Fixture = {
  case: { id: string; expectedLabel: string; title: string; frozenAt: string; provenance?: unknown };
  evidence: Evidence;
};

type Args = { command: string; flags: Record<string, string | boolean>; positional: string[] };

function parseArgs(argv: string[]): Args {
  const [command = "help", ...rest] = argv;
  const flags: Record<string, string | boolean> = {};
  const positional: string[] = [];
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i]!;
    if (!token.startsWith("--")) {
      positional.push(token);
      continue;
    }
    const key = token.slice(2);
    const next = rest[i + 1];
    if (next === undefined || next.startsWith("--")) flags[key] = true;
    else {
      flags[key] = next;
      i += 1;
    }
  }
  return { command, flags, positional };
}

function flagString(flags: Args["flags"], key: string): string | undefined {
  const value = flags[key];
  return typeof value === "string" ? value : undefined;
}

function loadFixtures(): Fixture[] {
  return readdirSync(FIXTURE_DIR)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => JSON.parse(readFileSync(join(FIXTURE_DIR, f), "utf8")) as Fixture);
}

function resolveFixture(idOrPath: string): Fixture {
  if (idOrPath.endsWith(".json")) {
    const path = isAbsolute(idOrPath) ? idOrPath : join(process.cwd(), idOrPath);
    return JSON.parse(readFileSync(path, "utf8")) as Fixture;
  }
  const found = loadFixtures().find((f) => f.case.id === idOrPath || f.case.id.startsWith(idOrPath));
  if (!found) throw new Error(`No frozen case matches "${idOrPath}". Run: quittance cases`);
  return found;
}

async function emit(evidence: Evidence, args: Args): Promise<void> {
  const receipt = buildReceipt(evidence);
  if (args.flags.json) console.log(JSON.stringify(receipt, null, 2));
  else console.log(renderText(receipt));

  const webhook = flagString(args.flags, "webhook") ?? process.env.QUITTANCE_WEBHOOK_URL;
  if (!webhook) return;

  const result = await postReceipt({
    url: webhook,
    receipt,
    secret: flagString(args.flags, "secret") ?? process.env.QUITTANCE_WEBHOOK_SECRET,
  });
  if (result.delivered) {
    console.log(`\nwebhook  delivered to ${result.url} (HTTP ${result.statusCode}) in ${result.attempts} attempt(s)`);
    if (result.ack) console.log(`ack      ${result.ack.replace(/\s+/g, " ").slice(0, 120)}`);
  } else {
    console.log(`\nwebhook  NOT delivered to ${result.url} after ${result.attempts} attempt(s): ${result.error}`);
    process.exitCode = 2;
  }
}

async function cmdCheck(args: Args): Promise<void> {
  const deposit = flagString(args.flags, "deposit") ?? args.positional[0];
  const tx = flagString(args.flags, "tx");
  const search = flagString(args.flags, "search");
  if (!deposit && !tx && !search) {
    console.error("Supply --deposit <address>, --tx <near tx hash>, or --search <tx hash or recipient>.");
    process.exitCode = 1;
    return;
  }
  const evidence = await gatherEvidence({
    depositAddress: deposit,
    memo: flagString(args.flags, "memo"),
    nearTxHash: tx,
    search: flagString(args.flags, "search"),
    apiKey: flagString(args.flags, "key") ?? process.env.QUITTANCE_ONECLICK_KEY,
    explorerToken:
      flagString(args.flags, "token") ??
      process.env.QUITTANCE_PARTNER_JWT ??
      process.env.QUITTANCE_ONECLICK_KEY,
    rpc: process.env.QUITTANCE_NEAR_RPC,
    oneClickBase: process.env.QUITTANCE_ONECLICK_BASE,
    checkBtcConnector: args.flags.btc === true,
  });
  await emit(evidence, args);
}

async function cmdReplay(args: Args): Promise<void> {
  const id = flagString(args.flags, "case") ?? args.positional[0];
  if (!id) {
    console.error("Usage: quittance replay <case-id>. Run: quittance cases");
    process.exitCode = 1;
    return;
  }
  const fixture = resolveFixture(id);
  console.log(`case     ${fixture.case.id}`);
  console.log(`title    ${fixture.case.title}`);
  console.log(`frozen   ${fixture.case.frozenAt}\n`);
  await emit(fixture.evidence, args);
}

function cmdReceipt(args: Args): void {
  const file = args.positional[0];
  if (!file) {
    console.error("Usage: quittance receipt <receipt.json>, a receipt saved from the checker or printed with --json.");
    process.exitCode = 1;
    return;
  }
  const receipt = JSON.parse(readFileSync(isAbsolute(file) ? file : join(process.cwd(), file), "utf8")) as Receipt;
  const result = verifyReceipt(receipt);
  console.log(`label        ${receipt.verdict.label}`);
  console.log(`recorded     ${result.recorded}`);
  console.log(`recomputed   ${result.expected}`);
  console.log(result.intact ? "INTACT       the evidence and verdict are unchanged since the receipt was made" : "ALTERED      the evidence or verdict was changed after the receipt was made");
  for (const p of [receipt.evidence.origin, receipt.evidence.delivery]) {
    const url = p ? (p.explorerUrl ?? txUrl(p.chain, p.tx)) : undefined;
    if (url) console.log(`check        ${url}`);
  }
  console.log("\nA matching fingerprint proves integrity, not truth. Open the links to check the chains yourself.");
  if (!result.intact) process.exitCode = 2;
}

function cmdCases(): void {
  for (const fixture of loadFixtures()) {
    console.log(`${fixture.case.id.padEnd(41)} ${fixture.case.expectedLabel.padEnd(19)} ${fixture.case.title}`);
  }
}

function cmdVerify(): void {
  const fixtures = loadFixtures();
  const durations: number[] = [];
  let correct = 0;
  // Sized to the longest case name, so the columns hold as cases are added.
  const w = Math.max(...fixtures.map((f) => f.case.id.length)) + 2;

  console.log(`${" case".padEnd(w + 1)}${"expected".padEnd(20)}${"actual".padEnd(20)}ms`);
  console.log("-".repeat(w + 45));
  for (const fixture of fixtures) {
    const started = performance.now();
    const { verdict } = classify(fixture.evidence);
    buildReceipt(fixture.evidence);
    const ms = performance.now() - started;
    durations.push(ms);
    const ok = verdict.label === fixture.case.expectedLabel;
    if (ok) correct += 1;
    console.log(
      `${ok ? " " : "x"}${fixture.case.id.padEnd(w)}${fixture.case.expectedLabel.padEnd(20)}${verdict.label.padEnd(20)}${ms.toFixed(1)}`,
    );
  }

  const sorted = [...durations].sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
  console.log("-".repeat(w + 45));
  console.log(`labels correct        ${correct} of ${fixtures.length}`);
  console.log(`median classify time  ${median.toFixed(1)} ms (classification only, no network)`);
  if (correct !== fixtures.length) process.exitCode = 1;
}

async function cmdStudy(args: Args): Promise<void> {
  const token =
    flagString(args.flags, "token") ??
    process.env.QUITTANCE_PARTNER_JWT ??
    process.env.QUITTANCE_ONECLICK_KEY;
  if (!token) {
    console.error("The study needs a partner JWT. Set QUITTANCE_PARTNER_JWT in .env.");
    process.exitCode = 1;
    return;
  }
  const study = await runStudy({ token });
  console.log(renderStudy(study));
  if (args.flags.save) {
    const dir = join(ROOT, "studies");
    mkdirSync(dir, { recursive: true });
    const path = join(dir, study.at.slice(0, 10) + ".json");
    writeFileSync(path, JSON.stringify(study, null, 2) + "\n");
    console.log("\nsaved " + path);
  }
}

async function cmdCoverage(args: Args): Promise<void> {
  const token = flagString(args.flags, "token") ?? process.env.QUITTANCE_PARTNER_JWT;
  if (!token) {
    console.error("Coverage reads recent swaps from the Explorer, which needs a partner JWT in QUITTANCE_PARTNER_JWT.");
    process.exitCode = 1;
    return;
  }
  const checkFlag = flagString(args.flags, "check");
  const coverage = await runCoverage({ token, check: checkFlag ? Number(checkFlag) : undefined });
  console.log(renderCoverage(coverage));
  if (args.flags.save) {
    const dir = join(ROOT, "studies");
    mkdirSync(dir, { recursive: true });
    const path = join(dir, `coverage-${coverage.at.slice(0, 10)}.json`);
    writeFileSync(path, JSON.stringify(coverage, null, 2) + "\n");
    console.log("\nsaved " + path);
  }
}

function cmdRules(): void {
  console.log("Rules are evaluated in this order and the first match wins.\n");
  RULE_IDS.forEach((id, i) => console.log(`${String(i + 1).padStart(2)}. ${id}`));
  console.log(`${String(RULE_IDS.length + 1).padStart(2)}. fallback/no-rule-applied`);
}

function cmdHelp(): void {
  console.log(`quittance - a receipt for money that crossed chains

  quittance check --deposit <address> [--memo <memo>] [--key <api key>]
  quittance check --tx <near tx hash>
  quittance check --search <any tx hash, deposit address or wallet>
  quittance replay <case-id>
  quittance cases
  quittance study [--save]
  quittance coverage [--check <n>] [--save]
  quittance receipt <receipt.json>
  quittance verify
  quittance rules

Flags
  --json              print the machine-readable receipt instead of the text one
  --webhook <url>     post the receipt to an endpoint you control
  --secret <secret>   sign the webhook body with HMAC SHA256
  --btc               also read the bitcoin connector refund config

Environment
  QUITTANCE_ONECLICK_KEY     partner key; optional, it sets the quote fee schedule and is not needed to read status
  QUITTANCE_WEBHOOK_URL      default webhook target
  QUITTANCE_NEAR_RPC         override the NEAR RPC endpoint

Quittance only reads. It holds no keys, moves no funds, and opens no support tickets.`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  switch (args.command) {
    case "check":
      await cmdCheck(args);
      break;
    case "replay":
      await cmdReplay(args);
      break;
    case "cases":
      cmdCases();
      break;
    case "study":
      await cmdStudy(args);
      break;
    case "receipt":
      cmdReceipt(args);
      break;
    case "coverage":
      await cmdCoverage(args);
      break;
    case "verify":
      cmdVerify();
      break;
    case "rules":
      cmdRules();
      break;
    default:
      cmdHelp();
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : String(err));
  process.exitCode = 1;
});
