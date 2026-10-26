"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { ArrowLeft, Loader2, Search } from "lucide-react";
import { Wordmark } from "../../components/logo";

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
    creditedTo?: { account: string; token: string; amount: string };
  };
  sources: { name: string; url: string; ok: boolean; detail?: string }[];
  fingerprint: string;
};

const TONE: Record<string, { dot: string; text: string; ring: string }> = {
  DELIVERED: { dot: "bg-tally-bright", text: "text-tally-bright", ring: "ring-tally" },
  REFUNDED_OK: { dot: "bg-tally-bright", text: "text-tally-bright", ring: "ring-tally" },
  STRANDED: { dot: "bg-caution", text: "text-caution", ring: "ring-caution" },
  WRONG_DOOR: { dot: "bg-caution", text: "text-caution", ring: "ring-caution" },
  LOCKED_OUT: { dot: "bg-caution", text: "text-caution", ring: "ring-caution" },
  SHIELDED_UNPROVEN: { dot: "bg-[#8fa3b0]", text: "text-[#c3d2dc]", ring: "ring-[#2a3f4e]" },
  IN_FLIGHT: { dot: "bg-[#8fa3b0]", text: "text-[#c3d2dc]", ring: "ring-[#2a3f4e]" },
  UNDETERMINED: { dot: "bg-[#8fa3b0]", text: "text-[#c3d2dc]", ring: "ring-[#2a3f4e]" },
};

const SAMPLE = "8a33DkKfZMWRKbK2pXuQAWVLXSy4AyZF6PfcENvCJgCb";

const READS = [
  "resolving the identifier through the Intents Explorer",
  "reading the swap status",
  "reading the deposit transaction on its origin chain",
  "checking the recipient balance",
];

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:gap-4">
      <span className="w-44 shrink-0 text-[#5d6b76]">{label}</span>
      <span className="break-all text-[#14202a]">{value}</span>
    </div>
  );
}

