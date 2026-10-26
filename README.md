# Quittance

A receipt for money that crossed chains.

When a NEAR Intents swap says it failed, or says it succeeded and nothing arrives, Quittance
takes the deposit, reads only public records, and returns one of four labels plus the evidence
behind it. It holds no keys, moves no funds, and opens no support tickets.

A quittance is an old legal word for a written receipt proving an obligation has been discharged.

## What it found on its first real case

The most cited stuck deposit in the ecosystem, 575,830 TRX reported on the NEAR forum as roughly
193,000 dollars lost, had already been delivered when the complaint was filed.

| When | What | Verified against |
| --- | --- | --- |
| 2026-09-11 16:25:30Z | Quote created, 575,830 TRX in | Intents Explorer record |
| 2026-09-11 16:27:04Z | 575,830 TRX credited to `intents.near` | NEAR chain |
| 2026-09-27 11:16:35Z | 190,995.293894 USDT delivered to `0x632f...8bad` | Ethereum block 26,068,435 |
| 2026-10-09 | Forum post: FAILED since 12 Sep, zero refund, no reply | gov.near.org thread 42664 |

Settlement took 16 days. The public report of a loss was filed 12 days after the money arrived,
and the thread is still open and still unanswered. The poster cited `refundedAmount: 0` as proof
they got nothing back, when on a settled swap that field is correctly zero because no refund was
due. A healthy field read as a symptom.

The Ethereum transfer was confirmed by querying an Ethereum node directly, not by trusting the
operator's record. That is the whole thesis: a status word is not an answer, in either direction.

## How big is this, beyond one case

One anecdote is not a problem statement, so Quittance measures the population. Run it yourself
with `node apps/cli/src/main.ts study --save`, which writes a dated snapshot to `studies/`.

Measured 2026-10-26:

| Cohort | Sampled | Deposit landed | Landed, never settled, never refunded | Notional | Median age |
| --- | --- | --- | --- | --- | --- |
| `FAILED` | 1000 (capped) | 145 | 29 | $1,959 | 27 days |
| `PROCESSING` | 310 (full) | 283 | **44** | **$334,054** | **255 days** |

Read this honestly, because the headline is not that the system is broken. In a separate
one-hour window, 978 of 1000 swaps succeeded. Most `FAILED` records never received a deposit at
all; they are abandoned quotes, which is why the classifier refuses to say `STRANDED` without a
landed deposit. Refunds largely work, and no `REFUNDED` record in the sample was older than seven
days.

The finding is the tail. Forty-four swaps took a deposit, produced no destination transaction and
charged no refund fee, and have sat that way for a median of 255 days. The largest single one is
$114,620 of quoted notional. Those are not pending; they are forgotten. And the people holding
them cannot look them up, for the reason in the next section.

Notional is the quoted USD value at creation, not a realised loss, and some may yet settle, as
the case above did after sixteen days. The snapshot retains counts only: no addresses, no
per-user amounts, no identifiers.

## Run it

No install. The core has zero runtime dependencies and Node runs the TypeScript directly.
Requires Node 24 or newer (`node --version`).

**Step 1 - classify every frozen case and check the labels.**

```
node apps/cli/src/main.ts verify
```

Expect `labels correct 10 of 10` and a median classify time under a millisecond.

**Step 2 - print the receipt for the case above.**

```
node apps/cli/src/main.ts replay 01-reported-stranded-actually-delivered
```

Expect `LABEL DELIVERED` and the published destination transaction, against a forum thread that
still says the money is gone.

**Step 3 - read live from mainnet, with no key of any kind.**

```
node apps/cli/src/main.ts check --tx 8a33DkKfZMWRKbK2pXuQAWVLXSy4AyZF6PfcENvCJgCb
node apps/cli/src/main.ts check --deposit 0xDF7A93d400159d0f8f40AAe42576d01285EA9e39 --json
```

The first proves the chain facts and returns `UNDETERMINED`, because a NEAR transaction alone does
not tell you what the operator thinks happened. The second calls the status endpoint with no
credentials at all; its receipt cites `HTTP 404 unauthenticated, limit 1200`, which is the server
confirming it processed an anonymous lookup.

**Step 3b - resolve the whole thing, if you have a partner JWT in `.env`.**

```
node apps/cli/src/main.ts check --search 8a33DkKfZMWRKbK2pXuQAWVLXSy4AyZF6PfcENvCJgCb
```

This is the full chain: a transaction hash resolves through the Explorer to its deposit address,
the status fields come back, and the verdict turns from `UNDETERMINED` into `DELIVERED`. It is the
one thing a partner token genuinely unlocks.

