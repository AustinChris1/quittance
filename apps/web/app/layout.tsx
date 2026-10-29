import type { Metadata, Viewport } from "next";
import { Geist_Mono, Mona_Sans } from "next/font/google";
import { ThemeProvider } from "../components/theme";
import { PwaRegister } from "../components/pwa";
import "./globals.css";

// Mona Sans is the face near.org itself uses. The width axis drives the wide display setting.
const mona = Mona_Sans({
  subsets: ["latin"],
  variable: "--font-mona",
  axes: ["wdth"],
  display: "swap",
});

const mono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const DESCRIPTION =
  "A receipt for money that crossed chains. Both ends of a NEAR Intents swap, proven on the chains they happened on.";

export const metadata: Metadata = {
  metadataBase: new URL("https://quittance-five.vercel.app"),
  title: "Quittance",
  description: DESCRIPTION,
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
  // The card a link unfurls into on X, Telegram and Discord.
  openGraph: {
    title: "Quittance",
    description: DESCRIPTION,
    url: "/",
    siteName: "Quittance",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Quittance: 575,830 TRX in, proven on TRON; 190,995.29 USDT out, proven on Ethereum" }],
  },
  twitter: { card: "summary_large_image", title: "Quittance", description: DESCRIPTION, images: ["/og.png"] },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f9f9fa" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${mona.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <PwaRegister />
      </body>
    </html>
  );
}
