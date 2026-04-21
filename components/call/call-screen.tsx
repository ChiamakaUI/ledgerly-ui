"use client";

import * as React from "react";
import { StreamView, useStreamContext } from "@vidbloq/react";
import type { Booking } from "@/types";
import { joinBookingCall } from "@/lib/api";
import { InCall } from "./in-call";

type CallScreenProps = {
  booking: Booking;
  wallet: string;
};

export function CallScreen({ booking, wallet }: CallScreenProps) {
  const { token, setToken, setUserType } = useStreamContext();
  const [error, setError] = React.useState<string | null>(null);
  const fetchedRef = React.useRef(false);

  React.useEffect(() => {
    if (fetchedRef.current || token) return;
    fetchedRef.current = true;

    // Don't send a name override — the backend picks the right name
    // (caller's or host's) based on which wallet is joining.
    joinBookingCall(booking.id, wallet)
      .then(({ token, userType }) => {
        setUserType(userType);
        setToken(token);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to join call");
      });
  }, [booking, wallet, token, setToken, setUserType]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <p className="font-display text-2xl">Couldn&apos;t join the call</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <a
            href={`/booking/${booking.id}`}
            className="text-sm text-primary hover:underline"
          >
            ← Back to booking
          </a>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Connecting to call with {booking.hostName}…
        </p>
      </div>
    );
  }

  return (
    <StreamView>
      <InCall />
    </StreamView>
  );
}