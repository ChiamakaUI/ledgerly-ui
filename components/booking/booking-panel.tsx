"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check } from "lucide-react";
import type { PublicHost, Slot } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { createBooking, confirmPayment } from "@/lib/api";
import { useWallet } from "@/lib/wallet";
import { formatUSDC, shortenAddress } from "@/lib/utils";

type BookingPanelProps = {
  host: PublicHost;
  slot: Slot | null;
  onBooked?: (bookingId: string) => void;
};

type Phase = "review" | "processing" | "success" | "error";

export function BookingPanel({ host, slot, onBooked }: BookingPanelProps) {
  const { address, connected, connect, signAndSendTransaction } = useWallet();

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("review");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<{
    name?: string;
    email?: string;
  }>({});
  const [bookingId, setBookingId] = React.useState<string | null>(null);

  const nameTrimmed = name.trim();
  const emailTrimmed = email.trim();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed);
  const canPay =
    !!slot &&
    nameTrimmed.length > 0 &&
    emailTrimmed.length > 0 &&
    emailValid &&
    phase !== "processing";

  // `rate` is the numeric USDC amount without symbol. We add "USDC" once,
  // next to it — never bake it into the number.
  const rate = formatUSDC(host.rate, { symbol: false });

  function validate(): boolean {
    const errs: typeof fieldErrors = {};
    if (!nameTrimmed) errs.name = "Your name is required.";
    if (!emailTrimmed) errs.email = "Your email is required.";
    else if (!emailValid) errs.email = "Please enter a valid email.";
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handlePay() {
    if (!slot || !address) return;
    if (!validate()) return;

    setError(null);
    setPhase("processing");

    try {
      const { booking: created, depositInstruction } = await createBooking({
        hostSlug: host.slug,
        scheduledAt: slot.startTime,
        callerWallet: address,
        callerName: nameTrimmed,
        callerEmail: emailTrimmed,
      });
      setBookingId(created.id);

      const signature = await signAndSendTransaction(depositInstruction);
      await confirmPayment(created.id, signature);

      setPhase("success");
      onBooked?.(created.id);
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Payment failed. Please try again.";
      setError(message);
      setPhase("error");
    }
  }

  // Empty state.
  if (!slot && phase !== "success") {
    return (
      <aside className="rounded-2xl border border-border bg-card p-6">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          / Review booking
        </p>
        <p className="mt-6 text-sm text-muted-foreground">
          Pick a date and time to continue.
        </p>
      </aside>
    );
  }

  // Success state.
  if (phase === "success" && bookingId) {
    return (
      <aside className="rounded-2xl border border-primary/30 bg-primary/5 p-6">
        <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          / Confirmed
        </p>
        <div className="mt-6 flex items-start gap-3">
          <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-primary/20 text-primary grid place-items-center">
            <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
          </div>
          <div>
            <p className="font-display text-2xl tracking-tight">
              You&apos;re on the calendar.
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Booking confirmed with {host.name}
            </p>
          </div>
        </div>
        <Link
          href={`/booking/${bookingId}`}
          className="mt-6 inline-flex items-center gap-2 text-sm text-primary hover:underline"
        >
          View booking status <Badge variant="primary">paid</Badge>
        </Link>
      </aside>
    );
  }

  // Active review + pay state.
  const scheduledFor = new Date(slot!.startTime);
  const formattedDate = scheduledFor.toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <aside className="rounded-2xl border border-border bg-card p-5 sm:!p-6">
      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
        / Review booking
      </p>

      <dl className="mt-6 space-y-3 text-sm">
        <Row label="with" value={host.name} />
        <Row label="when" value={formattedDate} />
        <Row label="duration" value={`${host.durationMinutes} minutes`} />
        <Row
          label="you pay"
          value={
            <span className="inline-flex items-baseline gap-1">
              <span className="font-display text-base tabular">{rate}</span>
              <span className="text-xs text-muted-foreground">USDC</span>
            </span>
          }
        />
      </dl>

      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="caller-name">Name</Label>
          <Input
            id="caller-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name)
                setFieldErrors((f) => ({ ...f, name: undefined }));
            }}
            placeholder="Ada Obi"
            disabled={phase === "processing"}
            aria-invalid={!!fieldErrors.name}
          />
          {fieldErrors.name && (
            <p className="text-xs text-destructive">{fieldErrors.name}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="caller-email">Email</Label>
          <Input
            id="caller-email"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email)
                setFieldErrors((f) => ({ ...f, email: undefined }));
            }}
            placeholder="you@example.com"
            disabled={phase === "processing"}
            aria-invalid={!!fieldErrors.email}
          />
          {fieldErrors.email && (
            <p className="text-xs text-destructive">{fieldErrors.email}</p>
          )}
          <p className="text-xs text-muted-foreground">
            We&apos;ll send the call link here.
          </p>
        </div>
      </div>

      {error && (
        <div className="mt-4 rounded-xl border border-destructive/40 bg-destructive/5 p-3">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}

      <div className="mt-6">
        {!connected ? (
          <Button
            onClick={() => void connect()}
            variant="primary"
            size="lg"
            className="w-full"
          >
            Sign in to pay
          </Button>
        ) : (
          <Button
            onClick={() => void handlePay()}
            variant="primary"
            size="lg"
            className="w-full"
            disabled={!canPay}
          >
            {phase === "processing" ? (
              <span className="inline-flex items-center gap-2">
                <Spinner /> Confirming on Solana…
              </span>
            ) : (
              <span className="inline-flex items-center gap-2">
                Pay {rate} USDC
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </Button>
        )}
        {connected && address && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            paying as{" "}
            <span className="font-mono">{shortenAddress(address)}</span>
          </p>
        )}
      </div>
    </aside>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className="text-xs font-mono uppercase tracking-widest text-muted-foreground shrink-0">
        {label}
      </dt>
      <dd className="text-sm text-foreground text-right min-w-0 truncate">
        {value}
      </dd>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}