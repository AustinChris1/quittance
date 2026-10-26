import { readJson } from "./http.ts";
import type { ConnectorEvidence, SourceRef } from "../types.ts";

export const DEFAULT_NEAR_RPC = "https://rpc.mainnet.fastnear.com";

/** Documented window in the published guide for rescuing a stuck bitcoin deposit. */
export const DOCUMENTED_BTC_REFUND_TIMELOCK_SEC = 14 * 24 * 60 * 60;
export const BTC_CONNECTOR = "btc-connector.bridge.near";

type RpcReply = {
  result?: { result?: number[]; error?: string };
  error?: unknown;
};

/** Read-only contract call. NEAR returns the result as a byte array to decode. */
export async function viewFunction(params: {
  contract: string;
  method: string;
  args?: Record<string, unknown>;
  rpc?: string;
}): Promise<{ value: unknown; source: SourceRef }> {
  const rpc = params.rpc ?? DEFAULT_NEAR_RPC;
  const argsBase64 = Buffer.from(JSON.stringify(params.args ?? {})).toString("base64");
  const res = await readJson<RpcReply>({
    name: `near.view:${params.contract}.${params.method}`,
    url: rpc,
    method: "POST",
    body: {
      jsonrpc: "2.0",
      id: "quittance",
      method: "query",
      params: {
        request_type: "call_function",
        finality: "final",
        account_id: params.contract,
        method_name: params.method,
        args_base64: argsBase64,
      },
    },
  });

  if (!res.ok) return { value: undefined, source: res.source };

  const bytes = res.data.result?.result;
  if (!Array.isArray(bytes)) {
    const detail = res.data.result?.error ?? "no result bytes";
    return { value: undefined, source: { ...res.source, ok: false, detail: String(detail) } };
  }

  try {
    return { value: JSON.parse(Buffer.from(bytes).toString("utf8")), source: res.source };
  } catch {
    return { value: undefined, source: { ...res.source, ok: false, detail: "result was not JSON" } };
  }
}

export async function ftBalanceOf(params: {
  token: string;
  account: string;
  rpc?: string;
}): Promise<{ balance?: string; source: SourceRef }> {
  const { value, source } = await viewFunction({
    contract: params.token,
    method: "ft_balance_of",
    args: { account_id: params.account },
    rpc: params.rpc,
  });
  return { balance: typeof value === "string" ? value : undefined, source };
}

/** Reads the connector config that governs whether a stuck deposit can be refunded. */
export async function readBtcConnectorConfig(rpc?: string): Promise<{
  connector?: ConnectorEvidence;
  source: SourceRef;
}> {
  const { value, source } = await viewFunction({
    contract: BTC_CONNECTOR,
    method: "get_config",
    rpc,
  });

  if (!value || typeof value !== "object") return { source };
  const config = value as Record<string, unknown>;
  const unsafe = config.unsafe_refund_timelock_sec;
  const safe = config.refund_timelock_sec;

  // The refund fee is a separate view method, not a field on the config.
  const fee = await viewFunction({
    contract: BTC_CONNECTOR,
    method: "required_balance_for_request_refund",
    rpc,
  });

  return {
    connector: {
      contract: BTC_CONNECTOR,
      unsafeRefundTimelockSec: typeof unsafe === "number" ? unsafe : undefined,
      safeRefundTimelockSec: typeof safe === "number" ? safe : undefined,
      documentedTimelockSec: DOCUMENTED_BTC_REFUND_TIMELOCK_SEC,
      requiredRefundDepositNear:
        typeof fee.value === "string" ? yoctoToNear(fee.value) : undefined,
    },
    source,
  };
}

export function yoctoToNear(yocto: string): string {
  const padded = yocto.padStart(25, "0");
  const whole = padded.slice(0, padded.length - 24).replace(/^0+(?=\d)/, "");
  const frac = padded.slice(padded.length - 24).replace(/0+$/, "");
  return frac.length > 0 ? `${whole}.${frac}` : whole;
}
