import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  CircleHelp,
  DoorOpen,
  EyeOff,
  FileCheck2,
  Github,
  KeyRound,
  Lock,
  PackageX,
  RotateCcw,
  ShieldOff,
  Timer,
} from "lucide-react";
import { TallyMark, Wordmark } from "../components/logo";
import { Reveal } from "../components/reveal";
import { TallyMatch } from "../components/tally-match";
import { Journey } from "../components/journey";
import { CHAINS } from "../components/chains";

const LABELS = [
  { name: "Delivered", Icon: CheckCircle2, tone: "text-tally-bright" },
  { name: "Refunded", Icon: RotateCcw, tone: "text-tally-bright" },
  { name: "In flight", Icon: Timer, tone: "text-[#c3d2dc]" },
  { name: "Stranded", Icon: PackageX, tone: "text-caution" },
  { name: "Wrong door", Icon: DoorOpen, tone: "text-caution" },
  { name: "Locked out", Icon: Lock, tone: "text-caution" },
  { name: "Shielded", Icon: EyeOff, tone: "text-[#c3d2dc]" },
  { name: "Undetermined", Icon: CircleHelp, tone: "text-mute" },
];

const REFUSALS = [
  { Icon: KeyRound, title: "Holds no keys", body: "Every read is read-only." },
  { Icon: ShieldOff, title: "Claims no recoveries", body: "No figure for money rescued." },
  { Icon: FileCheck2, title: "Files nothing for you", body: "You decide what to send." },
];

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rule-hair border-t pt-5">
      <div className="font-[family-name:var(--font-display)] text-[clamp(2.4rem,5vw,3.4rem)] leading-none text-tally-bright">
        {value}
      </div>
      <div className="mt-3 text-sm leading-relaxed text-[#b8c7d2]">{label}</div>
    </div>
  );
}

