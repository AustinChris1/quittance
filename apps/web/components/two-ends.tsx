"use client";

import { motion, useReducedMotion } from "motion/react";
import { ArrowDown, ArrowRight, CircleDashed, EyeOff, ShieldCheck } from "lucide-react";
import { ChainLogo, chainFor } from "./chains";

export type Proof = {
  verified: boolean;
  chain: string;
  tx?: string;
  deliveredFormatted?: string;
  symbol?: string;
  blockNumber?: number;
  blockTimeIso?: string;
  inconclusive?: boolean;
  reason?: string;
};

const ease = [0.16, 1, 0.3, 1] as const;

function amount(p: Proof): string {
  if (!p.deliveredFormatted) return "";
  const [whole, frac] = p.deliveredFormatted.split(".");
  const grouped = Number(whole).toLocaleString("en-US");
  const trimmed = frac?.replace(/0+$/, "");
  return `${trimmed ? `${grouped}.${trimmed}` : grouped}${p.symbol ? ` ${p.symbol}` : ""}`;
}

function End({ title, proof, fallback, delay }: { title: string; proof?: Proof; fallback?: string; delay: number }) {
  const reduced = useReducedMotion();
  const logo = chainFor(proof?.chain ?? fallback);
  const proven = proof?.verified === true;
  const state = proven
    ? `Proven on ${proof!.chain}`
    : proof?.inconclusive
      ? `${proof.chain} cannot show it`
      : proof
        ? `Not confirmed on ${proof.chain}`
        : fallback
          ? `${fallback}: operator record only`
          : "Operator record only";

  return (
    <motion.div
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease }}
      className={`flex min-w-0 flex-col rounded-[1.5rem] p-5 ${proven ? "bg-mint text-black" : "border border-line bg-surface"}`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold tracking-[0.14em] uppercase opacity-70">{title}</span>
        <span className="flex size-10 items-center justify-center rounded-xl bg-white">
          {logo ? <ChainLogo name={logo} size={24} /> : <CircleDashed size={20} className="text-black/50" />}
        </span>
      </div>
      <p className="figure mt-4 text-[clamp(1.4rem,3vw,1.9rem)] leading-tight break-words">
        {proof?.deliveredFormatted ? amount(proof) : "Not read"}
      </p>
      <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold">
        {proven ? <ShieldCheck size={15} /> : null}
        {state}
      </p>
      {proof?.blockNumber ? (
        <p className={`mt-auto pt-4 font-[family-name:var(--font-mono)] text-xs ${proven ? "opacity-70" : "text-faint"}`}>
          block {proof.blockNumber.toLocaleString("en-US")}
          {proof.blockTimeIso ? ` · ${proof.blockTimeIso.slice(0, 16).replace("T", " ")} UTC` : ""}
        </p>
      ) : null}
    </motion.div>
  );
}

function Connector({ delay }: { delay: number }) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      initial={reduced ? { opacity: 0 } : { opacity: 0, scale: 0.6 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.35, ease }}
      className="flex items-center justify-center text-faint"
      aria-hidden
    >
      <ArrowRight size={20} className="hidden md:block" />
      <ArrowDown size={20} className="md:hidden" />
    </motion.span>
  );
}

/**
 * The swap as its three steps: money in, the exchange, money out. Each end is read on its own
 * chain; the middle is named for what it is, and never painted as proven.
 */
export function TwoEnds({
  origin,
  delivery,
  unreadable,
  privateMiddle,
}: {
  origin?: Proof;
  delivery?: Proof;
  unreadable?: { chain: string; reason: string };
  privateMiddle: boolean;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="mt-8 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
      <End title="Money in" proof={origin} delay={0.1} />
      <Connector delay={0.25} />
      <motion.div
        initial={reduced ? { opacity: 0 } : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5, ease }}
        className="flex min-w-0 flex-col rounded-[1.5rem] bg-paper p-5"
      >
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold tracking-[0.14em] uppercase text-faint">The exchange</span>
          <span className="flex size-10 items-center justify-center rounded-xl bg-white">
            {privateMiddle ? <EyeOff size={20} className="text-black/70" /> : <ChainLogo name="NEAR" size={24} />}
          </span>
        </div>
        <p className="figure mt-4 text-[clamp(1.4rem,3vw,1.9rem)] leading-tight">
          {privateMiddle ? "Private shard" : "NEAR Intents"}
        </p>
        <p className="mt-2 text-sm text-muted">
          {privateMiddle
            ? "Since 27 October the exchange settles where no public record reaches. Only the two ends can be proven."
            : "Settled on NEAR Intents between the two public ends."}
        </p>
      </motion.div>
      <Connector delay={0.45} />
      <End title="Money out" proof={delivery} fallback={unreadable?.chain} delay={0.5} />
    </div>
  );
}
