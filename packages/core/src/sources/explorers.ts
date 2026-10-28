// Public block explorer links, so anyone can check a proven transfer without trusting Quittance.
const TX_URL: Record<string, string> = {
  ethereum: "https://etherscan.io/tx/",
  base: "https://basescan.org/tx/",
  arbitrum: "https://arbiscan.io/tx/",
  optimism: "https://optimistic.etherscan.io/tx/",
  polygon: "https://polygonscan.com/tx/",
  "bnb chain": "https://bscscan.com/tx/",
  gnosis: "https://gnosisscan.io/tx/",
  avalanche: "https://snowtrace.io/tx/",
  tron: "https://tronscan.org/#/transaction/",
  solana: "https://solscan.io/tx/",
  near: "https://nearblocks.io/txns/",
};

/** The explorer page for a transaction, keyed by the chain name a proof carries. Undefined when none is known. */
export function txUrl(chain: string | undefined, hash: string | undefined): string | undefined {
  if (!chain || !hash) return undefined;
  const base = TX_URL[chain.toLowerCase()];
  return base ? base + (chain.toLowerCase() === "tron" ? hash.replace(/^0x/, "") : hash) : undefined;
}
