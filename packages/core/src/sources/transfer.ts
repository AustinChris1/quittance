// One entry point for proving a transfer on whichever chain the asset lives on.
import type { DeliveryProof, SourceRef } from "../types.ts";
import { resolveToken, chainName } from "./tokens.ts";
import { EVM_RPCS, parseEvmAsset, verifyEvmTransfer } from "./evm.ts";
import { verifyTronTransfer } from "./tron.ts";
import { verifySolanaTransfer } from "./solana.ts";
import { txUrl } from "./explorers.ts";

export type TransferCheck = {
  proof?: DeliveryProof;
  sources: SourceRef[];
  /** Set when the chain is one Quittance cannot read, so the receipt can say which. */
  unsupported?: string;
};

/** True for the chains this module can read a receipt on. */
export function canProve(blockchain?: string): boolean {
  return blockchain !== undefined && (blockchain in EVM_RPCS || blockchain === "tron" || blockchain === "sol");
}

/**
 * Proves that `txHash` moved `assetId` to `to`. Used twice per swap: once on the origin chain
 * with the deposit address, once on the destination chain with the recipient.
 */
export async function proveTransfer(params: { assetId?: string; txHash: string; to?: string }): Promise<TransferCheck> {
  const { token, source } = await resolveToken(params.assetId);
  const sources: SourceRef[] = source ? [source] : [];

  if (!token) {
    // The token list was unreachable; an ERC20 still carries its contract in the asset id.
    const evm = parseEvmAsset(params.assetId);
    if (!evm) return { sources, unsupported: params.assetId ?? "unknown asset" };
    const r = await verifyEvmTransfer({ blockchain: evm.chainKey, txHash: params.txHash, contract: evm.token, recipient: params.to });
    return { proof: { ...r.proof, explorerUrl: txUrl(r.proof.chain, r.proof.tx) }, sources: [...sources, ...r.sources] };
  }

  const chain = token.blockchain;
  if (chain in EVM_RPCS) {
    if (!/^0x[0-9a-fA-F]{64}$/.test(params.txHash)) return { sources, unsupported: chainName(chain) };
    const r = await verifyEvmTransfer({
      blockchain: chain,
      txHash: params.txHash,
      contract: token.contractAddress,
      decimals: token.decimals,
      recipient: params.to,
    });
    return { proof: { ...r.proof, symbol: token.symbol, explorerUrl: txUrl(r.proof.chain, r.proof.tx) }, sources: [...sources, ...r.sources] };
  }
  if (chain === "tron") {
    const r = await verifyTronTransfer({
      txHash: params.txHash,
      contract: token.contractAddress,
      decimals: token.decimals,
      recipient: params.to,
    });
    return { proof: { ...r.proof, symbol: token.symbol, explorerUrl: txUrl(r.proof.chain, r.proof.tx) }, sources: [...sources, ...r.sources] };
  }
  if (chain === "sol") {
    const r = await verifySolanaTransfer({
      txHash: params.txHash,
      mint: token.contractAddress,
      decimals: token.decimals,
      recipient: params.to,
    });
    return { proof: { ...r.proof, symbol: token.symbol, explorerUrl: txUrl(r.proof.chain, r.proof.tx) }, sources: [...sources, ...r.sources] };
  }
  return { sources, unsupported: chainName(chain) };
}
