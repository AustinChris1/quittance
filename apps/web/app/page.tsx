import Link from "next/link";
import { ArrowRight, FileCheck2, KeyRound, ShieldOff, Github } from "lucide-react";
import { TallyMark, Wordmark } from "../components/logo";
import { Reveal } from "../components/reveal";

const TIMELINE = [
  {
    when: "11 Sep, 16:25 UTC",
    what: "Quote created. 575,830 TRX in.",
    source: "Intents Explorer record",
  },
  {
    when: "11 Sep, 16:27 UTC",
    what: "575,830 TRX credited to intents.near.",
    source: "NEAR chain",
  },
  {
    when: "27 Sep, 11:16 UTC",
    what: "190,995.29 USDT delivered to the recipient.",
    source: "Ethereum, block 26,068,435",
    settled: true,
  },
  {
    when: "9 Oct",
    what: "Reported on the forum as failed since 12 Sep, zero refund, no reply.",
    source: "gov.near.org thread 42664",
    wrong: true,
  },
];

const REFUSALS = [
  { icon: KeyRound, title: "Holds no keys", body: "Every read is read-only. There is nothing to steal." },
  { icon: ShieldOff, title: "Claims no recoveries", body: "No figure for money rescued appears anywhere." },
  { icon: FileCheck2, title: "Files nothing for you", body: "It produces the attachment. A human decides to send it." },
];