**Step 4 - close the loop into an endpoint you control.**

In one terminal:

```
QUITTANCE_WEBHOOK_SECRET=demo-secret node apps/sink/src/main.ts
```

In another:

```
node apps/cli/src/main.ts replay 01-stranded-trx --webhook http://localhost:8787/receipts --secret demo-secret
```

The sink prints `received STRANDED rule=stranded/terminal-with-no-refund` and files it under a
ticket reference derived from the fingerprint. Repeat with `--secret wrong-secret` and the sink
answers HTTP 401, because the body is signed with HMAC SHA256.

**Step 5 - see the rules themselves.**

```
node apps/cli/src/main.ts rules
node --test packages/core/test/fixtures.test.ts
```

## What a partner key is for, and what the real barrier is

Measured against the live server on 2026-10-26:

| Call | Result |
| --- | --- |
| No `X-API-Key` | `404 Deposit address ... not found`, with `X-RateLimit-Limit-unauth: 1200` |
| A deliberately wrong `X-API-Key` | `401` |

So reading a swap needs no key, and a rejected key is worse than no key. Quittance retries
unauthenticated when a supplied key returns 401, and records which tier the server applied in the
receipt's `sources`. A partner key governs the quote fee schedule, where unauthenticated quotes
carry an extra 0.25 percent platform fee. It is not a gate on reading.

The real barrier is the shape of the lookup, and it is worse than a missing parameter.
`/v0/status` accepts a deposit address plus an optional memo, and nothing else. There is no
correlation-id parameter, and there could not usefully be one: the correlation id is a per-request
trace, not a swap identifier. Three consecutive calls for the same swap returned
`7ff00f92-...`, `b9784595-...` and `98b41cc8-...`. The specification says as much, describing it as
a "unique identifier for request tracing and debugging".

So when a support thread quotes a correlation id as the handle for a stuck swap, which is exactly
what the case above does, it is quoting the id of one HTTP request made weeks earlier. Nobody can
resolve it, including the operator. That is why Quittance keys from a transaction hash and
resolves through the Explorer instead.

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
| `01-reported-stranded-actually-delivered` | [Forum thread 42664](https://gov.near.org/t/failed-near-intents-1-click-swap-575-830-trx-193k-stuck-failed-status-zero-refund-no-support-response/42664), the [NEAR deposit](https://nearblocks.io/txns/8a33DkKfZMWRKbK2pXuQAWVLXSy4AyZF6PfcENvCJgCb) and the [Ethereum delivery](https://etherscan.io/tx/0x9be9c2f8ed78d32ecf222bca3595d50cc42aed979030e4ebf0f84a626e13421a) |
| `02-wrong-door-base-eth` | [near/intents#382](https://github.com/near/intents/issues/382) |
| `03-locked-out-btc` | [near/intents#385](https://github.com/near/intents/issues/385) |
| `04-shielded-unproven` | [near/intents#384](https://github.com/near/intents/issues/384) |
| `05`, `06`, `08`, `09` | Controls and regression guards, so the rules are shown not to label every swap a failure |
| `10-stranded-synthetic` | Synthetic. We hold no verified real STRANDED case, and say so rather than implying one |

On case 01 the chain was the better witness, and it overturned the report. The deposit confirms at
block 215,243,812 with a block timestamp of 2026-09-11T16:27:04Z, one day earlier than the forum
post states, and the Ethereum delivery lands on 2026-09-27. The fixture records the correction,
not the claim, and its provenance block carries the full timeline.

## Layout

```
packages/core/src/classify.ts     ordered rules, first match wins
packages/core/src/receipt.ts      canonical JSON, sha256 fingerprint, text rendering
packages/core/src/gather.ts       assembles evidence from the readers
packages/core/src/sources/        1Click status, NEAR RPC, NearBlocks
packages/core/src/webhook.ts      the only write, HMAC signed
apps/cli/src/main.ts              check, replay, cases, verify, rules
apps/sink/src/main.ts             reference receiver, stands in for an integrator endpoint
packages/core/src/study.ts        population measurement, aggregates only
studies/                          dated snapshots of that measurement
fixtures/                         frozen cases with provenance
```

Receipts are fingerprinted with a sha256 over canonical JSON, so two runs over the same evidence
produce the same fingerprint and any change to the evidence changes it.

## Built for

NEAR Hackathon, 1 to 14 November 2026. Tracks: Unstoppable DeFi, Real-World Money, Privacy and
Private AI, Open Innovation.
