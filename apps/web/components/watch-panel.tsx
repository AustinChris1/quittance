"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Bell, BellOff, BellRing, Loader2, Send, Smartphone } from "lucide-react";
import { useInstallPrompt } from "./pwa";

type Saved = { key: string; until: string };
type Mode = "loading" | "off" | "unsupported" | "ios-install" | "idle" | "denied" | "watching";

let config: Promise<{ enabled: boolean; publicKey: string | null }> | null = null;
const getConfig = () =>
  (config ??= fetch("/api/watch")
    .then((r) => r.json())
    .catch(() => ({ enabled: false, publicKey: null })));

const storageKey = (q: string) => `quittance-watch:${q}`;

function readSaved(q: string): Saved | null {
  try {
    const raw = localStorage.getItem(storageKey(q));
    const s = raw ? (JSON.parse(raw) as Saved) : null;
    return s && new Date(s.until) > new Date() ? s : null;
  } catch {
    return null;
  }
}

function writeSaved(q: string, s: Saved | null) {
  try {
    if (s) localStorage.setItem(storageKey(q), JSON.stringify(s));
    else localStorage.removeItem(storageKey(q));
  } catch {
    // private mode; the watch still runs on the server
  }
}

function keyBytes(base64: string): Uint8Array {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

const isIos = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/**
 * "Tell me if this changes." Quittance rechecks the swap on the server; the browser only shows the
 * alert. Offered only once a receipt exists, so the permission prompt has a reason behind it.
 */
export function WatchPanel({ query }: { query: string }) {
  const reduced = useReducedMotion();
  const { available: canInstall, install } = useInstallPrompt();
  const [mode, setMode] = useState<Mode>("loading");
  const [days, setDays] = useState(14);
  const [saved, setSaved] = useState<Saved | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    void getConfig().then((cfg) => {
      if (!live) return;
      if (!cfg.enabled || !cfg.publicKey) return setMode("off");
      setPublicKey(cfg.publicKey);
      const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
      if (!supported) return setMode(isIos() && !isStandalone() ? "ios-install" : "unsupported");
      if (Notification.permission === "denied") return setMode("denied");
      const s = readSaved(query);
      setSaved(s);
      setMode(s ? "watching" : "idle");
    });
    return () => {
      live = false;
    };
  }, [query]);

  async function subscription(): Promise<PushSubscription> {
    const reg = await navigator.serviceWorker.ready;
    return (
      (await reg.pushManager.getSubscription()) ??
      (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(publicKey!) as BufferSource }))
    );
  }

  async function start() {
    setBusy(true);
    setNote(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setMode(permission === "denied" ? "denied" : "idle");
        return;
      }
      const sub = await subscription();
      const res = await fetch("/api/watch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, subscription: sub.toJSON(), days }),
      });
      const body = await res.json();
      if (!res.ok) return setNote(body.error ?? "Could not start watching.");
      const s = { key: body.key as string, until: body.until as string };
      writeSaved(query, s);
      setSaved(s);
      setMode("watching");
    } catch {
      setNote("This browser would not create a push subscription.");
    } finally {
      setBusy(false);
    }
  }

  async function stop() {
    if (!saved) return;
    setBusy(true);
    try {
      const sub = await subscription();
      await fetch("/api/watch", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: saved.key, endpoint: sub.endpoint }),
      });
    } finally {
      writeSaved(query, null);
      setSaved(null);
      setMode("idle");
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setNote(null);
    try {
      const sub = await subscription();
      const res = await fetch("/api/watch/test", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query, subscription: sub.toJSON() }),
      });
      setNote(res.ok ? "Test sent. It should appear in a few seconds." : ((await res.json()).error ?? "The test did not send."));
    } finally {
      setBusy(false);
    }
  }

  if (mode === "loading" || mode === "off") return null;

  const until = saved ? new Date(saved.until).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "";
  const button = "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors disabled:opacity-60";

  return (
    <motion.section
      initial={reduced ? { opacity: 0 } : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55, duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
      className="mt-4 flex flex-col gap-4 rounded-[1.5rem] border border-line bg-surface p-5 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Watch this swap"
    >
      <div className="flex min-w-0 gap-3.5">
        <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${mode === "watching" ? "bg-mint text-black" : "bg-paper"}`}>
          {mode === "watching" ? <BellRing size={19} /> : mode === "denied" ? <BellOff size={19} /> : <Bell size={19} />}
        </span>
        <div className="min-w-0">
          <p className="font-semibold">
            {mode === "watching"
              ? `Watching until ${until}`
              : mode === "denied"
                ? "Notifications are blocked for this site"
                : mode === "ios-install"
                  ? "Add Quittance to your Home Screen to be alerted"
                  : mode === "unsupported"
                    ? "This browser cannot show alerts"
                    : "Tell me if this changes"}
          </p>
          <p className="mt-0.5 text-sm text-muted">
            {mode === "watching"
              ? "Quittance rechecks this swap every 15 minutes and alerts you once when the evidence changes."
              : mode === "denied"
                ? "Allow notifications in your browser's site settings, then reload."
                : mode === "ios-install"
                  ? "On iPhone and iPad, alerts reach installed web apps only: tap Share, then Add to Home Screen."
                  : mode === "unsupported"
                    ? "Open this page in a recent Chrome, Edge, Firefox or Safari to watch it."
                    : "Quittance rechecks it on its own servers, and your browser just shows the alert. No account, no email."}
          </p>
          {note ? <p className="mt-1.5 text-sm text-mint-ink">{note}</p> : null}
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap items-center gap-2">
        {mode === "idle" ? (
          <>
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              aria-label="How long to watch"
              className="rounded-full border border-line bg-surface px-3 py-2 text-sm"
            >
              <option value={3}>3 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
            </select>
            <button type="button" onClick={() => void start()} disabled={busy} className={`${button} bg-fg text-bg`}>
              {busy ? <Loader2 size={15} className="animate-spin" /> : <Bell size={15} />}
              Watch
            </button>
          </>
        ) : null}
        {mode === "watching" ? (
          <>
            <button type="button" onClick={() => void test()} disabled={busy} className={`${button} border border-line hover:border-fg`}>
              <Send size={14} />
              Send a test
            </button>
            <button type="button" onClick={() => void stop()} disabled={busy} className={`${button} border border-line hover:border-fg`}>
              <BellOff size={14} />
              Stop
            </button>
          </>
        ) : null}
        {canInstall ? (
          <button type="button" onClick={() => void install()} className={`${button} border border-line hover:border-fg`}>
            <Smartphone size={14} />
            Install app
          </button>
        ) : null}
      </div>
    </motion.section>
  );
}
