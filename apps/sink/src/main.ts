#!/usr/bin/env node
// A reference receiver. It stands in for the integrator endpoint a support desk would run.
import { createServer } from "node:http";
import { createHmac, timingSafeEqual } from "node:crypto";
import { appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const PORT = Number(process.env.QUITTANCE_SINK_PORT ?? 8787);
const SECRET = process.env.QUITTANCE_WEBHOOK_SECRET;
const LOG_DIR = join(import.meta.dirname, "../../../out");
const LOG_FILE = join(LOG_DIR, "received-receipts.jsonl");

function signatureMatches(body: string, header: string | undefined): boolean {
  if (!SECRET) return true;
  if (!header) return false;
  const expected = "sha256=" + createHmac("sha256", SECRET).update(body).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(header);
  return a.length === b.length && timingSafeEqual(a, b);
}

const server = createServer((req, res) => {
  if (req.method !== "POST") {
    res.writeHead(405, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "post a receipt here" }));
    return;
  }

  let body = "";
  req.on("data", (chunk) => {
    body += chunk;
  });
  req.on("end", () => {
    if (!signatureMatches(body, req.headers["x-quittance-signature"] as string | undefined)) {
      console.log("rejected a receipt with a bad signature");
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ accepted: false, reason: "signature mismatch" }));
      return;
    }

    let receipt: Record<string, unknown>;
    try {
      receipt = JSON.parse(body) as Record<string, unknown>;
    } catch {
      res.writeHead(400, { "content-type": "application/json" });
      res.end(JSON.stringify({ accepted: false, reason: "body was not json" }));
      return;
    }

    const verdict = receipt.verdict as { label?: string; rule?: string } | undefined;
    const fingerprint = String(receipt.fingerprint ?? "unknown");
    const ticket = `TKT-${fingerprint.slice(0, 8).toUpperCase()}`;

    mkdirSync(LOG_DIR, { recursive: true });
    appendFileSync(LOG_FILE, JSON.stringify({ receivedAt: new Date().toISOString(), ticket, receipt }) + "\n");

    console.log(
      `received  ${verdict?.label ?? "UNKNOWN"}  rule=${verdict?.rule ?? "none"}  fingerprint=${fingerprint.slice(0, 16)}..  filed as ${ticket}`,
    );

    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ accepted: true, ticket, label: verdict?.label, fingerprint }));
  });
});

server.listen(PORT, () => {
  console.log(`quittance sink listening on http://localhost:${PORT}/receipts`);
  console.log(`signature checking ${SECRET ? "on" : "off, set QUITTANCE_WEBHOOK_SECRET to enable"}`);
  console.log(`receipts appended to ${LOG_FILE}`);
});
