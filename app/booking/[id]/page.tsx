"use client";

import { useState, useEffect, ReactNode } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  Clock,
  RefreshCcw,
  Video,
  XCircle,
} from "lucide-react";
import type { Booking, BookingStatus } from "@/types";
import { Button, Badge, useToast } from "@/components";
import {
  cancelBooking,
  getBooking,
  useWallet,
  formatCountdown,
  formatFullDateTime,
  formatRelative,
  formatUSDC,
  shortenAddress,
  cn,
} from "@/lib";

type ViewerRole = "payer" | "participant" | "neither" | null;

export default function BookingStatusPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { show } = useToast();
  const { address: walletAddress } = useWallet();

  const [booking, setBooking] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const b = await getBooking(id);
      if (!cancelled) setBooking(b);
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const viewerRole: ViewerRole = !walletAddress
    ? null
    : !booking
      ? null
      : booking.callerWallet === walletAddress
        ? "payer"
        : booking.participantWallet === walletAddress
          ? "participant"
          : "neither";

  const handleCancel = async () => {
    if (!booking) return;
    // For gift bookings, only the payer can cancel.
    // The refund always goes to the original caller wallet.
    const cancelerWallet = booking.callerWallet;
    if (!cancelerWallet) return;
    setCancelling(true);
    try {
      const updated = await cancelBooking(booking.id, cancelerWallet);
      setBooking(updated);
      show({
        kind: "success",
        title: "Booking cancelled",
        description: updated.refundSignature ? "Refund processed." : undefined,
        action: updated.refundSignature
          ? {
              label: "View refund transaction",
              href: `https://solscan.io/tx/${updated.refundSignature}?cluster=devnet`,
            }
          : undefined,
      });
    } catch (e) {
      show({
        kind: "error",
        title: "Could not cancel booking",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setCancelling(false);
    }
  };

  if (!booking) {
    return (
      <div className="container py-16">
        <div className="max-w-2xl mx-auto animate-pulse space-y-4">
          <div className="h-6 w-32 bg-muted rounded" />
          <div className="h-28 bg-muted/60 rounded-2xl" />
          <div className="h-48 bg-muted/40 rounded-2xl" />
        </div>
      </div>
    );
  }

  // For gift bookings, only the payer should see the cancel button.
  // Non-gift bookings: any authenticated user (typically the caller) can cancel.
  const canShowCancel =
    (booking.status === "paid" || booking.status === "active") &&
    (!booking.isGift || viewerRole === "payer");

  return (
    <div className="container py-6 md:!py-10 lg:!py-16">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>

        <StatusHeader status={booking.status} />

        {booking.isGift && (
          <GiftContextBanner booking={booking} viewerRole={viewerRole} />
        )}

        <div className="mt-8 space-y-6">
          {booking.status === "pending_payment" && (
            <PendingPaymentCard booking={booking} />
          )}
          {(booking.status === "paid" || booking.status === "active") && (
            <PaidCard booking={booking} viewerRole={viewerRole} />
          )}
          {booking.status === "completed" && (
            <CompletedCard booking={booking} />
          )}
          {booking.status === "refunded" && <RefundedCard booking={booking} />}
          {booking.status === "expired" && <ExpiredCard booking={booking} />}
          {booking.status === "no_show" && <ExpiredCard booking={booking} />}

          <DetailsCard booking={booking} />

          <div className="flex flex-wrap gap-3 justify-end pt-2">
            {canShowCancel && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleCancel()}
                disabled={cancelling}
                className="text-destructive hover:text-destructive"
              >
                {cancelling ? "Cancelling…" : "Cancel booking"}
              </Button>
            )}
            {booking.status === "pending_payment" && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleCancel()}
                className="text-muted-foreground"
              >
                Abandon booking
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.refresh()}
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Refresh
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Header ---------------------------------------------------------------

