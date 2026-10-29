import type { MetadataRoute } from "next";

/** Makes Quittance installable, which is also what lets iPhones deliver its notifications. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Quittance",
    short_name: "Quittance",
    description: "A receipt for money that crossed chains. Check a NEAR Intents swap, and be told when it changes.",
    start_url: "/check",
    scope: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icons/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
