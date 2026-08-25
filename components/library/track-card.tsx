"use client";

import Image from "next/image";
import { useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { TrackTagsPopover } from "@/components/library/track-tags-popover";
import type { TrackDto } from "@/lib/spotify/dto";

export function TrackCardContent({ track }: { track: TrackDto }) {
  return (
    <div className="flex items-center gap-3">
      {track.albumImage ? (
        <Image
          src={track.albumImage}
          alt={track.albumName}
          width={44}
          height={44}
          className="size-11 shrink-0 rounded-md object-cover"
          draggable={false}
        />
      ) : (
        <div className="size-11 shrink-0 rounded-md bg-muted" />
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm text-foreground">{track.name}</p>
        <p className="truncate text-xs text-muted-foreground">{track.artists}</p>
        <div className="mt-1">
          <TrackTagsPopover trackId={track.id} />
        </div>
      </div>
    </div>
  );
}

export function TrackCard({ track }: { track: TrackDto }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `track:${track.id}`,
    data: { type: "track", track },
  });

  return (
    <Card
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`cursor-grab touch-none p-3 active:cursor-grabbing ${isDragging ? "opacity-30" : ""}`}
    >
      <TrackCardContent track={track} />
    </Card>
  );
}
