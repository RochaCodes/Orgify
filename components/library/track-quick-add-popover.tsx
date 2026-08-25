"use client";

import type { ReactElement, ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAssignTag, useUnassignTag, type Tag } from "@/lib/tags/hooks";
import { useAddTrackToCollection, type CollectionSummary } from "@/lib/collections/hooks";
import type { TrackDto } from "@/lib/spotify/dto";

/**
 * Everything the popover reads. One popover is mounted per visible track row, so the queries behind
 * this live in the track list instead: subscribing every row to them re-derived the same track-tag
 * map dozens of times per render.
 */
export interface TrackQuickAddData {
  collections: CollectionSummary[];
  tags: Tag[];
  /** Ids of the tags already on this track. */
  assignedTagIds: string[];
}

/**
 * Single click-to-open popover for a track: add it to a collection and/or toggle tags on it,
 * as a faster alternative to dragging it onto a collection tile one at a time. `trigger` is the
 * whole track row, so clicking anywhere on a track opens it; rendering it through Base UI's
 * `render` prop (rather than syncing an `open` state) is what lets a second click on the row close
 * the popover instead of the outside-press dismissal and the click fighting each other.
 */
export function TrackQuickAddPopover({
  track,
  collections,
  tags,
  assignedTagIds,
  trigger,
  children,
}: TrackQuickAddData & {
  track: TrackDto;
  trigger: ReactElement;
  children: ReactNode;
}) {
  const assignTag = useAssignTag();
  const unassignTag = useUnassignTag();
  const addToCollection = useAddTrackToCollection();

  const assigned = new Set(assignedTagIds);

  function toggleTag(tagId: string) {
    if (assigned.has(tagId)) {
      unassignTag.mutate({ trackId: track.id, tagId });
    } else {
      assignTag.mutate({ trackId: track.id, tagId });
    }
  }

  return (
    <Popover>
      <PopoverTrigger nativeButton={false} render={trigger}>
        {children}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Add to collection
        </p>
        <div className="mb-3 flex flex-col gap-0.5">
          {collections.length === 0 ? (
            <p className="px-1 py-1 text-xs text-muted-foreground">No collections yet.</p>
          ) : (
            collections.map((c) => (
              <button
                key={c.id}
                type="button"
                disabled={c.isSmart || addToCollection.isPending}
                onClick={() => addToCollection.mutate({ collectionId: c.id, track })}
                className="flex items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  {c.name}
                  {c.isSmart && (
                    <Badge variant="secondary" className="shrink-0 text-[9px]">
                      Smart
                    </Badge>
                  )}
                </span>
                <span className="shrink-0 text-muted-foreground">+</span>
              </button>
            ))
          )}
        </div>

        <div className="mb-3 h-px bg-border" />

        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Tags</p>
        {tags.length === 0 ? (
          <p className="px-1 py-1 text-xs text-muted-foreground">
            No tags yet. Create one in the collections panel.
          </p>
        ) : (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`rounded-full border px-2 py-0.5 text-xs transition-colors ${
                  assigned.has(tag.id)
                    ? "border-transparent bg-secondary text-secondary-foreground"
                    : "border-border text-muted-foreground hover:border-ring/50 hover:text-foreground"
                }`}
              >
                {tag.name}
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