const STATUS_META: Record<
  BookingStatus,
  {
    label: string;
    variant: "primary" | "success" | "warning" | "destructive" | "muted";
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

function StatusHeader({ status }: { status: BookingStatus }) {
  const meta = STATUS_META[status];
  return (
    <div>
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
        / Booking status
      </p>
      <div className="flex items-center gap-3">
        <h1 className="font-display text-4xl sm:text-5xl tracking-tight">
          {meta.label}
        </h1>
        <Badge variant={meta.variant}>{status.replace("_", " ")}</Badge>
      </div>
    </div>
  );
}

// --- Gift context banner --------------------------------------------------

function GiftContextBanner({
  booking,
  viewerRole,
}: {
  booking: Booking;
  viewerRole: ViewerRole;
}) {
  if (viewerRole === "payer") {
    const claimed = !!booking.giftClaimedAt;
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mt-6">
        <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">
          / Gift booking
        </p>
        <p className="text-sm text-pretty">
          You gifted this session to{" "}
          <span className="font-medium">
            {booking.participantName ?? "your recipient"}
          </span>
          {claimed ? (
            <> — they&apos;ve claimed it and can join when it&apos;s time.</>
          ) : booking.participantEmail ? (
            <>
              . We&apos;ve emailed{" "}
              <span className="font-mono text-xs">
                {booking.participantEmail}
              </span>{" "}
              a link to claim it.
            </>
          ) : (
            <>. They&apos;ll receive a claim link by email.</>
          )}
        </p>
      </div>
    );
  }

  if (viewerRole === "participant") {
    return (
      <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mt-6">
        <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">
          / Gifted to you
        </p>
        <p className="text-sm">
          {booking.callerName
            ? `${booking.callerName} gifted you this session.`
            : "You received this session as a gift."}{" "}
          Join when it&apos;s time.
        </p>
      </div>
    );
  }

  // viewerRole === "neither" or null
  return (
    <div className="rounded-xl border border-warning/40 bg-warning/5 p-4 mt-6">
      <p className="text-xs font-mono uppercase tracking-widest text-warning-foreground mb-1">
        / Gift booking
      </p>
      <p className="text-sm text-pretty">
        This is a gift booking. Sign in with the wallet that paid for it or the
        wallet that received it to manage or join the call.
      </p>
    </div>
  );
}

// --- Status cards ---------------------------------------------------------

