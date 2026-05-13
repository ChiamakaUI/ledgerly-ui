"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, ReactNode, ElementType } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  Check,
  Clock,
  Gift,
  Users,
} from "lucide-react";
import type { Session } from "@/types";
import { Button, Input, Label, Badge, useToast } from "@/components";
import {
  bookSession,
  confirmSessionPayment,
  getSession,
  ApiError,
  useWallet,
  formatUSDC,
  shortenAddress,
} from "@/lib";

type Phase = "review" | "processing" | "error";

export default function BookSessionPage() {
  const params = useParams<{ hostSlug: string; sessionId: string }>();
  const router = useRouter();
  const { address, connected, connect, signAndSendTransaction } = useWallet();
  const { show } = useToast();

  const [session, setSession] = useState<Session | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isGift, setIsGift] = useState(false);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [phase, setPhase] = useState<Phase>("review");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    recipientName?: string;
    recipientEmail?: string;
  }>({});

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const s = await getSession(params.sessionId);
        if (!cancelled) setSession(s);
      } catch (e) {
        if (!cancelled)
          setLoadError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [params.sessionId]);

  const nameTrimmed = name.trim();
  const emailTrimmed = email.trim();
  const recipientNameTrimmed = recipientName.trim();
  const recipientEmailTrimmed = recipientEmail.trim();
  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const canPay =
    !!session &&
    nameTrimmed.length > 0 &&
    isValidEmail(emailTrimmed) &&
    (!isGift ||
      (recipientNameTrimmed.length > 0 &&
        isValidEmail(recipientEmailTrimmed))) &&
    phase !== "processing";

  function validate(): boolean {
    const errs: typeof fieldErrors = {};
    if (!nameTrimmed) errs.name = "Your name is required.";
    if (!emailTrimmed) errs.email = "Your email is required.";
    else if (!isValidEmail(emailTrimmed))
      errs.email = "Please enter a valid email.";

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
    if (!session || !address) return;
    if (!validate()) return;

    setError(null);
    setPhase("processing");

    try {
      const { booking, depositInstruction } = await bookSession(session.id, {
        callerWallet: address,
        callerName: nameTrimmed,
        callerEmail: emailTrimmed,
        ...(isGift && {
          isGift: true,
          participantName: recipientNameTrimmed,
          participantEmail: recipientEmailTrimmed,
        }),
      });
      const signature = await signAndSendTransaction(depositInstruction);
      await confirmSessionPayment(booking.id, signature);
      show({
        kind: "success",
        title: isGift ? "Gift sent" : "Spot reserved",
        description: isGift
          ? `We've emailed ${recipientNameTrimmed} a link to claim their spot.`
          : `You're booked for ${session.title}.`,
      });
      router.push(`/booking/${booking.id}`);
    } catch (e) {
      let message =
        e instanceof Error ? e.message : "Payment failed. Please try again.";
      if (
        e instanceof ApiError &&
        (e.status === 409 || /already booked/i.test(message))
      ) {
        message = "You've already reserved a spot in this session.";
      }
      setError(message);
      setPhase("error");
    }
  }

  if (loadError) {
    return (
      <div className="container py-16">
        <div className="max-w-md mx-auto rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="font-display text-xl">Could not load session</p>
          <p className="text-sm text-muted-foreground mt-1">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="container py-16 animate-pulse">
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="h-8 w-48 bg-muted rounded" />
          <div className="h-64 bg-muted/40 rounded-2xl" />
        </div>
      </div>
    );
  }

  const scheduled = new Date(session.scheduledAt);
  const spots = session.spotsRemaining ?? session.maxParticipants;
  const isFull = spots === 0;
  const isPast = scheduled.getTime() < Date.now();
  const cantBook = isFull || isPast || session.status !== "open";
  const rate = formatUSDC(session.rate, { symbol: false });

  return (
    <div className="container py-6 md:py-10 lg:py-16">
      <div className="max-w-2xl mx-auto">
        <Link
          href={`/sessions/${params.hostSlug}`}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All sessions
        </Link>

        <div className="rounded-2xl border border-border bg-card p-6 md:p-8">
          <div className="flex items-start gap-2 flex-wrap mb-3">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              / Reserve a spot
            </p>
            {isFull ? (
              <Badge variant="warning">Full</Badge>
            ) : (
              <Badge variant="primary">{spots} spots left</Badge>
            )}
          </div>

          <h1 className="font-display text-3xl md:text-4xl tracking-tight">
            {session.title}
          </h1>
          {session.description && (
            <p className="text-sm text-muted-foreground mt-3 text-pretty">
              {session.description}
            </p>
          )}

          <dl className="mt-6 grid sm:grid-cols-2 gap-4 text-sm border-t border-border pt-6">
            <DetailRow icon={Calendar} label="When">
              {scheduled.toLocaleString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZoneName: "short",
              })}
            </DetailRow>
            <DetailRow icon={Clock} label="Duration">
              {session.durationMinutes} minutes
            </DetailRow>
            <DetailRow icon={Users} label="Capacity">
              up to {session.maxParticipants} participants
            </DetailRow>
            <DetailRow label="Cost">
              <span className="font-mono tabular">{rate}</span>{" "}
              <span className="text-xs text-muted-foreground">USDC</span>
            </DetailRow>
          </dl>

          {cantBook ? (
            <div className="mt-6 rounded-xl border border-warning/40 bg-warning/5 p-4">
              <p className="text-sm text-warning-foreground">
                {isFull && "This session is fully booked."}
                {isPast && "This session has already started."}
                {!isFull &&
                  !isPast &&
                  session.status !== "open" &&
                  "This session is no longer accepting bookings."}
              </p>
            </div>
          ) : (
            <div className="mt-6 space-y-4 border-t border-border pt-6">
              <div className="space-y-1.5">
                <Label htmlFor="caller-name">
                  {isGift ? "Your name (sender)" : "Your name"}
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
                  <p className="text-xs text-destructive">
                    {fieldErrors.email}
                  </p>
                )}
                {!isGift && (
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll send the call link here.
                  </p>
                )}
              </div>

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
                        <Check
                          className="h-3 w-3 text-primary-foreground"
                          strokeWidth={3}
                        />
                      )}
                    </div>
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 text-sm font-medium group-hover:text-foreground">
                      <Gift className="h-3.5 w-3.5" />
                      Gift this to someone
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 text-pretty">
                      You pay, they attend. We&apos;ll email them a link to
                      claim it.
                    </p>
                  </div>
                </label>
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
                        They&apos;ll get a link to claim this gift and join the
                        call.
                      </p>
                    )}
                  </div>
                </>
              )}

              {error && (
                <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3">
                  <p className="text-xs text-destructive">{error}</p>
                </div>
              )}

              {!connected ? (
                <Button
                  onClick={() => void connect()}
                  variant="primary"
                  size="lg"
                  className="w-full"
                >
                  Sign in to reserve
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
                      {isGift
                        ? `Gift ${rate} USDC`
                        : `Pay ${rate} USDC and reserve`}
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  )}
                </Button>
              )}
              {connected && address && (
                <p className="text-center text-xs text-muted-foreground">
                  paying as{" "}
                  <span className="font-mono">{shortenAddress(address)}</span>
                </p>
              )}
            </div>
          )}
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
  icon?: ElementType;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start gap-3">
      {Icon && (
        <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      )}
      <div className="min-w-0">
        <dt className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
          {label}
        </dt>
        <dd className="text-sm text-foreground mt-1">{children}</dd>
      </div>
    </div>
  );
}