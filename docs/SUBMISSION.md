# Submission kit

Everything here is ready to use on 1 November. Submissions open 1 Nov 00:00 UTC and close
14 Nov 23:59 UTC, so nothing can be filed before then.

## Order of operations on the day

1. Make the repository public. `gh repo edit AustinChris1/quittance --visibility public`
2. Record the demo (script below). One take, one screen, no narration needed.
3. Post it to X with the copy below. The post must say it was built at NEAR HACKATHON.
4. Fill the form at nearhackathon.com with the repo link and the post link.

Both links are required and the submission cannot be edited afterwards.

## Demo script, about 90 seconds, one screen

Record the browser at `https://quittance-five.vercel.app/check`. No terminal, no slides. Paste each
input by hand so the viewer sees it is a real lookup.

| Time | On screen | What it shows |
| --- | --- | --- |
| 0:00 | Paste `0x9be9c2f8ed78d32ecf222bca3595d50cc42aed979030e4ebf0f84a626e13421a` and press Resolve. | The Ethereum payout of the swap the forum calls a $193K loss. |
| 0:08 | The reading panel while it works. | Several chains consulted in turn. |
| 0:20 | DELIVERED lands. Pause on the three cards. | Money in proven on TRON, 575,830 TRX. Money out proven on Ethereum, 190,995.29 USDT. |
| 0:30 | Scroll to the quote line in the receipt. | 0.40% under the quote, inside its guaranteed minimum. Nobody has to trust the status word. |
| 0:40 | Paste `0x632F5D32448DE43b8b9cfD063aCfcDac09108bad`. | The wallet that was paid. |
| 0:50 | The list appears. Click **Check it** on the one swap. | A wallet is not a swap, so it lists rather than guesses. |
| 1:00 | Paste `3djtQ3pUHv8SGtNKS3CMGice7E7S9oeS4DJzNYyjCUVD`. | A confidential shield with no public out. |
| 1:12 | SHIELDED_UNPROVEN lands. | It refuses to call this a loss or a delivery, and says why. |
| 1:25 | Stop. | |

The pair is the argument. The first case shows public records overturning a status word and a
public complaint. The last shows the tool refusing to claim what it cannot see. Judges will trust
the first more because of the last.

Do not use `0xDF7A93d400159d0f8f40AAe42576d01285EA9e39`: that is a deliberately unknown address for
demonstrating the anonymous 404, and it returns nothing. Leave the population numbers out of the
video; they live in the README and the docs, each with its saved snapshot.

The one frame that matters is 0:20. A forum thread still says that money is gone. The screen says
it arrived on 27 September, and proves both ends on the chains themselves.

## X post

> Built Quittance at NEAR HACKATHON.
>
> The most cited stuck deposit on NEAR Intents, $193K reported lost, was delivered 12 days before
> the complaint was filed. Nobody could tell, because a status word is not an answer.
>
> Paste a transaction hash or your wallet. Get a receipt with both ends proven on their own chains.
>
> quittance-five.vercel.app

Attach the demo video. Keep the repo link in a reply rather than the main post, so the video
carries the first impression.

## Form answers

- **Project name:** Quittance
- **Tracks:** Unstoppable DeFi, Real-World Money, Privacy and Private AI, Open Innovation
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

## Honesty note to keep in the README

The research and a working prototype predate the 1 to 14 November window. Decide whether to state
that plainly in the README or to leave the commit history to speak for itself. Two of the judges
read repositories.
