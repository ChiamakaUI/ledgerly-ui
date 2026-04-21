"use client";

import {
  VideoTrack,
  AudioTrack,
  type SDKParticipant,
  type SDKTrackReference,
} from "@vidbloq/react";

type VideoTileProps = {
  participant: SDKParticipant;
  track: SDKTrackReference | null;
  isActive: boolean;
  isSpeaking: boolean;
  isLocal: boolean;
};

export function VideoTile({
  participant,
  track,
  isActive,
  isSpeaking,
  isLocal,
}: VideoTileProps) {
  const metadata = parseMetadata(participant.metadata);
  const displayName = metadata.userName || participant.identity;
  const initials = getInitials(displayName);

  const isCameraOn = track?.publication
    ? !track.publication.isMuted
    : false;

  return (
    <div
      className={`relative h-full w-full rounded-lg overflow-hidden bg-black border transition-all ${
        isActive
          ? "border-primary ring-2 ring-primary/40"
          : isSpeaking
            ? "border-primary/60"
            : "border-border"
      }`}
    >
      {isCameraOn && track ? (
        <VideoTrack trackRef={track} className="w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-20 w-20 rounded-full bg-primary/20 text-primary flex items-center justify-center text-2xl font-serif">
            {initials}
          </div>
        </div>
      )}

      {track && (track.publication?.track || track.track) && (
        <AudioTrack trackRef={track} />
      )}

      {/* Name label */}
      <div className="absolute bottom-3 left-3 bg-black/60 backdrop-blur rounded-md px-2 py-1 flex items-center gap-2">
        <span className="text-xs text-white">
          {displayName}
          {isLocal && <span className="text-white/60"> (you)</span>}
        </span>
      </div>
    </div>
  );
}

function parseMetadata(metadata?: string): { userName?: string; avatarUrl?: string } {
  if (!metadata) return {};
  try {
    return JSON.parse(metadata);
  } catch {
    return {};
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