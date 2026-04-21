"use client";

import { useRouter } from "next/navigation";
import {
  useStreamRoom,
  BaseCallControls,
  MicrophoneControl,
  CameraControl,
  ScreenShareControl,
  SDKTrackSource,
  type SDKParticipant,
  type SDKTrackReference,
  type CallControlsRenderProps,
} from "@vidbloq/react";
import { VideoTile } from "./video-tile";

export function InCall() {
  const router = useRouter();
  const room = useStreamRoom({
    enableSpeakerEvents: true,
    autoPromoteActiveSpeakers: true,
  });

  const participants = room.participants.all;

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Video grid */}
      <div className="flex-1 p-4 min-h-0">
        <VideoGrid
          participants={participants}
          getCameraTrack={(p) => getCameraTrack(room, p.identity)}
          activeSpeaker={room.participants.currentActiveSpeaker}
          isSpeaking={(id) => room.isParticipantSpeaking(id)}
          localIdentity={room.participants.local?.identity}
        />
      </div>

      {/* Controls */}
      <div className="border-t border-border bg-card">
        <BaseCallControls
          features={{
            media: true,
            recording: false,
            handRaise: false,
            guestRequests: false,
            screenShare: true,
            disconnect: true,
          }}
          onDisconnect={() => router.push("/")}
          render={(props: CallControlsRenderProps) => (
            <ControlBar props={props} />
          )}
        />
      </div>
    </div>
  );
}

function VideoGrid({
  participants,
  getCameraTrack,
  activeSpeaker,
  isSpeaking,
  localIdentity,
}: {
  participants: SDKParticipant[];
  getCameraTrack: (p: SDKParticipant) => SDKTrackReference | null;
  activeSpeaker?: string;
  isSpeaking: (id: string) => boolean;
  localIdentity?: string;
}) {
  if (participants.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        Waiting for the other participant…
      </div>
    );
  }

  // 1 participant = full screen. 2+ = split.
  const gridClass =
    participants.length === 1
      ? "grid grid-cols-1 gap-3 h-full"
      : "grid grid-cols-1 md:grid-cols-2 gap-3 h-full";

  return (
    <div className={gridClass}>
      {participants.map((p) => {
        const track = getCameraTrack(p);
        return (
          <div key={p.identity} className="h-full min-h-0">
            <VideoTile
              participant={p}
              track={track}
              isActive={activeSpeaker === p.identity}
              isSpeaking={isSpeaking(p.identity)}
              isLocal={p.identity === localIdentity}
            />
          </div>
        );
      })}
    </div>
  );
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

function ControlBar({ props }: { props: CallControlsRenderProps }) {
  const {
    canAccessMediaControls,
    toggleMic,
    toggleCamera,
    toggleScreenShare,
    handleDisconnectClick,
    displayName,
    participantCount,
  } = props;

  return (
    <div className="px-4 py-3 flex items-center justify-between">
      <div className="hidden md:block text-xs text-muted-foreground">
        {participantCount} {participantCount === 1 ? "person" : "people"} in call
      </div>

      <div className="flex items-center gap-2 mx-auto md:mx-0">
        <div className="flex items-center gap-2 bg-secondary/50 rounded-full p-1">
          {canAccessMediaControls && toggleMic && (
            <MicrophoneControl showLabel={false} />
          )}
          {canAccessMediaControls && toggleCamera && (
            <CameraControl showLabel={false} />
          )}
          {canAccessMediaControls && toggleScreenShare && (
            <div className="hidden md:block">
              <ScreenShareControl showLabel={false} />
            </div>
          )}
        </div>

        {handleDisconnectClick && (
          <button
            onClick={handleDisconnectClick}
            className="inline-flex items-center gap-2 rounded-full bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 transition-colors"
          >
            <PhoneOffIcon />
            <span className="hidden md:inline">End call</span>
          </button>
        )}
      </div>

      <div className="hidden md:block text-xs text-muted-foreground">
        {displayName}
      </div>
    </div>
  );
}

function PhoneOffIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91" />
      <line x1="23" y1="1" x2="1" y2="23" />
    </svg>
  );
}