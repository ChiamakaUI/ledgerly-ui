"use client";

export const dynamic = "force-dynamic";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import type { AvailabilityRule } from "@/types";
import { Button } from "@/components/ui/button";
import { getHostMe, setAvailability as saveAvailabilityApi } from "@/lib/api";
import { ApiError } from "@/lib/http";
import { useWallet } from "@/lib/wallet";
import { useToast } from "@/components/ui/toast";
import { AvailabilityEditor } from "@/components/host/availability-editor";

export default function AvailabilityPage() {
  const router = useRouter();
  const { address: walletAddress, connected, connecting, connect } = useWallet();
  const { show } = useToast();

  const [initial, setInitial] = React.useState<AvailabilityRule[] | null>(null);
  const [availability, setAvailability] = React.useState<AvailabilityRule[]>(
    [],
  );
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Load the host's current availability. Redirect to /setup if not a host.
  React.useEffect(() => {
    if (connecting) return;
    if (!connected || !walletAddress) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const data = await getHostMe(walletAddress);
        if (cancelled) return;
        setInitial(data.availability);
        setAvailability(data.availability);
      } catch (e) {
        if (cancelled) return;
        if (e instanceof ApiError && e.status === 404) {
          router.replace("/dashboard/setup");
          return;
        }
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connected, connecting, walletAddress, router]);

  const handleSave = async () => {
    if (!walletAddress) return;
    setSaving(true);
    setError(null);
    try {
      await saveAvailabilityApi(walletAddress, { rules: availability });
      setSavedAt(new Date());
      setInitial(availability);
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
      const msg = e instanceof Error ? e.message : "Save failed";
      setError(msg);
      show({
        kind: "error",
        title: "Could not save availability",
        description: msg,
      });
    } finally {
      setSaving(false);
    }
  };

  // Not signed in — gate the page
  if (!connected && !connecting) {
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
            / Availability
          </p>
          <h1 className="font-display text-3xl tracking-tight">
            Sign in to continue
          </h1>
          <p className="text-sm text-muted-foreground">
            Your availability is tied to your connected wallet.
          </p>
          <Button onClick={() => void connect()} variant="primary" size="lg">
            Sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-10 md:py-16">
      <div className="max-w-3xl mx-auto">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to dashboard
        </Link>

        <div className="flex items-end justify-between gap-4 flex-wrap mb-10">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
              / Schedule
            </p>
            <h1 className="font-display text-4xl md:text-5xl tracking-tight">
              Availability
            </h1>
            <p className="text-muted-foreground mt-2 max-w-md text-pretty">
              Set the recurring windows when callers can book time with you.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {savedAt && (
              <span className="text-xs font-mono text-muted-foreground">
                saved {savedAt.toLocaleTimeString()}
              </span>
            )}
            <Button
              variant="primary"
              onClick={() => void handleSave()}
              disabled={saving || loading || !connected}
            >
              <Save className="h-4 w-4" />
              {saving ? "Saving…" : "Save schedule"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {loading || connecting ? (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/40" />
            ))}
          </div>
        ) : initial ? (
          <AvailabilityEditor initial={initial} onChange={setAvailability} />
        ) : null}

        <details className="mt-8 rounded-xl border border-dashed border-border p-4">
          <summary className="text-xs font-mono uppercase tracking-widest text-muted-foreground cursor-pointer">
            preview / api payload
          </summary>
          <pre className="mt-3 text-xs font-mono text-muted-foreground overflow-x-auto">
{JSON.stringify({ rules: availability }, null, 2)}
          </pre>
        </details>
      </div>
    </div>
  );
}