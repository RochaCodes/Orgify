"use client";

import Image from "next/image";
import { useDraggable } from "@dnd-kit/core";
import { TrackQuickAddPopover } from "@/components/library/track-quick-add-popover";
import { formatDuration } from "@/lib/format";
import type { TrackDto } from "@/lib/spotify/dto";

export function TrackCardContent({
  track,
  interactive = true,
}: {
  track: TrackDto;
  interactive?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-3">
      {track.albumImage ? (
        <Image
          src={track.albumImage}
          alt={track.albumName}
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-md object-cover"
          draggable={false}
        />
      ) : (
        <div className="size-10 shrink-0 rounded-md bg-muted" />
      )}
      <div className="w-56 min-w-0 shrink-0">
        <p className="truncate text-sm text-foreground">{track.name}</p>
        <p className="truncate text-xs text-muted-foreground">{track.artists}</p>
      </div>
      {interactive && <TrackQuickAddPopover track={track} />}
      <div className="flex-1" />
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
        {formatDuration(track.durationMs)}
      </span>
    </div>
  );
}

export function TrackCard({
  track,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  track: TrackDto;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `track:${track.id}`,
    data: { type: "track", track },
    disabled: selectable,
  });

  return (
    <div
      ref={setNodeRef}
      {...(selectable ? {} : { ...listeners, ...attributes })}
      onClick={selectable ? onToggleSelect : undefined}
      className={`flex touch-none items-center gap-3 border-b border-border/60 px-3 py-2 transition-colors last:border-b-0 hover:bg-muted/30 ${
        selectable ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
      } ${isDragging ? "opacity-30" : ""} ${selected ? "bg-primary/10" : ""}`}
    >
      {selectable && (
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="size-4 shrink-0 rounded border border-input accent-primary"
          aria-label={`Select ${track.name}`}
        />
      )}
      <TrackCardContent track={track} interactive={!selectable} />
    </div>
  );
}
