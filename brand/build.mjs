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

const ends = (scale = 1) => {
  const card = (title, logo, amount, state, mint) => `<div style="flex:1;border-radius:${22 * scale}px;padding:${18 * scale}px ${20 * scale}px;${mint ? `background:${C.mint};color:#000` : `background:#121212;color:#fff`}">
    <div style="display:flex;justify-content:space-between;align-items:center"><span style="font-size:${11 * scale}px;font-weight:650;letter-spacing:0.14em;text-transform:uppercase;opacity:${mint ? 0.65 : 0.5}">${title}</span>
    <span style="width:${34 * scale}px;height:${34 * scale}px;border-radius:${10 * scale}px;background:#fff;display:flex;align-items:center;justify-content:center">${logo}</span></div>
    <div class="figure" style="font-size:${25 * scale}px;margin-top:${12 * scale}px;line-height:1.05">${amount}</div>
    <div style="font-size:${13 * scale}px;font-weight:600;margin-top:${6 * scale}px;opacity:${mint ? 1 : 0.6}">${state}</div></div>`;
  const arrow = `<span style="color:#757575;font-size:${18 * scale}px;align-self:center">→</span>`;
  const img = (f) => `<img src="${chain(f)}" width="${21 * scale}" height="${21 * scale}">`;
  const eye = `<svg width="${18 * scale}" height="${18 * scale}" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-opacity=".7" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/></svg>`;
  return `<div style="display:flex;gap:${10 * scale}px">${card("Money in", img("tron"), "575,830 TRX", "Proven on TRON", true)}${arrow}${card("The exchange", eye, "Private shard", "Named, never painted as proven", false)}${arrow}${card("Money out", img("ethereum"), "190,995.29 USDT", "Proven on Ethereum", true)}</div>`;
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
