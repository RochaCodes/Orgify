"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAssignTag, useTags, useTrackTagsMap, useUnassignTag } from "@/lib/tags/hooks";

export function TrackTagsPopover({ trackId }: { trackId: string }) {
  const { data: tags } = useTags();
  const { map: trackTagsMap } = useTrackTagsMap();
  const assignTag = useAssignTag();
  const unassignTag = useUnassignTag();

  const assignedTagIds = new Set(trackTagsMap.get(trackId) ?? []);

  function toggle(tagId: string) {
    if (assignedTagIds.has(tagId)) {
      unassignTag.mutate({ trackId, tagId });
    } else {
      assignTag.mutate({ trackId, tagId });
    }
  }

  const assignedTags = (tags ?? []).filter((t) => assignedTagIds.has(t.id));

  return (
    <Popover>
      <PopoverTrigger className="flex flex-wrap items-center gap-1 text-left">
        {assignedTags.length > 0 ? (
          assignedTags.map((tag) => (
            <Badge key={tag.id} variant="secondary" className="text-[10px]">
              {tag.name}
            </Badge>
          ))
        ) : (
          <span className="font-mono text-[10px] text-muted-foreground">+ tag</span>
        )}
      </PopoverTrigger>
      <PopoverContent className="w-48 p-2" align="start">
        {!tags || tags.length === 0 ? (
          <p className="p-2 text-xs text-muted-foreground">
            No tags yet. Create one in the collections panel.
          </p>
        ) : (
          <div className="flex flex-col gap-1">
            {tags.map((tag) => (
              <Button
                key={tag.id}
                type="button"
                variant={assignedTagIds.has(tag.id) ? "secondary" : "ghost"}
                size="sm"
                className="justify-start"
                onClick={() => toggle(tag.id)}
              >
                {tag.name}
              </Button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
