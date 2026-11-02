// Pay per receipt over x402, for agents. The site and /api/check stay free; only /api/receipt can answer 402.
// NEAR is the first door: Circle USDC on NEAR mainnet, sent as a signed NEP-366 delegate the payer never pays
// gas for. Base USDC is the second, so any stock x402 agent can pay too. Fees go straight from the payer to the
// payTo account; Quittance never holds them.
import { HTTPFacilitatorClient, x402HTTPResourceServer, x402ResourceServer } from "@x402/core/server";
import type { FacilitatorClient } from "@x402/core/server";
import type { SupportedResponse } from "@x402/core/types";
import { x402Facilitator } from "@x402/core/facilitator";
import { createFacilitatorNearSigner } from "@x402/near";
import { ExactNearScheme as NearFacilitatorScheme } from "@x402/near/exact/facilitator";
import { ExactNearScheme as NearServerScheme } from "@x402/near/exact/server";
import { ExactEvmScheme as EvmServerScheme } from "@x402/evm/exact/server";
import { loadRootEnv } from "./env.ts";

export const NEAR_MAINNET = "near:mainnet";
export const BASE_MAINNET = "eip155:8453";
const FASTNEAR = "https://x402.mikedotexe.com";
const PAYAI = "https://facilitator.payai.network";

type Door = { network: typeof NEAR_MAINNET | typeof BASE_MAINNET; payTo: string; facilitator: FacilitatorClient; settledBy: string };

/**
 * The doors this deployment can open, from its environment. NEAR settles through FastNEAR's facilitator when an
 * allowlisted key is set, otherwise through Quittance's own relayer, whose key only ever pays NEAR gas.
 */
function doors(): Door[] {
  loadRootEnv();
  const env = process.env;
  const out: Door[] = [];
  if (env.X402_NEAR_PAY_TO) {
    if (env.X402_NEAR_FACILITATOR_KEY) {
      const key = env.X402_NEAR_FACILITATOR_KEY;
      const headers = { "X-API-Key": key };
      const url = env.X402_NEAR_FACILITATOR_URL ?? FASTNEAR;
      out.push({
        network: NEAR_MAINNET,
        payTo: env.X402_NEAR_PAY_TO,
        facilitator: new HTTPFacilitatorClient({ url, createAuthHeaders: async () => ({ verify: headers, settle: headers }) }),
        settledBy: url,
      });
    } else if (env.X402_NEAR_RELAYER_ACCOUNT && env.X402_NEAR_RELAYER_KEY) {
      const signer = createFacilitatorNearSigner({
        relayers: [{ accountId: env.X402_NEAR_RELAYER_ACCOUNT, secretKey: env.X402_NEAR_RELAYER_KEY as `ed25519:${string}` }],
      });
      const local = new x402Facilitator().register(NEAR_MAINNET, new NearFacilitatorScheme(signer));
      out.push({
        network: NEAR_MAINNET,
        payTo: env.X402_NEAR_PAY_TO,
        facilitator: {
          verify: (payload, requirements) => local.verify(payload, requirements),
          settle: (payload, requirements) => local.settle(payload, requirements),
          // Its networks come back as plain strings; they are the CAIP-2 ids registered above.
          getSupported: async () => local.getSupported() as SupportedResponse,
        },
        settledBy: `relayer ${env.X402_NEAR_RELAYER_ACCOUNT}`,
      });
    }
  }
  if (env.X402_BASE_PAY_TO) {
    const url = env.X402_BASE_FACILITATOR_URL ?? PAYAI;
    out.push({ network: BASE_MAINNET, payTo: env.X402_BASE_PAY_TO, facilitator: new HTTPFacilitatorClient({ url }), settledBy: url });
  }
  return out;
}

export function price(): string {
  loadRootEnv();
  return process.env.X402_PRICE ?? "$0.01";
}

/** What the paid door accepts, for the docs and for a 503 that explains itself. */
export function paidDoors(): { network: string; payTo: string; settledBy: string }[] {
  return doors().map(({ network, payTo, settledBy }) => ({ network, payTo, settledBy }));
}

