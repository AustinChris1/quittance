// Reads a transfer receipt directly on an EVM chain, so a delivery or a deposit is proven rather than reported.
import { readJson, formatUnits } from "./http.ts";
import type { DeliveryProof, SourceRef } from "../types.ts";

export type { DeliveryProof } from "../types.ts";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/** Intents asset ids look like nep141:eth-0xdac17f...omft.near. */
const ASSET_PATTERN = /^nep141:([a-z0-9]+)-(0x[0-9a-fA-F]{40})\.omft\.near$/;

// Several endpoints per chain: public RPCs often refuse datacenter traffic. Keyed by the token list's blockchain.
export const EVM_RPCS: Record<string, { name: string; urls: string[] }> = {
  eth: {
    name: "Ethereum",
    urls: [
      "https://ethereum-rpc.publicnode.com",
      "https://eth.llamarpc.com",
      "https://cloudflare-eth.com",
      "https://eth.drpc.org",
      "https://rpc.ankr.com/eth",
    ],
  },
  base: {
    name: "Base",
    urls: ["https://base-rpc.publicnode.com", "https://mainnet.base.org", "https://base.llamarpc.com"],
  },
  arb: {
    name: "Arbitrum",
    urls: ["https://arbitrum-one-rpc.publicnode.com", "https://arb1.arbitrum.io/rpc"],
  },
  op: { name: "Optimism", urls: ["https://optimism-rpc.publicnode.com", "https://mainnet.optimism.io"] },
  pol: { name: "Polygon", urls: ["https://polygon-bor-rpc.publicnode.com", "https://polygon-rpc.com"] },
  bsc: { name: "BNB Chain", urls: ["https://bsc-rpc.publicnode.com", "https://bsc-dataseed.binance.org"] },
  gnosis: { name: "Gnosis", urls: ["https://gnosis-rpc.publicnode.com", "https://rpc.gnosischain.com"] },
  avax: {
    name: "Avalanche",
    urls: ["https://avalanche-c-chain-rpc.publicnode.com", "https://api.avax.network/ext/bc/C/rpc"],
  },
  // Chain id 4663, the official public endpoint.
  hood: { name: "Robinhood Chain", urls: ["https://rpc.mainnet.chain.robinhood.com"] },
};

export type EvmAsset = { chainKey: string; chainName: string; token: string; rpcs: string[] };

/** Fallback for when the token list is unreachable: the contract is inside the asset id. */
export function parseEvmAsset(assetId?: string): EvmAsset | undefined {
  const match = ASSET_PATTERN.exec(assetId ?? "");
  if (!match) return undefined;
  const [, prefix, token] = match;
  const chain = EVM_RPCS[prefix!];
  if (!chain) return undefined;
  return { chainKey: prefix!, chainName: chain.name, token: token!.toLowerCase(), rpcs: chain.urls };
}

async function rpc<T>(url: string, method: string, params: unknown[], name: string) {
  return readJson<{ result?: T; error?: { message?: string } }>({
    name,
    url,
    method: "POST",
    body: { jsonrpc: "2.0", id: 1, method, params },
    timeoutMs: 20_000,
  });
}

type Receipt = {
  status?: string;
  blockNumber?: string;
  logs?: { address?: string; topics?: string[]; data?: string }[];
};

type Tx = { to?: string | null; value?: string; input?: string };

/**
 * Confirms that one transaction moved the expected asset to the expected address. For a token
 * that is a Transfer log; for the native coin it is the transaction's own value. Decimals come
 * from the token list, or from the contract when the list does not give them.
 */
