"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Calendar } from "lucide-react";
import type { PublicHost, Session } from "@/types";
import { getHost, listOpenSessions } from "@/lib/api";
import { SessionCard } from "@/components";

export default function SessionsListPage() {
  const params = useParams<{ hostSlug: string }>();
  const hostSlug = params.hostSlug;

  const [host, setHost] = useState<PublicHost | null>(null);
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [h, s] = await Promise.all([
          getHost(hostSlug),
          listOpenSessions(hostSlug),
        ]);
        if (!cancelled) {
          setHost(h);
          setSessions(s);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hostSlug]);

  if (error) {
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
    <div className="container py-6 md:py-10 lg:py-16">
      <Link
        href={`/book/${hostSlug}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to {host?.name ?? "host"}
      </Link>

      <div className="mb-10">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
          / Group sessions
        </p>
        <h1 className="font-display text-4xl md:text-5xl tracking-tight">
          {host ? `Sessions with ${host.name}` : "Loading…"}
        </h1>
        <p className="text-muted-foreground mt-3 max-w-md text-pretty">
          Reserve a spot in upcoming workshops, masterclasses, and group calls.
        </p>
      </div>

      {sessions === null ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 animate-pulse">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-64 rounded-2xl bg-muted/40" />
          ))}
        </div>
      ) : sessions.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 md:p-16 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-muted grid place-items-center mb-4">
            <Calendar className="h-5 w-5 text-muted-foreground" />
          </div>
          <p className="font-display text-2xl tracking-tight mb-2">
            No upcoming sessions
          </p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {host?.name ?? "This host"} doesn&apos;t have any group sessions
            scheduled right now. You can book a 1:1 instead.
          </p>
          <Link
            href={`/book/${hostSlug}`}
            className="inline-flex items-center gap-2 mt-6 text-sm text-primary hover:underline"
          >
            Book a 1:1 call →
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sessions.map((s) => (
            <SessionCard key={s.id} session={s} hostSlug={hostSlug} />
          ))}
        </div>
      )}
    </div>
  );
}
