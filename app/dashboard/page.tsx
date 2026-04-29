"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Copy, Link as LinkIcon, Save, Sparkles } from "lucide-react";
import type { AvailabilityRule, Booking, Host } from "@/types";
import {
  Button,
  Input,
  Label,
  Badge,
  useToast,
  AvailabilityEditor,
  BookingsList,
} from "@/components";
import {
  getHostMe,
  listHostBookings,
  setAvailability,
  updateHostProfile,
  ApiError,
  useWallet,
  formatUSDC,
} from "@/lib";

const TIMEZONES = [
  "Africa/Lagos",
  "Europe/London",
  "America/New_York",
  "America/Los_Angeles",
  "Asia/Singapore",
  "Asia/Tokyo",
  "UTC",
];

export default function DashboardPage() {
  const router = useRouter();
  const {
    address: walletAddress,
    connected,
    connecting,
    connect,
  } = useWallet();
  const { show } = useToast();

  const [host, setHost] = useState<Host | null>(null);
  const [availability, setAvailabilityState] = useState<
    AvailabilityRule[]
  >([]);
  const [initialAvailability, setInitialAvailability] = useState<
    AvailabilityRule[]
  >([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Profile form state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [bio, setBio] = useState("");
  const [rateUsdc, setRateUsdc] = useState("5");
  const [duration, setDuration] = useState(30);
  const [timezone, setTimezone] = useState("Africa/Lagos");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingAvailability, setSavingAvailability] = useState(false);
  const [copied, setCopied] = useState(false);

  // Load host profile. Redirect to /setup if not registered.
  useEffect(() => {
    if (connecting) return;
    if (!connected || !walletAddress) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    void (async () => {
      try {
        const data = await getHostMe(walletAddress);
        if (cancelled) return;
        setHost(data.host);
        setAvailabilityState(data.availability);
        setInitialAvailability(data.availability);
        setName(data.host.name);
        setEmail(data.host.email ?? "");
        setBio(data.host.bio ?? "");
        setRateUsdc(formatUSDC(data.host.rate, { symbol: false }));
        setDuration(data.host.durationMinutes);
        setTimezone(data.host.timezone);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) {
          router.replace("/dashboard/setup");
          return;
        }
        setError(e instanceof Error ? e.message : "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connected, connecting, walletAddress, router]);

  // Load host's bookings.
  useEffect(() => {
    if (!walletAddress || !host) {
      setBookings([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const bks = await listHostBookings(walletAddress);
        if (!cancelled) setBookings(bks);
      } catch {
        if (!cancelled) setBookings([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [walletAddress, host]);

  const availabilityDirty = useMemo(
    () => JSON.stringify(availability) !== JSON.stringify(initialAvailability),
    [availability, initialAvailability],
  );

  const handleSaveProfile = async () => {
    if (!walletAddress) return;
    const emailTrimmed = email.trim();
    if (emailTrimmed && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
      setEmailError("Please enter a valid email.");
      return;
    }
    setEmailError(null);

    setSavingProfile(true);
    try {
      const rateMinor = Math.round(Number(rateUsdc) * 1_000_000);
      const updated = await updateHostProfile(walletAddress, {
        name,
        email: emailTrimmed || undefined,
        bio,
        rate: rateMinor,
        durationMinutes: duration,
        timezone,
      });
      setHost((prev) => (prev ? { ...prev, ...updated } : prev));
      show({
        kind: "success",
        title: "Profile saved",
      });
    } catch (e) {
      show({
        kind: "error",
        title: "Could not save profile",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveAvailability = async () => {
    if (!walletAddress) return;
    setSavingAvailability(true);
    try {
      await setAvailability(walletAddress, { rules: availability });
      setInitialAvailability(availability);
      show({
        kind: "success",
        title: "Availability saved",
        description:
          availability.length === 0
            ? "No windows set — your booking page will show as unavailable."
            : `${availability.length} window${
                availability.length === 1 ? "" : "s"
              } active.`,
      });
    } catch (e) {
      show({
        kind: "error",
        title: "Could not save availability",
        description: e instanceof Error ? e.message : "Please try again.",
      });
    } finally {
      setSavingAvailability(false);
    }
  };

  const profileUrl =
    typeof window !== "undefined" && host
      ? `${window.location.origin}/book/${host.slug}`
      : "";

  const copyLink = async () => {
    if (!profileUrl) return;
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked */
    }
  };

  // Connect wallet gate
  if (!connected && !connecting) {
    return (
      <div className="container max-w-md py-16">
        <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-4">
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
            / Dashboard
          </p>
          <h1 className="font-display text-3xl tracking-tight">
            Sign in to continue
          </h1>
          <p className="text-sm text-muted-foreground">
            Your dashboard is tied to your connected wallet.
          </p>
          <Button onClick={() => void connect()} variant="primary" size="lg">
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  if (loading || connecting) {
    return (
      <div className="container py-16 animate-pulse space-y-4">
        <div className="h-8 w-48 bg-muted rounded" />
        <div className="h-96 bg-muted/40 rounded-2xl" />
      </div>
    );
  }

  if (error || !host) {
    return (
      <div className="container py-16">
        <div className="max-w-md mx-auto rounded-2xl border border-destructive/30 bg-destructive/5 p-6">
          <p className="font-display text-xl">Could not load dashboard</p>
          <p className="text-sm text-muted-foreground mt-1">{error}</p>
        </div>
      </div>
    );
  }

  const noAvailability = availability.length === 0;

  return (
    <div className="container py-10 md:py-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
        <div>
          <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
            / Host dashboard
          </p>
          <h1 className="font-display text-5xl tracking-tight">
            Welcome back, {host.name.split(" ")[0]}.
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[11px]">
            <LinkIcon className="h-3 w-3" />
            {profileUrl.replace(/^https?:\/\//, "")}
          </Badge>
          <Button size="sm" variant="outline" onClick={() => void copyLink()}>
            <Copy className="h-3.5 w-3.5" />
            {copied ? "Copied" : "Copy link"}
          </Button>
        </div>
      </div>

      {/* Empty availability CTA */}
      {noAvailability && (
        <div className="mb-8 rounded-2xl border border-primary/30 bg-primary/5 p-6 relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/20 blur-3xl"
          />
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 shrink-0 rounded-full bg-primary/20 text-primary grid place-items-center">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-display text-2xl tracking-tight">
                  Set your availability
                </p>
                <p className="text-sm text-muted-foreground mt-1 text-pretty">
                  Callers can&apos;t book you until you say when you&apos;re
                  free. Scroll down to add windows.
                </p>
              </div>
            </div>
            <Button variant="primary" size="sm" asChild>
              <a href="#availability">Get started →</a>
            </Button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-[320px_1fr] gap-12">
        {/* Side nav */}
        <aside className="lg:sticky lg:top-24 h-fit">
          <nav className="flex lg:flex-col gap-1 overflow-x-auto scrollbar-none">
            <SideLink href="#profile" label="Profile" />
            <SideLink href="#availability" label="Availability" />
            <SideLink href="#bookings" label="Bookings" />
            <Link
              href="/dashboard/sessions"
              className="px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors whitespace-nowrap inline-flex items-center gap-1"
            >
              Sessions <span className="text-[10px] text-primary">↗</span>
            </Link>
          </nav>

          <div className="hidden lg:block mt-10 rounded-2xl border border-border bg-card p-5 space-y-3">
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
              / At a glance
            </p>
            <Stat
              label="Upcoming"
              value={
                bookings.filter(
                  (b) =>
                    (b.status === "paid" ||
                      b.status === "active" ||
                      b.status === "pending_payment") &&
                    new Date(b.scheduledAt).getTime() >= Date.now(),
                ).length
              }
            />
            <Stat
              label="Completed"
              value={bookings.filter((b) => b.status === "completed").length}
            />
            <Stat
              label="Earned (USDC)"
              value={
                <span className="font-mono tabular">
                  {bookings
                    .filter((b) => b.status === "completed")
                    .reduce((sum, b) => sum + Number(b.amount) / 1_000_000, 0)
                    .toFixed(2)}
                </span>
              }
            />
          </div>
        </aside>

        {/* Sections */}
        <div className="space-y-16 min-w-0">
          <section id="profile" className="scroll-mt-24">
            <SectionHeader
              title="Profile"
              description="What callers see when they land on your booking page."
            />
            <div className="mt-6 rounded-2xl border border-border bg-card p-6 md:p-8 space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                  placeholder="you@example.com"
                  aria-invalid={!!emailError}
                />
                {emailError ? (
                  <p className="text-xs text-destructive">{emailError}</p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    We&apos;ll notify you here when someone books a call.
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bio">Bio</Label>
                <textarea
                  id="bio"
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                />
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="rate">Rate (USDC)</Label>
                  <Input
                    id="rate"
                    type="number"
                    step="0.5"
                    min="0"
                    value={rateUsdc}
                    onChange={(e) => setRateUsdc(e.target.value)}
                    className="font-mono tabular"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dur">Duration (min)</Label>
                  <Input
                    id="dur"
                    type="number"
                    step="5"
                    min="10"
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="font-mono tabular"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="tz">Timezone</Label>
                  <select
                    id="tz"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="flex h-10 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  onClick={() => void handleSaveProfile()}
                  disabled={savingProfile}
                >
                  <Save className="h-4 w-4" />
                  {savingProfile ? "Saving…" : "Save changes"}
                </Button>
              </div>
            </div>
          </section>

          <section id="availability" className="scroll-mt-24">
            <SectionHeader
              title="Availability"
              description="Weekly recurring hours when callers can book you."
              action={
                availabilityDirty && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => void handleSaveAvailability()}
                    disabled={savingAvailability}
                  >
                    <Save className="h-3.5 w-3.5" />
                    {savingAvailability ? "Saving…" : "Save availability"}
                  </Button>
                )
              }
            />
            <div className="mt-6">
              <AvailabilityEditor
                initial={availability}
                onChange={setAvailabilityState}
              />
            </div>
          </section>

          <section id="bookings" className="scroll-mt-24">
            <SectionHeader
              title="Bookings"
              description="Every caller on your calendar. Confirm completed calls to release funds."
              action={
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/bookings">Open full view →</Link>
                </Button>
              }
            />
            <div className="mt-6">
              <BookingsList
                bookings={bookings}
                hostWallet={walletAddress ?? ""}
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h2 className="font-display text-3xl tracking-tight">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1.5 max-w-md text-pretty">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

function SideLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      className="px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground hover:bg-accent transition-colors whitespace-nowrap"
    >
      {label}
    </a>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="font-display text-xl tracking-tight">{value}</span>
    </div>
  );
}