export default function Home() {
  return (
    <main className="relative overflow-hidden">
      <div className="field-grain pointer-events-none absolute inset-0 opacity-[0.55]" aria-hidden />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-7">
        <Wordmark />
        <nav className="flex items-center gap-6 text-sm">
          <a
            className="hidden text-mute transition-colors hover:text-[#dbe5ec] sm:inline"
            href="https://github.com/AustinChris1/quittance"
          >
            Repository
          </a>
          <Link
            href="/check"
            className="rounded-full bg-tally px-4 py-2 font-medium text-white transition-colors hover:bg-tally-bright hover:text-ink"
          >
            Check a swap
          </Link>
        </nav>
      </header>

      <section className="relative mx-auto max-w-6xl px-6 pt-12 pb-20 sm:pt-20">
        <div className="grid items-center gap-14 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="min-w-0">
            <Reveal>
              <p className="font-[family-name:var(--font-mono)] text-xs tracking-[0.18em] text-tally-bright uppercase">
                NEAR Intents, resolved
              </p>
            </Reveal>
            <Reveal delay={0.06}>
              <h1 className="mt-6 font-[family-name:var(--font-display)] text-[clamp(1.95rem,7vw,4.6rem)] leading-[1.02] tracking-[-0.02em] text-balance">
                A receipt for money
                <br className="hidden sm:inline" /> that crossed chains.
              </h1>
            </Reveal>
            <Reveal delay={0.12}>
              <p className="mt-7 max-w-md text-lg leading-relaxed text-[#b8c7d2]">
                Paste a transaction hash. Get back what actually happened, with the proof attached.
              </p>
            </Reveal>
            <Reveal delay={0.18}>
              <div className="mt-9 flex flex-wrap items-center gap-x-5 gap-y-3">
                <Link
                  href="/check"
                  className="group inline-flex items-center gap-2 rounded-full bg-paper px-6 py-3.5 font-medium text-ink transition-transform hover:-translate-y-0.5"
                >
                  Check a swap
                  <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
                </Link>
                <span className="font-[family-name:var(--font-mono)] text-sm text-mute">
                  no wallet, read only
                </span>
              </div>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <TallyMatch className="mx-auto max-w-sm text-[#dbe5ec]" />
          </Reveal>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-20">
        <Reveal>
          <div className="rule-hair flex flex-wrap items-center gap-x-10 gap-y-6 border-t pt-7">
            <span className="font-[family-name:var(--font-mono)] text-xs tracking-wide text-mute uppercase">
              Reads across
            </span>
            {CHAINS.map(({ name, Mark }) => (
              <span key={name} className="flex items-center gap-2.5 text-mute transition-colors hover:text-[#dbe5ec]">
                <Mark size={21} />
                <span className="text-sm">{name}</span>
              </span>
            ))}
          </div>
        </Reveal>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <Reveal>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,4.4vw,2.8rem)] leading-tight tracking-[-0.015em]">
            The case it was built on was wrong.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-[#b8c7d2]">
            A $193,000 deposit, reported publicly as lost. One hash resolved it.
          </p>
        </Reveal>

        <Journey />

        <Reveal delay={0.1}>
          <p className="mt-10 max-w-2xl border-l-2 border-l-tally pl-5 leading-relaxed text-[#b8c7d2]">
            The poster cited a refund field reading zero as proof of loss. On a settled swap that is
            the correct value.
          </p>
        </Reveal>
      </section>

      <section className="relative border-t border-t-[#16242f] bg-[#0a1219]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,4.4vw,2.8rem)] leading-tight tracking-[-0.015em]">
              Not a broken system. An unanswerable one.
            </h2>
            <p className="mt-4 max-w-xl leading-relaxed text-[#b8c7d2]">
              978 of 1,000 swaps settle. The problem is the tail nobody can see into.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            <Reveal delay={0.04}>
              <Stat value="44" label="swaps took a deposit and went nowhere" />
            </Reveal>
            <Reveal delay={0.1}>
              <Stat value="$334k" label="of quoted notional sitting in them" />
            </Reveal>
            <Reveal delay={0.16}>
              <Stat value="255 days" label="median age, the oldest waited 292" />
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <p className="mt-12 font-[family-name:var(--font-mono)] text-xs leading-relaxed text-mute">
              Measured 26 Oct 2026. Counts only, no addresses. Reproduce with{" "}
              <span className="text-tally-bright">quittance study</span>.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,4.4vw,2.8rem)] leading-tight tracking-[-0.015em]">
            Eight answers, never a guess.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-[#b8c7d2]">
            Each verdict carries its evidence, its next step, and the edge of what it can see.
          </p>
        </Reveal>

        <div className="mt-11 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LABELS.map((label, i) => (
            <Reveal key={label.name} delay={i * 0.04}>
              <div className="flex items-center gap-3 rounded-xl border border-[#1e3140] bg-[#0f1b24] px-4 py-3.5">
                <label.Icon size={17} className={label.tone} />
                <span className="font-[family-name:var(--font-mono)] text-[0.8rem] text-[#dbe5ec]">
                  {label.name}
                </span>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <Reveal>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.6rem,4.4vw,2.8rem)] leading-tight tracking-[-0.015em]">
            The identifier you hold cannot be looked up.
          </h2>
          <p className="mt-4 max-w-xl leading-relaxed text-[#b8c7d2]">
            Three reads of one swap, three different ids. It traces a request, not the money.
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="paper paper-edge mt-9 max-w-2xl rounded-lg p-6 font-[family-name:var(--font-mono)] text-[0.76rem] leading-relaxed sm:p-7 sm:text-[0.82rem]">
            <div className="break-token space-y-1.5">
              <div>correlationId 7ff00f92-f61e-45b5-a7d1-9d52dbe057aa</div>
              <div>correlationId b9784595-5a17-4a15-a3cb-1be0c464a79f</div>
              <div>correlationId 98b41cc8-98d0-4650-a803-4ac5ef0e7e4b</div>
            </div>
            <div className="mt-4 border-t border-t-[#ddd8cc] pt-3 text-[#4a5b66]">
              Same deposit. Same settlement. Quittance keys from a transaction hash instead.
            </div>
          </div>
        </Reveal>
      </section>

      <section className="relative border-t border-t-[#16242f]">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="grid gap-8 sm:grid-cols-3">
            {REFUSALS.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.06}>
                <div className="rule-hair border-t pt-5">
                  <item.Icon size={20} className="text-tally-bright" />
                  <h3 className="mt-4 font-medium text-[#eaf3f2]">{item.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-mute">{item.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <footer className="relative border-t border-t-[#16242f]">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-12 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 text-sm text-mute">
            <TallyMark size={22} />
            <span>A written receipt proving an obligation has been discharged.</span>
          </div>
          <a
            href="https://github.com/AustinChris1/quittance"
            className="inline-flex items-center gap-2 text-sm text-mute transition-colors hover:text-[#dbe5ec]"
          >
            <Github size={16} />
            Source
          </a>
        </div>
      </footer>
    </main>
  );
}
