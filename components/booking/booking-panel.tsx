"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Check, Gift } from "lucide-react";
import type { PublicHost, Slot } from "@/types";
import { Button, Input, Label, Badge } from "@/components";
import { createBooking, confirmPayment, useWallet, formatUSDC, shortenAddress } from "@/lib";

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
  const [isGift, setIsGift] = React.useState(false);
  const [recipientName, setRecipientName] = React.useState("");
  const [recipientEmail, setRecipientEmail] = React.useState("");
  const [phase, setPhase] = React.useState<Phase>("review");
  const [error, setError] = React.useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = React.useState<{
    name?: string;
    email?: string;
    recipientName?: string;
    recipientEmail?: string;
  }>({});
  const [bookingId, setBookingId] = React.useState<string | null>(null);

  const nameTrimmed = name.trim();
  const emailTrimmed = email.trim();
  const recipientNameTrimmed = recipientName.trim();
  const recipientEmailTrimmed = recipientEmail.trim();
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const canPay =
    !!slot &&
    nameTrimmed.length > 0 &&
    isValidEmail(emailTrimmed) &&
    (!isGift ||
      (recipientNameTrimmed.length > 0 &&
        isValidEmail(recipientEmailTrimmed))) &&
    phase !== "processing";

  const rate = formatUSDC(host.rate, { symbol: false });

  function validate(): boolean {
    const errs: typeof fieldErrors = {};
    if (!nameTrimmed) errs.name = "Your name is required.";
    if (!emailTrimmed) errs.email = "Your email is required.";
    else if (!isValidEmail(emailTrimmed)) errs.email = "Please enter a valid email.";

    if (isGift) {
      if (!recipientNameTrimmed)
        errs.recipientName = "Recipient name is required.";
      if (!recipientEmailTrimmed)
        errs.recipientEmail = "Recipient email is required.";
      else if (!isValidEmail(recipientEmailTrimmed))
        errs.recipientEmail = "Please enter a valid email.";
    }

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
        ...(isGift && {
          isGift: true,
          participantName: recipientNameTrimmed,
          participantEmail: recipientEmailTrimmed,
        }),
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

  // Empty state
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

  // Success state
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
              {isGift ? "Gift sent!" : "You're on the calendar."}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isGift ? (
                <>
                  We&apos;ve emailed {recipientNameTrimmed} a link to claim
                  their session.
                </>
              ) : (
                <>Booking confirmed with {host.name}</>
              )}
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

  // Active form state
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
    <aside className="rounded-2xl border border-border bg-card p-5 sm:p-6">
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

      {/* Gift toggle */}
      <div className="mt-6 pt-6 border-t border-border">
        <label className="flex items-start gap-3 cursor-pointer group">
          <div className="relative pt-0.5">
            <input
              type="checkbox"
              checked={isGift}
              onChange={(e) => setIsGift(e.target.checked)}
              disabled={phase === "processing"}
              className="peer sr-only"
            />
            <div className="h-5 w-5 rounded border-2 border-input peer-checked:border-primary peer-checked:bg-primary transition-colors grid place-items-center">
              {isGift && (
                <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
              )}
            </div>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-1.5 text-sm font-medium group-hover:text-foreground">
              <Gift className="h-3.5 w-3.5" />
              Gift this to someone
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 text-pretty">
              You pay, they attend. We&apos;ll email them a link to claim it.
            </p>
          </div>
        </label>
      </div>

      {/* Form */}
      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="caller-name">
            {isGift ? "Your name (sender)" : "Name"}
          </Label>
          <Input
            id="caller-name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (fieldErrors.name)
                setFieldErrors((f) => ({ ...f, name: undefined }));
            }}
            placeholder={isGift ? "Alice" : "Ada Obi"}
            disabled={phase === "processing"}
            aria-invalid={!!fieldErrors.name}
          />
          {fieldErrors.name && (
            <p className="text-xs text-destructive">{fieldErrors.name}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="caller-email">
            {isGift ? "Your email" : "Email"}
          </Label>
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
          {!isGift && (
            <p className="text-xs text-muted-foreground">
              We&apos;ll send the call link here.
            </p>
          )}
        </div>

        {isGift && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="recipient-name">Recipient name</Label>
              <Input
                id="recipient-name"
                value={recipientName}
                onChange={(e) => {
                  setRecipientName(e.target.value);
                  if (fieldErrors.recipientName)
                    setFieldErrors((f) => ({
                      ...f,
                      recipientName: undefined,
                    }));
                }}
                placeholder="Bob"
                disabled={phase === "processing"}
                aria-invalid={!!fieldErrors.recipientName}
              />
              {fieldErrors.recipientName && (
                <p className="text-xs text-destructive">
                  {fieldErrors.recipientName}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="recipient-email">Recipient email</Label>
              <Input
                id="recipient-email"
                type="email"
                inputMode="email"
                value={recipientEmail}
                onChange={(e) => {
                  setRecipientEmail(e.target.value);
                  if (fieldErrors.recipientEmail)
                    setFieldErrors((f) => ({
                      ...f,
                      recipientEmail: undefined,
                    }));
                }}
                placeholder="bob@example.com"
                disabled={phase === "processing"}
                aria-invalid={!!fieldErrors.recipientEmail}
              />
              {fieldErrors.recipientEmail ? (
                <p className="text-xs text-destructive">
                  {fieldErrors.recipientEmail}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  They&apos;ll get a link to claim this gift and join the call.
                </p>
              )}
            </div>
          </>
        )}
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
              "Confirming on Solana…"
            ) : (
              <span className="inline-flex items-center gap-2">
                {isGift ? `Gift ${rate} USDC` : `Pay ${rate} USDC`}
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