export default function CheckPage() {
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ receipt: Receipt; inputKind: string } | null>(null);
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
      }
    } catch {
      setError("The lookup could not reach the server.");
    } finally {
      setBusy(false);
    }
  }

  const tone = result ? (TONE[result.receipt.verdict.label] ?? TONE.UNDETERMINED!) : null;

  return (
    <main className="relative min-h-dvh">
      <div className="field-grain pointer-events-none absolute inset-0 opacity-40" aria-hidden />

      <header className="relative mx-auto flex max-w-4xl items-center justify-between px-6 py-7">
        <Link href="/" className="transition-opacity hover:opacity-80">
          <Wordmark />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm text-mute transition-colors hover:text-[#dbe5ec]"
        >
          <ArrowLeft size={15} />
          Back
        </Link>
      </header>

      <section className="relative mx-auto max-w-4xl px-6 pt-10 pb-24">
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(2rem,5vw,3.2rem)] leading-[1.05] tracking-[-0.02em]">
          What happened to this swap?
        </h1>
        <p className="mt-5 max-w-xl leading-relaxed text-[#b8c7d2]">
          A transaction hash from either side, or the deposit address the quote issued. Nothing is
          signed and nothing moves.
        </p>

        <form
          className="mt-9"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(query);
          }}
        >
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-mute"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                spellCheck={false}
                autoComplete="off"
                placeholder="Transaction hash or deposit address"
                aria-label="Transaction hash or deposit address"
                className="w-full rounded-xl border border-[#1e3140] bg-[#0f1b24] py-3.5 pr-4 pl-11 font-[family-name:var(--font-mono)] text-sm text-[#e6edf2] outline-none transition-colors placeholder:text-[#5e7180] focus:border-tally"
              />
            </div>
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-paper px-6 py-3.5 font-medium text-ink transition-transform disabled:opacity-60 enabled:hover:-translate-y-0.5"
            >
              {busy ? <Loader2 size={17} className="animate-spin" /> : null}
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
          className="mt-4 font-[family-name:var(--font-mono)] text-xs text-mute underline decoration-dotted underline-offset-4 transition-colors hover:text-tally-bright"
        >
          try the 193k case
        </button>

        <AnimatePresence mode="wait">
          {busy ? (
            <motion.div
              key="busy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-10 rounded-lg border border-[#1e3140] bg-[#0f1b24] p-6"
            >
              <p className="font-[family-name:var(--font-mono)] text-xs tracking-wide text-tally-bright">
                Reading public records
              </p>
              <ul className="mt-4 space-y-2.5">
                {READS.map((label, i) => (
                  <li key={label} className="flex items-center gap-3 text-sm text-mute">
                    <motion.span
                      className="size-1.5 rounded-full bg-tally-bright"
                      animate={reduced ? {} : { opacity: [0.25, 1, 0.25] }}
                      transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.18 }}
                    />
                    {label}
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-xs text-[#5e7180]">
                Several chains are consulted in turn, so this takes a few seconds.
              </p>
            </motion.div>
          ) : null}

          {error ? (
            <motion.p
              key="error"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mt-8 rounded-lg border border-caution/40 bg-caution/10 px-4 py-3 text-sm text-caution"
            >
              {error}
            </motion.p>
          ) : null}

          {result && tone ? (
            <motion.article
              key={result.receipt.fingerprint}
              initial={reduced ? { opacity: 0 } : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="mt-12"
            >
              <div className={`flex flex-wrap items-center gap-3 ring-1 ${tone.ring} rounded-full px-4 py-2 w-fit`}>
                <span className={`size-2 rounded-full ${tone.dot}`} />
                <span className={`font-[family-name:var(--font-mono)] text-sm font-medium ${tone.text}`}>
                  {result.receipt.verdict.label}
                </span>
                <span className="text-xs text-mute">read as {result.inputKind}</span>
              </div>

              <h2 className="mt-5 max-w-2xl font-[family-name:var(--font-display)] text-2xl leading-snug tracking-[-0.01em]">
                {result.receipt.verdict.headline}
              </h2>

              <div className="paper paper-edge mt-8 rounded-lg p-6 font-[family-name:var(--font-mono)] text-[0.78rem] leading-[1.9] sm:p-8 sm:text-[0.82rem]">
                <div className="flex items-baseline justify-between border-b border-b-[#ddd8cc] pb-3">
                  <span className="font-medium tracking-wide text-[#14202a]">QUITTANCE RECEIPT</span>
                  <span className="text-[#5d6b76]">
                    {result.receipt.quittance.generatedAt.slice(0, 19)}Z
                  </span>
                </div>

                <div className="mt-4 space-y-1">
                  {result.receipt.input.depositAddress ? (
                    <Field label="deposit_address" value={result.receipt.input.depositAddress} />
                  ) : null}
                  {result.receipt.evidence.correlationId ? (
                    <Field label="correlation_id" value={result.receipt.evidence.correlationId} />
                  ) : null}
                  <Field label="status" value={result.receipt.evidence.status ?? "not read"} />
                  {result.receipt.evidence.statusUpdatedAt ? (
                    <Field label="last_changed" value={result.receipt.evidence.statusUpdatedAt} />
                  ) : null}
                  {result.receipt.evidence.creditedTo ? (
                    <Field
                      label="credited_to"
                      value={`${result.receipt.evidence.creditedTo.account}  ${result.receipt.evidence.creditedTo.amount} ${result.receipt.evidence.creditedTo.token}`}
                    />
                  ) : null}
                  <Field
                    label="destination_tx"
                    value={
                      result.receipt.evidence.destinationChainTxHashes.length > 0
                        ? result.receipt.evidence.destinationChainTxHashes.join(", ")
                        : "none"
                    }
                  />
                </div>

                <div className="mt-5 border-t border-t-[#ddd8cc] pt-4">
                  <div className="text-[#5d6b76]">BASIS</div>
                  <ul className="mt-2 space-y-1.5">
                    {result.receipt.verdict.basis.map((line) => (
                      <li key={line} className="text-[#14202a]">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 border-t border-t-[#ddd8cc] pt-4">
                  <div className="text-[#5d6b76]">NEXT</div>
                  <p className="mt-2 text-[#14202a]">{result.receipt.verdict.next}</p>
                </div>

                <div className="mt-5 border-t border-t-[#ddd8cc] pt-4">
                  <div className="text-[#5d6b76]">LIMITS</div>
                  <ul className="mt-2 space-y-1.5">
                    {result.receipt.verdict.limits.map((line) => (
                      <li key={line} className="text-[#4a5b66]">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-5 flex flex-col gap-1 border-t border-t-[#ddd8cc] pt-4 text-[#5d6b76]">
                  <Field label="rule" value={result.receipt.verdict.rule} />
                  <Field label="fingerprint" value={result.receipt.fingerprint} />
                </div>
              </div>

              <details className="mt-6">
                <summary className="cursor-pointer font-[family-name:var(--font-mono)] text-xs text-mute transition-colors hover:text-[#dbe5ec]">
                  {result.receipt.sources.length} sources read
                </summary>
                <ul className="mt-3 space-y-2">
                  {result.receipt.sources.map((s) => (
                    <li key={s.url + s.name} className="font-[family-name:var(--font-mono)] text-xs">
                      <span className={s.ok ? "text-tally-bright" : "text-caution"}>
                        {s.ok ? "ok  " : "err "}
                      </span>
                      <span className="text-[#dbe5ec]">{s.name}</span>
                      {s.detail ? <span className="text-mute"> {s.detail}</span> : null}
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