function PendingPaymentCard({ booking }: { booking: Booking }) {
  const [countdown, setCountdown] = useState(() =>
    booking.paymentExpiresAt ? formatCountdown(booking.paymentExpiresAt) : "",
  );

  useEffect(() => {
    if (!booking.paymentExpiresAt) return;
    const i = setInterval(
      () => setCountdown(formatCountdown(booking.paymentExpiresAt!)),
      1000,
    );
    return () => clearInterval(i);
  }, [booking.paymentExpiresAt]);

  return (
    <div className="rounded-2xl border border-warning/40 bg-warning/5 p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div className="flex items-start gap-4 min-w-0">
        <div className="h-10 w-10 shrink-0 rounded-full bg-warning/15 text-warning-foreground grid place-items-center">
          <Clock className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-2xl tracking-tight">
            Complete your payment
          </p>
          <p className="text-sm text-muted-foreground mt-1 text-pretty">
            Your slot is held until the timer runs out. Connect your wallet and
            sign the transaction to confirm.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-6 md:!gap-8 shrink-0 md:!pl-6 md:!border-l md:!border-warning/30 w-full md:!w-auto flex-wrap md:!flex-nowrap">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
            expires in
          </p>
          <p className="font-mono text-3xl tabular mt-1">{countdown}</p>
        </div>
        <Button variant="primary" size="lg">
          Complete payment
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function PaidCard({
  booking,
  viewerRole,
}: {
  booking: Booking;
  viewerRole: ViewerRole;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(i);
  }, []);

  const scheduledMs = new Date(booking.scheduledAt).getTime();
  const joinOpensAt = scheduledMs - 5 * 60 * 1000;
  const joinClosesAt =
    scheduledMs + booking.durationMinutes * 60 * 1000 + 15 * 60 * 1000;
  const inJoinWindow = now >= joinOpensAt && now <= joinClosesAt;

  // For gift bookings, only the participant can join.
  // For regular bookings, the caller (= viewer) can join.
  const canViewerJoin = !booking.isGift || viewerRole === "participant";

  return (
    <div className="rounded-2xl border border-primary/30 bg-primary/5 p-6 md:p-8 relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
      />
      <div className="relative flex flex-col md:!flex-row md:!items-center justify-between gap-4 md:!gap-6">
        <div className="flex items-start gap-4 min-w-0">
          <div className="h-10 w-10 shrink-0 rounded-full bg-primary/20 text-primary grid place-items-center">
            <Check className="h-5 w-5" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-2xl tracking-tight">
              You are all set.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {formatFullDateTime(booking.scheduledAt)}
              {" · "}
              <span className="text-foreground">
                {formatRelative(booking.scheduledAt)}
              </span>
            </p>
          </div>
        </div>
        <div className="w-full md:!w-auto">
          {!canViewerJoin ? (
            <p className="text-sm text-muted-foreground text-right md:!text-left">
              {booking.participantName ?? "Your recipient"} can join the call
              when it&apos;s time.
            </p>
          ) : inJoinWindow ? (
            <Button
              asChild
              size="lg"
              variant="primary"
              className="w-full md:!w-auto"
            >
              <Link href={`/call/${booking.id}`}>
                <Video className="h-4 w-4" />
                Join call
              </Link>
            </Button>
          ) : (
            <Button
              size="lg"
              variant="primary"
              disabled
              className="w-full md:!w-auto"
            >
              <Video className="h-4 w-4" />
              Join opens 5 min before
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function CompletedCard({ booking }: { booking: Booking }) {
  return (
    <div className="rounded-2xl border border-success/30 bg-success/5 p-6 md:p-8">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 shrink-0 rounded-full bg-success/15 text-success grid place-items-center">
          <Check className="h-5 w-5" strokeWidth={2.5} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl tracking-tight">
            Call completed · funds released
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Settled {formatRelative(booking.scheduledAt)} to the host&apos;s
            wallet.
          </p>
          <div className="mt-5 grid grid-cols-1 md:!grid-cols-2 gap-3">
            <TxLink label="Deposit tx" signature={booking.depositSignature} />
            <TxLink
              label="Release tx"
              signature={booking.distributeSignature}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function RefundedCard({ booking }: { booking: Booking }) {
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-6 md:p-8">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 shrink-0 rounded-full bg-muted text-muted-foreground grid place-items-center">
          <RefreshCcw className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl tracking-tight">
            Refund processed
          </p>
          <p className="text-sm text-muted-foreground mt-1 text-pretty">
            {booking.refundReason ??
              "The booking was cancelled and funds have been returned to the caller's wallet."}
          </p>
          {booking.refundSignature && (
            <div className="mt-5 max-w-sm">
              <TxLink label="Refund tx" signature={booking.refundSignature} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ExpiredCard({ booking }: { booking: Booking }) {
  const isNoShow = booking.status === "no_show";
  return (
    <div className="rounded-2xl border border-border bg-muted/30 p-6 md:p-8">
      <div className="flex items-start gap-4">
        <div className="h-10 w-10 shrink-0 rounded-full bg-muted text-muted-foreground grid place-items-center">
          <XCircle className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="font-display text-2xl tracking-tight">
            {isNoShow ? "Marked as no-show" : "Booking expired"}
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            {isNoShow
              ? "The call did not take place. Contact the host if this is a mistake."
              : "Payment wasn't completed in time. Feel free to book a new slot."}
          </p>
        </div>
      </div>
    </div>
  );
}

// --- Shared detail card ---------------------------------------------------

function DetailsCard({ booking }: { booking: Booking }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-5">
        / Booking details
      </p>
      <dl className="divide-y divide-border">
        <DetailRow
          label="Booking ID"
          value={<span className="font-mono text-xs">{booking.id}</span>}
        />
        <DetailRow
          label="Scheduled for"
          value={formatFullDateTime(booking.scheduledAt)}
        />
        <DetailRow
          label="Duration"
          value={`${booking.durationMinutes} minutes`}
        />
        <DetailRow
          label="Amount"
          value={
            <span className="font-mono tabular">
              {formatUSDC(booking.amount)}
            </span>
          }
        />
        {booking.callerName && (
          <DetailRow
            label={booking.isGift ? "Sender" : "Caller"}
            value={booking.callerName}
          />
        )}
        {booking.callerWallet && (
          <DetailRow
            label={booking.isGift ? "Sender wallet" : "Caller wallet"}
            value={
              <span className="font-mono text-xs">
                {shortenAddress(booking.callerWallet, 6)}
              </span>
            }
          />
        )}
        {booking.isGift && booking.participantName && (
          <DetailRow label="Recipient" value={booking.participantName} />
        )}
        {booking.isGift && booking.participantWallet && (
          <DetailRow
            label="Recipient wallet"
            value={
              <span className="font-mono text-xs">
                {shortenAddress(booking.participantWallet, 6)}
              </span>
            }
          />
        )}
        <DetailRow
          label="Stream"
          value={
            <span className="font-mono text-xs">{booking.streamName}</span>
          }
        />
      </dl>
      {booking.sessionId && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mt-6">
          <p className="text-xs font-mono uppercase tracking-widest text-primary mb-1">
            / Group session
          </p>
          <p className="text-sm">
            You&apos;re part of a group call. The host and other participants
            will join at the scheduled time.
          </p>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-6 py-3 first:pt-0 last:pb-0">
      <dt className="text-xs font-mono uppercase tracking-wider text-muted-foreground pt-0.5">
        {label}
      </dt>
      <dd className="text-sm text-right min-w-0 text-foreground">{value}</dd>
    </div>
  );
}

function TxLink({
  label,
  signature,
}: {
  label: string;
  signature?: string | null;
}) {
  if (!signature) {
    return (
      <div className="rounded-xl border border-dashed border-border px-4 py-3">
        <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
          {label}
        </p>
        <p className="text-sm text-muted-foreground mt-1">—</p>
      </div>
    );
  }
  return (
    <a
      href={`https://solscan.io/tx/${signature}?cluster=devnet`}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "rounded-xl border border-border px-4 py-3 block",
        "hover:border-foreground/40 transition-colors group",
      )}
    >
      <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 flex items-center justify-between gap-2">
        <span className="font-mono text-xs truncate">
          {shortenAddress(signature, 8)}
        </span>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors shrink-0" />
      </p>
    </a>
  );
}