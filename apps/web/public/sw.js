// Quittance's service worker. It does not check anything: the server rechecks swaps, and this only shows what changed.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "Quittance";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || "A swap you are watching has new evidence.",
      icon: "/icons/app-icon-192.png",
      badge: "/icons/app-icon-192.png",
      tag: data.tag || "quittance",
      data: { url: data.url || "/check" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/check", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if (w.url === url && "focus" in w) return w.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
