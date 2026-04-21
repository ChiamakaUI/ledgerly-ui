"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import { StreamRoom } from "@vidbloq/react";
import type { Booking } from "@/types";
import { getBooking } from "@/lib/api";
import { useWallet } from "@/lib/wallet";
import { CallScreen } from "@/components/call/call-screen";
import { Button } from "@/components/ui/button";

export default function CallPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { address, connected, connecting, connect } = useWallet();

  const [booking, setBooking] = React.useState<Booking | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  console.log({booking})
  React.useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const b = await getBooking(id);
        if (!cancelled) setBooking(b);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Booking not found");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  // Still bootstrapping Privy.
  if (connecting) {
    return <Shell>Loading…</Shell>;
  }

  // Not signed in — prompt connect. We don't redirect away, because the
  // user may have hit /call/[id] directly from the success screen and
  // just needs to complete login.
  if (!connected) {
    return (
      <Shell>
        <div className="max-w-md text-center space-y-4">
          <p className="font-display text-2xl">Sign in to join the call</p>
          <p className="text-sm text-muted-foreground">
            We need to confirm your wallet matches the booking.
          </p>
          <Button onClick={() => void connect()} variant="primary" size="lg">
            Sign in
          </Button>
        </div>
      </Shell>
    );
  }

  if (loadError) {
    return (
      <Shell>
        <div className="max-w-md text-center space-y-4">
          <p className="text-destructive text-sm">{loadError}</p>
          <Button variant="outline" size="sm" onClick={() => router.push("/")}>
            Back home
          </Button>
        </div>
      </Shell>
    );
  }

  if (!booking || !address) {
    return <Shell>Loading booking…</Shell>;
  }

  return (
    <div className="h-screen bg-background">
      <StreamRoom roomName={booking.vidbloqRoom}>
        <CallScreen booking={booking} wallet={address} />
      </StreamRoom>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="flex flex-col items-center">{children}</div>
    </div>
  );
}