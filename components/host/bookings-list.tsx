"use client";

import { useState, useEffect, type ReactNode, useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import type { Booking, BookingStatus } from "@/types";
import { Button, useToast, Badge } from "@/components";
import {
  confirmCallCompleted,
  ApiError,
  formatUSDC,
  formatRelative,
  shortenAddress,
} from "@/lib";

type BookingsListProps = {
  bookings: Booking[];
  hostWallet: string;
};

const STATUS_BADGE: Record<
  BookingStatus,
  {
    label: string;
    variant: "primary" | "success" | "warning" | "muted" | "destructive";
  }
> = {
  pending_payment: { label: "Awaiting payment", variant: "warning" },
  paid: { label: "Confirmed", variant: "primary" },
  active: { label: "In progress", variant: "primary" },
  completed: { label: "Completed", variant: "success" },
  refunded: { label: "Refunded", variant: "muted" },
  expired: { label: "Expired", variant: "muted" },
  no_show: { label: "No-show", variant: "destructive" },
};

const TIME_LOCK_MS = 15 * 60 * 1000; // Vidbloq's distribute time-lock

type Tab = "upcoming" | "past" | "all";

export function BookingsList({ bookings, hostWallet }: BookingsListProps) {
  const [tab, setTab] = useState<Tab>("upcoming");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [now, setNow] = useState(() => Date.now());
  const { show } = useToast();

  // Tick every 30s so canConfirm flips automatically when the lock expires.
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(i);
  }, []);

  const upcoming = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            (b.status === "paid" ||
              b.status === "active" ||
              b.status === "pending_payment") &&
            new Date(b.scheduledAt).getTime() >= now - TIME_LOCK_MS,
        )
        .sort(
          (a, b) =>
            new Date(a.scheduledAt).getTime() -
            new Date(b.scheduledAt).getTime(),
        ),
    [bookings, now],
  );

  const past = useMemo(
    () =>
      bookings
        .filter(
          (b) =>
            b.status === "completed" ||
            b.status === "refunded" ||
            b.status === "expired" ||
            b.status === "no_show" ||
            ((b.status === "paid" || b.status === "active") &&
              new Date(b.scheduledAt).getTime() < now - TIME_LOCK_MS),
        )
        .sort(
          (a, b) =>
            new Date(b.scheduledAt).getTime() -
            new Date(a.scheduledAt).getTime(),
        ),
    [bookings, now],
  );

  const all = [...upcoming, ...past];

  const list = tab === "upcoming" ? upcoming : tab === "past" ? past : all;

  async function handleConfirm(bookingId: string) {
    if (!hostWallet) {
      show({
        kind: "error",
        title: "Wallet not connected",
        description: "Sign in to confirm completed calls.",
      });
      return;
    }
    setConfirming(bookingId);
    try {
      const updated = await confirmCallCompleted(bookingId, hostWallet);
      setConfirmed((s) => new Set(s).add(bookingId));
      show({
        kind: "success",
        title: "Funds released",
        description: `${formatUSDC(updated.amount, { symbol: false })} USDC sent to your wallet.`,
        action: updated.distributeSignature
          ? {
              label: "View transaction",
              href: `https://solscan.io/tx/${updated.distributeSignature}?cluster=devnet`,
            }
          : undefined,
      });
    } catch (e) {
      const message =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not confirm call.";
      const friendly = /time.?locked/i.test(message)
        ? "The payout is time-locked. Try again in a few minutes."
        : message;
      show({
        kind: "error",
        title: "Could not release funds",
        description: friendly,
      });
    } finally {
      setConfirming(null);
    }
  }

  if (bookings.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <p className="font-display text-xl">No bookings yet</p>
        <p className="text-sm text-muted-foreground mt-2">
          When callers book you, they&apos;ll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-1 bg-muted/50 rounded-full p-1 w-fit">
        <TabButton
          active={tab === "upcoming"}
          onClick={() => setTab("upcoming")}
        >
          Upcoming <span className="tabular">{upcoming.length}</span>
        </TabButton>
        <TabButton active={tab === "past"} onClick={() => setTab("past")}>
          Past <span className="tabular">{past.length}</span>
        </TabButton>
        <TabButton active={tab === "all"} onClick={() => setTab("all")}>
          All <span className="tabular">{all.length}</span>
        </TabButton>
      </div>

      <div className="rounded-2xl border border-border bg-card divide-y divide-border">
        {list.map((b) => (
          <BookingRow
            key={b.id}
            booking={b}
            now={now}
            isConfirming={confirming === b.id}
            isConfirmed={confirmed.has(b.id)}
            onConfirm={() => void handleConfirm(b.id)}
          />
        ))}
        {list.length === 0 && (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Nothing here.
          </p>
        )}
      </div>
    </div>
  );
}

function BookingRow({
  booking,
  now,
  isConfirming,
  isConfirmed,
  onConfirm,
}: {
  booking: Booking;
  now: number;
  isConfirming: boolean;
  isConfirmed: boolean;
  onConfirm: () => void;
}) {
  const scheduled = new Date(booking.scheduledAt);
  const scheduledMs = scheduled.getTime();
  const callEndsAt = scheduledMs + booking.durationMinutes * 60_000;
  const lockExpiresAt = callEndsAt + TIME_LOCK_MS;

  const canConfirm =
    (booking.status === "paid" || booking.status === "active") &&
    now >= lockExpiresAt &&
    !isConfirmed;

  const meta = STATUS_BADGE[booking.status] ?? {
    label: booking.status,
    variant: "muted" as const,
  };
  const effectiveMeta = isConfirmed ? STATUS_BADGE.completed : meta;

  const callerLabel =
    booking.callerName ?? shortenAddress(booking.callerWallet, 4);

  return (
    <div className="flex items-start gap-6 p-5 flex-wrap md:flex-nowrap">
      <div className="shrink-0 w-14 text-center font-display">
        <div className="text-2xl leading-none">
          {scheduled.toLocaleDateString("en-US", { day: "2-digit" })}
        </div>
        <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mt-1">
          {scheduled.toLocaleDateString("en-US", { month: "short" })}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-sm truncate">{callerLabel}</p>
          <Badge variant={effectiveMeta.variant}>{effectiveMeta.label}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {scheduled.toLocaleString("en-US", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
          {" · "}
          {formatRelative(booking.scheduledAt)}
          {" · "}
          <span className="font-mono">
            {shortenAddress(booking.callerWallet, 4)}
          </span>
        </p>
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <span className="font-mono text-xs tabular">
            {formatUSDC(booking.amount, { symbol: false })}{" "}
            <span className="text-muted-foreground">USDC</span>
          </span>
          {canConfirm && (
            <Button
              variant="primary"
              size="sm"
              onClick={onConfirm}
              disabled={isConfirming}
            >
              <Check className="h-3.5 w-3.5" />
              {isConfirming ? "Confirming…" : "Confirm completed"}
            </Button>
          )}
          <Button variant="ghost" size="sm" asChild>
            <Link
              href={`/booking/${booking.id}`}
              className="text-muted-foreground hover:text-foreground"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
              View
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 text-xs font-medium rounded-full transition-colors inline-flex items-center gap-1.5 ${
        active
          ? "bg-background text-foreground shadow-soft"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}
