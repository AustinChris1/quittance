import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Bitcoin,
  Building2,
  CheckCircle2,
  CircleHelp,
  Code2,
  DoorOpen,
  EyeOff,
  FileText,
  Fingerprint,
  Headset,
  Lock,
  PackageX,
  ReceiptText,
  RotateCcw,
  Search,
  ShieldCheck,
  Timer,
  Wallet,
  Webhook,
  type LucideIcon,
} from "lucide-react";
import { Wordmark } from "../../components/logo";
import { ThemeToggle } from "../../components/theme";
import { ChainLogo, type ChainName } from "../../components/chains";
import { DocsNav, type DocSection } from "../../components/docs-nav";

export const metadata: Metadata = {
  title: "Quittance docs",
  description:
    "How Quittance proves what happened to a NEAR Intents swap: the use cases, how to check a swap, the API, and how it is built.",
};

const REPO = "https://github.com/AustinChris1/quittance";

const SECTIONS: DocSection[] = [
  { id: "overview", title: "Overview", children: [
    { id: "problem", title: "The problem" },
    { id: "what-it-does", title: "What it does" },
    { id: "numbers", title: "Measured, not claimed" },
    { id: "will-not", title: "What it will not do" },
  ] },
  { id: "use-cases", title: "Use cases" },
  { id: "how-to-use", title: "How to use", children: [
    { id: "web", title: "Check a swap" },
    { id: "inputs", title: "What you can paste" },
    { id: "reading", title: "Reading a receipt" },
    { id: "sharing", title: "Sharing a receipt" },
    { id: "cli", title: "Command line" },
    { id: "api", title: "HTTP API" },
    { id: "paid", title: "Pay per receipt (x402)" },
    { id: "watch", title: "Watch a swap" },
    { id: "webhook", title: "Webhook" },
  ] },
  { id: "architecture", title: "Architecture", children: [
    { id: "pipeline", title: "The pipeline" },
    { id: "resolve", title: "Resolve" },
    { id: "read", title: "Read" },
    { id: "classify", title: "Classify" },
    { id: "receipt-format", title: "The receipt" },
    { id: "chains", title: "Chains" },
    { id: "layout", title: "Code layout" },
  ] },
  { id: "labels", title: "The eight labels" },
  { id: "faq", title: "Questions" },
];

/* ---------- small building blocks ---------- */

function H2({ id, kicker, children }: { id: string; kicker: string; children: React.ReactNode }) {
  return (
    <header className="scroll-mt-28 lg:scroll-mt-12" id={id}>
      <p className="text-xs font-semibold tracking-[0.16em] text-mint-ink uppercase">{kicker}</p>
      <h2 className="display mt-3 text-[clamp(2rem,4.4vw,3.2rem)]">{children}</h2>
    </header>
  );
}

function H3({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h3 id={id} className="mt-14 scroll-mt-28 text-[1.35rem] font-bold tracking-tight lg:scroll-mt-12">
      {children}
    </h3>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mt-4 max-w-[68ch] text-[1.02rem] leading-relaxed text-muted">{children}</p>;
}

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-2xl bg-paper p-5 font-[family-name:var(--font-mono)] text-[0.82rem] leading-relaxed">
      <code>{children}</code>
    </pre>
  );
}

function M({ children }: { children: React.ReactNode }) {
  return <code className="rounded-md bg-paper px-1.5 py-0.5 font-[family-name:var(--font-mono)] text-[0.86em] text-fg">{children}</code>;
}

function A({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="font-medium text-mint-ink underline decoration-1 underline-offset-4 hover:decoration-2">
      {children}
    </a>
  );
}

const LABEL_STYLE: Record<string, { Icon: LucideIcon; chip: string }> = {
  DELIVERED: { Icon: CheckCircle2, chip: "bg-mint text-black" },
  REFUNDED_OK: { Icon: RotateCcw, chip: "bg-mint text-black" },
  STRANDED: { Icon: PackageX, chip: "bg-coral text-black" },
  WRONG_DOOR: { Icon: DoorOpen, chip: "bg-coral text-black" },
  LOCKED_OUT: { Icon: Lock, chip: "bg-coral text-black" },
  SHIELDED_UNPROVEN: { Icon: EyeOff, chip: "bg-violet text-black" },
  IN_FLIGHT: { Icon: Timer, chip: "bg-cyan text-black" },
  UNDETERMINED: { Icon: CircleHelp, chip: "bg-paper text-fg" },
  WALLET: { Icon: Wallet, chip: "bg-paper text-fg" },
  ANY: { Icon: ReceiptText, chip: "bg-paper text-fg" },
  API: { Icon: Code2, chip: "bg-paper text-fg" },
};

