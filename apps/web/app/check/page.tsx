"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import {
  ArrowLeft,
  CheckCircle2,
  CircleHelp,
  Copy,
  DoorOpen,
  EyeOff,
  Loader2,
  Lock,
  PackageX,
  RotateCcw,
  Search,
  ShieldCheck,
  Timer,
  type LucideIcon,
} from "lucide-react";
import { TallyMark, Wordmark } from "../../components/logo";
import { ThemeToggle } from "../../components/theme";
import { ChainLogo, type ChainName } from "../../components/chains";

type Verdict = {
  label: string;
  headline: string;
  rule: string;
  basis: string[];
  limits: string[];
  next: string;
};

type Receipt = {
  quittance: { version: string; generatedAt: string };
  input: { depositAddress?: string; memo?: string; nearTxHash?: string };
  verdict: Verdict;
  evidence: Record<string, unknown> & {
    mode: string;
    status?: string;
    correlationId?: string;
    statusUpdatedAt?: string;
    destinationChainTxHashes: string[];
    delivery?: {
      verified: boolean;
      chain: string;
      deliveredFormatted?: string;
      blockNumber?: number;
      blockTimeIso?: string;
      reason?: string;
    };
    creditedTo?: { account: string; token: string; amount: string };
  };
  sources: { name: string; url: string; ok: boolean; detail?: string }[];
  fingerprint: string;
};

type Tone = { Icon: LucideIcon; chip: string; text: string };

const GOOD = "bg-mint text-black";
const BAD = "bg-coral text-black";
const QUIET = "bg-paper text-fg";

const TONE: Record<string, Tone> = {
  DELIVERED: { Icon: CheckCircle2, chip: GOOD, text: "text-mint-ink" },
  REFUNDED_OK: { Icon: RotateCcw, chip: GOOD, text: "text-mint-ink" },
  STRANDED: { Icon: PackageX, chip: BAD, text: "text-coral-ink" },
  WRONG_DOOR: { Icon: DoorOpen, chip: BAD, text: "text-coral-ink" },
  LOCKED_OUT: { Icon: Lock, chip: BAD, text: "text-coral-ink" },
  SHIELDED_UNPROVEN: { Icon: EyeOff, chip: "bg-violet text-black", text: "text-fg" },
  IN_FLIGHT: { Icon: Timer, chip: "bg-cyan text-black", text: "text-fg" },
  UNDETERMINED: { Icon: CircleHelp, chip: QUIET, text: "text-muted" },
};

const SAMPLE = "8a33DkKfZMWRKbK2pXuQAWVLXSy4AyZF6PfcENvCJgCb";

const READS: { label: string; chain: ChainName }[] = [
  { label: "Resolving the hash through the Intents Explorer", chain: "NEAR" },
  { label: "Reading the swap status", chain: "NEAR" },
  { label: "Reading the deposit on its origin chain", chain: "Tron" },
  { label: "Proving delivery on the destination chain", chain: "Ethereum" },
];

/** Map the receipt's chain names onto the vendored official logos. */
function chainFor(name?: string): ChainName | null {
  const n = (name ?? "").toLowerCase();
  if (n.includes("eth")) return "Ethereum";
  if (n.includes("base")) return "Base";
  if (n.includes("sol")) return "Solana";
  if (n.includes("btc") || n.includes("bitcoin")) return "Bitcoin";
  if (n.includes("tron")) return "Tron";
  if (n.includes("near")) return "NEAR";
  return null;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-1 gap-1 border-b border-line py-3 last:border-0 sm:grid-cols-[150px_1fr] sm:gap-4">
      <span className="font-[family-name:var(--font-mono)] text-xs text-faint">{label}</span>
      <span className="break-token font-[family-name:var(--font-mono)] text-sm">{value}</span>
    </div>
  );
}

