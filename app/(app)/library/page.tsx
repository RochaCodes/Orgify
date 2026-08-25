"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { TrackCard, TrackCardContent } from "@/components/library/track-card";
import { PlaylistCard } from "@/components/library/playlist-card";
import { CollectionsPanel } from "@/components/library/collections-panel";
import { usePlaylists } from "@/lib/spotify/hooks";
import { useAddTrackToCollection, useAddPlaylistToCollection, useCollections } from "@/lib/collections/hooks";
import {
  useLikedTracks,
  useSyncLikedTracks,
  useBulkAddToCollection,
  useBulkAssignTag,
} from "@/lib/library/hooks";
import { useTags } from "@/lib/tags/hooks";
import { formatSyncedAt } from "@/lib/format";
import type { TrackDto } from "@/lib/spotify/dto";

const PAGE_SIZE = 30;

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

function LibraryTracksTab() {
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 300);
  const { data, isLoading, isError, error } = useLikedTracks(offset, PAGE_SIZE, debouncedSearch);
  const syncLikedTracks = useSyncLikedTracks();

  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { data: collections } = useCollections();
  const { data: tags } = useTags();
  const bulkAddToCollection = useBulkAddToCollection();
  const bulkAssignTag = useBulkAssignTag();

  // Reset pagination when the search term changes, without an extra render pass.
  const [prevSearch, setPrevSearch] = useState(debouncedSearch);
  if (debouncedSearch !== prevSearch) {
    setPrevSearch(debouncedSearch);
    setOffset(0);
  }

  function toggleSelected(trackId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(trackId)) next.delete(trackId);
      else next.add(trackId);
      return next;
    });
  }

  function exitSelectMode() {
    setSelectMode(false);
    setSelectedIds(new Set());
  }

  const isFirstRunEmpty = !data?.syncedAt && !debouncedSearch && data?.total === 0;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search liked songs…"
          className="h-8 max-w-xs text-sm"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={syncLikedTracks.isPending}
          onClick={() => syncLikedTracks.mutate()}
        >
          {syncLikedTracks.isPending ? "Syncing…" : data?.syncedAt ? "Sync" : "Sync now"}
        </Button>
        {data?.syncedAt && (
          <span className="text-[10px] text-muted-foreground">
            Last synced {formatSyncedAt(data.syncedAt)}
          </span>
        )}
        <Button
          type="button"
          variant={selectMode ? "secondary" : "ghost"}
          size="sm"
          className="ml-auto"
          onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}
        >
          {selectMode ? "Cancel" : "Select"}
        </Button>
      </div>

      {isError && <p className="text-sm text-destructive">{(error as Error).message}</p>}
      {syncLikedTracks.isError && (
        <p className="text-sm text-destructive">{(syncLikedTracks.error as Error).message}</p>
      )}

      {selectMode && selectedIds.size > 0 && (
        <Card className="flex flex-wrap items-center gap-2 p-2">
          <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
          <select
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm transition-colors hover:border-ring/50 focus-visible:border-ring focus-visible:outline-none"
            defaultValue=""
            disabled={bulkAddToCollection.isPending}
            onChange={(e) => {
              const collectionId = e.target.value;
              if (!collectionId) return;
              bulkAddToCollection.mutate({ collectionId, trackIds: Array.from(selectedIds) });
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Add to collection…
            </option>
            {collections
              ?.filter((c) => !c.isSmart)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
          <select
            className="h-8 rounded-md border border-input bg-transparent px-2 text-sm transition-colors hover:border-ring/50 focus-visible:border-ring focus-visible:outline-none"
            defaultValue=""
            disabled={bulkAssignTag.isPending}
            onChange={(e) => {
              const tagId = e.target.value;
              if (!tagId) return;
              bulkAssignTag.mutate({ tagId, trackIds: Array.from(selectedIds) });
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Add tag…
            </option>
            {tags?.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </Card>
      )}

      {isFirstRunEmpty ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Sync your liked songs to search and organize them.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          {isLoading &&
            Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-14 w-full rounded-none border-b border-border/60 last:border-b-0" />
            ))}
          {data?.items.length === 0 && !isLoading && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No liked songs match &ldquo;{debouncedSearch}&rdquo;.
            </p>
          )}
          {data?.items.map((item) => (
            <TrackCard
              key={item.track.id}
              track={item.track}
              selectable={selectMode}
              selected={selectedIds.has(item.track.id)}
              onToggleSelect={() => toggleSelected(item.track.id)}
            />
          ))}
        </div>
      )}

      {data && (data.hasMore || offset > 0) && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!data.hasMore}
            onClick={() => setOffset((o) => o + PAGE_SIZE)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

function LibraryPlaylistsTab() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, error } = usePlaylists(offset, 20);
  const { data: collections } = useCollections();
  const addPlaylist = useAddPlaylistToCollection();

  return (
    <div className="flex flex-col gap-3">
      {isError && (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      )}
      <div className="flex flex-col gap-2">
        {isLoading &&
          Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        {data?.items.map((playlist) => (
          <PlaylistCard
            key={playlist.id}
            playlist={playlist}
            collections={collections ?? []}
            onAddToCollection={(collectionId) =>
              addPlaylist.mutate({ collectionId, spotifyPlaylistId: playlist.id })
            }
          />
        ))}
      </div>
      {data && (data.hasMore || offset > 0) && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={offset === 0}
            onClick={() => setOffset((o) => Math.max(0, o - 20))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!data.hasMore}
            onClick={() => setOffset((o) => o + 20)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

export default function LibraryPage() {
  const [selectedCollectionId, setSelectedCollectionId] = useState<string | null>(null);
  const [draggedTrack, setDraggedTrack] = useState<TrackDto | null>(null);
  const addTrackToCollection = useAddTrackToCollection();
  const { data: collections } = useCollections();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  function handleDragStart(event: DragStartEvent) {
    const trackData = event.active.data.current;
    if (trackData?.type === "track") setDraggedTrack(trackData.track as TrackDto);
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggedTrack(null);
    const { active, over } = event;
    if (!over) return;
    const trackData = active.data.current;
    const collectionData = over.data.current;
    if (trackData?.type === "track" && collectionData?.type === "collection") {
      const targetCollection = collections?.find((c) => c.id === collectionData.collectionId);
      if (targetCollection?.isSmart) return;
      addTrackToCollection.mutate({
        collectionId: collectionData.collectionId,
        track: trackData.track as TrackDto,
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setDraggedTrack(null)}
    >
      <div className="flex flex-1 flex-col gap-4 lg:flex-row">
        <div className="flex-1">
          <Tabs defaultValue="tracks">
            <TabsList>
              <TabsTrigger value="tracks">Saved tracks</TabsTrigger>
              <TabsTrigger value="playlists">Playlists</TabsTrigger>
            </TabsList>
            <TabsContent value="tracks" className="mt-4">
              <LibraryTracksTab />
            </TabsContent>
            <TabsContent value="playlists" className="mt-4">
              <LibraryPlaylistsTab />
            </TabsContent>
          </Tabs>
        </div>
        <CollectionsPanel selectedId={selectedCollectionId} onSelect={setSelectedCollectionId} />
      </div>
      <DragOverlay>
        {draggedTrack && (
          <Card className="w-80 p-3 shadow-lg">
            <TrackCardContent track={draggedTrack} interactive={false} />
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