function Chip({ label, text }: { label: string; text?: string }) {
  const s = LABEL_STYLE[label] ?? LABEL_STYLE.UNDETERMINED!;
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${s.chip}`}>
      <s.Icon size={13} />
      {text ?? label.replace(/_/g, " ")}
    </span>
  );
}

/* ---------- content ---------- */

type UseCase = {
  Icon: LucideIcon;
  who: string;
  title: string;
  situation: string;
  paste: string;
  label: string;
  labelText?: string;
  outcome: string;
  source?: { href: string; text: string };
};

const USE_CASES: UseCase[] = [
  {
    Icon: PackageX,
    who: "A swapper",
    title: "My swap says it failed, but the money left my wallet",
    situation:
      "575,830 TRX, about $193K, was reported on the NEAR forum as failed with a zero refund. The thread is still unanswered.",
    paste: "The NEAR transaction, the TRON deposit address, or the Ethereum payout hash.",
    label: "DELIVERED",
    outcome:
      "Both ends proven on their own chains: 575,830 TRX reached the deposit address on TRON, and 190,995.293894 USDT reached the recipient on Ethereum, 12 days before the complaint was filed.",
    source: { href: "https://gov.near.org/t/failed-near-intents-1-click-swap-575-830-trx-193k-stuck-failed-status-zero-refund-no-support-response/42664", text: "Forum thread 42664" },
  },
  {
    Icon: EyeOff,
    who: "A swapper",
    title: "The Explorer says Success, and my balance is zero",
    situation:
      "Two deposits on Robinhood Chain showed a green Success, \"Transfer to Confidential Intents\", while the recipient's public balance read zero. Neither the status endpoint nor the Explorer can find them.",
    paste: "The NEAR transaction from the wallet.",
    label: "SHIELDED_UNPROVEN",
    outcome:
      "Quittance decodes the signed intent inside the transaction: 0.038 ETH moved to the documented Confidential Intents treasury. The shield is proven. It says plainly that public records can prove neither delivery nor loss from there.",
    source: { href: "https://github.com/near/intents/issues/384", text: "near/intents#384" },
  },
  {
    Icon: EyeOff,
    who: "Anyone swapping after 27 October",
    title: "My swap went through a private shard. Did it actually complete?",
    situation:
      "From 27 October 2026, NEAR's changelog says 1Click swaps roll out as confidential only. The exchange settles on the NEAR Private Shard, so the status word describes a step nobody can see.",
    paste: "Any transaction from the swap, or the deposit address.",
    label: "DELIVERED",
    outcome:
      "The two public ends, read on their own chains: for example 150 USDC in on Base and 149.829629 USDT out on Solana, with the quote reconciled against what arrived. The private middle is named, never painted as proven.",
    source: { href: "https://docs.near-intents.org/changelog/overview", text: "NEAR Intents changelog" },
  },
  {
    Icon: DoorOpen,
    who: "A swapper or a partner",
    title: "I sent on the wrong chain",
    situation:
      "0.17 ETH was sent on Base to an address issued for an Ethereum quote. The route is documented as a manual refund, and a support ticket was already open.",
    paste: "The deposit address.",
    label: "WRONG_DOOR",
    outcome:
      "Names the mismatch, says the funds are a manual refund, and tells you not to retry the swap. The receipt is the attachment the ticket needs.",
    source: { href: "https://github.com/near/intents/issues/382", text: "near/intents#382" },
  },
  {
    Icon: Bitcoin,
    who: "A Bitcoin depositor",
    title: "My Bitcoin refund is stuck behind a timer",
    situation:
      "The recovery guide says 14 days. Read directly from btc-connector.bridge.near, the timer for a deposit with no refund address is 3,153,600,000 seconds, about 100 years, and requesting the refund costs 2 NEAR.",
    paste: "The deposit address.",
    label: "LOCKED_OUT",
    outcome:
      "Quotes the contract's own values, notes that the long timer only binds deposits without a refund address, and warns against paying the fee expecting a quick return.",
    source: { href: "https://github.com/near/intents/issues/385", text: "near/intents#385" },
  },
  {
    Icon: PackageX,
    who: "A swapper",
    title: "The swap took my deposit and nothing came back",
    situation:
      "On 26 October, 44 swaps had taken a deposit, produced no destination transaction and charged no refund, at a median age of 255 days, holding about $334,000 of quoted notional.",
    paste: "The deposit address or any transaction.",
    label: "STRANDED",
    outcome:
      "Only when the deposit really landed and the swap is terminal with nothing returned. It asks for a manual refund and packages the evidence for the request.",
  },
  {
    Icon: Wallet,
    who: "A swapper",
    title: "I only know my wallet address",
    situation:
      "Most people never see a deposit address or a NEAR hash. They know the wallet that sent or received the money.",
    paste: "Your wallet address, on any chain.",
    label: "WALLET",
    labelText: "WALLET LOOKUP",
    outcome:
      "Lists every swap the wallet sent, received or was refunded in, with its chains, amounts and status. One tap opens the receipt for that swap. The wallet that supposedly lost $193K finds its swap this way.",
  },
  {
    Icon: Building2,
    who: "A business or a payer",
    title: "I need to prove I paid someone",
    situation:
      "An invoice, a payroll run, an OTC settlement. The other side says it never arrived, and a screenshot of a status page proves nothing.",
    paste: "The payment's transaction.",
    label: "DELIVERED",
    outcome:
      "A link anyone can open, showing the payout read on the recipient's own chain, with the block, time and amount. The sha256 fingerprint lets both sides confirm they are looking at the same evidence.",
  },
  {
    Icon: Headset,
    who: "A support desk",
    title: "I triage tickets for a wallet or an app",
    situation:
      "Support threads quote correlation ids, which identify one HTTP request rather than the swap, so nobody can resolve them.",
    paste: "Whatever the user sent: a hash, an address or a wallet.",
    label: "ANY",
    labelText: "ANY LABEL",
    outcome:
      "One click copies the receipt as markdown for the ticket: the plain sentence, what was observed, what it cannot see, the next step, the rule and the fingerprint. Two tickets about one swap share a fingerprint.",
  },
  {
    Icon: Webhook,
    who: "An integrator",
    title: "I build on 1Click and want receipts in my own system",
    situation:
      "A wallet or exchange wants every questionable swap classified and filed where its own team works, not on a third-party page.",
    paste: "Nothing by hand. Call the API, or post receipts to your webhook.",
    label: "API",
    labelText: "JSON + HMAC",
    outcome:
      "POST /api/check returns the full receipt as JSON. The CLI posts receipts to an endpoint you control, signed with HMAC SHA256, and a reference receiver is included.",
  },
];

const CHAIN_GRID: { name: ChainName; what: string }[] = [
  { name: "Ethereum", what: "ERC20 and ETH" },
  { name: "Base", what: "ERC20 and ETH" },
  { name: "Arbitrum", what: "ERC20 and ETH" },
  { name: "Optimism", what: "ERC20 and ETH" },
  { name: "Polygon", what: "ERC20 and POL" },
  { name: "BNB Chain", what: "BEP20 and BNB" },
  { name: "Gnosis", what: "ERC20 and xDAI" },
  { name: "Avalanche", what: "ERC20 and AVAX" },
  { name: "Robinhood Chain", what: "ERC20 and ETH" },
  { name: "Tron", what: "TRC20 and TRX" },
  { name: "Solana", what: "SPL and SOL" },
  { name: "NEAR", what: "signed intents, credits" },
];

const RULES: { id: string; label: string; when: string }[] = [
  { id: "locked-out/refund-timelock-exceeds-docs", label: "LOCKED_OUT", when: "No refund address was set, and the connector's timer is more than ten times the documented one." },
  { id: "wrong-door/asset-or-chain-mismatch", label: "WRONG_DOOR", when: "The deposit landed as a different asset or on a different chain than the quote, or the status reads INCOMPLETE_DEPOSIT." },
  { id: "stranded/terminal-with-no-refund", label: "STRANDED", when: "The deposit landed, the swap is FAILED or REFUNDED, and no refund is recorded or observed." },
  { id: "refunded/returned-to-refund-address", label: "REFUNDED_OK", when: "REFUNDED with a refund amount or a refund transaction." },
  { id: "shielded/success-not-provable-from-public-data", label: "SHIELDED_UNPROVEN", when: "SUCCESS on a confidential route with no published destination transaction." },
  { id: "shielded/transfer-to-confidential-treasury", label: "SHIELDED_UNPROVEN", when: "A signed intent moved funds to the Confidential Intents treasury, and no delivery was proven." },
  { id: "contradicted/destination-chain-disagrees", label: "UNDETERMINED", when: "SUCCESS, but the destination chain answered and does not show the money arriving." },
  { id: "delivered/destination-transaction-observed", label: "DELIVERED", when: "SUCCESS with a published destination transaction. Proven when read on that chain." },
  { id: "in-flight/not-yet-terminal", label: "IN_FLIGHT", when: "PENDING_DEPOSIT, KNOWN_DEPOSIT_TX or PROCESSING." },
  { id: "fallback/no-rule-applied", label: "UNDETERMINED", when: "Nothing matched. A gap in the rules, never a clean bill of health." },
];

const LABELS: { label: string; means: string; next: string }[] = [
  { label: "DELIVERED", means: "A destination transaction is published, and read from the destination chain where that chain can be read.", next: "Nothing. Keep the receipt." },
  { label: "REFUNDED_OK", means: "The money went back to the refund address.", next: "Confirm the amount, compare it with the quote." },
  { label: "STRANDED", means: "The deposit arrived, the swap is terminal, nothing came back.", next: "Request a manual refund with the receipt attached." },
  { label: "WRONG_DOOR", means: "The deposit does not match its quote: wrong chain or wrong asset.", next: "Manual refund. Do not retry the swap." },
  { label: "LOCKED_OUT", means: "A refund exists on paper, but a connector timelock puts it out of reach.", next: "Do not pay the refund fee expecting speed." },
  { label: "SHIELDED_UNPROVEN", means: "The money took a private route. Public records cannot prove delivery either way.", next: "Not a loss. Ask for an internal trace if you expected a public payout." },
  { label: "IN_FLIGHT", means: "Not terminal yet.", next: "Check again later." },
  { label: "UNDETERMINED", means: "Not enough evidence, or the evidence disagrees with itself.", next: "Supply another identifier, or ask for a trace." },
];

const FAQ: { q: string; a: React.ReactNode }[] = [
  {
    q: "Can an agent use it without an account?",
    a: (
      <>
        Yes. <code className="font-mono">/api/receipt</code> sells the same receipt for one x402 payment of $0.01, in USDC on NEAR
        mainnet or on Base. Without payment it answers 402 with what to pay; the agent signs and retries. The payment is checked
        before the lookup runs and settled only if the receipt is built, so a failed lookup costs nothing. This site and its free
        checker stay free; the paid door exists because the Explorer allows one lookup every five seconds for everyone, so the free
        checker allows 30 lookups per visitor every 10 minutes.
      </>
    ),
  },
  {
    q: "Is Quittance the first place a swap can be looked up?",
    a: (
      <>
        No, and it does not claim to be. The Intents Explorer and the 1Click status endpoint already show the operator's record and
        its status word. Quittance is not a new data source. What it adds is reading the deposit and the payout on the chains they
        happened on, separating a shield from a delivery, and attaching the limits of what can be seen. We did not find another
        public tool that does that.
      </>
    ),
  },
  {
    q: "Why not just use the Explorer?",
    a: (
      <>
        Because the Explorer shows what the operator recorded, and the record is easy to misread. In #384 a green Success hid a
        shield to a private treasury. In the $193K case a refund field of zero, correct for a settled swap, was read as proof of
        loss. Quittance checks the record against the chains themselves, and since 27 October it is the way to see that both public
        ends of a confidential swap really happened.
      </>
    ),
  },
  {
    q: "Which chains' hashes and addresses can I paste?",
    a: (
      <>
        Any transaction hash from a chain the swap touched: NEAR, any EVM chain listed above, TRON or Solana. The deposit address
        the quote issued, on any chain. Or a wallet address that sent, received or was refunded. An Ethereum address is first tried
        as a deposit address, then as a wallet.
      </>
    ),
  },
  {
    q: "Can it prove a confidential swap arrived?",
    a: (
      <>
        It proves the two public ends: the deposit and, when the payout lands on a public chain, the payout. The exchange between
        them settles on the NEAR Private Shard, which NEAR documents as a permissioned chain with a private RPC, so no public record
        can prove that step, and the receipt says so.
      </>
    ),
  },
  {
    q: "What does proven mean, exactly?",
    a: (
      <>
        Quittance read the transaction from that chain&apos;s public RPC endpoints, several per chain, and checked that its receipt
        succeeded and that the quoted asset moved to the quoted address. That is independent evidence, read from the chain rather
        than from the operator. It is not a trustless cryptographic proof: nothing is checked against chain state with a light client.
        That is why every proof carries an explorer link, so you can check it yourself.
      </>
    ),
  },
  {
    q: "Do I need a key, a wallet connection or a signature?",
    a: (
      <>
        No. Nothing is signed and nothing moves. The status endpoint answers without a key. A partner token, held on the server and
        never sent to the browser, is used only to search the Explorer by transaction hash or wallet.
      </>
    ),
  },
  {
    q: "Which chains can it not read yet?",
    a: (
      <>
        In the coverage snapshot of 28 October, payouts to NEAR accounts, TON, XRP, Bitcoin, Litecoin and a handful of smaller chains
        were not yet read independently. For those the receipt says delivery rests on the operator's record. Payouts to shielded Zcash
        addresses cannot be proven by anyone, by design, and the receipt says that too.
      </>
    ),
  },
  {
    q: "Could it be wrong?",
    a: (
      <>
        Every verdict carries the facts it observed, the limits of what it can see, and the rule that fired, so a wrong one can be
        checked and argued with. Seventeen frozen cases, with provenance, are re-classified on every test run. A failed lookup is
        reported as unread, never as the chain disagreeing.
      </>
    ),
  },
];

/* ---------- page ---------- */

export default function DocsPage() {
  return (
    <main id="top" className="min-h-dvh">
      <header className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/" className="transition-opacity hover:opacity-75">
            <Wordmark />
          </Link>
          <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-semibold text-muted">Docs</span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-3">
          <a href={REPO} target="_blank" rel="noreferrer" className="hidden items-center gap-2 rounded-full border border-line px-4 py-2.5 text-sm transition-colors hover:border-fg sm:inline-flex">
            <Code2 size={15} />
            Source
          </a>
          <ThemeToggle />
          <Link href="/check" aria-label="Check a swap" className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-fg text-sm font-medium whitespace-nowrap text-bg transition-transform hover:-translate-y-0.5 max-sm:w-10 sm:px-4">
            <Search size={15} />
            <span className="hidden sm:inline">Check a swap</span>
          </Link>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 pb-32 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-14">
        {/* On small screens the aside dissolves, so the contents bar sticks against the whole page. */}
        <aside className="contents lg:block lg:pt-10">
          <DocsNav sections={SECTIONS} />
        </aside>

        <article className="min-w-0 pt-6 lg:pt-10">
          {/* ---------------- Overview ---------------- */}
          <section>
            <H2 id="overview" kicker="Overview">A receipt for money that crossed chains</H2>
            <P>
              Quittance answers one question: what actually happened to a NEAR Intents swap. Paste a transaction hash, a deposit address or a
              wallet. It reads public records only, proves the deposit and the payout on the chains they happened on, and returns one of eight
              labels with the facts it observed, the limits of what it can see, and the next step.
            </P>
            <P>A quittance is an old legal word for a written receipt proving an obligation has been discharged.</P>

            <H3 id="problem">The problem</H3>
            <div className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                { Icon: CircleHelp, t: "A status word is not an answer", d: "FAILED, PROCESSING and SUCCESS are the operator's record. A $193K swap reported on the NEAR forum as lost had been delivered." },
                { Icon: Fingerprint, t: "The handle people quote resolves nothing", d: "The correlation id in every support thread is a per-request trace. Three calls for one swap return three different ids." },
                { Icon: EyeOff, t: "Since 27 October the middle is private", d: "1Click swaps now settle on the NEAR Private Shard. Only the deposit and the payout remain public, so those are what must be proven." },
              ].map((c) => (
                <div key={c.t} className="rounded-[1.5rem] border border-line bg-surface p-5">
                  <c.Icon size={22} className="text-mint-ink" />
                  <p className="mt-4 font-bold">{c.t}</p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{c.d}</p>
                </div>
              ))}
            </div>

            <H3 id="what-it-does">What it does</H3>
            <P>Every swap is three steps. Quittance reads the two public ones on their own chains and names the third for what it is.</P>
            <div className="mt-6 grid gap-3 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-stretch">
              <div className="rounded-[1.5rem] bg-mint p-5 text-black">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-[0.14em] uppercase opacity-70">Money in</span>
                  <span className="flex size-9 items-center justify-center rounded-xl bg-white"><ChainLogo name="Tron" size={22} /></span>
                </div>
                <p className="figure mt-4 text-2xl">575,830 TRX</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck size={14} /> Proven on TRON</p>
              </div>
              <span className="flex items-center justify-center text-faint" aria-hidden>
                <ArrowRight size={20} className="hidden md:block" /><ArrowDown size={20} className="md:hidden" />
              </span>
              <div className="rounded-[1.5rem] bg-paper p-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-[0.14em] text-faint uppercase">The exchange</span>
                  <span className="flex size-9 items-center justify-center rounded-xl bg-white"><EyeOff size={18} className="text-black/70" /></span>
                </div>
                <p className="figure mt-4 text-2xl">Named, not proven</p>
                <p className="mt-1 text-sm text-muted">NEAR Intents, or the Private Shard after 27 October.</p>
              </div>
              <span className="flex items-center justify-center text-faint" aria-hidden>
                <ArrowRight size={20} className="hidden md:block" /><ArrowDown size={20} className="md:hidden" />
              </span>
              <div className="rounded-[1.5rem] bg-mint p-5 text-black">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold tracking-[0.14em] uppercase opacity-70">Money out</span>
                  <span className="flex size-9 items-center justify-center rounded-xl bg-white"><ChainLogo name="Ethereum" size={22} /></span>
                </div>
                <p className="figure mt-4 text-2xl">190,995.29 USDT</p>
                <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold"><ShieldCheck size={14} /> Proven on Ethereum</p>
              </div>
            </div>
            <P>
              It also reconciles the amount. On that swap the quote promised 191,757.901149 USDT with a guaranteed minimum of 189,840.322137,
              and 190,995.293894 arrived: 0.40% under the quote, inside its guarantee.
            </P>

            <H3 id="numbers">Measured, not claimed</H3>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { n: "81.8%", l: "of external payouts are on a chain Quittance reads", s: "up from 27.0% for an ERC20-only reader. 1,000 swaps, 28 Oct" },
                { n: "99 / 100", l: "sampled payouts proven on their own chain", s: "one inconclusive, none contradicted. 28 Oct" },
                { n: "44", l: "swaps took a deposit and returned nothing", s: "median age 255 days, $334K quoted. 26 Oct" },
                { n: "17", l: "frozen cases re-classified on every test run", s: "each with provenance: what was read on chain, and what was only reported" },
              ].map((s) => (
                <div key={s.l} className="rounded-[1.5rem] bg-fg p-5 text-bg">
                  <p className="figure text-[2rem] leading-none text-mint">{s.n}</p>
                  <p className="mt-3 text-sm font-semibold">{s.l}</p>
                  <p className="mt-2 text-xs opacity-60">{s.s}</p>
                </div>
              ))}
            </div>
            <P>
              Each figure is reproducible from the repository. <M>quittance coverage --save</M> and <M>quittance study --save</M> write
              dated snapshots to <M>studies/</M>, keeping counts only: no addresses, no amounts per person.
            </P>
            <details className="mt-5 rounded-2xl border border-line bg-surface p-5">
              <summary className="cursor-pointer font-semibold">How the coverage was measured</summary>
              <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-muted">
                {[
                  ["Sample", "The 1,000 most recent SUCCESS swaps the Explorer returned, 11:15 to 12:45 UTC on 28 October."],
                  ["Denominator", "The 978 whose payout left NEAR for another chain. Payouts that stay inside NEAR Intents are excluded."],
                  ["Readable", "The destination asset's chain, from the public 1Click token list, is one Quittance reads. NEAR account payouts are not yet counted."],
                  ["Proven", "100 readable payouts, spread evenly across the window by position, not chosen. Proven means read on its own chain, receipt successful, the quoted asset to the quoted recipient."],
                  ["Not proven", "Inconclusive, contradicted and unread are each counted apart, and never as proven."],
                  ["Limits", "One window at one moment, and quoted USD rather than realised value. A sample shows the readers work on real traffic; it does not prove every payout."],
                ].map(([k, v]) => (
                  <li key={k} className="grid gap-1 sm:grid-cols-[7.5rem_1fr]">
                    <span className="font-semibold text-fg">{k}</span>
                    <span>{v}</span>
                  </li>
                ))}
              </ul>
            </details>

            <H3 id="will-not">What it will not do</H3>
            <ul className="mt-5 grid gap-2.5 sm:grid-cols-2">
              {[
                "Never holds keys or funds. Every read is read-only.",
                "Never asks you to connect a wallet or sign anything.",
                "Never claims a loss the evidence does not prove.",
                "Never paints the private middle of a swap as proven.",
                "Never files tickets for strangers. It produces the attachment.",
                "Never claims recovered money. No such figure appears anywhere.",
              ].map((t) => (
                <li key={t} className="flex gap-2.5 rounded-2xl bg-paper px-4 py-3 text-sm">
                  <BadgeCheck size={17} className="mt-0.5 shrink-0 text-mint-ink" />
                  {t}
                </li>
              ))}
            </ul>
          </section>

          {/* ---------------- Use cases ---------------- */}
          <section className="mt-28">
            <H2 id="use-cases" kicker="Use cases">Ten situations Quittance is for</H2>
            <P>Most are real cases, open in public when they were recorded. Each names what you paste and what you get back.</P>
            <ol className="mt-8 grid gap-4 xl:grid-cols-2">
              {USE_CASES.map((u, i) => (
                <li key={u.title} className="flex flex-col rounded-[1.75rem] border border-line bg-surface p-6">
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-11 items-center justify-center rounded-2xl bg-mint-wash text-mint-ink">
                      <u.Icon size={21} />
                    </span>
                    <span className="font-[family-name:var(--font-mono)] text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <p className="mt-4 text-xs font-semibold tracking-[0.12em] text-faint uppercase">{u.who}</p>
                  <h4 className="mt-1.5 text-lg leading-snug font-bold">{u.title}</h4>
                  <p className="mt-3 text-sm leading-relaxed text-muted">{u.situation}</p>
                  <div className="mt-5 grid gap-3 rounded-2xl bg-paper p-4 text-sm">
                    <p><span className="font-semibold">Paste </span><span className="text-muted">{u.paste}</span></p>
                    <div className="flex flex-wrap items-start gap-2">
                      <Chip label={u.label} text={u.labelText} />
                    </div>
                    <p className="leading-relaxed text-muted">{u.outcome}</p>
                  </div>
                  {u.source ? (
                    <p className="mt-4 text-xs text-faint">Source: <A href={u.source.href}>{u.source.text}</A></p>
                  ) : null}
                </li>
              ))}
            </ol>
          </section>

          {/* ---------------- How to use ---------------- */}
          <section className="mt-28">
            <H2 id="how-to-use" kicker="How to use">Check a swap in under a minute</H2>

            <H3 id="web">Check a swap</H3>
            <ol className="mt-6 grid gap-3 md:grid-cols-3">
              {[
                { Icon: Search, t: "Paste", d: "Open the checker and paste a hash, a deposit address or a wallet." },
                { Icon: ShieldCheck, t: "Read", d: "Quittance resolves the swap and reads each end on its own chain. Usually 10 to 30 seconds." },
                { Icon: ReceiptText, t: "Keep", d: "You get a plain sentence, a label, the evidence and its limits, and a link that reproduces it." },
              ].map((s, i) => (
                <li key={s.t} className="rounded-[1.5rem] bg-paper p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-fg font-[family-name:var(--font-mono)] text-sm text-bg">{i + 1}</span>
                    <s.Icon size={19} className="text-mint-ink" />
                  </div>
                  <p className="mt-4 font-bold">{s.t}</p>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{s.d}</p>
                </li>
              ))}
            </ol>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/check?q=8a33DkKfZMWRKbK2pXuQAWVLXSy4AyZF6PfcENvCJgCb" className="inline-flex items-center gap-2 rounded-full bg-mint-wash px-4 py-2 text-sm font-medium text-mint-ink">
                <span className="size-1.5 rounded-full bg-mint" /> Open the $193K case
              </Link>
              <Link href="/check?q=3djtQ3pUHv8SGtNKS3CMGice7E7S9oeS4DJzNYyjCUVD" className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium">
                <EyeOff size={14} /> Open a confidential swap
              </Link>
              <Link href="/check?q=0x632F5D32448DE43b8b9cfD063aCfcDac09108bad" className="inline-flex items-center gap-2 rounded-full border border-line px-4 py-2 text-sm font-medium">
                <Wallet size={14} /> Open a wallet
              </Link>
            </div>

            <H3 id="inputs">What you can paste</H3>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-paper text-xs tracking-[0.1em] text-faint uppercase">
                  <tr><th className="px-4 py-3">Input</th><th className="px-4 py-3">Looks like</th><th className="px-4 py-3">What happens</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[
                    ["NEAR transaction", "8a33Dk…CgCb", "Resolved through the Explorer. A confidential shield is decoded from the signed intent."],
                    ["EVM transaction", "0x9be9…421a", "The deposit or the payout, on any EVM chain the swap touched."],
                    ["TRON transaction", "d603ec…076a", "Bare hex, the id TRONSCAN shows."],
                    ["Solana signature", "btNXAN…XPA", "The 88-character signature your wallet shows."],
                    ["Deposit address", "TBy2io…2sus", "The address the quote issued, on any chain. Read straight from the status endpoint."],
                    ["Wallet address", "0x632F…8bad", "Lists every swap that wallet sent, received or was refunded in."],
                  ].map(([a, b, c]) => (
                    <tr key={a}>
                      <td className="px-4 py-3 font-semibold">{a}</td>
                      <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs">{b}</td>
                      <td className="px-4 py-3 text-muted">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <H3 id="reading">Reading a receipt</H3>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { Icon: CheckCircle2, t: "Label and sentence", d: "One of eight labels, then one plain sentence built only from the evidence. It can never say more than the basis supports." },
                { Icon: ShieldCheck, t: "Money in, money out", d: "Each end in mint when it was proven on its own chain, with the amount, block and time. Grey when it rests on the operator's record." },
                { Icon: FileText, t: "Observed and cannot see", d: "Every fact that was checked, and every limit of what could be checked. No verdict is produced without limits." },
                { Icon: Fingerprint, t: "Rule and fingerprint", d: "The rule that fired, and a sha256 over the canonical evidence. Same evidence, same fingerprint. Any change, a new one." },
              ].map((c) => (
                <div key={c.t} className="flex gap-4 rounded-[1.5rem] border border-line bg-surface p-5">
                  <c.Icon size={21} className="mt-0.5 shrink-0 text-mint-ink" />
                  <div>
                    <p className="font-bold">{c.t}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{c.d}</p>
                  </div>
                </div>
              ))}
            </div>

            <H3 id="sharing">Sharing a receipt</H3>
            <P>
              <strong className="text-fg">Copy link</strong> gives a URL that re-runs the check for whoever opens it, so they see the chains answer
              for themselves. <strong className="text-fg">Copy for a ticket</strong> gives markdown that pastes cleanly into a support ticket, a
              GitHub issue or a chat, with the fingerprint and explorer links. <strong className="text-fg">Download JSON</strong> saves
              the whole receipt, and every proven transfer carries a link to check it on the chain&apos;s own explorer.
            </P>
            <P>
              <M>quittance receipt receipt.json --expect &lt;fingerprint&gt;</M> recomputes a saved receipt&apos;s fingerprint and compares it with
              one you obtained separately, such as the one on this page or in a ticket. Without <M>--expect</M> it only shows the file is
              self-consistent, because whoever edits a receipt can recompute its fingerprint too. Neither proves the claims are true: the
              explorer links are how those are checked.
            </P>

            <H3 id="cli">Command line</H3>
            <P>No install. The core has zero runtime dependencies and Node 24 or newer runs the TypeScript directly.</P>
            <Code>{`git clone ${REPO}
cd quittance

# classify the seventeen frozen cases and check every label
node apps/cli/src/main.ts verify

# check any swap live, by any identifier
node apps/cli/src/main.ts check --search 8a33DkKfZMWRKbK2pXuQAWVLXSy4AyZF6PfcENvCJgCb
node apps/cli/src/main.ts check --deposit TBy2io3Q3Jt4UM4ejDhkkUQJZgZuXw2sus --json

# measure the rails yourself
node apps/cli/src/main.ts coverage --save
node apps/cli/src/main.ts study --save`}</Code>
            <P>
              Searching by transaction hash or wallet needs a partner JWT in <M>QUITTANCE_PARTNER_JWT</M>, from the NEAR Intents Partner
              Dashboard. Reading a deposit address needs nothing.
            </P>

            <H3 id="api">HTTP API</H3>
            <P>The hosted checker exposes the same pipeline. Credentials stay on the server.</P>
            <Code>{`curl -s https://quittance-five.vercel.app/api/check \\
  -H 'content-type: application/json' \\
  -d '{"query":"TBy2io3Q3Jt4UM4ejDhkkUQJZgZuXw2sus"}'`}</Code>
            <Code>{`{
  "inputKind": "deposit address",
  "receipt": {
    "verdict": {
      "label": "DELIVERED",
      "summary": "Delivered on Ethereum about 16 days after the deposit. Both ends proven ...",
      "rule": "delivered/destination-transaction-observed",
      "basis": ["..."], "limits": ["..."], "next": "..."
    },
    "evidence": { "origin": { "verified": true, "chain": "TRON", ... },
                  "delivery": { "verified": true, "chain": "Ethereum", ... } },
    "sources": [ { "name": "1click.status (unauthenticated)", "ok": true, ... } ],
    "fingerprint": "ced90d..."
  },
  "swaps": null,
  "text": "QUITTANCE RECEIPT ..."
}`}</Code>
            <P>When the input is a wallet, <M>swaps</M> lists the swaps it appears in, each with its deposit address to check next.</P>
            <P>
              The free checker allows 30 lookups per visitor every 10 minutes, because the Explorer allows one lookup every five seconds
              for the whole deployment. A person never meets the limit. Agents that need more use the paid door below.
            </P>

            <H3 id="paid">Pay per receipt (x402)</H3>
            <P>
              <M>/api/receipt</M> returns the same JSON for one <a className="underline underline-offset-4" href="https://x402.org">x402</a> payment
              of $0.01, with no account and no API key. Without payment it answers 402 and says what to pay: Circle USDC on NEAR mainnet
              first, and USDC on Base second, so any standard x402 agent can pay.
            </P>
            <Code>{`curl -i "https://quittance-five.vercel.app/api/receipt?q=TBy2io3Q3Jt4UM4ejDhkkUQJZgZuXw2sus"
# HTTP/1.1 402 Payment Required
# PAYMENT-REQUIRED: <base64> accepts near:mainnet 0.01 USDC, eip155:8453 0.01 USDC`}</Code>
            <P>
              The agent signs the payment and repeats the request with a <M>PAYMENT-SIGNATURE</M> header. On NEAR that is a NEP-366
              signed delegate for exactly one USDC transfer, so the payer needs no NEAR for gas. The payment is verified before the
              lookup runs and settled only if the receipt is built: a failed lookup is never charged. The settlement comes back in{" "}
              <M>PAYMENT-RESPONSE</M>, and fees move straight from the payer to the payee.
            </P>
            <P>
              The first paid receipt settled on NEAR mainnet on 2 November 2026, in transaction{" "}
              <a className="underline underline-offset-4" href="https://nearblocks.io/txns/7gNyhiJpzfH4b7ZRu7FkWpxD6RzaXpRnxGkcjWAWmQCN">
                7gNyhiJp…
              </a>
              . The repository includes the agent script that made it, <M>apps/web/scripts/pay.ts</M>.
            </P>

            <H3 id="watch">Watch a swap</H3>
            <P>
              A swap that is still moving, or shielded, can be watched from its receipt. Press <strong className="text-fg">Watch</strong>, allow
              notifications, and Quittance alerts you once when the evidence changes, such as <M>IN FLIGHT is now DELIVERED</M>, with a link
              back to the receipt. No account and no email: the browser&apos;s push subscription is the only identity.
            </P>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {[
                { Icon: ShieldCheck, t: "The server rechecks", d: "On a schedule, Quittance runs the same check the page runs. A phone cannot poll chains in the background, so the browser only displays the alert." },
                { Icon: Fingerprint, t: "One alert per change", d: "It keys on the evidence and the verdict, not on read times, so a recheck that finds nothing new stays silent." },
                { Icon: Timer, t: "It stops", d: "A proven delivery or a refund ends the watch. Otherwise it ends after the 3 to 30 days you chose. Dropped subscriptions are pruned." },
                { Icon: Wallet, t: "It installs", d: "Quittance is an installable app. On iPhone and iPad, alerts reach Home Screen apps only, so the panel tells you to add it there first." },
              ].map((c) => (
                <div key={c.t} className="flex gap-4 rounded-[1.5rem] border border-line bg-surface p-5">
                  <c.Icon size={21} className="mt-0.5 shrink-0 text-mint-ink" />
                  <div>
                    <p className="font-bold">{c.t}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted">{c.d}</p>
                  </div>
                </div>
              ))}
            </div>

            <H3 id="webhook">Webhook</H3>
            <P>
              The one write Quittance makes is posting a receipt to an endpoint you control, signed with HMAC SHA256 so the receiver can reject
              anything it did not send. A reference receiver ships in <M>apps/sink</M>.
            </P>
            <Code>{`# terminal 1: the receiver
QUITTANCE_WEBHOOK_SECRET=demo-secret node apps/sink/src/main.ts

# terminal 2: post a receipt to it
node apps/cli/src/main.ts replay 10-stranded-synthetic \\
  --webhook http://localhost:8787/receipts --secret demo-secret`}</Code>
          </section>

          {/* ---------------- Architecture ---------------- */}
          <section className="mt-28">
            <H2 id="architecture" kicker="Architecture">How it is built</H2>
            <P>
              A small core with no runtime dependencies, and three thin shells over it: the web app, the command line, and the webhook receiver.
              Every outbound read returns a citation, so the receipt can name everything it looked at.
            </P>

            <H3 id="pipeline">The pipeline</H3>
            <div className="mt-6 grid gap-3 lg:grid-cols-[1fr_auto_1fr_auto_1fr_auto_1fr] lg:items-stretch">
              {[
                { t: "Resolve", d: "Turn any identifier into one swap, or a wallet into its swaps.", items: ["Intents Explorer search", "1Click status", "exact-match check"] },
                { t: "Read", d: "Gather evidence, each end on its own chain.", items: ["origin deposit", "NEAR transaction", "destination payout", "token list"] },
                { t: "Classify", d: "Ordered rules, first match wins.", items: ["10 rules", "8 labels", "basis, limits, next"] },
                { t: "Receipt", d: "Canonical JSON, fingerprinted.", items: ["web and API", "CLI text and JSON", "signed webhook"] },
              ].flatMap((b, i, all) => {
                const box = (
                  <div key={b.t} className={`rounded-[1.5rem] p-5 ${i === all.length - 1 ? "bg-mint text-black" : "border border-line bg-surface"}`}>
                    <p className="font-[family-name:var(--font-mono)] text-xs opacity-60">{String(i + 1).padStart(2, "0")}</p>
                    <p className="figure mt-2 text-xl">{b.t}</p>
                    <p className={`mt-1.5 text-sm ${i === all.length - 1 ? "opacity-75" : "text-muted"}`}>{b.d}</p>
                    <ul className="mt-4 space-y-1.5">
                      {b.items.map((it) => (
                        <li key={it} className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-xs">
                          <span className={`size-1.5 rounded-full ${i === all.length - 1 ? "bg-black" : "bg-mint"}`} />
                          {it}
                        </li>
                      ))}
                    </ul>
                  </div>
                );
                return i === all.length - 1
                  ? [box]
                  : [box, (
                    <span key={b.t + "-arrow"} className="flex items-center justify-center text-faint" aria-hidden>
                      <ArrowRight size={20} className="hidden lg:block" /><ArrowDown size={20} className="lg:hidden" />
                    </span>
                  )];
              })}
            </div>

            <H3 id="resolve">Resolve</H3>
            <P>
              The 1Click status endpoint is keyed by deposit address only. Anything else resolves through the Explorer search first, and only a
              record the term actually identifies is taken as the swap: its deposit address, one of its transactions, or one of its intents. A
              wallet matches many records, so picking one would be a guess, and Quittance lists them instead. An address is always tried as a
              deposit address first, because that read needs no token and has no rate limit.
            </P>

            <H3 id="read">Read</H3>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-line">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-paper text-xs tracking-[0.1em] text-faint uppercase">
                  <tr><th className="px-4 py-3">Source</th><th className="px-4 py-3">Read for</th><th className="px-4 py-3">Needs</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {[
                    ["1Click /v0/status", "The operator's record: status, quote, hashes, refunds", "nothing"],
                    ["1Click /v0/tokens", "Each asset's chain, contract and decimals, so nothing is guessed from an id", "nothing"],
                    ["Intents Explorer", "Resolving hashes and wallets to swaps", "partner JWT, 1 request per 5 s"],
                    ["NearBlocks", "NEAR transactions, credits, and transfers inside signed intents", "nothing"],
                    ["EVM JSON-RPC", "Receipts, Transfer logs and native value on nine chains", "nothing, several endpoints each"],
                    ["TronGrid", "TRC20 Transfer logs and TRX transfers", "nothing, two endpoints"],
                    ["Solana JSON-RPC", "Token and lamport balance changes inside the transaction", "nothing, two endpoints"],
                    ["NEAR RPC", "The Bitcoin connector's refund timers, read from the contract", "nothing"],
                  ].map(([a, b, c]) => (
                    <tr key={a}>
                      <td className="px-4 py-3 font-semibold whitespace-nowrap">{a}</td>
                      <td className="px-4 py-3 text-muted">{b}</td>
                      <td className="px-4 py-3 font-[family-name:var(--font-mono)] text-xs">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <P>
              Public endpoints fail in two different ways, and Quittance keeps them apart. A chain that answers and does not show the transfer
              is a contradiction. A read that fails everywhere is unread. A native coin paid inside a contract call is inconclusive, because public
              endpoints cannot show internal transfers without a trace. Only the first can change a verdict.
            </P>

            <H3 id="classify">Classify</H3>
            <P>Rules run in this order and the first match wins, so narrow cases are declared before broad ones.</P>
            <ol className="mt-5 space-y-2">
              {RULES.map((r, i) => (
                <li key={r.id} className="grid gap-2 rounded-2xl border border-line bg-surface p-4 sm:grid-cols-[2.2rem_minmax(0,1fr)_auto] sm:items-center">
                  <span className="font-[family-name:var(--font-mono)] text-xs text-faint">{String(i + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">
                    <span className="block font-[family-name:var(--font-mono)] text-[0.8rem] break-all">{r.id}</span>
                    <span className="mt-1 block text-sm text-muted">{r.when}</span>
                  </span>
                  <span><Chip label={r.label} /></span>
                </li>
              ))}
            </ol>

            <H3 id="receipt-format">The receipt</H3>
            <P>
              A receipt is the verdict, the evidence it rests on, and every source read, serialised as canonical JSON with sorted keys and hashed
              with sha256. Two runs over the same evidence give the same fingerprint, and any change to the evidence gives a new one. The text form
              wraps to a fixed width, keeps hashes whole so they can be copied, and lists the rule that fired.
            </P>

            <H3 id="chains">Chains</H3>
            <P>Where Quittance proves a deposit or a payout on the chain itself.</P>
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {CHAIN_GRID.map((c) => (
                <div key={c.name} className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-3.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white"><ChainLogo name={c.name} size={24} /></span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{c.name === "Tron" ? "TRON" : c.name}</span>
                    <span className="block truncate text-xs text-faint">{c.what}</span>
                  </span>
                </div>
              ))}
            </div>
            <P>
              Payouts to shielded Zcash addresses are unprovable by anyone, and the receipt says so. Bitcoin, TON, XRP and the other chains in the
              coverage snapshot are not yet read independently; for those, delivery rests on the operator's record and the receipt says that.
            </P>

            <H3 id="layout">Code layout</H3>
            <Code>{`packages/core/src/classify.ts      ordered rules, first match wins
packages/core/src/gather.ts        resolves the swap and assembles evidence
packages/core/src/receipt.ts       canonical JSON, sha256 fingerprint, text form
packages/core/src/sources/         1Click, Explorer, NearBlocks, NEAR RPC,
                                   EVM, TRON, Solana, token list
packages/core/src/coverage.ts      how many real payouts can be proven
packages/core/src/watch.ts         what a watcher compares between two checks
packages/core/src/study.ts         the stuck tail, aggregates only
apps/web                           the site, the checker, these docs, the API
apps/cli                           check, replay, verify, rules, study, coverage, receipt
apps/sink                          reference webhook receiver
fixtures/                          seventeen frozen cases with provenance
studies/                           dated measurement snapshots`}</Code>
          </section>

          {/* ---------------- Labels ---------------- */}
          <section className="mt-28">
            <H2 id="labels" kicker="Reference">The eight labels</H2>
            <div className="mt-8 grid gap-3 md:grid-cols-2">
              {LABELS.map((l) => (
                <div key={l.label} className="rounded-[1.5rem] border border-line bg-surface p-5">
                  <Chip label={l.label} />
                  <p className="mt-3 text-sm leading-relaxed">{l.means}</p>
                  <p className="mt-2 text-sm text-muted"><span className="font-semibold text-fg">Next </span>{l.next}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ---------------- FAQ ---------------- */}
          <section className="mt-28">
            <H2 id="faq" kicker="Questions">Asked and answered</H2>
            <div className="mt-8 divide-y divide-line rounded-[1.75rem] border border-line bg-surface">
              {FAQ.map((f) => (
                <details key={f.q} className="group p-5 sm:p-6">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-bold">
                    {f.q}
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-line text-faint transition-transform group-open:rotate-45">+</span>
                  </summary>
                  <p className="mt-3 max-w-[70ch] text-sm leading-relaxed text-muted">{f.a}</p>
                </details>
              ))}
            </div>

            <div className="mt-16 flex flex-col items-start gap-5 rounded-[1.75rem] bg-mint p-8 text-black sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="figure text-2xl">Check a swap now</p>
                <p className="mt-1 text-sm opacity-75">Paste a hash, a deposit address or a wallet. Nothing is signed.</p>
              </div>
              <Link href="/check" className="inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 font-medium text-white transition-transform hover:-translate-y-0.5">
                Open the checker <ArrowRight size={16} />
              </Link>
            </div>
          </section>
        </article>
      </div>
    </main>
  );
}
