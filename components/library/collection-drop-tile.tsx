"use client";

import { useDroppable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CollectionSummary } from "@/lib/collections/hooks";

export function CollectionDropTile({
  collection,
  isSelected,
  onSelect,
}: {
  collection: CollectionSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `collection:${collection.id}`,
    data: { type: "collection", collectionId: collection.id },
  });

  return (
    <Card
      ref={setNodeRef}
      onClick={onSelect}
      className={`cursor-pointer p-3 transition-colors hover:border-ring/40 hover:bg-muted/20 ${
        isOver ? "border-primary bg-primary/10" : isSelected ? "border-primary/50" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate text-sm font-medium text-foreground">{collection.name}</span>
          {collection.isSmart && (
            <Badge variant="secondary" className="shrink-0 text-[9px]">
              Smart
            </Badge>
          )}
        </span>
        <span className="shrink-0 font-mono text-[10px] text-muted-foreground">
          {collection.trackCount}
        </span>
      </div>
    </Card>
  );
}
