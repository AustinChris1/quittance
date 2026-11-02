// Prints a fresh NEAR implicit account and its full-access key, for a relayer or a test payer. Nothing is saved:
// copy the key where it belongs (an environment variable), then fund the account by sending to its id.
//   node apps/web/scripts/new-near-account.ts
import { createRequire } from "node:module";

const require = createRequire(import.meta.resolve("@x402/near"));
// @near-js/crypto arrives through @x402/near rather than as a direct dependency, so only its shape is declared.
type Pair = { getPublicKey(): { data: Uint8Array }; toString(): string };
const { KeyPair } = require("@near-js/crypto") as { KeyPair: { fromRandom(curve: "ed25519"): Pair } };

const pair = KeyPair.fromRandom("ed25519");
const accountId = Buffer.from(pair.getPublicKey().data).toString("hex");
console.log(`account ${accountId}`);
console.log(`key     ${pair.toString()}`);
console.log("The account exists once it receives NEAR. Keep the key out of files, chat and screenshots.");
