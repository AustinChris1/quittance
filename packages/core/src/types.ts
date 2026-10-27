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
      /** What the quote promised, and the floor its slippage tolerance guarantees, in raw units. */
      quotedAmountOut?: string;
      quotedAmountOutFormatted?: string;
      minAmountOut?: string;
      refundedAmount?: string;
      /** False when the source cannot report a refund amount, so absence proves nothing. */
      refundAmountKnown?: boolean;
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

/** Independent confirmation that the destination transaction did what the status claims. */
export type DeliveryProof = {
  verified: boolean;
  chain: string;
  tx: string;
  receiptStatus?: "success" | "failed";
  blockNumber?: number;
  blockTimeIso?: string;
  deliveredRaw?: string;
  deliveredFormatted?: string;
  /** Read from the token contract, so quoted and delivered amounts compare in the same units. */
  decimals?: number;
  recipientMatched?: boolean;
  reason?: string;
};

/**
 * The documented Confidential Intents treasury (PRIVATE_TREASURY_ACCOUNT_ID). A transfer here is
 * the public shield step: the bridge mints matching tokens on the private FAR chain, where
 * balances are not visible from any public record.
 */
export const CONFIDENTIAL_TREASURY =
  "51e8f94d77b5e90dc9852ca6113771e11e8382ce69473a75e313e41665de7cbe";

/** A transfer decoded from a signed intent inside an execute_intents call. */
export type IntentTransfer = {
  signer?: string;
  receiver: string;
  token: string;
  amountRaw: string;
  amountFormatted?: string;
  deadline?: string;
};

export type ChainEvidence = {
  deposits: ObservedDeposit[];
  /**
   * Transfers moved inside the Intents contract's own ledger. These never surface as ordinary
   * token events, so they have to be read out of the signed intent payloads.
   */
  intentTransfers?: IntentTransfer[];
  /** When the NEAR transaction landed. */
  nearTxTimeIso?: string;
  creditedTo?: { account: string; token: string; amount: string };
  recipientBalance?: { account: string; token: string; amount: string };
  refundTx?: TxRef;
  /** Read from the destination chain, not taken from the operator record. */
  delivery?: DeliveryProof;
  /** Set when a deposit landed as a different asset or chain than the quote expected. */
  assetMismatch?: { expected: string; observed: string; chain: string };
  /** Funds still sitting untouched at the deposit address. */
  unspentAtDepositAddress?: { chain: string; token: string; amount: string };
  checked: boolean;
};

/** Bridge connector settings, used for the stuck-bitcoin case. */
export type ConnectorEvidence = {
  contract: string;
  /** Applies when the deposit carries no refund address. */
  unsafeRefundTimelockSec?: number;
  /** Applies when a refund address was set. */
  safeRefundTimelockSec?: number;
  documentedTimelockSec: number;
  requiredRefundDepositNear?: string;
};

/** Whether the status call carried a partner key. The endpoint answers either way. */
export type EvidenceMode = "authenticated" | "unauthenticated";

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
