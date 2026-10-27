import type { Metadata, Viewport } from "next";
import { Geist_Mono, Mona_Sans } from "next/font/google";
import { ThemeProvider } from "../components/theme";
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

export const metadata: Metadata = {
  title: "Quittance",
  description:
    "A receipt for money that crossed chains. Resolves what actually happened to a NEAR Intents swap, and proves it.",
  icons: { icon: "/icon.svg" },
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
      </body>
    </html>
  );
}
