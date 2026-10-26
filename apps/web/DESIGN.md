# Quittance, design truth

## The one sentence

The mark is a split tally: a debt was notched across a stick, then split lengthwise so each party
held half, and matching the halves proved the obligation discharged. Quittance matches the deposit
half to the delivery half, so the notches only read as whole when the two sides agree.

Chosen by the user on 2026-10-26 over three alternatives: a perforation stub, a settlement seal,
and a struck ledger line. Do not change the mark without asking.

## The world

Dark ledger field with the receipt rendered as warm paper inset into it. The contrast is the
brand, not decoration: ink on paper, inside a ledger. Also chosen by the user over an all-paper
light treatment and a terminal-green treatment.

The dark field carries a faint repeating rule every 34px so it reads as ruled ledger stock rather
than a void. The receipt reverses that: warm paper, ruled every 28px, with a mask that notches the
left and right edges so it reads as something torn from a book.

## Tokens

Defined once in `app/globals.css` under `@theme`. Never hard-code these values in components.

| Token | Value | Use |
| --- | --- | --- |
| `--color-ink` | `#0b141c` | page field |
| `--color-ink-raised` | `#111f2a` | inputs, raised panels |
| `--color-ink-line` | `#1e3140` | hairlines on the dark field |
| `--color-paper` | `#f6f4ee` | the receipt, and the primary button |
| `--color-paper-line` | `#ddd8cc` | hairlines on paper |
| `--color-tally` | `#15807a` | accent, the matched half |
| `--color-tally-bright` | `#5fc7bf` | accent on dark, settled states |
| `--color-caution` | `#c27318` | unresolved states, never alarm red |
| `--color-mute` | `#8fa3b0` | secondary text |

Caution is amber, never red. The product reports what it can prove; it does not alarm.

## Type

Three faces, each with a job. Inter is deliberately absent.

- **Fraunces** for display. Headlines only, tight tracking, optical sizing on.
- **IBM Plex Sans** for interface text and prose.
- **IBM Plex Mono** for anything that is evidence: hashes, field names, the receipt body, source
  lines. If a value could be pasted into a ticket, it is mono.

## Motion

Entrances only. `Reveal` animates opacity and transform, ease-out, 420ms, staggered by at most
0.18s. Nothing loops except the pending dots while a lookup runs.

Two hard rules the code enforces:

- `prefers-reduced-motion` drops the transform and keeps a plain fade.
- Motion starts at zero opacity, so `@media (scripting: none)` forces `[data-reveal]` visible.
  Without that the page is blank for anyone without JavaScript.

## Surfaces

- `/` is **Persuade**. The visitor decides this is worth using. It leads with the case the project
  was built on and the population study, both with their sources named.
- `/check` is **Operate**. The visitor completes one task. Scanability beats expression; the
  receipt is the product and gets the paper treatment.

## Copy rules

State what was observed and the edge of what it shows. Never claim a loss the evidence does not
prove. No exclamation marks, no growth copy, no em-dashes. Numbers carry their source inline.
