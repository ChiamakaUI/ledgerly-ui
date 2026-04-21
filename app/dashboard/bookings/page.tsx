"use client";

export const dynamic = "force-dynamic"; 

import * as React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { Booking } from "@/types";
import { listHostBookings } from "@/lib/api";
import { useWallet } from "@/lib/wallet";
import { BookingsList } from "@/components/host/bookings-list";

export default function DashboardBookingsPage() {
  const { address: walletAddress, connected } = useWallet();
  const [bookings, setBookings] = React.useState<Booking[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!walletAddress) {
      setBookings(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const bks = await listHostBookings(walletAddress);
        if (!cancelled) setBookings(bks);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [walletAddress]);

  return (
    <div className="container py-10 md:py-16">
      <div className="max-w-5xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>

        <div className="mb-10">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
            / Ledger
          </p>
          <h1 className="font-display text-4xl md:text-5xl tracking-tight">
            Bookings
          </h1>
          <p className="text-muted-foreground mt-2 max-w-lg text-pretty">
            Every caller on your calendar, in every state.
          </p>
        </div>

        {!connected && (
          <div className="rounded-xl border border-warning/30 bg-warning/5 px-4 py-6 text-sm text-center">
            Connect your wallet to see your bookings.
          </div>
        )}

        {connected && error && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-6 text-sm">
            {error}
          </div>
        )}

        {connected && !error && bookings === null && (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/40" />
            ))}
          </div>
        )}

        {connected && !error && bookings !== null && (
          <BookingsList bookings={bookings} hostWallet={walletAddress ?? ""} />
        )}
      </div>
    </div>
  );
}