let cached: Promise<x402HTTPResourceServer | undefined> | undefined;

async function build(): Promise<x402HTTPResourceServer | undefined> {
  const open = doors();
  if (open.length === 0) return undefined;
  const server = new x402ResourceServer(open.map((d) => d.facilitator));
  if (open.some((d) => d.network === NEAR_MAINNET)) server.register(NEAR_MAINNET, new NearServerScheme());
  if (open.some((d) => d.network === BASE_MAINNET)) server.register(BASE_MAINNET, new EvmServerScheme());
  const http = new x402HTTPResourceServer(server, {
    accepts: open.map((d) => ({ scheme: "exact", network: d.network, payTo: d.payTo, price: price(), maxTimeoutSeconds: 120 })),
    description: "One Quittance receipt: both public ends of a NEAR Intents swap, read on their own chains.",
    mimeType: "application/json",
  });
  await http.initialize();
  return http;
}

function server(): Promise<x402HTTPResourceServer | undefined> {
  if (!cached) cached = build().catch((err) => {
    cached = undefined;
    throw err;
  });
  return cached;
}

function instructions(r: { status: number; headers: Record<string, string>; body?: unknown; isHtml?: boolean }): Response {
  const headers = new Headers(r.headers);
  if (!headers.has("Content-Type")) headers.set("Content-Type", r.isHtml ? "text/html" : "application/json");
  const body = typeof r.body === "string" ? r.body : JSON.stringify(r.body ?? {});
  return new Response(body, { status: r.status, headers });
}

/**
 * Runs `handler` only after a valid payment is verified, and settles it only if the handler succeeds (status
 * under 400), so a failed lookup is never charged. Without payment it answers 402 with the requirements.
 */
export async function paid(request: Request, handler: () => Promise<Response>): Promise<Response> {
  let http: x402HTTPResourceServer | undefined;
  try {
    http = await server();
  } catch (err) {
    return Response.json({ error: `Payment facilitator unavailable: ${err instanceof Error ? err.message : String(err)}` }, { status: 503 });
  }
  if (!http) return Response.json({ error: "Paid receipts are not set up on this deployment. The free checker is at /api/check." }, { status: 503 });

  const url = new URL(request.url);
  const header = (name: string) => request.headers.get(name) ?? undefined;
  const context = {
    adapter: {
      getHeader: header,
      getMethod: () => request.method,
      getPath: () => url.pathname,
      getUrl: () => request.url,
      getAcceptHeader: () => header("accept") ?? "",
      getUserAgent: () => header("user-agent") ?? "",
    },
    path: url.pathname,
    decodedPath: url.pathname,
    method: request.method,
    paymentHeader: header("payment-signature") ?? header("x-payment"),
  };

  const result = await http.processHTTPRequest(context);
  if (result.type === "payment-error") return instructions(result.response);
  if (result.type === "no-payment-required") return handler();

  let response: Response;
  try {
    response = await handler();
  } catch (err) {
    await result.cancellationDispatcher.cancel({ reason: "handler_threw", error: err });
    return Response.json({ error: "The receipt could not be built, so the payment was not taken." }, { status: 500 });
  }
  if (response.status >= 400) {
    await result.cancellationDispatcher.cancel({ reason: "handler_failed", responseStatus: response.status });
    return response;
  }

  const body = Buffer.from(await response.arrayBuffer());
  const settled = await http.processSettlement(
    result.paymentPayload,
    result.paymentRequirements,
    result.declaredExtensions,
    { request: context, responseBody: body, responseHeaders: Object.fromEntries(response.headers) },
    undefined,
    result.beforeHandlerSettlement,
  );
  if (!settled.success) return instructions(settled.response);
  const headers = new Headers(response.headers);
  for (const [k, v] of Object.entries(settled.headers)) headers.set(k, v);
  headers.set("Cache-Control", "private, no-store");
  return new Response(body, { status: response.status, headers });
}