function Stat({ value, label, hint }: { value: string; label: string; hint?: string }) {
  return (
    <div className="rule-hair border-t pt-5">
      <div className="font-[family-name:var(--font-display)] text-4xl leading-none text-tally-bright sm:text-5xl">
        {value}
      </div>
      <div className="mt-2.5 text-sm font-medium text-[#dbe5ec]">{label}</div>
      {hint ? <div className="mt-1 text-[0.8rem] leading-relaxed text-mute">{hint}</div> : null}
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

      <section className="relative mx-auto max-w-6xl px-6 pt-16 pb-24 sm:pt-24">
        <Reveal>
          <p className="font-[family-name:var(--font-mono)] text-xs uppercase tracking-[0.18em] text-tally-bright">
            NEAR Intents, resolved
          </p>
        </Reveal>
        <Reveal delay={0.06}>
          <h1 className="mt-6 max-w-4xl font-[family-name:var(--font-display)] text-[clamp(2.6rem,7vw,5.2rem)] leading-[0.98] tracking-[-0.02em]">
            A receipt for money
            <br />
            that crossed chains.
          </h1>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[#b8c7d2]">
            Paste a transaction hash. Quittance reads the public record, works out what actually
            happened to the swap, and hands back the evidence behind its answer.
          </p>
        </Reveal>
        <Reveal delay={0.18}>
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/check"
              className="group inline-flex items-center gap-2 rounded-full bg-paper px-6 py-3.5 font-medium text-ink transition-transform hover:-translate-y-0.5"
            >
              Check a swap
              <ArrowRight size={17} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <span className="font-[family-name:var(--font-mono)] text-sm text-mute">
              no wallet, no signing, read only
            </span>
          </div>
        </Reveal>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 pb-24">
        <Reveal>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.9rem,3.6vw,2.8rem)] leading-tight tracking-[-0.015em]">
            The case it was built on was wrong.
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-[#b8c7d2]">
            A deposit of roughly 193,000 dollars was reported publicly as lost. Resolving it took
            one transaction hash. The money had already arrived.
          </p>
        </Reveal>

        <ol className="mt-12 space-y-px">
          {TIMELINE.map((row, i) => (
            <Reveal key={row.when} delay={i * 0.05}>
              <li
                className={`rule-hair grid grid-cols-1 gap-2 border-t py-5 sm:grid-cols-[180px_1fr_auto] sm:items-baseline sm:gap-6 ${
                  row.settled ? "text-[#eaf3f2]" : ""
                }`}
              >
                <span className="font-[family-name:var(--font-mono)] text-sm text-mute">
                  {row.when}
                </span>
                <span
                  className={`leading-relaxed ${
                    row.settled
                      ? "text-tally-bright"
                      : row.wrong
                        ? "text-caution"
                        : "text-[#dbe5ec]"
                  }`}
                >
                  {row.what}
                </span>
                <span className="font-[family-name:var(--font-mono)] text-xs text-mute">
                  {row.source}
                </span>
              </li>
            </Reveal>
          ))}
        </ol>

        <Reveal delay={0.1}>
          <p className="rule-hair mt-10 max-w-2xl border-l-2 border-l-tally pl-5 leading-relaxed text-[#b8c7d2]">
            Delivered twelve days before the complaint was filed. The thread is still open and
            still unanswered. The poster cited a refund field reading zero as proof they got
            nothing back, when on a settled swap that is exactly what it should read.
          </p>
        </Reveal>
      </section>

      <section className="relative border-t border-t-[#16242f] bg-[#0a1219]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.9rem,3.6vw,2.8rem)] leading-tight tracking-[-0.015em]">
              Not a broken system. An unanswerable one.
            </h2>
            <p className="mt-5 max-w-2xl leading-relaxed text-[#b8c7d2]">
              In a one hour window, 978 of 1,000 swaps settled. The failures are mostly quotes that
              never received a deposit. The problem is the tail, and the fact that nobody in it can
              get an answer.
            </p>
          </Reveal>

          <div className="mt-14 grid gap-10 sm:grid-cols-3">
            <Reveal delay={0.04}>
              <Stat
                value="44"
                label="swaps took a deposit and went nowhere"
                hint="No destination transaction, no refund charged."
              />
            </Reveal>
            <Reveal delay={0.1}>
              <Stat value="$334k" label="of quoted notional sitting in them" hint="Largest single one is $114,620." />
            </Reveal>
            <Reveal delay={0.16}>
              <Stat value="255 days" label="median age of those swaps" hint="The oldest has waited 292 days." />
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <p className="mt-12 max-w-2xl font-[family-name:var(--font-mono)] text-sm leading-relaxed text-mute">
              Measured 26 Oct 2026 against the Intents Explorer. Counts only, no addresses or
              per-user amounts. Reproduce it with{" "}
              <span className="text-tally-bright">quittance study</span>.
            </p>
          </Reveal>
        </div>
      </section>

      <section className="relative mx-auto max-w-6xl px-6 py-24">
        <Reveal>
          <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.9rem,3.6vw,2.8rem)] leading-tight tracking-[-0.015em]">
            Why the identifier fails you
          </h2>
          <p className="mt-5 max-w-2xl leading-relaxed text-[#b8c7d2]">
            Every support thread quotes a correlation id. It identifies one HTTP request, not the
            swap. Three consecutive lookups of the same swap return three different ones, so the
            handle people hold was never resolvable, by anyone.
          </p>
        </Reveal>
        <Reveal delay={0.08}>
          <div className="paper paper-edge mt-10 max-w-3xl rounded-lg p-6 font-[family-name:var(--font-mono)] text-[0.78rem] leading-relaxed sm:p-8 sm:text-sm">
            <div className="text-[#5d6b76]">three reads of one swap</div>
            <div className="mt-3 space-y-1.5">
              <div>correlationId  7ff00f92-f61e-45b5-a7d1-9d52dbe057aa</div>
              <div>correlationId  b9784595-5a17-4a15-a3cb-1be0c464a79f</div>
              <div>correlationId  98b41cc8-98d0-4650-a803-4ac5ef0e7e4b</div>
            </div>
            <div className="mt-4 border-t border-t-[#ddd8cc] pt-3 text-[#14202a]">
              same deposit, same status, same settlement. Quittance keys from a transaction hash
              instead.
            </div>
          </div>
        </Reveal>
      </section>

      <section className="relative border-t border-t-[#16242f]">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <Reveal>
            <h2 className="font-[family-name:var(--font-display)] text-[clamp(1.9rem,3.6vw,2.8rem)] leading-tight tracking-[-0.015em]">
              What it refuses to do
            </h2>
          </Reveal>
          <div className="mt-12 grid gap-8 sm:grid-cols-3">
            {REFUSALS.map((item, i) => (
              <Reveal key={item.title} delay={i * 0.06}>
                <div className="rule-hair border-t pt-5">
                  <item.icon size={20} className="text-tally-bright" />
                  <h3 className="mt-4 font-medium text-[#eaf3f2]">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-mute">{item.body}</p>
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
            <span>
              A quittance is a written receipt proving an obligation has been discharged.
            </span>
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
