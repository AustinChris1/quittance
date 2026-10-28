// Measures how many real payouts Quittance can prove on their own chain. Aggregates only.
import { readJson } from "./sources/http.ts";
import { DEFAULT_EXPLORER_BASE } from "./sources/explorer.ts";
import { loadTokens } from "./sources/tokens.ts";
import { canProve, proveTransfer } from "./sources/transfer.ts";
import { parseEvmAsset } from "./sources/evm.ts";

export type Coverage = {
  at: string;
  window: { from: string; to: string };
  sampled: number;
  externalPayouts: number;
  /** Share of external payouts on a chain Quittance reads, by count and by quoted USD. */
  readable: { count: number; share: number; usdShare: number };
  /** The same measure for the ERC20-only reader that shipped before 2026-10-28. */
  erc20Only: { count: number; share: number; usdShare: number };
  /** Payouts to shielded Zcash addresses, which no public record can show. */
  shieldedZcash: number;
  notYetRead: Record<string, number>;
  /** Payouts actually checked on chain, spread evenly across the window. */
  proven: { checked: number; verified: number; inconclusive: number; contradicted: number; unread: number };
  provenByChain: Record<string, number>;
  notes: string[];
};

type Row = {
  createdAt?: string;
  recipientType?: string;
  destinationAsset?: string;
  recipient?: string;
  amountOutUsd?: string;
  destinationChainTxHashes?: ({ hash?: string } | string)[];
};

const round = (n: number) => Math.round(n * 1000) / 10;

export async function runCoverage(params: { token: string; size?: number; check?: number }): Promise<Coverage> {
  const url = new URL("/api/v0/transactions", DEFAULT_EXPLORER_BASE);
  url.searchParams.set("numberOfTransactions", String(params.size ?? 1000));
  url.searchParams.set("statuses", "SUCCESS");
  const res = await readJson<Row[]>({
    name: "intents.explorer.recent",
    url: url.toString(),
    headers: { Authorization: `Bearer ${params.token}` },
    timeoutMs: 60_000,
  });
  if (!res.ok || !Array.isArray(res.data)) throw new Error(`Explorer read failed: ${res.source.detail ?? "unknown"}`);
  const rows = res.data;
  const { tokens } = await loadTokens();

  const chainOf = (r: Row) => tokens.get(r.destinationAsset ?? "")?.blockchain;
  const usd = (xs: Row[]) => xs.reduce((a, r) => a + Number(r.amountOutUsd ?? 0), 0);
  const shielded = (r: Row) => r.destinationAsset === "nep141:zec.omft.near" && !String(r.recipient).startsWith("t");

  const external = rows.filter((r) => r.recipientType === "DESTINATION_CHAIN");
  const readable = external.filter((r) => canProve(chainOf(r)));
  const erc20 = external.filter((r) => parseEvmAsset(r.destinationAsset));
  const notYetRead: Record<string, number> = {};
  for (const r of external) {
    if (canProve(chainOf(r)) || shielded(r)) continue;
    const k = chainOf(r) ?? "unlisted";
    notYetRead[k] = (notYetRead[k] ?? 0) + 1;
  }

  const total = usd(external) || 1;
  const share = (xs: Row[]) => ({
    count: xs.length,
    share: round(xs.length / (external.length || 1)),
    usdShare: round(usd(xs) / total),
  });

  // An even spread across the window, so one busy minute does not stand for the hour.
  const want = Math.min(params.check ?? 40, readable.length);
  const step = want > 0 ? Math.max(1, Math.floor(readable.length / want)) : 1;
  const proven = { checked: 0, verified: 0, inconclusive: 0, contradicted: 0, unread: 0 };
  const provenByChain: Record<string, number> = {};
  for (let i = 0; i < want; i += 1) {
    const r = readable[i * step]!;
    const first = r.destinationChainTxHashes?.[0];
    const hash = typeof first === "string" ? first : first?.hash;
    if (!hash) continue;
    const { proof } = await proveTransfer({ assetId: r.destinationAsset, txHash: hash, to: r.recipient });
    proven.checked += 1;
    if (proof?.verified) {
      proven.verified += 1;
      const k = chainOf(r) ?? "unknown";
      provenByChain[k] = (provenByChain[k] ?? 0) + 1;
    } else if (proof?.inconclusive) proven.inconclusive += 1;
    else if (proof?.receiptStatus) proven.contradicted += 1;
    else proven.unread += 1;
  }

  return {
    at: new Date().toISOString(),
    window: { from: rows.at(-1)?.createdAt ?? "", to: rows[0]?.createdAt ?? "" },
    sampled: rows.length,
    externalPayouts: external.length,
    readable: share(readable),
    erc20Only: share(erc20),
    shieldedZcash: external.filter(shielded).length,
    notYetRead,
    proven,
    provenByChain,
    notes: [
      "Readable means the destination chain is one Quittance reads. Proven means the payout was read on that chain and matched the quoted recipient.",
      "USD is the quoted value at creation, not a realised amount.",
      "Counts only. No addresses, hashes or per-swap amounts are retained.",
    ],
  };
}

export function renderCoverage(c: Coverage): string {
  const lines = [
    `Coverage measured ${c.at}`,
    `window ${c.window.from} to ${c.window.to}, ${c.sampled} successful swaps`,
    "",
    `external payouts          ${c.externalPayouts}`,
    `on a chain Quittance reads ${c.readable.count}  (${c.readable.share}% of payouts, ${c.readable.usdShare}% of value)`,
    `ERC20-only reader, before ${c.erc20Only.count}  (${c.erc20Only.share}% of payouts, ${c.erc20Only.usdShare}% of value)`,
    `shielded Zcash, unprovable ${c.shieldedZcash}`,
    `not yet read              ${Object.entries(c.notYetRead).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(", ") || "none"}`,
    "",
    `proven on chain           ${c.proven.verified} of ${c.proven.checked} checked` +
      (c.proven.inconclusive + c.proven.contradicted + c.proven.unread > 0
        ? ` (inconclusive ${c.proven.inconclusive}, contradicted ${c.proven.contradicted}, unread ${c.proven.unread})`
        : ""),
    `by chain                  ${Object.entries(c.provenByChain).map(([k, v]) => `${k} ${v}`).join(", ")}`,
  ];
  return lines.join("\n");
}
