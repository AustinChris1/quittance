// Reads a TRON transfer directly, so a delivery or deposit on TRON is proven rather than reported.
import { readJson, formatUnits } from "./http.ts";
import type { DeliveryProof, SourceRef } from "../types.ts";

const TRANSFER_TOPIC = "ddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";
const ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";

export const TRON_APIS = ["https://api.trongrid.io", "https://tron-rpc.publicnode.com"];

/** Decodes a base58 TRON address to its 21-byte hex form, 41 followed by the 20-byte account. */
export function tronToHex(address: string): string | undefined {
  let n = 0n;
  for (const ch of address) {
    const i = ALPHABET.indexOf(ch);
    if (i < 0) return undefined;
    n = n * 58n + BigInt(i);
  }
  // 21 bytes of address plus a 4-byte checksum.
  const hex = n.toString(16).padStart(50, "0");
  const body = hex.slice(0, 42);
  return body.startsWith("41") ? body : undefined;
}

type Info = {
  id?: string;
  blockNumber?: number;
  blockTimeStamp?: number;
  receipt?: { result?: string };
  result?: string;
  log?: { address?: string; topics?: string[]; data?: string }[];
};

type Tx = {
  ret?: { contractRet?: string }[];
  raw_data?: { contract?: { type?: string; parameter?: { value?: { to_address?: string; amount?: number } } }[] };
};

async function post<T>(base: string, path: string, value: string, name: string) {
  return readJson<T>({ name, url: `${base}${path}`, method: "POST", body: { value }, timeoutMs: 20_000 });
}

/** Confirms that one TRON transaction moved the expected asset to the expected address. */
export async function verifyTronTransfer(params: {
  txHash: string;
  /** TRC20 contract in base58; omit for native TRX. */
  contract?: string;
  decimals: number;
  recipient?: string;
}): Promise<{ proof: DeliveryProof; sources: SourceRef[] }> {
  const sources: SourceRef[] = [];
  const base: DeliveryProof = { verified: false, chain: "TRON", tx: params.txHash };
  const hash = params.txHash.replace(/^0x/, "");

  let api = TRON_APIS[0]!;
  let info: Info | undefined;
  for (const candidate of TRON_APIS) {
    const res = await post<Info>(candidate, "/wallet/gettransactioninfobyid", hash, "tron.txinfo");
    sources.push(res.source);
    if (res.ok && res.data?.id) {
      api = candidate;
      info = res.data;
      break;
    }
  }
  if (!info) {
    return {
      proof: { ...base, reason: `The transaction was not returned by any of the ${TRON_APIS.length} TRON endpoints tried.` },
      sources,
    };
  }

  const blockNumber = info.blockNumber;
  const blockTimeIso = info.blockTimeStamp ? new Date(info.blockTimeStamp).toISOString() : undefined;
  const recipientHex = params.recipient ? tronToHex(params.recipient) : undefined;

  if (params.contract) {
    const contractHex = tronToHex(params.contract)?.slice(2);
    const receiptStatus = info.receipt?.result === "SUCCESS" ? "success" : "failed";
    const settled: DeliveryProof = { ...base, receiptStatus, blockNumber, blockTimeIso };
    const transfers = (info.log ?? []).filter(
      (l) => l.address?.toLowerCase() === contractHex && l.topics?.[0] === TRANSFER_TOPIC,
    );
    for (const log of transfers) {
      const to = (log.topics?.[2] ?? "").slice(24).toLowerCase();
      if (recipientHex && to !== recipientHex.slice(2)) continue;
      const raw = BigInt("0x" + (log.data || "0")).toString();
      return {
        proof: {
          ...settled,
          verified: receiptStatus === "success",
          deliveredRaw: raw,
          deliveredFormatted: formatUnits(raw, params.decimals),
          decimals: params.decimals,
          recipientMatched: Boolean(recipientHex),
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

  // Native TRX: the amount and receiver sit on the transaction's TransferContract.
  const txRes = await post<Tx>(api, "/wallet/gettransactionbyid", hash, "tron.tx");
  sources.push(txRes.source);
  const contract = txRes.ok ? txRes.data.raw_data?.contract?.[0] : undefined;
  const ok = txRes.ok && txRes.data.ret?.[0]?.contractRet === "SUCCESS";
  const value = contract?.parameter?.value;
  const settled: DeliveryProof = { ...base, receiptStatus: ok ? "success" : "failed", blockNumber, blockTimeIso };
  if (contract?.type === "TransferContract" && value?.amount && (!recipientHex || value.to_address?.toLowerCase() === recipientHex)) {
    const raw = String(value.amount);
    return {
      proof: {
        ...settled,
        verified: ok,
        deliveredRaw: raw,
        deliveredFormatted: formatUnits(raw, params.decimals),
        decimals: params.decimals,
        recipientMatched: Boolean(recipientHex),
      },
      sources,
    };
  }
  return {
    proof: {
      ...settled,
      recipientMatched: false,
      reason:
        contract?.type === "TransferContract"
          ? "The transaction sent TRX, but not to the quoted address."
          : "The transaction is not a plain TRX transfer.",
    },
    sources,
  };
}
