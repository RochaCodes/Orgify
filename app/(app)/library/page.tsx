"use client";

import { useState } from "react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { TrackCard, TrackCardContent } from "@/components/library/track-card";
import { PlaylistCard } from "@/components/library/playlist-card";
import { CollectionsPanel } from "@/components/library/collections-panel";
import { useSavedTracks, usePlaylists } from "@/lib/spotify/hooks";
import { useAddTrackToCollection, useAddPlaylistToCollection, useCollections } from "@/lib/collections/hooks";
import type { TrackDto } from "@/lib/spotify/dto";

const PAGE_SIZE = 30;

function LibraryTracksTab() {
  const [offset, setOffset] = useState(0);
  const { data, isLoading, isError, error } = useSavedTracks(offset, PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3">
      {isError && (
        <p className="text-sm text-destructive">{(error as Error).message}</p>
      )}
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {isLoading &&
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
        {data?.items.map((item) => <TrackCard key={item.track.id} track={item.track} />)}
      </div>
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
          <Card className="w-72 p-3 shadow-lg">
            <TrackCardContent track={draggedTrack} />
          </Card>
        )}
      </DragOverlay>
    </DndContext>
  );
}
