"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import type { Host, Session } from "@/types";
import { getHostMe, listMySessions, ApiError, useWallet } from "@/lib";
import {
  useToast,
  SessionsList,
  CreateSessionForm,
  Button,
} from "@/components";

export default function HostSessionsPage() {
  const router = useRouter();
  const {
    address: walletAddress,
    connected,
    connecting,
    connect,
  } = useWallet();
  const { show } = useToast();

  const [host, setHost] = useState<Host | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (connecting) return;
    if (!connected || !walletAddress) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const me = await getHostMe(walletAddress);
        if (cancelled) return;
        setHost(me.host);
        const list = await listMySessions(walletAddress, { limit: 50 });
        if (!cancelled) setSessions(list);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) {
          router.replace("/dashboard/setup");
          return;
        }
        setError(e instanceof Error ? e.message : "Failed to load sessions");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connected, connecting, walletAddress, router]);

  async function reload() {
    if (!walletAddress) return;
    try {
      const list = await listMySessions(walletAddress, { limit: 50 });
      setSessions(list);
    } catch (e) {
      show({
        kind: "error",
        title: "Could not refresh sessions",
        description: e instanceof Error ? e.message : "Try again.",
      });
    }
  }

  if (!connected && !connecting) {
    return (
      <div className="container max-w-md py-16">
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            / Sessions
          </p>
          <h1 className="font-display text-3xl tracking-tight">
            Sign in to continue
          </h1>
          <Button onClick={() => void connect()} variant="primary" size="lg">
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  if (loading || connecting) {
    return (
      <div className="container py-10 md:py-16 animate-pulse space-y-4">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-96 bg-muted/40 rounded-2xl" />
      </div>
    );
  }

  if (error || !host) {
    return (
      <div className="container py-16">
        <div className="max-w-md mx-auto rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="font-display text-xl">Could not load sessions</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6 md:!py-10 lg:!py-16">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to dashboard
      </Link>

      <div className="flex flex-col md:!flex-row md:!items-end md:!justify-between gap-6 mb-10">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
            / Group sessions
          </p>
          <h1 className="font-display text-4xl md:!text-5xl tracking-tight">
            Sessions
          </h1>
          <p className="text-muted-foreground mt-2 max-w-md text-pretty">
            Schedule masterclasses, workshops, and group calls. Callers reserve
            spots, you show up.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:!self-auto">
          {host && (
            <Button variant="outline" size="lg" asChild>
              <Link href={`/sessions/${host.slug}`}>View public page</Link>
            </Button>
          )}
          <Button variant="primary" size="lg" onClick={() => setCreating(true)}>
            <Plus className="h-4 w-4" />
            New session
          </Button>
        </div>
      </div>

      <SessionsList
        sessions={sessions}
        hostWallet={walletAddress ?? ""}
        hostSlug={host.slug}
        onChange={() => void reload()}
      />

      {creating && (
        <CreateSessionForm
          hostSlug={host.slug}
          walletAddress={walletAddress ?? ""}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            void reload();
          }}
        />
      )}
    </div>
  );
}
