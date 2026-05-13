"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Calendar, Clock, Gift } from "lucide-react";
import type { Gift as GiftType } from "@/types";
import { Button, useToast } from "@/components";
import { getGiftByClaimCode, claimGift, ApiError, useWallet } from "@/lib";


export default function GiftClaimPage() {
  const params = useParams<{ code: string }>();
  const router = useRouter();
  const { address, connected, connecting, connect } = useWallet();
  const { show } = useToast();

  const [gift, setGift] = React.useState<GiftType | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [claiming, setClaiming] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const g = await getGiftByClaimCode(params.code);
        if (!cancelled) setGift(g);
      } catch (e) {
        if (!cancelled) {
          setLoadError(
            e instanceof ApiError && e.status === 404
              ? "This gift link isn't valid."
              : e instanceof Error
                ? e.message
                : "Could not load gift.",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.code]);

  async function handleClaim() {
    if (!address || !gift) return;
    setClaiming(true);
    try {
      const { booking } = await claimGift(params.code, address);
      show({
        kind: "success",
        title: "Gift claimed",
        description: `You're booked with ${gift.hostName}.`,
      });
      router.push(`/booking/${booking.id}`);
    } catch (e) {
      const msg =
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Try again.";
      show({
        kind: "error",
        title: "Could not claim gift",
        description: msg,
      });
    } finally {
      setClaiming(false);
    }
  }

  if (loadError) {
    return (
      <div className="container py-16">
        <div className="max-w-md mx-auto rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-center">
          <Gift className="h-8 w-8 text-destructive mx-auto mb-3" />
          <p className="font-display text-xl">Gift unavailable</p>
          <p className="text-sm text-muted-foreground mt-2">{loadError}</p>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline mt-6"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back home
          </Link>
        </div>
      </div>
    );
  }

  if (!gift) {
    return (
      <div className="container py-16 animate-pulse">
        <div className="max-w-md mx-auto space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted/40 rounded-2xl" />
        </div>
      </div>
    );
  }

  const claimed = gift.giftClaimedAt !== null;
  const isCancelled =
    gift.status === "refunded" ||
    gift.status === "expired" ||
    gift.status === "no_show";
  const callEndsAt =
    new Date(gift.scheduledAt).getTime() + gift.durationMinutes * 60_000;
  const isPast = Date.now() > callEndsAt;

  // Already claimed
  if (claimed) {
    return (
      <div className="container py-16">
        <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-6 text-center">
          <Gift className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-display text-xl">Already claimed</p>
          <p className="text-sm text-muted-foreground mt-2">
            This gift was claimed{" "}
            {gift.giftClaimedAt
              ? `on ${new Date(gift.giftClaimedAt).toLocaleDateString()}`
              : "earlier"}
            .
          </p>
        </div>
      </div>
    );
  }

  // Cancelled or past
  if (isCancelled) {
    return (
      <div className="container py-16">
        <div className="max-w-md mx-auto rounded-2xl border border-warning/40 bg-warning/5 p-6 text-center">
          <Gift className="h-8 w-8 text-warning-foreground mx-auto mb-3" />
          <p className="font-display text-xl">Gift was cancelled</p>
          <p className="text-sm text-muted-foreground mt-2">
            {gift.callerName} cancelled this gift before you could claim it.
          </p>
        </div>
      </div>
    );
  }

  if (isPast) {
    return (
      <div className="container py-16">
        <div className="max-w-md mx-auto rounded-2xl border border-border bg-card p-6 text-center">
          <Gift className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="font-display text-xl">Gift has expired</p>
          <p className="text-sm text-muted-foreground mt-2">
            The session has already passed. Sorry you missed it.
          </p>
        </div>
      </div>
    );
  }

  const scheduled = new Date(gift.scheduledAt);

  return (
    <div className="container py-6 md:py-10 lg:py-16">
      <div className="max-w-lg mx-auto">
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 to-card p-6 md:p-8 relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
          />
          <div className="relative">
            <div className="h-12 w-12 rounded-full bg-primary/20 text-primary grid place-items-center mb-4">
              <Gift className="h-6 w-6" />
            </div>
            <p className="text-xs font-mono uppercase tracking-widest text-primary mb-2">
              / You&apos;ve received a gift
            </p>
            <h1 className="font-display text-3xl md:text-4xl tracking-tight">
              {gift.callerName} gifted you a session with{" "}
              <em>{gift.hostName}</em>.
            </h1>

            <dl className="mt-6 space-y-3 border-t border-border pt-6">
              <DetailRow icon={Calendar} label="When">
                {scheduled.toLocaleString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  timeZoneName: "short",
                })}
              </DetailRow>
              <DetailRow icon={Clock} label="Duration">
                {gift.durationMinutes} minutes
              </DetailRow>
            </dl>

            <div className="mt-8">
              {!connected ? (
                <>
                  <Button
                    onClick={() => void connect()}
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={connecting}
                  >
                    {connecting ? "Connecting…" : "Connect wallet to claim"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    Sign in with email or Google. We&apos;ll create a wallet for
                    you automatically.
                  </p>
                </>
              ) : (
                <>
                  <Button
                    onClick={() => void handleClaim()}
                    variant="primary"
                    size="lg"
                    className="w-full"
                    disabled={claiming}
                  >
                    {claiming ? (
                      "Claiming…"
                    ) : (
                      <>
                        Claim your gift
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-3">
                    This binds the gift to your wallet so you can join the call.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <div className="min-w-0">
        <dt className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          {label}
        </dt>
        <dd className="text-sm text-foreground mt-1">{children}</dd>
      </div>
    </div>
  );
}