export async function verifyEvmTransfer(params: {
  blockchain: string;
  txHash: string;
  /** Token contract; omit for the chain's native coin. */
  contract?: string;
  decimals?: number;
  recipient?: string;
  rpcUrl?: string;
}): Promise<{ proof: DeliveryProof; sources: SourceRef[] }> {
  const chain = EVM_RPCS[params.blockchain]!;
  const candidates = params.rpcUrl ? [params.rpcUrl] : chain.urls;
  const sources: SourceRef[] = [];
  const base: DeliveryProof = { verified: false, chain: chain.name, tx: params.txHash };
  const label = `evm.${params.blockchain}`;

  // Public endpoints often answer 200 with an empty result from datacenter IPs, so try in turn.
  let url = candidates[0]!;
  let receipt: Receipt | undefined;
  for (const candidate of candidates) {
    const attempt = await rpc<Receipt>(candidate, "eth_getTransactionReceipt", [params.txHash], `${label}.receipt`);
    sources.push(attempt.source);
    if (attempt.ok && attempt.data.result) {
      url = candidate;
      receipt = attempt.data.result;
      break;
    }
  }

  if (!receipt) {
    return {
      proof: {
        ...base,
        reason: `The transaction was not returned by any of the ${candidates.length} endpoints tried on ${chain.name}.`,
      },
      sources,
    };
  }
  const receiptStatus = receipt.status === "0x1" ? "success" : "failed";

  let blockTimeIso: string | undefined;
  let blockNumber: number | undefined;
  if (receipt.blockNumber) {
    blockNumber = Number.parseInt(receipt.blockNumber, 16);
    const block = await rpc<{ timestamp?: string }>(url, "eth_getBlockByNumber", [receipt.blockNumber, false], `${label}.block`);
    sources.push(block.source);
    const ts = block.ok ? block.data.result?.timestamp : undefined;
    if (ts) blockTimeIso = new Date(Number.parseInt(ts, 16) * 1000).toISOString();
  }

  const recipient = params.recipient?.toLowerCase();
  const settled = { ...base, receiptStatus, blockNumber, blockTimeIso } as DeliveryProof;

  if (!params.contract) {
    // Native coin: the value rides on the transaction itself.
    // A failed read is not a contradiction, so every endpoint is tried before giving up.
    let body: Tx | undefined;
    for (const candidate of [url, ...candidates.filter((c) => c !== url)]) {
      const attempt = await rpc<Tx>(candidate, "eth_getTransactionByHash", [params.txHash], `${label}.tx`);
      sources.push(attempt.source);
      if (attempt.ok && attempt.data.result) {
        body = attempt.data.result;
        break;
      }
    }
    if (!body) {
      return {
        proof: { ...base, blockNumber, blockTimeIso, reason: `The transaction body could not be read from any endpoint on ${chain.name}.` },
        sources,
      };
    }
    const to = body.to?.toLowerCase();
    const value = body.value ? BigInt(body.value) : 0n;
    const viaContract = (body.input ?? "0x").length > 2;
    const decimals = params.decimals ?? 18;
    if (to && value > 0n && (!recipient || to === recipient)) {
      return {
        proof: {
          ...settled,
          verified: receiptStatus === "success",
          deliveredRaw: value.toString(),
          deliveredFormatted: formatUnits(value.toString(), decimals),
          decimals,
          recipientMatched: Boolean(recipient),
        },
        sources,
      };
    }
    if (viaContract) {
      // The coin moved as an internal transfer inside a contract call, which only a trace shows.
      return {
        proof: {
          ...settled,
          inconclusive: true,
          reason: `The transaction calls a contract (${to ?? "unknown"}), so the native transfer inside it is internal. Public endpoints cannot show internal transfers without a trace.`,
        },
        sources,
      };
    }
    return {
      proof: {
        ...settled,
        recipientMatched: false,
        reason:
          value === 0n
            ? "The transaction carries no native value."
            : "The transaction sent the native coin, but not to the quoted address.",
      },
      sources,
    };
  }

  const contract = params.contract.toLowerCase();
  let decimals = params.decimals;
  if (decimals === undefined) {
    const call = await rpc<string>(url, "eth_call", [{ to: contract, data: "0x313ce567" }, "latest"], `${label}.decimals`);
    sources.push(call.source);
    decimals = call.ok && typeof call.data.result === "string" ? Number.parseInt(call.data.result, 16) : 18;
  }

  const transfers = (receipt.logs ?? []).filter(
    (log) => log.address?.toLowerCase() === contract && log.topics?.[0] === TRANSFER_TOPIC,
  );
  for (const log of transfers) {
    const to = "0x" + (log.topics?.[2] ?? "").slice(26).toLowerCase();
    if (recipient && to !== recipient) continue;
    const raw = BigInt(log.data && log.data !== "0x" ? log.data : "0x0").toString();
    return {
      proof: {
        ...settled,
        verified: receiptStatus === "success",
        deliveredRaw: raw,
        deliveredFormatted: formatUnits(raw, decimals),
        decimals,
        recipientMatched: Boolean(recipient),
      },
      sources,
    };
  }

  return {
    proof: {
      ...settled,
      recipientMatched: false,
      reason:
        transfers.length === 0
          ? "The transaction carries no transfer of the expected token."
          : "The transaction moved the expected token, but not to the quoted address.",
    },
    sources,
  };
}

/** Kept for callers that still pass a parsed asset. */
export async function verifyEvmDelivery(params: {
  txHash: string;
  asset: EvmAsset;
  recipient?: string;
  rpcUrl?: string;
}): Promise<{ proof: DeliveryProof; sources: SourceRef[] }> {
  return verifyEvmTransfer({
    blockchain: params.asset.chainKey,
    txHash: params.txHash,
    contract: params.asset.token,
    recipient: params.recipient,
    rpcUrl: params.rpcUrl,
  });
}
