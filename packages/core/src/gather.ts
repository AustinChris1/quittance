import type { ChainEvidence, Evidence, SourceRef } from "./types.ts";
import { readOneClickStatus } from "./sources/oneclick.ts";
import { readNearTx } from "./sources/nearblocks.ts";
import { ftBalanceOf, readBtcConnectorConfig } from "./sources/near.ts";

export type GatherOptions = {
  depositAddress?: string;
  memo?: string;
  nearTxHash?: string;
  apiKey?: string;
  rpc?: string;
  oneClickBase?: string;
  nearblocksBase?: string;
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

export async function gatherEvidence(options: GatherOptions): Promise<Evidence> {
  const sources: SourceRef[] = [];
  const notes: string[] = [];
  const fetchedAt = new Date().toISOString();

  if (!options.depositAddress && !options.nearTxHash) {
    throw new Error("Supply a deposit address, or a NEAR transaction hash, to gather evidence.");
  }

  let status: Evidence["status"] = {
    available: false,
    reason: "No deposit address was supplied, so the status endpoint was not called.",
  };
  if (!options.depositAddress) notes.push(status.available ? "" : status.reason);

  if (options.depositAddress) {
    const read = await readOneClickStatus({
      depositAddress: options.depositAddress,
      memo: options.memo,
      apiKey: options.apiKey,
      base: options.oneClickBase,
    });
    status = read.evidence;
    sources.push(...read.sources);
    if (!read.evidence.available) notes.push(read.evidence.reason);
  }

  const chain: ChainEvidence = { deposits: [], checked: false };

  const nearTxHash =
    options.nearTxHash ?? (status.available ? status.nearTxHashes[0] : undefined);

  if (nearTxHash) {
    const tx = await readNearTx({ hash: nearTxHash, base: options.nearblocksBase });
    sources.push(tx.source);
    chain.checked = true;
    chain.deposits = tx.deposits;
    chain.creditedTo = tx.creditedTo;
    if (tx.deposits.length === 0) {
      notes.push(`No token movement was decoded from NEAR transaction ${nearTxHash}.`);
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

  let connector: Evidence["connector"];
  const routeLooksBitcoin =
    status.available && looksBitcoin(status.originAsset, status.destinationAsset);
  if (options.checkBtcConnector || routeLooksBitcoin) {
    const read = await readBtcConnectorConfig(options.rpc);
    sources.push(read.source);
    connector = read.connector;
    if (status.available && !status.refundTo) {
      notes.push("The quote carries no refund address, which is what puts a stuck deposit behind the connector timelock.");
    }
  }

  return {
    input: {
      depositAddress: options.depositAddress,
      memo: options.memo,
      nearTxHash,
    },
    fetchedAt,
    mode: options.apiKey ? "authenticated" : "unauthenticated",
    status,
    chain,
    connector,
    sources,
    notes,
  };
}
