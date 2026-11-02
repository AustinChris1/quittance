// An agent buying one Quittance receipt over x402: ask, read the 402, sign the payment, retry, print the receipt.
// Keys come from the environment of the shell that runs it and are never written anywhere.
//
//   NEAR_PAYER_ACCOUNT=you.near NEAR_PAYER_KEY=ed25519:... node apps/web/scripts/pay.ts <hash, address or wallet>
//   BASE_PAYER_KEY=0x...                                  node apps/web/scripts/pay.ts <query> --network base
//
// Options: --url <origin> (default https://quittance-five.vercel.app), --network near|base (default near).
import { x402Client, x402HTTPClient } from "@x402/core/client";
import { createClientNearSigner } from "@x402/near";
import { ExactNearScheme } from "@x402/near/exact/client";
import { toClientEvmSigner } from "@x402/evm";
import { ExactEvmScheme } from "@x402/evm/exact/client";
import { privateKeyToAccount } from "viem/accounts";

const args = process.argv.slice(2);
const opt = (name: string, fallback: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : fallback;
};
const query = args.find((a, i) => !a.startsWith("--") && !args[i - 1]?.startsWith("--"));
const origin = opt("url", "https://quittance-five.vercel.app");
const network = opt("network", "near");
if (!query) {
  console.error("usage: node apps/web/scripts/pay.ts <hash, deposit address or wallet> [--network near|base] [--url origin]");
  process.exit(2);
}

const client = new x402Client();
if (network === "near") {
  const accountId = process.env.NEAR_PAYER_ACCOUNT;
  const secretKey = process.env.NEAR_PAYER_KEY as `ed25519:${string}` | undefined;
  if (!accountId || !secretKey) throw new Error("Set NEAR_PAYER_ACCOUNT and NEAR_PAYER_KEY (a full-access key) in this shell.");
  client.register("near:mainnet", new ExactNearScheme(createClientNearSigner({ accountId, secretKey })));
} else {
  const key = process.env.BASE_PAYER_KEY as `0x${string}` | undefined;
  if (!key) throw new Error("Set BASE_PAYER_KEY in this shell.");
  client.register("eip155:8453", new ExactEvmScheme(toClientEvmSigner(privateKeyToAccount(key))));
}
const http = new x402HTTPClient(client);
const url = `${origin}/api/receipt?q=${encodeURIComponent(query)}`;

console.log(`GET ${url}`);
const first = await fetch(url);
if (first.status !== 402) {
  console.log(`expected 402, got ${first.status}:`, await first.text());
  process.exit(1);
}
const required = http.getPaymentRequiredResponse((name) => first.headers.get(name), await first.json());
for (const a of required.accepts) console.log(`  402 accepts ${a.network}: ${Number(a.amount) / 1e6} USDC to ${a.payTo}`);

const payment = await http.createPaymentPayload(required);
console.log(`  signed ${payment.accepted.network} payment, retrying`);
const paid = await fetch(url, { headers: http.encodePaymentSignatureHeader(payment) });
const body = (await paid.json()) as { receipt?: { verdict: { label: string; summary: string }; fingerprint: string }; error?: string };
if (!paid.ok) {
  console.log(`paid request failed, ${paid.status}:`, body.error ?? body);
  process.exit(1);
}
const settled = http.getPaymentSettleResponse((name) => paid.headers.get(name));
const explorer = settled.network === "near:mainnet" ? `https://nearblocks.io/txns/${settled.transaction}` : `https://basescan.org/tx/${settled.transaction}`;
console.log(`  settled ${settled.network} ${settled.transaction}`);
console.log(`  ${explorer}`);
console.log(`\nLABEL ${body.receipt?.verdict.label}\n${body.receipt?.verdict.summary}\nfingerprint ${body.receipt?.fingerprint}`);
