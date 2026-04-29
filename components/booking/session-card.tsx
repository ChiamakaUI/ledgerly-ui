"use client";

import Link from "next/link";
import { ArrowRight, Clock, Users } from "lucide-react";
import type { Session } from "@/types";
import { Badge } from "@/components";
import { formatUSDC } from "@/lib";

type SessionCardProps = {
  session: Session;
  hostSlug: string;
};

export function SessionCard({ session, hostSlug }: SessionCardProps) {
  const scheduled = new Date(session.scheduledAt);
  const spots = session.spotsRemaining ?? session.maxParticipants;
  const isFull = spots === 0;
  const isPast = scheduled.getTime() < Date.now();

  return (
    <Link
      href={`/sessions/${hostSlug}/book/${session.id}`}
      className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40 transition-colors flex flex-col"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="font-display">
          <div className="text-3xl leading-none">
            {scheduled.toLocaleDateString("en-US", { day: "2-digit" })}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
            {scheduled.toLocaleDateString("en-US", { month: "short" })}
          </div>
        </div>
        {isFull ? (
          <Badge variant="warning">Full</Badge>
        ) : isPast ? (
          <Badge variant="muted">Started</Badge>
        ) : (
          <Badge variant="primary">{spots} left</Badge>
        )}
      </div>

      <h3 className="font-display text-xl tracking-tight mb-2 line-clamp-2">
        {session.title}
      </h3>
      {session.description && (
        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 text-pretty flex-1">
          {session.description}
        </p>
      )}

      <div className="space-y-2 mt-auto pt-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Clock className="h-3 w-3" />
          {scheduled.toLocaleString("en-US", {
            weekday: "short",
            hour: "numeric",
            minute: "2-digit",
          })}
          <span>·</span>
          {session.durationMinutes} min
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Users className="h-3 w-3" />
            up to {session.maxParticipants}
          </div>
          <div className="font-mono text-sm tabular">
            {formatUSDC(session.rate, { symbol: false })}{" "}
            <span className="text-xs text-muted-foreground">USDC</span>
          </div>
        </div>
      </div>

      <div className="mt-4 inline-flex items-center gap-1 text-sm text-primary group-hover:gap-2 transition-all">
        Reserve a spot
        <ArrowRight className="h-3.5 w-3.5" />
      </div>
    </Link>
  );
}