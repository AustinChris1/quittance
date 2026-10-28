/**
 * Official network marks, vendored as static SVG from @web3icons (MIT) in each chain's own brand
 * colours. Fourteen files totalling about 12 KB, rather than the 102 MB package they come from.
 */
export const CHAINS = [
  { name: "NEAR", file: "near" },
  { name: "Ethereum", file: "ethereum" },
  { name: "Tron", file: "tron" },
  { name: "Bitcoin", file: "bitcoin" },
  { name: "Base", file: "base" },
  { name: "Solana", file: "solana" },
  { name: "Arbitrum", file: "arbitrum" },
  { name: "Optimism", file: "optimism" },
  { name: "Polygon", file: "polygon" },
  { name: "BNB Chain", file: "bnb" },
  { name: "Gnosis", file: "gnosis" },
  { name: "Avalanche", file: "avalanche" },
  { name: "Zcash", file: "zcash" },
  { name: "Robinhood Chain", file: "robinhood" },
] as const;

/** Maps any chain name a receipt carries onto a vendored mark, or null when there is none. */
export function chainFor(name?: string): ChainName | null {
  const n = (name ?? "").toLowerCase();
  if (n.includes("robinhood") || n === "hood") return "Robinhood Chain";
  if (n.includes("arb")) return "Arbitrum";
  if (n.includes("optimism") || n === "op") return "Optimism";
  if (n.includes("polygon") || n === "pol") return "Polygon";
  if (n.includes("bnb") || n === "bsc") return "BNB Chain";
  if (n.includes("gnosis")) return "Gnosis";
  if (n.includes("avalanche") || n === "avax") return "Avalanche";
  if (n.includes("zcash") || n === "zec") return "Zcash";
  if (n.includes("eth")) return "Ethereum";
  if (n.includes("base")) return "Base";
  if (n.includes("sol")) return "Solana";
  if (n.includes("btc") || n.includes("bitcoin")) return "Bitcoin";
  if (n.includes("tron")) return "Tron";
  if (n.includes("near")) return "NEAR";
  return null;
}

export type ChainName = (typeof CHAINS)[number]["name"];

export function ChainLogo({ name, size = 28 }: { name: ChainName; size?: number }) {
  const chain = CHAINS.find((c) => c.name === name);
  if (!chain) return null;
  return (
    // Static brand assets; next/image adds nothing for a 1 KB vector.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`/chains/${chain.file}.svg`}
      alt={`${name} logo`}
      width={size}
      height={size}
      className="shrink-0"
      loading="lazy"
      decoding="async"
    />
  );
}
