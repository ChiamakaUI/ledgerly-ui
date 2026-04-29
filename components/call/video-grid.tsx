"use client";

import { useState, useEffect, useMemo } from "react";
import {
  type SDKParticipant,
  type SDKTrackReference,
  SDKTrackSource,
  useStreamRoom,
} from "@vidbloq/react";
import { Users } from "lucide-react";
import { VideoTile } from "./video-tile";
import { cn } from "@/lib";

type VideoGridProps = {
  /**
   * Max visible tiles before overflow kicks in.
   * Defaults: 6 on desktop, 4 on mobile (handled internally).
   */
  desktopMax?: number;
  mobileMax?: number;
};

/**
 * Smart video grid for 1-N participants.
 *
 * Layout rules:
 *  - 1 participant: full-screen tile
 *  - 2 participants: side-by-side (or stacked on mobile)
 *  - 3-4 participants: 2x2 grid
 *  - 5-6 participants: 2x3 grid (desktop) / 2x2 + overflow (mobile)
 *  - 7+ participants: max grid + overflow tile
 *
 * Speaker promotion:
 *  - Host is always pinned in the visible set
 *  - Remaining slots prioritize the active speaker, then recent speakers
 *  - Stable order otherwise (no flicker on every render)
 */
export function VideoGrid({
  desktopMax = 6,
  mobileMax = 4,
}: VideoGridProps) {
  const room = useStreamRoom({
    enableSpeakerEvents: true,
    autoPromoteActiveSpeakers: true,
  });

  const [isMobile, setIsMobile] = useState(false);

  // Detect viewport size for max-tiles decision.
  useEffect(() => {
    const update = () => setIsMobile(window.innerWidth < 768);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const maxVisible = isMobile ? mobileMax : desktopMax;

  // Build the visible tile set: host always in, then active/recent speakers,
  // then everyone else in stable order.
  const { visible, overflow } = useMemo(
    () => selectVisibleParticipants(room, maxVisible),
    [room, maxVisible],
  );

  // Empty state.
  if (visible.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Waiting for the other participant…
      </div>
    );
  }

  const totalTiles = visible.length + (overflow.length > 0 ? 1 : 0);
  const layoutClass = getLayoutClass(totalTiles, isMobile);

  return (
    <div className={cn("h-full min-h-0", layoutClass)}>
      {visible.map((participant) => {
        const track = getCameraTrack(room, participant.identity);
        const isActive =
          participant.identity === room.participants.currentActiveSpeaker;
        const isSpeaking = room.isParticipantSpeaking(participant.identity);
        const isLocal =
          participant.identity === room.participants.local?.identity;
        return (
          <div key={participant.identity} className="min-h-0 min-w-0">
            <VideoTile
              participant={participant}
              track={track}
              isActive={isActive}
              isSpeaking={isSpeaking}
              isLocal={isLocal}
            />
          </div>
        );
      })}
      {overflow.length > 0 && (
        <OverflowTile participants={overflow} />
      )}
    </div>
  );
}

function selectVisibleParticipants(
  room: ReturnType<typeof useStreamRoom>,
  maxVisible: number,
): { visible: SDKParticipant[]; overflow: SDKParticipant[] } {
  const all = room.participants.all;

  if (all.length <= maxVisible) {
    return { visible: all, overflow: [] };
  }

  const visibleSet = new Set<string>();
  const ordered: SDKParticipant[] = [];

  // 1. Host always shown first
  if (room.participants.host) {
    visibleSet.add(room.participants.host.identity);
    ordered.push(room.participants.host);
  }

  // 2. Local participant always shown
  if (
    room.participants.local &&
    !visibleSet.has(room.participants.local.identity)
  ) {
    visibleSet.add(room.participants.local.identity);
    ordered.push(room.participants.local);
  }

  // 3. Current active speaker
  const activeId = room.participants.currentActiveSpeaker;
  if (activeId && !visibleSet.has(activeId)) {
    const p = all.find((x) => x.identity === activeId);
    if (p) {
      visibleSet.add(p.identity);
      ordered.push(p);
    }
  }

  // 4. Recent speakers, most-recent first
  const recents = Array.from(room.participants.recentSpeakers.entries())
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => id);
  for (const id of recents) {
    if (visibleSet.size >= maxVisible) break;
    if (visibleSet.has(id)) continue;
    const p = all.find((x) => x.identity === id);
    if (p) {
      visibleSet.add(p.identity);
      ordered.push(p);
    }
  }

  // 5. Fill remaining slots with everyone else, stable order
  for (const p of all) {
    if (visibleSet.size >= maxVisible) break;
    if (visibleSet.has(p.identity)) continue;
    visibleSet.add(p.identity);
    ordered.push(p);
  }

  const overflow = all.filter((p) => !visibleSet.has(p.identity));
  return { visible: ordered, overflow };
}

function getCameraTrack(
  room: ReturnType<typeof useStreamRoom>,
  identity: string,
): SDKTrackReference | null {
  const tracks = room.getParticipantTracks(identity);
  return (
    tracks.find(
      (t) => t.source === SDKTrackSource.Camera || t.source === "camera",
    ) ?? null
  );
}

function getLayoutClass(totalTiles: number, isMobile: boolean): string {
  // Mobile layouts
  if (isMobile) {
    if (totalTiles === 1) return "grid grid-cols-1 gap-2 p-2";
    if (totalTiles === 2) return "grid grid-cols-1 grid-rows-2 gap-2 p-2";
    if (totalTiles <= 4) return "grid grid-cols-2 grid-rows-2 gap-2 p-2";
    return "grid grid-cols-2 grid-rows-2 gap-2 p-2";
  }

  // Desktop layouts
  if (totalTiles === 1) return "grid grid-cols-1 gap-3 p-3";
  if (totalTiles === 2) return "grid grid-cols-2 gap-3 p-3";
  if (totalTiles <= 4) return "grid grid-cols-2 grid-rows-2 gap-3 p-3";
  if (totalTiles <= 6) return "grid grid-cols-3 grid-rows-2 gap-3 p-3";
  // 7+ shouldn't happen given maxVisible=6, but defensive default
  return "grid grid-cols-3 grid-rows-3 gap-3 p-3";
}

function OverflowTile({ participants }: { participants: SDKParticipant[] }) {
  const count = participants.length;
  const previewCount = Math.min(4, count);
  const initialsList = participants
    .slice(0, previewCount)
    .map((p) => getInitials(parseUserName(p)));

  return (
    <div className="h-full min-h-0 min-w-0 rounded-lg bg-card border border-border flex flex-col items-center justify-center gap-3 p-4">
      <div className="flex -space-x-2">
        {initialsList.map((initials, i) => (
          <div
            key={i}
            className="h-10 w-10 rounded-full bg-primary/20 text-primary border-2 border-card flex items-center justify-center text-xs font-display"
            style={{ zIndex: previewCount - i }}
          >
            {initials}
          </div>
        ))}
      </div>
      <div className="text-center">
        <div className="text-sm font-medium">+{count} more</div>
        <div className="text-xs text-muted-foreground inline-flex items-center gap-1 mt-0.5">
          <Users className="h-3 w-3" />
          in this call
        </div>
      </div>
    </div>
  );
}

function parseUserName(participant: SDKParticipant): string {
  if (!participant.metadata) return participant.identity;
  try {
    const meta = JSON.parse(participant.metadata);
    return meta.userName || participant.identity;
  } catch {
    return participant.identity;
  }
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}