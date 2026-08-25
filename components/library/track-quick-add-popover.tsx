"use client";

import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAssignTag, useTags, useTrackTagsMap, useUnassignTag } from "@/lib/tags/hooks";
import { useAddTrackToCollection, useCollections } from "@/lib/collections/hooks";
import type { TrackDto } from "@/lib/spotify/dto";

/**
 * Single click-to-open popover for a track: add it to a collection and/or toggle tags on it,
 * as a faster alternative to dragging it onto a collection tile one at a time.
 */
export function TrackQuickAddPopover({ track }: { track: TrackDto }) {
  const { data: tags } = useTags();
  const { map: trackTagsMap } = useTrackTagsMap();
  const assignTag = useAssignTag();
  const unassignTag = useUnassignTag();
  const { data: collections } = useCollections();
  const addToCollection = useAddTrackToCollection();

  const assignedTagIds = new Set(trackTagsMap.get(track.id) ?? []);
  const assignedTags = (tags ?? []).filter((t) => assignedTagIds.has(t.id));

  function toggleTag(tagId: string) {
    if (assignedTagIds.has(tagId)) {
      unassignTag.mutate({ trackId: track.id, tagId });
    } else {
      assignTag.mutate({ trackId: track.id, tagId });
    }
  }

  return (
    <Popover>
      <PopoverTrigger
        className="flex flex-wrap items-center gap-1 rounded text-left transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        onClick={(e) => e.stopPropagation()}
      >
        {assignedTags.length > 0 ? (
          assignedTags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="text-[10px]">
              {tag.name}
            </Badge>
          ))
        ) : (
          <span className="font-mono text-[10px] text-muted-foreground transition-colors hover:text-foreground">
            + add
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3" align="start">
        <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
          Add to collection
        </p>
        <div className="mb-3 flex flex-col gap-0.5">
          {!collections || collections.length === 0 ? (
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
        {!tags || tags.length === 0 ? (
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
                  assignedTagIds.has(tag.id)
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
