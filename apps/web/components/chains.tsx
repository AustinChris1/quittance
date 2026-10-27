/**
 * Official network marks, vendored as static SVG from @web3icons (MIT) in each chain's own brand
 * colours. Six files totalling about 4 KB, rather than the 102 MB package they come from.
 */
export const CHAINS = [
  { name: "NEAR", file: "near" },
  { name: "Ethereum", file: "ethereum" },
  { name: "Tron", file: "tron" },
  { name: "Bitcoin", file: "bitcoin" },
  { name: "Base", file: "base" },
  { name: "Solana", file: "solana" },
] as const;

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
