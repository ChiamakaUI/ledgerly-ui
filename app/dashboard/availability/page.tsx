"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowLeft, Save } from "lucide-react";
import type { AvailabilityRule } from "@/types";
import { Button } from "@/components/ui/button";
import { getHostWithAvailability, setAvailability as saveAvailabilityApi } from "@/lib/api";
import { useWallet } from "@/lib/wallet";
import { AvailabilityEditor } from "@/components/host/availability-editor";

// TODO (Chunk 2): derive this from the connected host's own slug.
const DEMO_HOST_SLUG = "emmy-test";

export default function AvailabilityPage() {
  const { address: walletAddress, connected } = useWallet();
  const [initial, setInitial] = React.useState<AvailabilityRule[] | null>(null);
  const [availability, setAvailability] = React.useState<AvailabilityRule[]>(
    [],
  );
  const [saving, setSaving] = React.useState(false);
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const data = await getHostWithAvailability(DEMO_HOST_SLUG);
        if (!cancelled) {
          setInitial(data.availability);
          setAvailability(data.availability);
        }
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSave = async () => {
    if (!walletAddress) return;
    setSaving(true);
    setError(null);
    try {
      await saveAvailabilityApi(walletAddress, { rules: availability });
      setSavedAt(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

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
              disabled={saving || !connected}
              title={connected ? undefined : "Connect wallet to save"}
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

        {initial ? (
          <AvailabilityEditor initial={initial} onChange={setAvailability} />
        ) : (
          <div className="space-y-2 animate-pulse">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl bg-muted/40" />
            ))}
          </div>
        )}

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