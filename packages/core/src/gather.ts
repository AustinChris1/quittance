import type { ChainEvidence, Evidence, SourceRef } from "./types.ts";
import { readOneClickStatus } from "./sources/oneclick.ts";
import { readNearTx } from "./sources/nearblocks.ts";
import { ftBalanceOf, readBtcConnectorConfig } from "./sources/near.ts";
import { searchExplorer, statusFromExplorer, type ExplorerRecord } from "./sources/explorer.ts";
import { parseEvmAsset, verifyEvmDelivery } from "./sources/evm.ts";

export type GatherOptions = {
  depositAddress?: string;
  memo?: string;
  nearTxHash?: string;
  /** Any identifier the explorer can search: a transaction hash, a recipient or a sender. */
  search?: string;
  apiKey?: string;
  explorerToken?: string;
  rpc?: string;
  oneClickBase?: string;
  nearblocksBase?: string;
  explorerBase?: string;
  /** Read the bitcoin connector config even when the route is not obviously BTC. */
  checkBtcConnector?: boolean;
};

/** Asset ids look like nep141:tron.omft.near; only nep141 assets can be balance-checked here. */
export function parseNep141(assetId?: string): string | undefined {
  if (!assetId) return undefined;
  const match = /^nep141:(.+)$/.exec(assetId);
  return match?.[1];
}

function looksBitcoin(...values: (string | undefined)[]): boolean {
  return values.some((v) => typeof v === "string" && /btc|bitcoin/i.test(v));
}

/** Base58 of 32 bytes, which is what a NEAR transaction hash looks like. */
function looksNearTxHash(value?: string): boolean {
  return value !== undefined && /^[1-9A-HJ-NP-Za-km-z]{43,44}$/.test(value);
}

export async function gatherEvidence(options: GatherOptions): Promise<Evidence> {
  const sources: SourceRef[] = [];
  const notes: string[] = [];
  const fetchedAt = new Date().toISOString();

  if (!options.depositAddress && !options.nearTxHash && !options.search) {
    throw new Error("Supply a deposit address, a NEAR transaction hash, or a search term.");
  }

  let depositAddress = options.depositAddress;
  let memo = options.memo;
  let explorerRecord: ExplorerRecord | undefined;

  // The status endpoint is keyed by deposit address only, so other identifiers resolve first.
  const searchTerm = options.search ?? (depositAddress ? undefined : options.nearTxHash);
  if (!depositAddress && searchTerm) {
    const found = await searchExplorer({
      query: searchTerm,
      token: options.explorerToken,
      base: options.explorerBase,
    });
    sources.push(...found.sources);
    if (found.note) notes.push(found.note);
    const match = found.records.find((r) => r.depositAddress);
    if (match) {
      depositAddress = match.depositAddress;
      memo = memo ?? match.depositMemo;
      explorerRecord = match;
      notes.push(`Resolved ${searchTerm} to deposit address ${depositAddress} through the Explorer API.`);
    } else if (!found.needsToken && found.records.length === 0) {
      notes.push(`The Explorer API returned no swap matching ${searchTerm}.`);
    }
  }

  let status: Evidence["status"] = {
    available: false,
    reason: "No deposit address was available, so the status endpoint was not called.",
  };

  if (depositAddress) {
    const read = await readOneClickStatus({
      depositAddress,
      memo,
      apiKey: options.apiKey,
      base: options.oneClickBase,
    });
    status = read.evidence;
    sources.push(...read.sources);
  }

  // The explorer record carries the same fields and is a usable fallback.
  if (!status.available && explorerRecord) {
    const fromExplorer = statusFromExplorer(explorerRecord);
    if (fromExplorer.available) {
      notes.push("Status fields were taken from the explorer record, not the status endpoint.");
      status = fromExplorer;
    }
  }

  if (!status.available) notes.push(status.reason);

  const chain: ChainEvidence = { deposits: [], checked: false };
  // A search term that is itself a NEAR transaction still yields chain evidence if resolution failed.
  const nearTxHash =
    options.nearTxHash ??
    (status.available ? status.nearTxHashes[0] : undefined) ??
    (looksNearTxHash(searchTerm) ? searchTerm : undefined);

  if (nearTxHash) {
    const tx = await readNearTx({ hash: nearTxHash, base: options.nearblocksBase });
    sources.push(tx.source);
    chain.checked = true;
    chain.deposits = tx.deposits;
    chain.creditedTo = tx.creditedTo;
    chain.intentTransfers = tx.intentTransfers;
    chain.nearTxTimeIso = tx.blockTimestampIso;
    if (tx.deposits.length === 0 && tx.intentTransfers.length === 0) {
      notes.push(`No token movement was decoded from NEAR transaction ${nearTxHash}.`);
    } else if (tx.intentTransfers.length > 0) {
      for (const t of tx.intentTransfers) {
        notes.push(
          `Signed intent in ${nearTxHash}: ${t.amountFormatted ?? t.amountRaw} ${t.token} transferred to ${t.receiver}.`,
        );
      }
    } else if (tx.creditedTo) {
      const when = tx.blockTimestampIso ? ` at ${tx.blockTimestampIso}` : "";
      notes.push(
        `Chain evidence: ${tx.creditedTo.amount} ${tx.creditedTo.token} was credited to ${tx.creditedTo.account} in ${nearTxHash}${when}.`,
      );
    }
  } else {
    notes.push("No NEAR transaction hash was available, so chain evidence could not be gathered.");
  }

  if (status.available) {
    const token = parseNep141(status.destinationAsset);
    const recipient = status.recipient;
    if (token && recipient && !recipient.startsWith("0x")) {
      const balance = await ftBalanceOf({ token, account: recipient, rpc: options.rpc });
      sources.push(balance.source);
      if (balance.balance !== undefined) {
        chain.recipientBalance = { account: recipient, token, amount: balance.balance };
      }
    }
  }

  // A reported SUCCESS is not evidence. Read the destination receipt and check it ourselves.
  if (status.available && status.destinationChainTxHashes.length > 0) {
    const asset = parseEvmAsset(status.destinationAsset);
    const txHash = status.destinationChainTxHashes[0]!.hash;
    if (asset && /^0x[0-9a-fA-F]{64}$/.test(txHash)) {
      const { proof, sources: proofSources } = await verifyEvmDelivery({
        txHash,
        asset,
        recipient: status.recipient,
      });
      sources.push(...proofSources);
      chain.delivery = proof;
      if (proof.verified && proof.deliveredFormatted) {
        notes.push(
          `Delivery confirmed on ${proof.chain}: ${proof.deliveredFormatted} reached the quoted recipient in block ${proof.blockNumber ?? "unknown"}${proof.blockTimeIso ? " at " + proof.blockTimeIso : ""}.`,
        );
      } else if (proof.reason) {
        notes.push(`Delivery could not be confirmed on ${proof.chain}: ${proof.reason}`);
      }
    }
  }

  let connector: Evidence["connector"];
  const routeLooksBitcoin =
    status.available && looksBitcoin(status.originAsset, status.destinationAsset);
  if (options.checkBtcConnector || routeLooksBitcoin) {
    const read = await readBtcConnectorConfig(options.rpc);
    sources.push(read.source);
    connector = read.connector;
  }

  return {
    input: { depositAddress, memo, nearTxHash },
    fetchedAt,
    mode: options.apiKey ? "authenticated" : "unauthenticated",
    status,
    chain,
    connector,
    sources,
    notes,
  };
}
