# Submission kit

Everything here is ready to use on 1 November. Submissions open 1 Nov 00:00 UTC and close
14 Nov 23:59 UTC, so nothing can be filed before then.

## Order of operations on the day

1. Make the repository public. `gh repo edit AustinChris1/quittance --visibility public`
2. Record the demo (script below). One take, one screen, no narration needed.
3. Post it to X with the copy below. The post must say it was built at NEAR HACKATHON.
4. Fill the form at nearhackathon.com with the repo link and the post link.

Both links are required and the submission cannot be edited afterwards.

## Demo script, 70 seconds, one screen

Record the browser at `https://quittance-five.vercel.app`. No terminal, no slides.

| Time | On screen | What it shows |
| --- | --- | --- |
| 0:00 | Landing, hero. Let the tally animation finish. | The mechanic: a deposit half and a delivery half that only match when they agree. |
| 0:08 | Scroll to the journey diagram. Pause on it. | Deposited 11 Sep, delivered 27 Sep, reported lost 9 Oct. |
| 0:18 | Scroll to the three numbers. | 44 swaps, $334k, 255 days median. |
| 0:26 | Click **Check a swap**. | The product, not a pitch. |
| 0:30 | Click **try the 193k case**. | Hands off the keyboard while it reads. |
| 0:38 | The reading panel, sources naming themselves. | Four chains consulted in turn. |
| 0:48 | The verdict lands: DELIVERED, the proof badge. | Proven on Ethereum, 190,995.29, block 26,068,435. |
| 0:56 | Scroll the receipt: basis, next, limits, fingerprint. | Every verdict carries its evidence and its limits. |
| 1:06 | Click **Try a confidential swap**. | The second case. |
| 1:18 | SHIELDED_UNPROVEN lands. | Shielded to the private treasury. No public record can prove it arrived or was lost, and the tool says so. |
| 1:28 | Stop. | |

The pair is the argument. The first case shows public records overturning a status word and a
public complaint. The second shows the tool refusing to claim a loss it cannot see. Judges will
trust the first more because of the second.

Use `TBy2io3Q3Jt4UM4ejDhkkUQJZgZuXw2sus` if you ever need the $193K swap's deposit address. Do not
use `0xDF7A93d400159d0f8f40AAe42576d01285EA9e39`: that is a deliberately unknown address for
demonstrating the anonymous 404, and it returns nothing.

The one frame that matters is 0:48. A forum thread still says that money is gone. The screen says
it arrived on 27 September, and proves it against an Ethereum node.

## X post

> Built Quittance at NEAR HACKATHON.
>
> The most cited stuck deposit on NEAR Intents, $193K reported lost, was delivered 12 days before
> the complaint was filed. Nobody could tell, because a status word is not an answer.
>
> Paste a transaction hash, get a receipt with the proof attached.
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
> Paste a transaction hash. It resolves the swap through the Explorer, reads the status, reads the
> deposit on its origin chain, and then reads the destination receipt on the destination chain to
> confirm the expected token reached the quoted recipient. It returns one of eight labels, each
> carrying the facts observed, the limits of what it can see, and the next action.
>
> It was built around a case we then disproved with it. A deposit of 575,830 TRX, roughly $193,000,
> was reported on the NEAR forum as failed since 12 September with a zero refund. It had settled on
> 27 September: 190,995.29 USDT reached the recipient on Ethereum, confirmed against an Ethereum
> node rather than taken from the operator's record. The complaint was filed twelve days after the
> money arrived and the thread is still unanswered. The poster cited a refund field reading zero as
> proof of loss, which on a settled swap is the correct value.
>
> The failure rate is not the problem. 978 of 1,000 swaps settle. The problem is the tail: on
> 2026-10-26, 44 swaps had taken a deposit, produced no destination transaction and charged no
> refund, at a median age of 255 days, holding about $334,000 of quoted notional. Those people
> cannot look their own swap up, because the status endpoint is keyed only by deposit address and
> the correlation id every support thread quotes identifies one HTTP request, not the swap.
>
> Quittance holds no keys, moves no funds, files nothing on anyone's behalf and claims no recovered
> money. Ten frozen cases, each with provenance separating what was verified on chain from what was
> only reported. Run `node apps/cli/src/main.ts verify` to check the labels yourself.

## Honesty note to keep in the README

The research and a working prototype predate the 1 to 14 November window. Decide whether to state
that plainly in the README or to leave the commit history to speak for itself. Two of the judges
read repositories.
