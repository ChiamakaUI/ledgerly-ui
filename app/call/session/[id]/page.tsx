"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { StreamRoom } from "@vidbloq/react";
import type { Session } from "@/types";
import { getSession, useWallet } from "@/lib";
import { SessionCallScreen, Button } from "@/components";

export default function SessionCallPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { address, connected, connecting, connect } = useWallet();

  const [session, setSession] = useState<Session | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    void (async () => {
      try {
        const s = await getSession(id);
        if (!cancelled) setSession(s);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Session not found");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (connecting) return <Shell>Loading…</Shell>;

  if (!connected) {
    return (
      <Shell>
        <div className="max-w-md text-center space-y-4">
          <p className="font-display text-2xl">Sign in to join the call</p>
          <p className="text-sm text-muted-foreground">
            We need to confirm your wallet matches the session host.
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/sessions")}
          >
            Back to sessions
          </Button>
        </div>
      </Shell>
    );
  }

  if (!session || !address) {
    return <Shell>Loading session…</Shell>;
  }

  // Session needs a room before the host can join. The room is created
  // when the first caller pays. Until then, there's nothing to join.
  if (!session.vidbloqRoom) {
    return (
      <Shell>
        <div className="max-w-md text-center space-y-4">
          <p className="font-display text-2xl">Waiting for participants</p>
          <p className="text-sm text-muted-foreground">
            The call room opens when the first caller pays. Come back once
            someone has reserved a spot.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/dashboard/sessions")}
          >
            Back to sessions
          </Button>
        </div>
      </Shell>
    );
  }

  return (
    <div className="h-screen bg-background">
      <StreamRoom roomName={session.vidbloqRoom}>
        <SessionCallScreen session={session} wallet={address} />
      </StreamRoom>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="flex flex-col items-center">{children}</div>
    </div>
  );
}