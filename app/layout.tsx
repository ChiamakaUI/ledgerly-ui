import type { Metadata, Viewport } from "next";
import { Instrument_Serif } from "next/font/google";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "./providers";
import { Nav, Footer } from "@/components";

const displaySerif = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Ledgerly — Get paid for your time",
  description:
    "Share a link. Callers pay USDC into escrow when they book. Funds release automatically after the call.",
  applicationName: "Ledgerly",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Ledgerly",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    title: "Ledgerly — Get paid for your time",
    description:
      "On-chain escrow for paid 1:1 calls and group sessions. Settled on Solana.",
    siteName: "Ledgerly",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ledgerly",
    description: "Get paid for your time, settled on Solana.",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0d" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${displaySerif.variable} ${GeistSans.variable} ${GeistMono.variable} dark`}
      suppressHydrationWarning
    >
      <body className="min-h-screen bg-background text-foreground antialiased">
        <Providers>
          <div className="relative z-10 flex min-h-screen flex-col">
            <Nav />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
