"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button, Badge } from "@/components";
import { useWallet, shortenAddress, cn } from "@/lib";

export default function Nav() {
  const pathname = usePathname();
  const isCallRoute = pathname.startsWith("/call/");
  const { address, connected, connecting, connect, disconnect } = useWallet();
  const [mobileOpen, setMobileOpen] = useState(false);

  const routes = [
    // { href: "/", label: "Home" },
    { href: "/dashboard", label: "Dashboard" },
  ];

  // Close mobile menu on route change.
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  if (isCallRoute) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between gap-4">
        {/* Logo + wordmark */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="relative h-7 w-7 rounded-full bg-primary/15 ring-1 ring-primary/30 grid place-items-center">
            <span className="font-display text-primary text-lg leading-none -mt-0.5">
              L
            </span>
          </div>
          <span className="font-display text-xl tracking-tight">Ledgerly</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:!flex items-center gap-1">
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

        {/* Right-side actions */}
        <div className="flex items-center gap-2">
          {connected ? (
            <>
              <Badge
                variant="primary"
                className="hidden sm:!inline-flex font-mono text-[11px]"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                {shortenAddress(address)}
              </Badge>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void disconnect()}
                className="hidden sm:!inline-flex"
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
              {connecting ? "Connecting…" : "Sign In"}
            </Button>
          )}

          {/* Mobile menu toggle — only shown when there's something to show */}
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:!hidden h-9 w-9 grid place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="md:!hidden border-t border-border/60 bg-background">
          <div className="container py-4 flex flex-col gap-1">
            {routes.map((r) => {
              const active =
                r.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(
                      r.href.split("/").slice(0, 2).join("/"),
                    );
              return (
                <Link
                  key={r.href}
                  href={r.href}
                  className={cn(
                    "px-4 py-3 rounded-lg text-sm transition-colors",
                    active
                      ? "text-foreground bg-accent"
                      : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                  )}
                >
                  {r.label}
                </Link>
              );
            })}
            {connected && address && (
              <div className="mt-2 pt-4 border-t border-border/60 flex items-center justify-between">
                <span className="font-mono text-xs text-muted-foreground">
                  {shortenAddress(address)}
                </span>
                <button
                  onClick={() => void disconnect()}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
