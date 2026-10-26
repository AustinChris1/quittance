// Status values and enums mirror the live 1Click OpenAPI spec read on 2026-10-26.

export const ONECLICK_STATUSES = [
  "KNOWN_DEPOSIT_TX",
  "PENDING_DEPOSIT",
  "INCOMPLETE_DEPOSIT",
  "PROCESSING",
  "SUCCESS",
  "REFUNDED",
  "FAILED",
] as const;
export type OneClickStatus = (typeof ONECLICK_STATUSES)[number];

export const DEPOSIT_TYPES = ["ORIGIN_CHAIN", "INTENTS", "CONFIDENTIAL_INTENTS"] as const;
export type DepositType = (typeof DEPOSIT_TYPES)[number];

export const RECIPIENT_TYPES = ["DESTINATION_CHAIN", "INTENTS", "CONFIDENTIAL_INTENTS"] as const;
export type RecipientType = (typeof RECIPIENT_TYPES)[number];

export type TxRef = {
  chain: string;
  hash: string;
  explorerUrl?: string;
  confirmed?: boolean;
};

export type SourceRef = {
  name: string;
  url: string;
  readAt: string;
  ok: boolean;
  detail?: string;
};

/** What the 1Click status endpoint reported, or why it could not be read. */
export type StatusEvidence =
  | {
      available: true;
      status: OneClickStatus;
      correlationId: string;
      updatedAt: string;
      depositType?: DepositType;
      recipientType?: RecipientType;
      originAsset?: string;
      destinationAsset?: string;
      recipient?: string;
      refundTo?: string;
      amountIn?: string;
      amountInFormatted?: string;
      amountOut?: string;
      refundedAmount?: string;
      refundReason?: string | null;
      originChainTxHashes: TxRef[];
      destinationChainTxHashes: TxRef[];
      nearTxHashes: string[];
      intentHashes: string[];
    }
  | { available: false; reason: string };

/** A transfer actually observed on a public ledger. */
export type ObservedDeposit = {
  chain: string;
  tx: TxRef;
  token: string;
  amount: string;
  amountFormatted?: string;
  creditedTo?: string;
  blockTimestampIso?: string;
  spent?: boolean;
};

export type ChainEvidence = {
  deposits: ObservedDeposit[];
  creditedTo?: { account: string; token: string; amount: string };
  recipientBalance?: { account: string; token: string; amount: string };
  refundTx?: TxRef;
  /** Set when a deposit landed as a different asset or chain than the quote expected. */
  assetMismatch?: { expected: string; observed: string; chain: string };
  /** Funds still sitting untouched at the deposit address. */
  unspentAtDepositAddress?: { chain: string; token: string; amount: string };
  checked: boolean;
};

/** Bridge connector settings, used for the stuck-bitcoin case. */
export type ConnectorEvidence = {
  contract: string;
  unsafeRefundTimelockSec?: number;
  documentedTimelockSec: number;
  requiredRefundDepositNear?: string;
};

export type EvidenceMode = "api" | "public-only";

export type Evidence = {
  input: { depositAddress?: string; memo?: string; nearTxHash?: string };
  fetchedAt: string;
  mode: EvidenceMode;
  status: StatusEvidence;
  chain: ChainEvidence;
  connector?: ConnectorEvidence;
  sources: SourceRef[];
  notes: string[];
};
