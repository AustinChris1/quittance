// Builds the brand kit: exact SVG marks, plus PNGs rendered in headless Chrome with the real fonts.
// Needs a headless Chrome on port 9555: chrome --headless=new --remote-debugging-port=9555
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as sleep } from "node:timers/promises";

const ROOT = resolve(import.meta.dirname, "..").replace(/\\/g, "/");
const OUT = join(ROOT, "brand").replace(/\\/g, "/");
const TMP = join(tmpdir(), "quittance-brand-render");
mkdirSync(OUT, { recursive: true });
mkdirSync(TMP, { recursive: true });

const C = { black: "#000000", white: "#ffffff", mint: "#00ec97", mintInk: "#007a4d", paper: "#f2f1e9", bg: "#f9f9fa", line: "#262626", muted: "#acaba6" };

/* ---------- the mark, exact geometry from components/logo.tsx ---------- */
const markPaths = (left, right, w = 2.6) => `<g stroke="${left}" stroke-width="${w}" stroke-linecap="round" fill="none"><path d="M9 5 V27"/><path d="M9 11 H14.5"/><path d="M9 16 H14.5"/><path d="M9 21 H14.5"/></g><g stroke="${right}" stroke-width="${w}" stroke-linecap="round" fill="none"><path d="M23 5 V27"/><path d="M17.5 11 H23"/><path d="M17.5 16 H23"/><path d="M17.5 21 H23"/></g>`;
const markSvg = (left, right) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" fill="none">${markPaths(left, right)}</svg>\n`;
// The app tile keeps the favicon's tighter verticals so the mark sits inside the rounded corner.
const tileSvg = (bg, left, right) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="8" fill="${bg}"/><g stroke="${left}" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M9 6.5 V25.5"/><path d="M9 11.5 H14"/><path d="M9 16 H14"/><path d="M9 20.5 H14"/></g><g stroke="${right}" stroke-width="2.6" stroke-linecap="round" fill="none"><path d="M23 6.5 V25.5"/><path d="M18 11.5 H23"/><path d="M18 16 H23"/><path d="M18 20.5 H23"/></g></svg>\n`;

const SVGS = {
  "mark-on-light.svg": markSvg(C.black, C.mintInk),
  "mark-on-dark.svg": markSvg(C.white, C.mint),
  "mark-mono-black.svg": markSvg(C.black, C.black),
  "mark-mono-white.svg": markSvg(C.white, C.white),
  "app-icon.svg": tileSvg(C.black, C.white, C.mint),
  "app-icon-mint.svg": tileSvg(C.mint, C.black, C.black),
};
for (const [name, svg] of Object.entries(SVGS)) writeFileSync(join(OUT, name), svg);

