"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Footer() {
  const pathname = usePathname();
  const isCallRoute = pathname.startsWith("/call/");
  if (isCallRoute) return null;
  return (
    <footer className="border-t border-border/60 mt-24">
      <div className="container py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1">
          <p className="font-display text-lg tracking-tight">Ledgerly</p>
          <p className="text-xs text-muted-foreground">
            Settled on Solana.{" "}
            <span className="font-mono">USDC · escrow · instant</span>
          </p>
        </div>
        <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground transition-colors">
            How it works
          </Link>
          <Link
            href="/book/emmy-test"
            className="hover:text-foreground transition-colors"
          >
            Try a demo
          </Link>
          <Link
            href="/dashboard"
            className="hover:text-foreground transition-colors"
          >
            Host dashboard
          </Link>
          <a
            href="https://github.com"
            className="hover:text-foreground transition-colors"
            rel="noreferrer"
          >
            GitHub
          </a>
        </nav>
      </div>
    </footer>
  );
}
