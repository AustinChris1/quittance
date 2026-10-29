# Submission kit

Everything here is ready to use on 1 November. Submissions open 1 Nov 00:00 UTC and close
14 Nov 23:59 UTC, so nothing can be filed before then.

## Order of operations on the day

1. Make the repository public. `gh repo edit AustinChris1/quittance --visibility public`
2. Record the demo (script below). One take, one screen, no narration needed.
3. Post it to X with the copy below. The post must say it was built at NEAR HACKATHON.
4. Fill the form at nearhackathon.com with the repo link and the post link.

Both links are required and the submission cannot be edited afterwards.

## Demo video

The full production brief is [DEMO.md](DEMO.md): seven scenes, 1:40 to 2:00, with what to show,
click and say in each, the claims you may make, and what not to film. The order is the $193K payout
proven at both ends, the wallet that was paid, the confidential shield it refuses to over-claim, and
a live watch alert.

## X post

> A status is a claim. A receipt is evidence.
>
> A $193K NEAR Intents swap was reported as failed with a zero refund. The deposit had arrived on
> TRON, and 190,995 USDT reached the recipient on Ethereum 12 days before the complaint was filed.
>
> I built Quittance at NEAR HACKATHON to read both ends of a cross-chain swap on their own chains,
> and to say plainly what public records cannot show.
>
> Try it: quittance-five.vercel.app

Attach the demo video. Keep the repo link in a reply rather than the main post, so the video
carries the first impression.

## Form answers

- **Project name:** Quittance
- **Tracks:** Open Innovation, Unstoppable DeFi, Privacy and Private AI. Real-World Money is the weakest fit; add it only if you want the payment-proof use case judged there.
- **Repository:** https://github.com/AustinChris1/quittance
- **Description, 20 to 2000 characters:**

> Quittance answers one question: what actually happened to a NEAR Intents swap.
>
> Paste a transaction hash from any chain the swap touched, the deposit address its quote issued,
> or the wallet that sent or received it. Quittance proves the deposit on the origin chain and the
> payout on the destination chain, each read from that chain, and reconciles what arrived
> against the quote. It returns one of eight labels, each carrying the facts observed, the limits of
> what it can see, and the next action.
>
> That matters more since 27 October, when NEAR made 1Click swaps confidential only. The
> exchange now settles on the NEAR Private Shard, so a status word describes a step no public
> record can reach. The two ends stay public, and those are what Quittance proves. On 28 October,
> 81.8 percent of external payouts were on a chain it reads, and 99 of 100 sampled payouts proved
> on their own chain.
>
> It was built around a case we then disproved with it. A deposit of 575,830 TRX, about $193K,
> was reported on the NEAR forum as failed with a zero refund. It had settled: the TRX reached the
> deposit address on TRON, and 190,995.29 USDT reached the recipient on Ethereum on 27 September,
> twelve days before the complaint. The poster cited a refund field reading zero as proof of loss,
> which on a settled swap is the correct value.
>
> The rate is not the problem; the tail is. On 26 October, 44 swaps had taken a deposit, produced no
> destination transaction and charged no refund, at a median age of 255 days, holding about $334,000
> of quoted notional. Their owners cannot look them up: the status endpoint is keyed only by deposit
> address, and the correlation id support threads quote identifies one HTTP request.
>
> Quittance holds no keys, moves no funds, files nothing on anyone's behalf and claims no recovered
> money. Seventeen frozen cases, each with provenance, are re-classified on every test run. Run
> `node apps/cli/src/main.ts verify` to check the labels yourself.

## Development timeline

The rules on nearhackathon.com say "Code written since the announcement counts". The README carries
the dates so nobody has to infer them:

- 19 October 2026: the hackathon is announced.
- 26 October 2026: first commit. Everything in the repository was written from this date on.
- 1 to 14 November 2026: the submission window.
