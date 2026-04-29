"use client";

import { useState } from "react";
import Link from "next/link";
import { Copy, Trash2, Users, Video } from "lucide-react";
import type { Session, SessionStatus } from "@/types";
import { Button, useToast, Badge } from "@/components";
import { cancelSession, ApiError, formatUSDC } from "@/lib";

type SessionsListProps = {
  sessions: Session[];
  hostWallet: string;
  hostSlug: string;
  onChange: () => void;
};

const STATUS_BADGE: Record<
  SessionStatus,
  {
    label: string;
    variant: "primary" | "success" | "warning" | "muted" | "destructive";
  }
> = {
  open: { label: "Open", variant: "primary" },
  full: { label: "Full", variant: "warning" },
  active: { label: "Live", variant: "primary" },
  completed: { label: "Completed", variant: "success" },
  cancelled: { label: "Cancelled", variant: "muted" },
};

export function SessionsList({
  sessions,
  hostWallet,
  hostSlug,
  onChange,
}: SessionsListProps) {
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<Session | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const { show } = useToast();

  if (sessions.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <p className="font-display text-xl">No sessions yet</p>
        <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
          Create your first session to start running masterclasses or group
          calls. Callers can reserve spots up until the session starts.
        </p>
      </div>
    );
  }

  async function handleCancel(session: Session) {
    if (!hostWallet) return;
    setCancelling(session.id);
    try {
      const result = await cancelSession(session.id, hostWallet);
      show({
        kind: "success",
        title: "Session cancelled",
        description:
          result.refundedCount > 0
            ? `${result.refundedCount} caller${
                result.refundedCount === 1 ? "" : "s"
              } refunded.`
            : "No paid bookings to refund.",
      });
      setConfirmCancel(null);
      onChange();
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Try again.";
      show({
        kind: "error",
        title: "Could not cancel session",
        description: msg,
      });
    } finally {
      setCancelling(null);
    }
  }

  async function copyShareLink(session: Session) {
    // const url = `${window.location.origin}/sessions/${hostSlug}`;
    const url = `${window.location.origin}/sessions/${hostSlug}/book/${session.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(session.id);
      setTimeout(() => setCopied(null), 1800);
    } catch {
      /* ignore */
    }
  }

  return (
    <>
      <div className="space-y-4">
        {sessions.map((s) => (
          <SessionRow
            key={s.id}
            session={s}
            cancelling={cancelling === s.id}
            copied={copied === s.id}
            onCopy={() => void copyShareLink(s)}
            onCancel={() => setConfirmCancel(s)}
          />
        ))}
      </div>

      {confirmCancel && (
        <CancelConfirmDialog
          session={confirmCancel}
          onConfirm={() => void handleCancel(confirmCancel)}
          onClose={() => setConfirmCancel(null)}
          isCancelling={cancelling === confirmCancel.id}
        />
      )}
    </>
  );
}

function SessionRow({
  session,
  cancelling,
  copied,
  onCopy,
  onCancel,
}: {
  session: Session;
  cancelling: boolean;
  copied: boolean;
  onCopy: () => void;
  onCancel: () => void;
}) {
  const scheduled = new Date(session.scheduledAt);
  const callEndsAt = scheduled.getTime() + session.durationMinutes * 60_000;
  const isPast = Date.now() > callEndsAt;

  // Past sessions that didn't get marked completed/cancelled show as "Past"
  const effectiveMeta =
    isPast && (session.status === "open" || session.status === "full")
      ? { label: "Past", variant: "muted" as const }
      : STATUS_BADGE[session.status];

  const spots = session.spotsRemaining ?? session.maxParticipants;
  const taken = session.maxParticipants - spots;

  // Action visibility:
  // - Cancel only when the session hasn't started AND status is open/full
  // - Join only when session is open/full/active AND not past end
  // - Copy share link only for sessions in the future
  const canCancel =
    !isPast && (session.status === "open" || session.status === "full");
  const canJoin =
    !isPast &&
    (session.status === "open" ||
      session.status === "full" ||
      session.status === "active");
  const canShare = !isPast && session.status !== "cancelled";

  return (
    <div className="rounded-2xl border border-border bg-card p-5 md:p-6">
      <div className="flex items-start gap-4 flex-wrap md:flex-nowrap">
        <div className="shrink-0 w-14 text-center font-display">
          <div className="text-2xl leading-none">
            {scheduled.toLocaleDateString("en-US", { day: "2-digit" })}
          </div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
            {scheduled.toLocaleDateString("en-US", { month: "short" })}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h3 className="font-display text-xl tracking-tight truncate">
              {session.title}
            </h3>
            <Badge variant={effectiveMeta.variant}>{effectiveMeta.label}</Badge>
          </div>
          {session.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2 text-pretty">
              {session.description}
            </p>
          )}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            <span>
              {scheduled.toLocaleString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            <span>·</span>
            <span>{session.durationMinutes} min</span>
            <span>·</span>
            <span className="font-mono">
              {formatUSDC(session.rate, { symbol: false })}{" "}
              <span className="text-muted-foreground">USDC</span>
            </span>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {taken}/{session.maxParticipants}
            </span>
          </div>
        </div>
      </div>

      {/* Only render the action bar if there's at least one action */}
      {(canShare || canJoin || canCancel) && (
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-2 flex-wrap">
          {canShare && (
            <Button variant="outline" size="sm" onClick={onCopy}>
              <Copy className="h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy share link"}
            </Button>
          )}
          {canJoin && (
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/call/session/${session.id}`}>
                <Video className="h-3.5 w-3.5" />
                Join call
              </Link>
            </Button>
          )}
          {canCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={cancelling}
              className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function CancelConfirmDialog({
  session,
  onConfirm,
  onClose,
  isCancelling,
}: {
  session: Session;
  onConfirm: () => void;
  onClose: () => void;
  isCancelling: boolean;
}) {
  const taken =
    session.maxParticipants -
    (session.spotsRemaining ?? session.maxParticipants);
  const refundTotal = (Number(session.rate) / 1_000_000) * taken;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4">
      <div className="bg-card border border-border rounded-2xl p-6 max-w-md w-full">
        <h2 className="font-display text-2xl tracking-tight mb-2">
          Cancel session?
        </h2>
        <p className="text-sm text-muted-foreground text-pretty">
          {taken === 0 ? (
            <>
              No one has booked yet. Cancelling will mark this session as
              cancelled.
            </>
          ) : (
            <>
              This will refund <strong>{taken}</strong> caller
              {taken === 1 ? "" : "s"} (
              <span className="font-mono">{refundTotal.toFixed(2)} USDC</span>{" "}
              total). This cannot be undone.
            </>
          )}
        </p>
        <div className="mt-6 flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isCancelling}>
            Keep session
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={isCancelling}
            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
          >
            {isCancelling ? "Cancelling…" : "Cancel session"}
          </Button>
        </div>
      </div>
    </div>
  );
}
