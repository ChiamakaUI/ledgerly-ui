"use client";

import * as React from "react";
import { useParams } from "next/navigation";
import type { PublicHost, Slot } from "@/types";
import { getHost, getSlots, toDateKey } from "@/lib";
import { HostProfile, DatePicker, SlotGrid, BookingPanel } from "@/components";

export default function BookHostPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const [host, setHost] = React.useState<PublicHost | null>(null);
  const [slots, setSlots] = React.useState<Slot[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => {
    const d = new Date();
    d.setUTCHours(0, 0, 0, 0);
    return d;
  });
  const [selectedSlot, setSelectedSlot] = React.useState<Slot | null>(null);

  // Load host.
  React.useEffect(() => {
    let cancelled = false;
    void (async () => {
      const h = await getHost(slug);
      if (!cancelled) setHost(h);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  // Load slots whenever the date changes.
  React.useEffect(() => {
    let cancelled = false;
    setSlotsLoading(true);
    setSelectedSlot(null);
    void (async () => {
      const s = await getSlots(slug, toDateKey(selectedDate));
      if (!cancelled) {
        setSlots(s);
        setSlotsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug, selectedDate]);

  // On mobile, when a slot is picked scroll the booking panel into view so it's obvious.
  const panelRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (selectedSlot && typeof window !== "undefined" && window.innerWidth < 768) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [selectedSlot]);

  return (
    <div className="container py-10 md:py-16">
      <div className="grid lg:grid-cols-[1fr_420px] gap-8 lg:gap-12">
        {/* LEFT — profile + picker */}
        <div className="space-y-10">
          {host ? (
            <HostProfile host={host} />
          ) : (
            <div className="animate-pulse flex gap-6">
              <div className="h-20 w-20 rounded-2xl bg-muted" />
              <div className="flex-1 space-y-3">
                <div className="h-10 w-48 bg-muted rounded-lg" />
                <div className="h-4 w-full max-w-md bg-muted/60 rounded" />
                <div className="h-4 w-3/4 max-w-sm bg-muted/60 rounded" />
              </div>
            </div>
          )}

          <div className="hairline" />

          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl tracking-tight">
                Pick a date
              </h2>
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                next 14 days
              </span>
            </div>
            <DatePicker
              selected={selectedDate}
              onSelect={setSelectedDate}
              timezone={host?.timezone}
            />
          </section>

          <section className="space-y-4">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl tracking-tight">
                Pick a time
              </h2>
              <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                {host?.durationMinutes ?? 30} min slots
              </span>
            </div>
            <SlotGrid
              slots={slots}
              selected={selectedSlot}
              onSelect={setSelectedSlot}
              timezone={host?.timezone}
              loading={slotsLoading}
            />
          </section>
        </div>

        {/* RIGHT — booking panel */}
        <div className="lg:sticky lg:top-24 h-fit" ref={panelRef}>
          {host && selectedSlot ? (
            <BookingPanel
              host={host}
              slot={selectedSlot}
            />
          ) : (
            <EmptyPanel />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyPanel() {
  return (
    <div className="hidden lg:block rounded-2xl border border-dashed border-border bg-card/40 p-8 text-center min-h-[420px] flex-col justify-center">
      <div className="mx-auto h-12 w-12 rounded-full bg-muted grid place-items-center mb-4">
        <div className="h-3 w-3 rounded-full bg-muted-foreground/40" />
      </div>
      <p className="font-display text-xl tracking-tight mb-2">
        Pick a time to begin
      </p>
      <p className="text-sm text-muted-foreground">
        Your booking summary will appear here.
      </p>
    </div>
  );
}
