# Quittance

A receipt for money that crossed chains.

When a NEAR Intents swap says it failed, or says it succeeded and nothing arrives, Quittance
takes the deposit, reads only public records, and returns one of four labels plus the evidence
behind it. It holds no keys, moves no funds, and opens no support tickets.

A quittance is an old legal word for a written receipt proving an obligation has been discharged.

## Run it

No install. The core has zero runtime dependencies and Node runs the TypeScript directly.
Requires Node 24 or newer (`node --version`).

**Step 1 - classify every frozen case and check the labels.**

```
node apps/cli/src/main.ts verify
```

Expect `labels correct 7 of 7` and a median classify time around 0.1 ms.

**Step 2 - print the receipt for the flagship case.**

```
node apps/cli/src/main.ts replay 01-stranded-trx
```

Expect `LABEL STRANDED`, rule `stranded/terminal-with-no-refund`, and a basis line reading
`575830.000000 TRX was credited to intents.near`.

**Step 3 - read the same deposit live from mainnet, with no partner key.**

```
node apps/cli/src/main.ts check --tx 8a33DkKfZMWRKbK2pXuQAWVLXSy4AyZF6PfcENvCJgCb
```

Expect `LABEL UNDETERMINED` and a limit reading `The 1Click status field was not read because no
partner key was supplied`. This is the tool refusing to guess, and it is the finding in step 4.

**Step 4 - see the rules themselves.**

```
node apps/cli/src/main.ts rules
node --test packages/core/test/fixtures.test.ts
```

## The finding behind step 3

The 1Click status endpoint accepts only a deposit address, never a correlation id, and it
requires an `X-API-Key` issued to partners. An ordinary user holding a stuck deposit therefore
cannot read their own swap programmatically. Quittance still runs without a key, reports every
chain fact it can prove, and labels the result `UNDETERMINED` rather than inventing a verdict.

With a key, export `QUITTANCE_ONECLICK_KEY` and the status fields fill in.

## The labels

| Label | Meaning |
| --- | --- |
| `STRANDED` | Deposit arrived, swap is terminal, nothing came back. |
| `WRONG_DOOR` | Deposit does not match the quote it was made for, wrong chain or wrong asset. |
| `LOCKED_OUT` | A refund exists on paper but the connector timelock puts it out of reach. |
| `SHIELDED_UNPROVEN` | The route is private. Public records cannot prove delivery either way. |
| `DELIVERED` | A destination transaction is published. |
| `REFUNDED_OK` | The money went back to the refund address. |
| `IN_FLIGHT` | Not terminal yet. |
| `UNDETERMINED` | Not enough evidence. A gap in the rules, not a clean bill of health. |

Rules are evaluated in a fixed order and the first match wins. Every verdict carries a `basis`
(facts observed), `limits` (what it cannot see) and a `next` action. No verdict is produced
without limits.

`SHIELDED_UNPROVEN` is deliberately cautious. On a confidential route the treasury holding the
tokens while the public balance reads zero is documented behaviour, so Quittance reports that
delivery cannot be verified from public data rather than claiming a loss. A test enforces this.

## What it will not do

- Hold keys or funds. Every read is read-only.
- Send a transaction. The one write is posting a receipt to a webhook the operator controls.
- File support tickets for strangers. It produces the attachment; a human decides to send it.
- Claim recovered money. No dollar figure for funds rescued appears anywhere.
- Accuse anyone. Each label states its evidence and the edge of that evidence.

## Evidence

Frozen on 2026-10-26, each fixture carrying its own provenance block. Three of the cases were
open and unanswered in `near/intents` when they were recorded.

| Case | Source |
| --- | --- |
| `01-stranded-trx` | [Forum thread 42664](https://gov.near.org/t/failed-near-intents-1-click-swap-575-830-trx-193k-stuck-failed-status-zero-refund-no-support-response/42664) and [the transaction](https://nearblocks.io/txns/8a33DkKfZMWRKbK2pXuQAWVLXSy4AyZF6PfcENvCJgCb) |
| `02-wrong-door-base-eth` | [near/intents#382](https://github.com/near/intents/issues/382) |
| `03-locked-out-btc` | [near/intents#385](https://github.com/near/intents/issues/385) |
| `04-shielded-unproven` | [near/intents#384](https://github.com/near/intents/issues/384) |
| `05`, `06`, `07` | Synthetic controls, so the rules are shown not to label every swap a failure |

On case 01 the chain is the better witness. The deposit confirms at block 215,243,812 with a
block timestamp of 2026-09-11T16:27:04Z, one day earlier than the forum post states. The status
fields in that fixture are the depositor's report and are marked unverified in its provenance
block, because reading them needs a partner key.

## Layout

```
packages/core/src/classify.ts     ordered rules, first match wins
packages/core/src/receipt.ts      canonical JSON, sha256 fingerprint, text rendering
packages/core/src/gather.ts       assembles evidence from the readers
packages/core/src/sources/        1Click status, NEAR RPC, NearBlocks
packages/core/src/webhook.ts      the only write, HMAC signed
apps/cli/src/main.ts              check, replay, cases, verify, rules
fixtures/                         frozen cases with provenance
```

Receipts are fingerprinted with a sha256 over canonical JSON, so two runs over the same evidence
produce the same fingerprint and any change to the evidence changes it.

## Built for

NEAR Hackathon, 1 to 14 November 2026. Tracks: Unstoppable DeFi, Real-World Money, Privacy and
Private AI, Open Innovation.
