# Quittance, design truth

## The world: NEAR-native, with one banknote motif

The site belongs to the NEAR ecosystem and should look like it. Its tokens are read directly from
near.org's own stylesheet on 2026-10-27, not approximated.

It carries one motif from security printing: a guilloché rosette, because modern banknotes are
printed on light paper with coloured guilloché, and a quittance is a receipt for money. Everything
else is NEAR: light first, mint, black, Mona Sans, generous space.

History, so nobody repeats it:
- A muted slate and teal world was rejected as flat and text-heavy.
- A dark banknote world in green, oxblood and gold was rejected for its colour and its background
  hatching. The user asked for NEAR's look and a light mode.

## Hard rules from user feedback

- **Real logos only.** Chain marks are the official ones, vendored from @web3icons (MIT) as six
  static SVGs in `public/chains/`. Never hand-draw a chain logo. The full package is 102 MB, so it
  is deliberately not a dependency.
- **No background lines.** No hatching, ruled grain or texture behind content.
- **Light and dark both work.** It follows the system theme, with a toggle that overrides.
- **Visual over textual.** Logos, icons, figures and motion carry meaning; prose stays to a line.

## Tokens

From near.org, defined once in `app/globals.css`. Light values shown; `.dark` swaps them.

| Token | Light | Dark | Use |
| --- | --- | --- | --- |
| `--bg` | `#f9f9fa` | `#000000` | page |
| `--surface` | `#ffffff` | `#0c0c0c` | cards, inputs |
| `--paper` | `#f2f1e9` | `#121212` | the receipt, quiet panels |
| `--fg` | `#000000` | `#ffffff` | text, primary buttons |
| `--muted` | `#5c5c5c` | `#acaba6` | secondary text |
| `--line` | `#e5e5e5` | `#262626` | borders |
| `--mint` | `#00ec97` | `#00ec97` | NEAR's signature: fills, the guilloché |
| `--mint-ink` | `#007a4d` | `#00ec97` | mint as text; raw mint fails contrast on white |
| `--coral` | `#ff7966` | `#ff7966` | failure and unresolved states |
| `--cyan`, `--violet` | `#17d9d4`, `#9797ff` | same | in flight, shielded |

## Type

- **Mona Sans**, the face near.org uses. Display runs wide and heavy: `wdth` 112, weight 760,
  tight tracking. Figures run wider still.
- **Geist Mono** for evidence: hashes, field names, dates, block numbers.

## The guilloché

`components/guilloche.tsx`. Each ring is a hypotrochoid, the curve a rose engine cuts. Three
details make it read as real engraving rather than a lopsided scribble, all learned by measuring:

1. **Whole-number ratios.** `R / r` must be an integer or the curve fails to close in one turn.
2. **Solve the radius from the reach.** A hypotrochoid extends to `R - r + d`, so `R` is solved to
   land that reach inside the viewBox. Otherwise the outer rings clip.
3. **Golden-angle phases.** Without them every ring's loops line up in one direction and crowd it.

The lines draw themselves with CSS: `pathLength="1"` on each curve so one keyframe fits all.

## Motion

GSAP ScrollTrigger in `components/scroll-cinema.tsx`: headlines rise word by word, figures roll
over, cards lift in, the case thread draws across, the receipt assembles line by line, and the hero
medallion recedes as you leave it. A logo marquee runs in CSS.

Non-negotiable, each learned from shipping the failure:

1. **Content never depends on JavaScript to appear.** Above-the-fold entrances and the guilloché
   are CSS. GSAP only ever enhances, and sets its own hidden states so a failure leaves text visible.
2. **Never split a visible heading in JavaScript.** It flashes the text before hiding it.
3. **`prefers-reduced-motion` disables everything** and shows the guilloché fully drawn.

## Copy

State what was observed and the edge of what it shows. Never claim a loss the evidence does not
prove. No exclamation marks, no em-dashes. Numbers carry their source.
