import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  CircleHelp,
  DoorOpen,
  EyeOff,
  Github,
  Lock,
  PackageX,
  RotateCcw,
  Timer,
} from "lucide-react";
import { TallyMark, Wordmark } from "../components/logo";
import { Guilloche } from "../components/guilloche";
import { ScrollCinema } from "../components/scroll-cinema";
import { CHAINS, ChainLogo } from "../components/chains";
import { ThemeToggle } from "../components/theme";

const STOPS = [
  {
    chain: "NEAR" as const,
    date: "11 Sep",
    title: "575,830 TRX lands",
    detail: "Credited to intents.near",
    source: "NEAR chain",
    tone: "border-line",
    accent: "text-fg",
  },
  {
    chain: "Ethereum" as const,
    date: "27 Sep",
    title: "190,995.29 USDT delivered",
    detail: "Reached the quoted recipient",
    source: "Ethereum, block 26,068,435",
    tone: "border-mint",
    accent: "text-mint-ink",
  },
  {
    chain: null,
    date: "9 Oct",
    title: "Reported as lost",
    detail: "Twelve days after it arrived. Still unanswered.",
    source: "Forum thread 42664",
    tone: "border-coral",
    accent: "text-coral-ink",
  },
];

const ANSWERS = [
  { name: "Delivered", Icon: CheckCircle2, tint: "bg-mint-wash text-mint-ink" },
  { name: "Refunded", Icon: RotateCcw, tint: "bg-mint-wash text-mint-ink" },
  { name: "In flight", Icon: Timer, tint: "bg-[color-mix(in_oklab,var(--cyan)_18%,transparent)] text-fg" },
  { name: "Stranded", Icon: PackageX, tint: "bg-[color-mix(in_oklab,var(--coral)_18%,transparent)] text-coral-ink" },
  { name: "Wrong door", Icon: DoorOpen, tint: "bg-[color-mix(in_oklab,var(--coral)_18%,transparent)] text-coral-ink" },
  { name: "Locked out", Icon: Lock, tint: "bg-[color-mix(in_oklab,var(--coral)_18%,transparent)] text-coral-ink" },
  { name: "Shielded", Icon: EyeOff, tint: "bg-[color-mix(in_oklab,var(--violet)_20%,transparent)] text-fg" },
  { name: "Undetermined", Icon: CircleHelp, tint: "bg-paper text-muted" },
];

const RECEIPT = [
  ["deposit", "TBy2io3Q3Jt4UM4ejDhkkUQJZgZuXw2sus"],
  ["status", "SUCCESS · last changed 27 Sep 2026"],
  ["credited", "575,830 TRX to intents.near"],
  ["destination", "0x9be9c2f8…e13421a on Ethereum"],
  ["proven", "190,995.293894 USDT · block 26,068,435"],
];