export default function CheckPage() {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ receipt: Receipt; inputKind: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const reduced = useReducedMotion();
  const ran = useRef(false);

  // A result is linkable: /check?q=<hash> resolves on load.
  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    const q = new URLSearchParams(window.location.search).get("q");
    if (q && q.trim().length >= 8) {
      setQuery(q.trim());
      void submit(q.trim());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(value: string) {
    const trimmed = value.trim();
    if (trimmed.length < 8) {
      setError("Paste a deposit address or a transaction hash.");
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(typeof body.error === "string" ? body.error : "That lookup did not work.");
      } else {
        setResult({ receipt: body.receipt as Receipt, inputKind: body.inputKind as string });
        window.history.replaceState(null, "", `/check?q=${encodeURIComponent(trimmed)}`);
      }
    } catch {
      setError("The lookup could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // clipboard denied; nothing to recover
    }
  }

  const tone = result ? (TONE[result.receipt.verdict.label] ?? TONE.UNDETERMINED!) : null;
  const delivery = result?.receipt.evidence.delivery;
  const deliveryChain = chainFor(delivery?.chain);
  const ease = [0.16, 1, 0.3, 1] as const;

  return (
    <main className="relative min-h-dvh">
      <header className="relative mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <Link href="/" className="transition-opacity hover:opacity-75">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm transition-colors hover:border-fg"
          >
            <ArrowLeft size={15} />
            Back
          </Link>
        </div>
      </header>

      <section className="relative mx-auto max-w-5xl px-6 pt-10 pb-28">
        <h1 className="display text-[clamp(2.2rem,6vw,4.4rem)]">What happened to this swap?</h1>
        <p className="mt-5 max-w-xl text-lg text-muted">
          A transaction hash from either side, or the deposit address the quote issued. Nothing is
          signed and nothing moves.
        </p>

        <form
          className="mt-10"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(query);
          }}
        >
          <div className="flex flex-col gap-3 rounded-[1.75rem] border border-line bg-surface p-2.5 shadow-[0_20px_60px_-40px_rgba(0,0,0,0.35)] sm:flex-row">
            <div className="relative flex-1">
              <Search size={19} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-faint" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                placeholder="Transaction hash or deposit address"
                aria-label="Transaction hash or deposit address"
                className="w-full rounded-2xl bg-transparent py-4 pr-4 pl-12 font-[family-name:var(--font-mono)] text-sm outline-none placeholder:text-faint"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-fg px-7 py-4 font-medium text-bg transition-transform disabled:opacity-60 enabled:hover:-translate-y-0.5"
            >
              {busy ? <Loader2 size={18} className="animate-spin" /> : null}
              {busy ? "Reading" : "Resolve"}
            </button>
          </div>
        </form>

        <button
          type="button"
          onClick={() => {
            setQuery(SAMPLE);
            void submit(SAMPLE);
          }}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-mint-wash px-4 py-2 text-sm font-medium text-mint-ink transition-transform hover:-translate-y-0.5"
        >
          <span className="size-1.5 rounded-full bg-mint" />
          Try the $193K case
        </button>

        <AnimatePresence mode="wait">
          {busy ? (
            <motion.div
              key="busy"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-12 rounded-[1.75rem] border border-line bg-surface p-7"
            >
              <p className="text-sm font-semibold">Reading public records</p>
              <ul className="mt-5 space-y-4">
                {READS.map((r, i) => (
                  <motion.li
                    key={r.label}
                    initial={reduced ? { opacity: 0 } : { opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.35, duration: 0.4, ease }}
                    className="flex items-center gap-3.5"
                  >
                    <ChainLogo name={r.chain} size={26} />
                    <span className="text-sm text-muted">{r.label}</span>
                    <Loader2 size={15} className="ml-auto animate-spin text-faint" />
                  </motion.li>
                ))}
              </ul>
              <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-paper">
                <motion.div
                  className="h-full w-1/3 rounded-full bg-mint"
                  animate={reduced ? {} : { x: ["-100%", "320%"] }}
                  transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>
            </motion.div>
          ) : null}

          {error ? (
            <motion.p
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-10 rounded-2xl bg-[color-mix(in_oklab,var(--coral)_16%,transparent)] px-5 py-4 text-sm text-coral-ink"
            >
              {error}
            </motion.p>
          ) : null}

          {result && tone ? (
            <motion.article
              key={result.receipt.fingerprint}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease }}
              className="mt-12"
            >
              <div className="flex flex-wrap items-center gap-3">
                <span className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-bold ${tone.chip}`}>
                  <tone.Icon size={17} />
                  {result.receipt.verdict.label.replace(/_/g, " ")}
                </span>
                <span className="text-sm text-faint">read as {result.inputKind}</span>
                <button
                  type="button"
                  onClick={copyLink}
                  className="ml-auto inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm transition-colors hover:border-fg"
                >
                  <Copy size={14} />
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>

              <h2 className="display mt-6 max-w-3xl text-[clamp(1.7rem,3.6vw,2.6rem)]">
                {result.receipt.verdict.headline}
              </h2>

              {delivery?.verified ? (
                <motion.div
                  initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.97 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.15, duration: 0.5, ease }}
                  className="mt-8 flex flex-wrap items-center gap-5 rounded-[1.75rem] bg-mint p-6 text-black sm:p-7"
                >
                  <span className="flex size-14 items-center justify-center rounded-2xl bg-white">
                    {deliveryChain ? <ChainLogo name={deliveryChain} size={34} /> : <ShieldCheck size={26} />}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold opacity-70">
                      Proven on {delivery.chain}, read from the chain itself
                    </p>
                    <p className="figure mt-1 text-[clamp(1.7rem,4vw,2.4rem)] leading-none">
                      {delivery.deliveredFormatted} delivered
                    </p>
                  </div>
                  {delivery.blockNumber ? (
                    <div className="ml-auto font-[family-name:var(--font-mono)] text-sm">
                      <div>block {delivery.blockNumber.toLocaleString("en-US")}</div>
                      {delivery.blockTimeIso ? (
                        <div className="opacity-70">{delivery.blockTimeIso.slice(0, 16).replace("T", " ")} UTC</div>
                      ) : null}
                    </div>
                  ) : null}
                </motion.div>
              ) : null}

              <div className="note-edge mt-8 rounded-[1.75rem] bg-paper p-7 sm:p-9">
                <div className="flex items-center justify-between border-b border-line pb-4">
                  <span className="flex items-center gap-2.5 font-semibold">
                    <TallyMark size={22} />
                    Quittance receipt
                  </span>
                  <span className="font-[family-name:var(--font-mono)] text-xs text-faint">
                    {result.receipt.quittance.generatedAt.slice(0, 19).replace("T", " ")} UTC
                  </span>
                </div>

                <div className="mt-2">
                  {result.receipt.input.depositAddress ? (
                    <Row label="deposit address" value={result.receipt.input.depositAddress} />
                  ) : null}
                  <Row label="status" value={result.receipt.evidence.status ?? "not read"} />
                  {result.receipt.evidence.statusUpdatedAt ? (
                    <Row label="last changed" value={result.receipt.evidence.statusUpdatedAt} />
                  ) : null}
                  {result.receipt.evidence.creditedTo ? (
                    <Row
                      label="credited"
                      value={`${result.receipt.evidence.creditedTo.amount} ${result.receipt.evidence.creditedTo.token} to ${result.receipt.evidence.creditedTo.account}`}
                    />
                  ) : null}
                  <Row
                    label="destination tx"
                    value={
                      result.receipt.evidence.destinationChainTxHashes.length > 0
                        ? result.receipt.evidence.destinationChainTxHashes.join(", ")
                        : "none"
                    }
                  />
                </div>

                <div className="mt-7 grid gap-6 md:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold tracking-[0.14em] text-mint-ink uppercase">What was observed</p>
                    <ul className="mt-3 space-y-2.5">
                      {result.receipt.verdict.basis.map((line) => (
                        <li key={line} className="flex gap-2.5 text-sm leading-relaxed">
                          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-mint-ink" />
                          <span className="break-token">{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-xs font-semibold tracking-[0.14em] text-faint uppercase">What it cannot see</p>
                    <ul className="mt-3 space-y-2.5">
                      {result.receipt.verdict.limits.map((line) => (
                        <li key={line} className="flex gap-2.5 text-sm leading-relaxed text-muted">
                          <EyeOff size={16} className="mt-0.5 shrink-0" />
                          <span>{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className={`mt-7 rounded-2xl bg-surface p-5 ${tone.text}`}>
                  <p className="text-xs font-semibold tracking-[0.14em] uppercase opacity-80">Next</p>
                  <p className="mt-2 text-[0.95rem] leading-relaxed text-fg">{result.receipt.verdict.next}</p>
                </div>

                <div className="mt-6 flex flex-col gap-1 font-[family-name:var(--font-mono)] text-xs text-faint">
                  <span>rule {result.receipt.verdict.rule}</span>
                  <span className="break-token">fingerprint {result.receipt.fingerprint}</span>
                </div>
              </div>

              <details className="mt-6">
                <summary className="cursor-pointer text-sm text-muted transition-colors hover:text-fg">
                  {result.receipt.sources.length} sources read
                </summary>
                <ul className="mt-3 space-y-2">
                  {result.receipt.sources.map((s) => (
                    <li key={s.url + s.name} className="flex items-center gap-2.5 font-[family-name:var(--font-mono)] text-xs">
                      <span className={`size-1.5 rounded-full ${s.ok ? "bg-mint" : "bg-coral"}`} />
                      <span>{s.name}</span>
                      {s.detail ? <span className="text-faint">{s.detail}</span> : null}
                    </li>
                  ))}
                </ul>
              </details>
            </motion.article>
          ) : null}
        </AnimatePresence>
      </section>
    </main>
  );
}
