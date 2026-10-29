"use client";

import { useEffect, useState } from "react";

type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

let deferred: InstallPrompt | null = null;
const listeners = new Set<(p: InstallPrompt | null) => void>();

/** Registers the service worker once per page load and keeps the browser's install prompt for later. */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Without it the site still works; only alerts and install are unavailable.
      });
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      deferred = e as InstallPrompt;
      listeners.forEach((l) => l(deferred));
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);
  return null;
}

/** The deferred install prompt, when the browser has offered one. Chrome and Edge do; Safari never does. */
export function useInstallPrompt(): { available: boolean; install: () => Promise<void> } {
  const [prompt, setPrompt] = useState<InstallPrompt | null>(deferred);
  useEffect(() => {
    listeners.add(setPrompt);
    return () => void listeners.delete(setPrompt);
  }, []);
  return {
    available: prompt !== null,
    install: async () => {
      if (!prompt) return;
      await prompt.prompt();
      await prompt.userChoice;
      deferred = null;
      listeners.forEach((l) => l(null));
    },
  };
}