/* ---------- the guilloché, same maths as components/guilloche.tsx ---------- */
function rosette(size, rings, stroke, width = 0.55, resolution = 560) {
  const half = size / 2;
  const curve = (R, r, d, phase) => {
    let p = "";
    for (let i = 0; i <= resolution; i += 1) {
      const t = (i * Math.PI * 2) / resolution;
      const k = (R - r) / r;
      const x = (R - r) * Math.cos(t + phase) + d * Math.cos(k * t + phase);
      const y = (R - r) * Math.sin(t + phase) - d * Math.sin(k * t + phase);
      p += `${i === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    }
    return p + "Z";
  };
  const paths = Array.from({ length: rings }, (_, i) => {
    const t = i / Math.max(1, rings - 1);
    const k = 14 + i;
    const dRatio = 2.5 - t * 0.8;
    const reach = half * (0.97 - t * 0.32);
    const R = reach / (1 + (dRatio - 1) / k);
    const r = R / k;
    return `<path d="${curve(R, r, r * dRatio, (i * 2.39996323) % (Math.PI * 2))}"/>`;
  }).join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${-half} ${-half} ${size} ${size}"><g fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linejoin="round">${paths}</g></svg>`;
}
writeFileSync(join(OUT, "guilloche-mint.svg"), rosette(560, 12, C.mint) + "\n");

/* ---------- HTML templates rendered to PNG ---------- */
const chain = (f) => `file:///${ROOT}/apps/web/public/chains/${f}.svg`;
const FONTS = `<link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Geist+Mono:wght@400;500&family=Mona+Sans:wdth,wght@75..125,200..900&display=block" rel="stylesheet">`;
const BASE = `*{margin:0;padding:0;box-sizing:border-box}html,body{background:transparent}body{font-family:"Mona Sans",sans-serif;-webkit-font-smoothing:antialiased}
.display{font-variation-settings:"wdth" 112;font-weight:760;letter-spacing:-0.045em;line-height:0.95}
.figure{font-variation-settings:"wdth" 118;font-weight:780;letter-spacing:-0.03em}
.mono{font-family:"Geist Mono",monospace}
.word{font-variation-settings:"wdth" 108;font-weight:600;letter-spacing:-0.02em}`;
const page = (w, h, css, body) => `<!doctype html><html><head><meta charset="utf-8">${FONTS}<style>${BASE}html,body{width:${w}px;height:${h}px;overflow:hidden}${css}</style></head><body>${body}</body></html>`;
const inlineMark = (px, left, right) => `<svg width="${px}" height="${px}" viewBox="0 0 32 32" fill="none">${markPaths(left, right)}</svg>`;
const lockup = (markPx, textPx, color, left, right) => `<div style="display:flex;align-items:center;gap:${Math.round(markPx * 0.38)}px">${inlineMark(markPx, left, right)}<span class="word" style="font-size:${textPx}px;color:${color};line-height:1">Quittance</span></div>`;

const ends = (scale = 1, inAmt = "575,830 TRX", inState = "Proven on TRON", outAmt = "190,995.29 USDT", outState = "Proven on Ethereum") => {
  const card = (title, logo, amount, state, mint) => `<div style="flex:1;border-radius:${22 * scale}px;padding:${18 * scale}px ${20 * scale}px;${mint ? `background:${C.mint};color:#000` : `background:#121212;color:#fff`}">
    <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:${11 * scale}px;font-weight:650;letter-spacing:0.14em;text-transform:uppercase;opacity:${mint ? 0.65 : 0.5}">${title}</span>
    <span style="width:${34 * scale}px;height:${34 * scale}px;border-radius:${10 * scale}px;background:#fff;display:flex;align-items:center;justify-content:center">${logo}</span></div>
    <div class="figure" style="font-size:${25 * scale}px;margin-top:${12 * scale}px;line-height:1.05">${amount}</div>
    <div style="font-size:${13 * scale}px;font-weight:600;margin-top:${6 * scale}px;opacity:${mint ? 1 : 0.6}">${state}</div></div>`;
  const arrow = `<span style="color:#757575;font-size:${18 * scale}px;align-self:center">→</span>`;
  const img = (f) => `<img src="${chain(f)}" width="${21 * scale}" height="${21 * scale}">`;
  // The $193K swap settled in September, before the confidential switch, so its middle is NEAR Intents.
  return `<div style="display:flex;gap:${10 * scale}px">${card("Money in", img("tron"), inAmt, inState, true)}${arrow}${card("The exchange", img("near"), "NEAR Intents", "Settled between the two ends", false)}${arrow}${card("Money out", img("ethereum"), outAmt, outState, true)}</div>`;
};

const glow = (x, y, r) => `<div style="position:absolute;left:${x}px;top:${y}px;width:${r}px;height:${r}px;border-radius:50%;background:radial-gradient(circle, rgba(0,236,151,0.16), rgba(0,236,151,0) 70%)"></div>`;
const rosetteImg = (size, x, y, opacity) => `<img src="file:///${OUT}/guilloche-mint.svg" style="position:absolute;left:${x}px;top:${y}px;width:${size}px;height:${size}px;opacity:${opacity}">`;

const ASSETS = [];
// App icon at every size a favicon, touch icon or store listing asks for.
for (const px of [16, 32, 48, 64, 180, 192, 512, 1024]) {
  ASSETS.push({ name: `app-icon-${px}.png`, w: px, h: px, dsf: 1, transparent: true, html: page(px, px, "", `<img src="file:///${OUT}/app-icon.svg" width="${px}" height="${px}" style="display:block">`) });
}
ASSETS.push({ name: "mark-on-light-1024.png", w: 512, h: 512, dsf: 2, transparent: true, html: page(512, 512, "", inlineMark(512, C.black, C.mintInk)) });
ASSETS.push({ name: "mark-on-dark-1024.png", w: 512, h: 512, dsf: 2, transparent: true, html: page(512, 512, "", inlineMark(512, C.white, C.mint)) });
ASSETS.push({ name: "lockup-on-light.png", w: 760, h: 200, dsf: 3, transparent: true, html: page(760, 200, "body{display:flex;align-items:center;justify-content:center}", lockup(132, 104, C.black, C.black, C.mintInk)) });
ASSETS.push({ name: "lockup-on-dark.png", w: 760, h: 200, dsf: 3, transparent: true, html: page(760, 200, "body{display:flex;align-items:center;justify-content:center}", lockup(132, 104, C.white, C.white, C.mint)) });
// X crops the avatar to a circle, so the mark stays well inside it.
ASSETS.push({ name: "avatar-400.png", w: 400, h: 400, dsf: 1, html: page(400, 400, `body{background:#000;display:flex;align-items:center;justify-content:center}`, inlineMark(250, C.white, C.mint)) });

ASSETS.push({
  name: "social-card-1200x630.png", w: 1200, h: 630, dsf: 1,
  html: page(1200, 630, `body{background:#000;color:#fff;position:relative}`, `
    ${glow(700, -260, 760)}${rosetteImg(620, 720, -150, 0.55)}
    <div style="position:absolute;left:64px;top:56px">${lockup(40, 31, C.white, C.white, C.mint)}</div>
    <div style="position:absolute;left:64px;top:150px;width:760px">
      <div class="display" style="font-size:76px">A receipt for money that crossed chains.</div>
      <div style="font-size:24px;color:${C.muted};margin-top:22px;line-height:1.35;max-width:640px">Both ends of a NEAR Intents swap, proven on the chains they happened on.</div>
    </div>
    <div style="position:absolute;left:64px;right:64px;bottom:56px">${ends(1)}</div>`),
});

ASSETS.push({
  name: "x-banner-1500x500.png", w: 1500, h: 500, dsf: 1,
  // The profile photo covers the lower left on X, so the content sits right of it.
  html: page(1500, 500, `body{background:#000;color:#fff;position:relative}`, `
    ${glow(980, -240, 760)}${rosetteImg(640, 1000, -70, 0.6)}
    <div style="position:absolute;left:470px;top:78px;width:720px">
      ${lockup(34, 27, C.white, C.white, C.mint)}
      <div class="display" style="font-size:66px;margin-top:30px">A receipt for money that crossed chains.</div>
      <div style="display:flex;gap:10px;align-items:center;margin-top:30px">
        ${["near", "ethereum", "tron", "solana", "base", "arbitrum", "bnb", "polygon", "optimism", "avalanche", "gnosis", "robinhood"].map((f) => `<span style="width:38px;height:38px;border-radius:12px;background:#fff;display:flex;align-items:center;justify-content:center"><img src="${chain(f)}" width="22" height="22"></span>`).join("")}
      </div>
      <div class="mono" style="font-size:16px;color:${C.muted};margin-top:22px">quittance-five.vercel.app</div>
    </div>`),
});

/* ---------- the launch thread on X: four 16:9 images, every figure from the README ---------- */
const TW = 1600;
const TH = 900;
const chip = (text, bg, fg) => `<span class="mono" style="font-size:19px;font-weight:500;padding:9px 16px;border-radius:999px;background:${bg};color:${fg};white-space:nowrap">${text}</span>`;
const frame = (n, body) =>
  page(TW, TH, `body{background:#000;color:#fff;position:relative}`, `
    ${glow(1080, -380, 900)}${rosetteImg(760, 1110, -250, 0.32)}
    <div style="position:absolute;left:80px;top:64px">${lockup(38, 30, C.white, C.white, C.mint)}</div>
    <div class="mono" style="position:absolute;right:80px;top:74px;font-size:20px;color:${C.muted}">${n}/4</div>
    ${body}
    <div class="mono" style="position:absolute;left:80px;bottom:56px;font-size:20px;color:${C.muted}">quittance-five.vercel.app</div>
    <div class="mono" style="position:absolute;right:80px;bottom:56px;font-size:20px;color:${C.muted}">Built at NEAR HACKATHON</div>`);
const stop = (x, date, title, detail, color) => `<div style="position:absolute;left:${x}px;top:0;transform:translateX(-50%);text-align:center;width:360px">
    <div style="width:22px;height:22px;border-radius:50%;background:${color};margin:0 auto"></div>
    <div class="mono" style="font-size:19px;color:${C.muted};margin-top:18px">${date}</div>
    <div style="font-size:28px;font-weight:700;margin-top:6px">${title}</div>
    <div class="mono" style="font-size:18px;color:${C.muted};margin-top:6px">${detail}</div></div>`;
const THREAD = [];
THREAD.push({
  name: "thread/1-reported-lost-already-paid.png",
  html: frame(1, `
    <div style="position:absolute;left:80px;top:150px;width:1180px;border-left:5px solid #ff7966;background:#121212;border-radius:0 16px 16px 0;padding:24px 30px">
      <div class="mono" style="font-size:18px;color:#ff7966;letter-spacing:0.08em">THE NEAR FORUM · 9 OCT 2026</div>
      <div style="font-size:30px;font-weight:600;margin-top:10px;line-height:1.3">“Failed NEAR Intents 1-Click swap: 575,830 TRX (~$193K) stuck, FAILED status, zero refund, no support response”</div>
    </div>
    <div class="display" style="position:absolute;left:80px;top:360px;font-size:100px">It had already been paid.<br><span style="color:${C.mint}">12 days before the post.</span></div>
    <div style="position:absolute;left:250px;right:250px;top:640px;height:3px;background:#3a3a3a"></div>
    <div style="position:absolute;left:0;right:0;top:630px">
      ${stop(250, "11 Sep 2026", "Deposit", "575,830 TRX · TRON", C.mint)}
      ${stop(800, "27 Sep 2026", "Payout", "190,995.29 USDT · Ethereum", C.mint)}
      ${stop(1350, "9 Oct 2026", "Forum post", "“stuck, zero refund”", "#ff7966")}
    </div>`),
});
THREAD.push({
  name: "thread/2-both-ends-proven.png",
  html: frame(2, `
    <div style="position:absolute;left:80px;top:150px;width:1300px">
      <div class="display" style="font-size:76px">Both ends, proven on<br>the chains they happened on.</div>
      <div style="font-size:25px;color:${C.muted};margin-top:20px;line-height:1.4;max-width:1180px">Paste a transaction hash, a deposit address or a wallet. Quittance reads the deposit where it landed and the payout where it arrived, then checks what arrived against the quote.</div>
    </div>
    <div style="position:absolute;left:80px;right:80px;top:420px">${ends(1.55, "575,830 TRX", "Proven on TRON · block 86,157,305", "190,995.29 USDT", "Proven on Ethereum · block 26,068,435")}</div>
    <div class="mono" style="position:absolute;left:80px;top:652px;font-size:20px;color:${C.muted}">Quote 191,757.90 USDT, guaranteed minimum 189,840.32. Arrived 0.40% under the quote, inside the guarantee.</div>
    <div style="position:absolute;left:80px;right:80px;top:700px;display:flex;flex-wrap:wrap;gap:10px">
      ${chip("DELIVERED", C.mint, "#000")}${chip("REFUNDED_OK", C.mint, "#000")}${chip("IN_FLIGHT", "#262626", "#fff")}${chip("STRANDED", "#ff7966", "#000")}${chip("WRONG_DOOR", "#ff7966", "#000")}${chip("LOCKED_OUT", "#ff7966", "#000")}${chip("SHIELDED_UNPROVEN", "#9797ff", "#000")}${chip("UNDETERMINED", "#262626", "#fff")}
    </div>`),
});
const zone = (title, sub, line, style) => `<div style="flex:1;border-radius:24px;padding:30px 32px;${style}">
    <div style="font-size:34px;font-weight:720;font-variation-settings:'wdth' 110;letter-spacing:-0.02em">${title}</div>
    <div class="mono" style="font-size:18px;letter-spacing:0.1em;margin-top:8px;opacity:0.75">${sub}</div>
    <div style="font-size:22px;font-weight:600;margin-top:22px;line-height:1.3">${line}</div></div>`;
THREAD.push({
  name: "thread/3-the-private-middle.png",
  html: frame(3, `
    <div class="display" style="position:absolute;left:80px;top:160px;font-size:74px;width:1500px">Since 27 Oct, the middle is private.<br><span style="color:${C.mint}">The two ends are not.</span></div>
    <div style="position:absolute;left:80px;right:80px;top:410px;display:flex;gap:18px;align-items:stretch">
      ${zone("Origin chain", "PUBLIC", "The deposit, proven", `background:${C.mint};color:#000`)}
      ${zone("NEAR Private Shard", "CONFIDENTIAL", "Named, never painted as proven", "background:rgba(151,151,255,0.18);border:2px solid #9797ff;color:#fff")}
      ${zone("Destination chain", "PUBLIC", "The payout, proven", `background:${C.mint};color:#000`)}
    </div>
    <div style="position:absolute;left:80px;right:80px;top:640px;background:${C.paper};color:#111;border-radius:18px;padding:24px 30px;display:flex;gap:26px;align-items:center">
      ${chip("SHIELDED_UNPROVEN", "#9797ff", "#000")}
      <div><div style="font-size:25px;font-weight:600;line-height:1.3">This proves the money was shielded. It does not prove it was delivered, and it does not prove it was lost.</div>
      <div class="mono" style="font-size:17px;color:#5d5d63;margin-top:8px">A real case: 0.038 ETH on Robinhood Chain, 23 Sep 2026. No public index has a record of it.</div></div>
    </div>`),
});
const stat = (big, label, src) => `<div style="flex:1"><div class="figure" style="font-size:104px;line-height:1">${big}</div>
    <div style="font-size:26px;font-weight:600;margin-top:14px;line-height:1.3">${label}</div>
    <div class="mono" style="font-size:17px;color:${C.muted};margin-top:10px">${src}</div></div>`;
THREAD.push({
  name: "thread/4-measured-and-try-it.png",
  html: frame(4, `
    <div class="display" style="position:absolute;left:80px;top:150px;font-size:76px">Measured on real swaps.</div>
    <div style="position:absolute;left:80px;right:80px;top:265px;display:flex;gap:56px">
      ${stat("81.8%", "of external payouts land on a chain it reads", "1,000 recent swaps · 28 Oct 2026")}
      ${stat("99<span style='font-size:56px'> of 100</span>", "sampled payouts proven on their own chain", "none contradicted")}
      ${stat("44", "swaps took a deposit and sent nothing back, median 255 days", "$334K quoted, not a realised loss · 26 Oct 2026")}
    </div>
    <div style="position:absolute;left:80px;top:556px;display:flex;gap:10px;align-items:center">
      ${["ethereum", "base", "arbitrum", "optimism", "polygon", "bnb", "gnosis", "avalanche", "robinhood", "tron", "solana"].map((f) => `<span style="width:52px;height:52px;border-radius:14px;background:#fff;display:flex;align-items:center;justify-content:center"><img src="${chain(f)}" width="30" height="30"></span>`).join("")}
      <span style="font-size:22px;color:${C.muted};margin-left:12px">11 chains read</span>
    </div>
    <div style="position:absolute;left:80px;top:642px;font-size:26px;font-weight:600;color:#e6e6ea">For people: no wallet, nothing to sign. For agents: a receipt for $0.01 over x402, paid in USDC on NEAR.</div>
    <div style="position:absolute;left:80px;top:700px;display:flex;gap:16px;align-items:center">
      <span style="font-size:28px;font-weight:700;padding:14px 26px;border-radius:999px;background:${C.mint};color:#000">Check a swap → quittance-five.vercel.app</span>
      <span class="mono" style="font-size:20px;color:${C.muted}">github.com/AustinChris1/quittance</span>
    </div>`),
});
for (const a of THREAD) ASSETS.push({ ...a, w: TW, h: TH, dsf: 2 });
mkdirSync(join(OUT, "thread"), { recursive: true });
mkdirSync(join(TMP, "thread"), { recursive: true });

const swatch = (hex, name, use, dark) => `<div style="flex:1"><div style="height:110px;border-radius:20px;background:${hex};${dark ? "" : "border:1px solid #e5e5e5"}"></div><div style="margin-top:12px;font-weight:700;font-size:17px">${name}</div><div class="mono" style="font-size:13px;color:#5c5c5c;margin-top:3px">${hex}</div><div style="font-size:13px;color:#5c5c5c;margin-top:2px">${use}</div></div>`;
ASSETS.push({
  name: "brand-sheet.png", w: 1600, h: 940, dsf: 1,
  html: page(1600, 940, `body{background:${C.bg};color:#000;padding:64px;position:relative}`, `
    <div style="display:flex;justify-content:space-between;align-items:flex-start">
      <div>${lockup(44, 34, C.black, C.black, C.mintInk)}<div class="display" style="font-size:58px;margin-top:34px;max-width:820px">A split tally: two halves that only read as whole when they agree.</div>
      <div style="font-size:19px;color:#5c5c5c;margin-top:18px;max-width:760px;line-height:1.45">A debt was notched across a stick, then split lengthwise so each party held half. Quittance matches the deposit half to the delivery half the same way.</div></div>
    </div>
    <div style="display:flex;gap:18px;margin-top:46px">
      <div style="width:220px;height:220px;border-radius:28px;background:#fff;border:1px solid #e5e5e5;display:flex;align-items:center;justify-content:center">${inlineMark(150, C.black, C.mintInk)}</div>
      <div style="width:220px;height:220px;border-radius:28px;background:#000;display:flex;align-items:center;justify-content:center">${inlineMark(150, C.white, C.mint)}</div>
      <div style="width:220px;height:220px;border-radius:28px;background:${C.mint};display:flex;align-items:center;justify-content:center">${inlineMark(150, C.black, C.black)}</div>
      <div style="width:220px;height:220px;border-radius:28px;background:#fff;border:1px solid #e5e5e5;display:flex;align-items:center;justify-content:center;gap:22px">
        <img src="file:///${OUT}/app-icon.svg" width="64" height="64"><img src="file:///${OUT}/app-icon.svg" width="32" height="32"><img src="file:///${OUT}/app-icon.svg" width="16" height="16"></div>
      <div style="flex:1;border-radius:28px;background:#000;color:#fff;padding:28px;display:flex;flex-direction:column;justify-content:space-between">
        <div class="display" style="font-size:44px">Mona Sans</div>
        <div style="font-size:15px;color:${C.muted}">Display at width 112, weight 760. The face near.org uses.</div>
        <div class="mono" style="font-size:22px;color:${C.mint}">Geist Mono 0x9be9…421a</div>
        <div style="font-size:15px;color:${C.muted}">Evidence: hashes, blocks, dates.</div>
      </div>
    </div>
    <div style="display:flex;gap:18px;margin-top:40px">
      ${swatch(C.black, "Ink", "text, primary, dark ground", true)}${swatch(C.mint, "Mint", "NEAR's signature, proven states", true)}${swatch(C.mintInk, "Mint ink", "mint as text on light", true)}${swatch(C.paper, "Paper", "the receipt, quiet panels", false)}${swatch("#ff7966", "Coral", "failure, unresolved", true)}${swatch("#9797ff", "Violet", "shielded", true)}
    </div>`),
});

/* ---------- render through the running headless Chrome on port 9555 ---------- */
const t = await (await fetch("http://127.0.0.1:9555/json/new?about:blank", { method: "PUT" })).json();
const ws = new WebSocket(t.webSocketDebuggerUrl);
await new Promise((r, j) => { ws.onopen = r; ws.onerror = j; });
let id = 0;
const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable");
await send("Runtime.enable");

for (const a of ASSETS) {
  const file = join(TMP, a.name.replace(/\.png$/, ".html"));
  writeFileSync(file, a.html);
  await send("Emulation.setDeviceMetricsOverride", { width: a.w, height: a.h, deviceScaleFactor: a.dsf, mobile: false });
  await send("Emulation.setDefaultBackgroundColorOverride", a.transparent ? { color: { r: 0, g: 0, b: 0, a: 0 } } : {});
  await send("Page.navigate", { url: "file:///" + file.replace(/\\/g, "/") });
  await sleep(600);
  // Fonts must finish loading or the wordmark renders in a fallback face.
  await send("Runtime.evaluate", { expression: "document.fonts.ready.then(() => document.fonts.size)", awaitPromise: true });
  await sleep(a.w > 600 ? 900 : 250);
  const shot = await send("Page.captureScreenshot", { format: "png", clip: { x: 0, y: 0, width: a.w, height: a.h, scale: 1 } });
  writeFileSync(join(OUT, a.name), Buffer.from(shot.result.data, "base64"));
  console.log(a.name.padEnd(28), `${a.w * a.dsf}x${a.h * a.dsf}`);
}
await fetch(`http://127.0.0.1:9555/json/close/${t.id}`);
ws.close();
console.log("svg:", Object.keys(SVGS).concat("guilloche-mint.svg").join(", "));
