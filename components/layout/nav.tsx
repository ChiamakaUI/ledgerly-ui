"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Badge } from "@/components";
import { useWallet, shortenAddress, cn } from "@/lib";

export default function Nav() {
  const pathname = usePathname();
  const { address, connected, connecting, connect, disconnect } = useWallet();

  const routes = [
    { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex items-center gap-2 group">
          {/* Wordmark — small serif flourish on the dot */}
          <div className="relative h-7 w-7 rounded-full bg-primary/15 ring-1 ring-primary/30 grid place-items-center">
            <span className="font-display text-primary text-lg leading-none -mt-0.5">
              L
            </span>
          </div>
          <span className="font-display text-xl tracking-tight">
            Ledgerly
          </span>
        </Link>

        <nav className="hidden md:!flex lg:!flex items-center gap-1 !text-red-600">
          {routes.map((r) => {
            const active =
              r.href === "/"
                ? pathname === "/"
                : pathname.startsWith(r.href.split("/").slice(0, 2).join("/"));
            return (
              <Link
                key={r.href}
                href={r.href}
                className={cn(
                  "px-3 py-1.5 rounded-full text-sm transition-colors text-red-500",
                  active
                    ? "text-foreground bg-accent"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <Badge variant="primary" className="hidden sm:!inline-flex font-mono text-[11px]">
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {shortenAddress(address)}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void disconnect()}
              >
                Disconnect
              </Button>
            </>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={() => void connect()}
              disabled={connecting}
            >
              {connecting ? "Connecting…" : "Connect wallet"}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

