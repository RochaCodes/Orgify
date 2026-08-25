"use client";

import Image from "next/image";
import { useDraggable } from "@dnd-kit/core";
import { Badge } from "@/components/ui/badge";
import {
  TrackQuickAddPopover,
  type TrackQuickAddData,
} from "@/components/library/track-quick-add-popover";
import { formatDuration } from "@/lib/format";
import type { Tag } from "@/lib/tags/hooks";
import type { TrackDto } from "@/lib/spotify/dto";

export function TrackCardContent({
  track,
  assignedTags,
  interactive = true,
}: {
  track: TrackDto;
  assignedTags?: Tag[];
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
      {interactive && (
        <span className="flex flex-wrap items-center gap-1">
          {assignedTags && assignedTags.length > 0 ? (
            assignedTags.map((tag) => (
              <Badge key={tag.id} variant="secondary" className="text-[10px]">
                {tag.name}
              </Badge>
            ))
          ) : (
            <span className="font-mono text-[10px] text-muted-foreground">+ add</span>
          )}
        </span>
      )}
      <div className="flex-1" />
      <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
        {formatDuration(track.durationMs)}
      </span>
    </div>
  );
}

export function TrackCard({
  track,
  quickAdd,
  selectable = false,
  selected = false,
  onToggleSelect,
}: {
  track: TrackDto;
  quickAdd: TrackQuickAddData;
  selectable?: boolean;
  selected?: boolean;
  onToggleSelect?: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `track:${track.id}`,
    data: { type: "track", track },
    disabled: selectable,
  });

  const rowClassName = `flex touch-none items-center gap-3 border-b border-border/60 px-3 py-2 text-left outline-none transition-colors last:border-b-0 hover:bg-muted/30 focus-visible:ring-3 focus-visible:ring-inset focus-visible:ring-ring/50 ${
    selectable ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"
  } ${isDragging ? "opacity-30" : ""} ${selected ? "bg-primary/10" : ""}`;

  if (selectable) {
    return (
      <div ref={setNodeRef} onClick={onToggleSelect} className={rowClassName}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          onClick={(e) => e.stopPropagation()}
          className="size-4 shrink-0 rounded border border-input accent-primary"
          aria-label={`Select ${track.name}`}
        />
        <TrackCardContent track={track} interactive={false} />
      </div>
    );
  }

  // The row doubles as the quick-add trigger, which Base UI makes focusable and Enter/Space
  // activatable. A drag never opens it: once PointerSensor's 8px constraint is met dnd-kit
  // swallows the click that follows the drop.
  return (
    <TrackQuickAddPopover
      track={track}
      {...quickAdd}
      trigger={<div ref={setNodeRef} className={rowClassName} {...listeners} {...attributes} />}
    >
      <TrackCardContent
        track={track}
        assignedTags={quickAdd.tags.filter((tag) => quickAdd.assignedTagIds.includes(tag.id))}
      />
    </TrackQuickAddPopover>
  );
}