export default function Home() {
  // Twice over so the marquee loops without a seam.
  const marquee = [...CHAINS, ...CHAINS];

  return (
    <main className="relative overflow-hidden">
      <ScrollCinema />

      <header className="relative z-20 mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <Wordmark />
        <nav className="flex items-center gap-3 text-sm">
          <a
            className="hidden px-3 text-muted transition-colors hover:text-fg sm:inline"
            href="https://github.com/AustinChris1/quittance"
          >
            Repository
          </a>
          <Link className="px-2 text-muted transition-colors hover:text-fg sm:px-3" href="/docs">
            Docs
          </Link>
          <ThemeToggle />
          <Link
            href="/check"
            className="rounded-full bg-fg px-5 py-2.5 font-medium text-bg transition-transform hover:-translate-y-0.5"
          >
            Check a swap
          </Link>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-6 pt-10 pb-24 lg:min-h-[min(78vh,760px)] lg:grid-cols-[1.15fr_0.85fr]">
        <div className="min-w-0">
          <p className="reveal inline-flex items-center gap-2 rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-muted">
            <span className="size-1.5 rounded-full bg-mint" />
            NEAR Intents, resolved
          </p>
          <h1
            className="display reveal mt-7 text-[clamp(2.7rem,7.6vw,6.4rem)]"
            style={{ animationDelay: "0.06s" }}
          >
            A receipt for money that crossed chains.
          </h1>
          <p
            className="reveal mt-7 max-w-lg text-lg leading-relaxed text-muted"
            style={{ animationDelay: "0.14s" }}
          >
            Paste a transaction hash, a deposit address or your wallet. Get back what actually
            happened to the swap, with both ends proven on their own chains.
          </p>
          <div className="reveal mt-10 flex flex-wrap items-center gap-3" style={{ animationDelay: "0.2s" }}>
            <Link
              href="/check"
              className="group inline-flex items-center gap-2 rounded-full bg-fg px-7 py-4 font-medium text-bg transition-transform hover:-translate-y-0.5"
            >
              Check a swap
              <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href="/check?q=8a33DkKfZMWRKbK2pXuQAWVLXSy4AyZF6PfcENvCJgCb"
              className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-6 py-4 font-medium transition-colors hover:border-fg"
            >
              See the $193K case
              <ArrowUpRight size={17} />
            </Link>
          </div>
        </div>

        <div className="relative flex justify-center lg:justify-end" data-hero-note>
          <div className="relative aspect-square w-[min(88vw,480px)]">
            <div className="absolute inset-[8%] rounded-full bg-mint-wash" />
            <div className="absolute inset-0 text-mint" data-parallax="-24">
              <Guilloche size={480} rings={13} className="rosette-slow h-full w-full" drawable />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex size-28 items-center justify-center rounded-full bg-fg shadow-[0_20px_60px_-20px_rgba(0,0,0,0.45)] sm:size-32">
                <TallyMark size={58} className="text-bg" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Official chain logos */}
      <section className="relative z-10 border-y border-line bg-surface py-7">
        <div className="mx-auto mb-4 max-w-7xl px-6">
          <p className="text-xs font-medium tracking-[0.18em] text-faint uppercase">Reads across</p>
        </div>
        <div className="relative overflow-hidden">
          <div className="marquee flex w-max items-center gap-14 pr-14">
            {marquee.map((c, i) => (
              <span key={`${c.name}-${i}`} className="flex items-center gap-3">
                <ChainLogo name={c.name} size={36} />
                <span className="text-lg font-semibold tracking-tight">{c.name}</span>
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* The case */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-28">
        <p className="text-xs font-semibold tracking-[0.18em] text-coral-ink uppercase">Case 42664</p>
        <h2 className="display mt-5 max-w-4xl text-[clamp(2rem,5vw,4rem)]" data-words>
          The case it was built on was wrong.
        </h2>
        <p className="mt-6 max-w-xl text-lg text-muted">
          A $193,000 deposit, reported publicly as lost. One hash resolved it.
        </p>

        <div className="relative mt-16">
          <span
            className="absolute top-[72px] right-[16%] left-[16%] hidden h-0.5 bg-gradient-to-r from-fg/25 via-mint to-coral md:block"
            data-thread-x
            aria-hidden
          />
          <ol className="grid gap-5 md:grid-cols-3">
            {STOPS.map((stop) => (
              <li
                key={stop.date}
                data-stop
                className={`relative rounded-3xl border-2 ${stop.tone} bg-surface p-7`}
              >
                <div className="flex size-14 items-center justify-center rounded-2xl bg-paper">
                  {stop.chain ? (
                    <ChainLogo name={stop.chain} size={34} />
                  ) : (
                    <span className="text-2xl font-bold text-coral-ink">!</span>
                  )}
                </div>
                <p className="mt-6 font-[family-name:var(--font-mono)] text-sm text-faint">{stop.date}</p>
                <p className={`figure mt-2 text-[1.6rem] leading-tight ${stop.accent}`}>{stop.title}</p>
                <p className="mt-2 text-muted">{stop.detail}</p>
                <p className="mt-5 font-[family-name:var(--font-mono)] text-xs text-faint">{stop.source}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-10 rounded-3xl bg-paper p-7 sm:p-9">
          <p className="max-w-3xl text-lg leading-relaxed">
            The poster cited a refund field reading <span className="font-semibold">zero</span> as
            proof of loss. On a settled swap, zero is the{" "}
            <span className="font-semibold text-mint-ink">correct value</span>.
          </p>
        </div>
      </section>

      {/* The numbers */}
      <section className="relative z-10 bg-fg text-bg">
        <div className="mx-auto max-w-7xl px-6 py-28">
          <h2 className="display max-w-4xl text-[clamp(2rem,5vw,4rem)]" data-words>
            Not a broken system. An unanswerable one.
          </h2>
          <p className="mt-6 max-w-xl text-lg opacity-70">
            978 of 1,000 swaps settle. The problem is the tail nobody can see into.
          </p>

          <div className="mt-20 grid gap-14 sm:grid-cols-3">
            {[
              { count: 44, prefix: "", suffix: "", label: "swaps took a deposit and went nowhere" },
              { count: 334, prefix: "$", suffix: "k", label: "of quoted notional sitting in them" },
              { count: 255, prefix: "", suffix: "", label: "days, the median age. The oldest waited 292." },
            ].map((d) => (
              <div key={d.label} className="border-t border-current/20 pt-6">
                <div
                  className="figure text-[clamp(3.6rem,8vw,6.4rem)] leading-none text-mint"
                  data-count={d.count}
                  data-prefix={d.prefix}
                  data-suffix={d.suffix}
                >
                  {d.prefix}
                  {d.count}
                  {d.suffix}
                </div>
                <p className="mt-4 max-w-[16rem] text-lg opacity-75">{d.label}</p>
              </div>
            ))}
          </div>

          <p className="mt-16 font-[family-name:var(--font-mono)] text-xs opacity-55">
            Measured 26 Oct 2026 against the Intents Explorer. Counts only, no addresses.
          </p>
        </div>
      </section>

      {/* The receipt assembles as you scroll */}
      <section className="relative z-10" data-assemble-scope>
        <div className="mx-auto grid max-w-7xl items-center gap-14 px-6 py-28 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold tracking-[0.18em] text-mint-ink uppercase">The receipt</p>
            <h2 className="display mt-5 text-[clamp(2rem,5vw,4rem)]" data-words>
              One hash in. The proof out.
            </h2>
            <p className="mt-6 max-w-md text-lg text-muted">
              Every line is read from a public chain, and delivery is proven against the destination
              chain itself, not taken from the operator.
            </p>
          </div>

          <div className="note-edge rounded-2xl bg-paper p-7 shadow-[0_40px_90px_-50px_rgba(0,0,0,0.5)] sm:p-9">
            <div className="flex items-center justify-between border-b border-line pb-4">
              <span className="flex items-center gap-2.5 font-semibold">
                <TallyMark size={22} />
                Quittance receipt
              </span>
              <span className="rounded-full bg-mint px-3 py-1 text-xs font-bold text-black">DELIVERED</span>
            </div>
            <dl className="mt-5 space-y-3.5">
              {RECEIPT.map(([k, v]) => (
                <div key={k} data-assemble className="grid grid-cols-[110px_1fr] gap-3 text-sm">
                  <dt className="font-[family-name:var(--font-mono)] text-faint">{k}</dt>
                  <dd className="break-token font-[family-name:var(--font-mono)]">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Eight answers */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-28">
        <h2 className="display max-w-4xl text-[clamp(2rem,5vw,4rem)]" data-words>
          Eight answers. Never a guess.
        </h2>
        <p className="mt-6 max-w-xl text-lg text-muted">
          Each verdict carries its evidence, its next step, and the edge of what it can see.
        </p>
        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {ANSWERS.map((a) => (
            <div
              key={a.name}
              data-stop
              className="rounded-3xl border border-line bg-surface p-6 transition-transform hover:-translate-y-1"
            >
              <span className={`flex size-12 items-center justify-center rounded-2xl ${a.tint}`}>
                <a.Icon size={22} />
              </span>
              <p className="mt-5 text-lg font-semibold tracking-tight">{a.name}</p>
            </div>
          ))}
        </div>
      </section>

      {/* The identifier */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-28">
        <div className="grid items-center gap-12 rounded-[2rem] bg-paper p-8 sm:p-14 lg:grid-cols-2">
          <div>
            <h2 className="display text-[clamp(1.8rem,4vw,3.2rem)]">The id you hold cannot be looked up.</h2>
            <p className="mt-5 max-w-md text-lg text-muted">
              Three reads of one swap, three different ids. It traces a request, not the money.
            </p>
          </div>
          <div className="space-y-2.5">
            {["7ff00f92-f61e-45b5-a7d1-9d52dbe057aa", "b9784595-5a17-4a15-a3cb-1be0c464a79f", "98b41cc8-98d0-4650-a803-4ac5ef0e7e4b"].map(
              (id, i) => (
                <div
                  key={id}
                  data-stop
                  className="break-token flex items-center gap-4 rounded-2xl border border-line bg-surface px-5 py-4 font-[family-name:var(--font-mono)] text-sm"
                >
                  <span className="text-faint">{i + 1}</span>
                  {id}
                </div>
              ),
            )}
          </div>
        </div>
      </section>

      {/* Closing band */}
      <section className="relative z-10 overflow-hidden bg-mint text-black">
        <div className="pointer-events-none absolute -top-40 -right-40 opacity-25" aria-hidden>
          <Guilloche size={560} rings={12} className="rosette-slow w-[560px]" />
        </div>
        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32">
          <h2 className="display max-w-4xl text-[clamp(2.4rem,6.5vw,5.6rem)]">
            Find out what happened to your swap.
          </h2>
          <Link
            href="/check"
            className="group mt-10 inline-flex items-center gap-2 rounded-full bg-black px-8 py-4 text-lg font-medium text-white transition-transform hover:-translate-y-0.5"
          >
            Check a swap
            <ArrowRight size={19} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <footer className="relative z-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-10 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-3 text-sm text-muted">
            <TallyMark size={22} />
            A written receipt proving an obligation has been discharged.
          </span>
          <a
            href="https://github.com/AustinChris1/quittance"
            className="inline-flex items-center gap-2 text-sm text-muted transition-colors hover:text-fg"
          >
            <Github size={16} />
            Source
          </a>
        </div>
      </footer>
    </main>
  );
}
