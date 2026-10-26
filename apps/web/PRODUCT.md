# Quittance, product truth

## What it is

A tool that answers one question: what actually happened to a NEAR Intents swap. You give it a
transaction hash or a deposit address. It reads public records, assembles them into a single
receipt, classifies the swap into one of eight documented states, and states the limits of what it
can see.

A quittance is a written receipt proving an obligation has been discharged.

## Who it is for

Integrators who resell these swaps, and the support teams holding the complaints. When a user's
money sticks, the integrator is the one who has to answer for it. Today that answer is assembled
by hand from a forum post, a block explorer and a guess.

## The problem, measured

Not a failure rate. In a one-hour window, 978 of 1,000 swaps settled, and most records marked
`FAILED` never received a deposit at all. The problem is the tail and the unanswerability.

On 2026-10-26, 44 swaps had taken a deposit, produced no destination transaction and charged no
refund, at a median age of 255 days, holding about $334,000 of quoted notional. The largest single
one was $114,620.

Worse, the people in that tail cannot look their own swap up. The status endpoint is keyed only by
deposit address. The correlation id that every support thread quotes identifies one HTTP request,
not the swap, and changes on every call.

## The case that defines the tone

A deposit of roughly $193,000 was reported publicly as lost. Resolving it took one transaction
hash: it had been delivered on Ethereum twelve days before the complaint was filed. The poster
cited a refund field reading zero as proof they got nothing back, when on a settled swap that is
the correct value.

So the product does not assume failure. A status word is unreliable in both directions, and the
job is to replace it with evidence.

## What it refuses to do

- Hold keys or funds. Every read is read-only.
- Send transactions. The one write is posting a receipt to a webhook the operator controls.
- File support tickets for strangers.
- Claim recovered money. No such figure appears anywhere.
- Accuse anyone. Every verdict states its basis and the edge of that basis.

## Success

Two numbers, nothing else claimed: correct labels across the frozen cases, and seconds from input
to delivered receipt. Currently 10 of 10, and under a millisecond to classify once evidence is in
hand.

## Constraints

- Credentials are server side only and never reach the browser.
- A partner token is needed for Explorer search, which is how an identifier resolves. Reading a
  swap's status needs no credentials at all.
- The Explorer allows one request every five seconds per partner id, so the client backs off.
- Built for the NEAR Hackathon, 1 to 14 November 2026.
