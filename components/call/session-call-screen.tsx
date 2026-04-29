"use client";

import { useEffect, useRef, useState } from "react";
import { StreamView, useStreamContext } from "@vidbloq/react";
import type { Session } from "@/types";
import { joinSessionCall } from "@/lib/api";
import { InCall } from "./in-call";

type SessionCallScreenProps = {
  session: Session;
  wallet: string;
};

export function SessionCallScreen({ session, wallet }: SessionCallScreenProps) {
  const { token, setToken, setUserType } = useStreamContext();
  const [error, setError] = useState<string | null>(null);
  const fetchedRef = useRef(false);

  const scheduledEndAt =
    new Date(session.scheduledAt).getTime() +
    session.durationMinutes * 60_000;

  useEffect(() => {
    if (fetchedRef.current || token) return;
    fetchedRef.current = true;

    joinSessionCall(session.id, wallet)
      .then(({ token, userType }) => {
        setUserType(userType);
        setToken(token);
      })
      .catch((e) => {
        setError(e instanceof Error ? e.message : "Failed to join call");
      });
  }, [session, wallet, token, setToken, setUserType]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <p className="font-display text-2xl">Couldn&apos;t join the call</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <a
            href="/dashboard/sessions"
            className="text-sm text-primary hover:underline"
          >
            ← Back to sessions
          </a>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">
          Connecting to {session.title}…
        </p>
      </div>
    );
  }

  return (
    <StreamView>
      <InCall scheduledEndAt={scheduledEndAt} />
    </StreamView>
  );
}