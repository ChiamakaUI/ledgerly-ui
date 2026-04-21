"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWallet } from "@/lib/wallet";
import { createHost, getHostMe } from "@/lib/api";
import { ApiError } from "@/lib/http";
import { useToast } from "@/components/ui/toast";

const TIMEZONES = [
  "Africa/Lagos",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Singapore",
  "Asia/Tokyo",
  "UTC",
];

const DURATIONS = [15, 30, 45, 60];

/**
 * Host onboarding.
 *
 * Flow:
 *  1. If wallet is already a host → redirect to /dashboard
 *  2. Otherwise, show the form
 *  3. On submit, POST /api/hosts → redirect to /dashboard
 *
 * Availability is NOT set here — the host lands on /dashboard with an
 * empty-state prompt to set their first availability window.
 */
export default function SetupPage() {
  const router = useRouter();
  const { address, connected, connecting, connect } = useWallet();
  const { show } = useToast();

  const [name, setName] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [rateUsdc, setRateUsdc] = React.useState("5");
  const [duration, setDuration] = React.useState(30);
  const [bio, setBio] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [timezone, setTimezone] = React.useState(
    typeof window !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "UTC",
  );

  const [submitting, setSubmitting] = React.useState(false);
  const [checking, setChecking] = React.useState(true);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  // If user is already a host, bounce them to the dashboard.
  React.useEffect(() => {
    if (!connected || !address) {
      setChecking(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        await getHostMe(address);
        // Success means they're already registered — redirect.
        if (!cancelled) router.replace("/dashboard");
      } catch (e) {
        // 404 is expected here — means they haven't onboarded yet.
        if (!cancelled && !(e instanceof ApiError && e.status === 404)) {
          show({
            kind: "error",
            title: "Couldn't check registration status",
            description: e instanceof Error ? e.message : "Please try again.",
          });
        }
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connected, address, router, show]);

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required.";
    if (!slug.trim()) errs.slug = "URL slug is required.";
    else if (!/^[a-z0-9-]+$/.test(slug.trim()))
      errs.slug = "Use lowercase letters, numbers, and hyphens only.";
    const rateNum = Number(rateUsdc);
    if (!rateUsdc || Number.isNaN(rateNum) || rateNum <= 0)
      errs.rate = "Enter a valid rate in USDC.";
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()))
      errs.email = "Invalid email.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!address) return;
    if (!validate()) return;

    setSubmitting(true);
    try {
      await createHost({
        walletAddress: address,
        name: name.trim(),
        slug: slug.trim(),
        rate: Math.round(Number(rateUsdc) * 1_000_000),
        durationMinutes: duration,
        bio: bio.trim() || undefined,
        email: email.trim() || undefined,
        timezone,
      });
      show({
        kind: "success",
        title: "Profile created",
        description: "Set your availability to start receiving bookings.",
      });
      router.replace("/dashboard");
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        setErrors({ slug: "That URL is already taken. Try a different one." });
      } else {
        show({
          kind: "error",
          title: "Could not create profile",
          description: e instanceof Error ? e.message : "Please try again.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  }

  const origin =
    typeof window !== "undefined" ? window.location.host : "ledgerly.com";
  const slugPreview = slug.trim() || "your-slug";

  if (connecting || checking) {
    return (
      <div className="container max-w-xl py-16 animate-pulse space-y-6">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-64 bg-muted/40 rounded-2xl" />
      </div>
    );
  }

  if (!connected) {
    return (
      <div className="container max-w-md py-16">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            / Host setup
          </p>
          <h1 className="font-display text-3xl tracking-tight">
            Connect your wallet
          </h1>
          <p className="text-sm text-muted-foreground text-pretty">
            Callers pay into your wallet. Sign in to register as a host.
          </p>
          <Button onClick={() => void connect()} variant="primary" size="lg">
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-xl py-10 md:py-16">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Link>

      <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
        / Host setup
      </p>
      <h1 className="font-display text-4xl tracking-tight">
        Start getting paid.
      </h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        Set up your profile in under a minute. You can change everything later.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 rounded-2xl border border-border bg-card p-6 md:p-8 space-y-5"
      >
        {/* Name */}
        <div className="space-y-1.5">
          <Label htmlFor="name">
            Display name <RequiredDot />
          </Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (errors.name) setErrors((x) => ({ ...x, name: "" }));
            }}
            placeholder="Emmy Ezemba"
            disabled={submitting}
            aria-invalid={!!errors.name}
          />
          {errors.name && <FieldError>{errors.name}</FieldError>}
        </div>

        {/* Slug */}
        <div className="space-y-1.5">
          <Label htmlFor="slug">
            Booking URL <RequiredDot />
          </Label>
          <div className="flex rounded-lg border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring">
            <span className="px-3 py-2 text-sm text-muted-foreground bg-muted/40 font-mono border-r border-input">
              {origin}/book/
            </span>
            <input
              id="slug"
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value.toLowerCase());
                if (errors.slug) setErrors((x) => ({ ...x, slug: "" }));
              }}
              placeholder="your-slug"
              disabled={submitting}
              aria-invalid={!!errors.slug}
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/60 font-mono"
            />
          </div>
          {errors.slug ? (
            <FieldError>{errors.slug}</FieldError>
          ) : (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <LinkIcon className="h-3 w-3" />
              Preview:{" "}
              <span className="font-mono text-foreground">
                {origin}/book/{slugPreview}
              </span>
            </p>
          )}
        </div>

        {/* Rate + Duration */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="rate">
              Rate per call (USDC) <RequiredDot />
            </Label>
            <Input
              id="rate"
              type="number"
              step="0.5"
              min="0"
              value={rateUsdc}
              onChange={(e) => {
                setRateUsdc(e.target.value);
                if (errors.rate) setErrors((x) => ({ ...x, rate: "" }));
              }}
              disabled={submitting}
              aria-invalid={!!errors.rate}
              className="font-mono tabular"
            />
            {errors.rate && <FieldError>{errors.rate}</FieldError>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="duration">Call duration</Label>
            <select
              id="duration"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              disabled={submitting}
              className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {d} minutes
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-1.5">
          <Label htmlFor="bio">
            Bio <span className="text-muted-foreground">(optional)</span>
          </Label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            disabled={submitting}
            placeholder="What can callers expect to get from a session with you?"
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>

        {/* Email */}
        <div className="space-y-1.5">
          <Label htmlFor="email">
            Email <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors((x) => ({ ...x, email: "" }));
            }}
            placeholder="you@example.com"
            disabled={submitting}
            aria-invalid={!!errors.email}
          />
          {errors.email ? (
            <FieldError>{errors.email}</FieldError>
          ) : (
            <p className="text-xs text-muted-foreground">
              We&apos;ll notify you here when someone books a call.
            </p>
          )}
        </div>

        {/* Timezone */}
        <div className="space-y-1.5">
          <Label htmlFor="timezone">Timezone</Label>
          <select
            id="timezone"
            value={timezone}
            onChange={(e) => setTimezone(e.target.value)}
            disabled={submitting}
            className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {TIMEZONES.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2 flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Next: set when you&apos;re available.
          </p>
          <Button
            type="submit"
            variant="primary"
            size="lg"
            disabled={submitting}
          >
            {submitting ? (
              "Creating…"
            ) : (
              <>
                Create profile
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

function RequiredDot() {
  return <span className="text-destructive">*</span>;
}

function FieldError({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-destructive">{children}</p>;
}