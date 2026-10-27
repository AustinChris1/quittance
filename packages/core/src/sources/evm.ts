// Reads the destination receipt directly, so DELIVERED is proven rather than reported.
import { readJson, formatUnits } from "./http.ts";
import type { SourceRef } from "../types.ts";

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/** Intents asset ids look like nep141:eth-0xdac17f...omft.near. */
const ASSET_PATTERN = /^nep141:([a-z0-9]+)-(0x[0-9a-fA-F]{40})\.omft\.near$/;

export const EVM_RPCS: Record<string, { name: string; url: string }> = {
  eth: { name: "ethereum", url: "https://ethereum-rpc.publicnode.com" },
  base: { name: "base", url: "https://base-rpc.publicnode.com" },
  arb: { name: "arbitrum", url: "https://arbitrum-one-rpc.publicnode.com" },
  op: { name: "optimism", url: "https://optimism-rpc.publicnode.com" },
  pol: { name: "polygon", url: "https://polygon-bor-rpc.publicnode.com" },
  bsc: { name: "bsc", url: "https://bsc-rpc.publicnode.com" },
};

export type EvmAsset = { chainKey: string; chainName: string; token: string; rpc: string };

export function parseEvmAsset(assetId?: string): EvmAsset | undefined {
  const match = ASSET_PATTERN.exec(assetId ?? "");
  if (!match) return undefined;
  const [, prefix, token] = match;
  const chain = EVM_RPCS[prefix!];
  if (!chain) return undefined;
  return { chainKey: prefix!, chainName: chain.name, token: token!.toLowerCase(), rpc: chain.url };
}

export type DeliveryProof = {
  verified: boolean;
  chain: string;
  tx: string;
  receiptStatus?: "success" | "failed";
  blockNumber?: number;
  blockTimeIso?: string;
  /** The transfer of the expected token to the expected recipient, if one is present. */
  deliveredRaw?: string;
  deliveredFormatted?: string;
  recipientMatched?: boolean;
  reason?: string;
};

async function rpc<T>(url: string, method: string, params: unknown[], name: string) {
  return readJson<{ result?: T; error?: { message?: string } }>({
    name,
    url,
    method: "POST",
    body: { jsonrpc: "2.0", id: 1, method, params },
    timeoutMs: 20_000,
  });
}

/**
 * Confirms that the destination transaction really moved the expected token to the expected
 * recipient. Decimals are read from the token contract, never assumed.
 */
export async function verifyEvmDelivery(params: {
  txHash: string;
  asset: EvmAsset;
  recipient?: string;
  rpcUrl?: string;
}): Promise<{ proof: DeliveryProof; sources: SourceRef[] }> {
  const url = params.rpcUrl ?? params.asset.rpc;
  const sources: SourceRef[] = [];
  const base: DeliveryProof = { verified: false, chain: params.asset.chainName, tx: params.txHash };

  const receipt = await rpc<{
    status?: string;
    blockNumber?: string;
    logs?: { address?: string; topics?: string[]; data?: string }[];
  }>(url, "eth_getTransactionReceipt", [params.txHash], `evm.receipt:${params.asset.chainName}`);
  sources.push(receipt.source);

  if (!receipt.ok || !receipt.data.result) {
    return { proof: { ...base, reason: "The destination transaction was not found on that chain." }, sources };
  }

  const result = receipt.data.result;
  const receiptStatus = result.status === "0x1" ? "success" : "failed";

  let blockTimeIso: string | undefined;
  let blockNumber: number | undefined;
  if (result.blockNumber) {
    blockNumber = Number.parseInt(result.blockNumber, 16);
    const block = await rpc<{ timestamp?: string }>(
      url,
      "eth_getBlockByNumber",
      [result.blockNumber, false],
      `evm.block:${params.asset.chainName}`,
    );
    sources.push(block.source);
    const ts = block.ok ? block.data.result?.timestamp : undefined;
    if (ts) blockTimeIso = new Date(Number.parseInt(ts, 16) * 1000).toISOString();
  }

  const decimalsCall = await rpc<string>(
    url,
    "eth_call",
    [{ to: params.asset.token, data: "0x313ce567" }, "latest"],
    `evm.decimals:${params.asset.chainName}`,
  );
  sources.push(decimalsCall.source);
  const decimals =
    decimalsCall.ok && typeof decimalsCall.data.result === "string"
      ? Number.parseInt(decimalsCall.data.result, 16)
      : 18;

  const recipient = params.recipient?.toLowerCase();
  const transfers = (result.logs ?? []).filter(
    (log) => log.address?.toLowerCase() === params.asset.token && log.topics?.[0] === TRANSFER_TOPIC,
  );

  for (const log of transfers) {
    const to = "0x" + (log.topics?.[2] ?? "").slice(26).toLowerCase();
    if (recipient && to !== recipient) continue;
    const raw = BigInt(log.data && log.data !== "0x" ? log.data : "0x0").toString();
    return {
      proof: {
        ...base,
        verified: receiptStatus === "success",
        receiptStatus,
        blockNumber,
        blockTimeIso,
        deliveredRaw: raw,
        deliveredFormatted: formatUnits(raw, Number.isFinite(decimals) ? decimals : 18),
        recipientMatched: Boolean(recipient),
      },
      sources,
    };
  }

  return {
    proof: {
      ...base,
      receiptStatus,
      blockNumber,
      blockTimeIso,
      recipientMatched: false,
      reason:
        transfers.length === 0
          ? "The destination transaction carries no transfer of the expected token."
          : "The destination transaction moved the expected token, but not to the quoted recipient.",
    },
    sources,
  };
}
