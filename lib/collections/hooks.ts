"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TrackDto } from "@/lib/spotify/dto";

export interface CollectionSummary {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  spotifyPlaylistId: string | null;
  exportedAt: string | null;
  isSmart: boolean;
  trackCount: number;
  playlistCount: number;
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Request failed with status ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export function useCollections() {
  return useQuery({
    queryKey: ["collections"],
    queryFn: () => fetchJson<CollectionSummary[]>("/api/collections"),
  });
}

export function useCreateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: string | { name: string; tagId?: string }) =>
      fetchJson<CollectionSummary>("/api/collections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(typeof input === "string" ? { name: input } : input),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections"] }),
  });
}

export function useDeleteCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => fetchJson(`/api/collections/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections"] }),
  });
}

export function useCollectionTracks(collectionId: string | null) {
  return useQuery({
    queryKey: ["collection-tracks", collectionId],
    queryFn: () => fetchJson<TrackDto[]>(`/api/collections/${collectionId}/tracks`),
    enabled: !!collectionId,
  });
}

export function useAddTrackToCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, track }: { collectionId: string; track: TrackDto }) =>
      fetchJson(`/api/collections/${collectionId}/tracks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track }),
      }),
    onMutate: async ({ collectionId, track }) => {
      await qc.cancelQueries({ queryKey: ["collection-tracks", collectionId] });
      const previousTracks = qc.getQueryData<TrackDto[]>(["collection-tracks", collectionId]);
      // Only bump trackCount when the insert below actually adds a new track;
      // if it was already in the collection the count must stay untouched.
      const alreadyPresent = previousTracks?.some((t) => t.id === track.id) ?? false;
      qc.setQueryData<TrackDto[]>(["collection-tracks", collectionId], (old) =>
        old && !old.some((t) => t.id === track.id) ? [...old, track] : (old ?? [track])
      );
      const previousCollections = qc.getQueryData<CollectionSummary[]>(["collections"]);
      qc.setQueryData<CollectionSummary[]>(["collections"], (old) =>
        old?.map((c) =>
          c.id === collectionId && !alreadyPresent
            ? { ...c, trackCount: c.trackCount + 1 }
            : c
        )
      );
      return { previousTracks, previousCollections };
    },
    onError: (_err, { collectionId }, context) => {
      if (context?.previousTracks) {
        qc.setQueryData(["collection-tracks", collectionId], context.previousTracks);
      }
      if (context?.previousCollections) {
        qc.setQueryData(["collections"], context.previousCollections);
      }
    },
    onSettled: (_data, _err, { collectionId }) => {
      qc.invalidateQueries({ queryKey: ["collection-tracks", collectionId] });
      qc.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useRemoveTrackFromCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, spotifyTrackId }: { collectionId: string; spotifyTrackId: string }) =>
      fetchJson(`/api/collections/${collectionId}/tracks/${spotifyTrackId}`, { method: "DELETE" }),
    onMutate: async ({ collectionId, spotifyTrackId }) => {
      await qc.cancelQueries({ queryKey: ["collection-tracks", collectionId] });
      const previousTracks = qc.getQueryData<TrackDto[]>(["collection-tracks", collectionId]);
      // Only drop trackCount when the filter below actually removes a track;
      // if the cached list does not contain it the count must stay untouched.
      const wasPresent = previousTracks?.some((t) => t.id === spotifyTrackId) ?? true;
      qc.setQueryData<TrackDto[]>(["collection-tracks", collectionId], (old) =>
        old?.filter((t) => t.id !== spotifyTrackId)
      );
      const previousCollections = qc.getQueryData<CollectionSummary[]>(["collections"]);
      qc.setQueryData<CollectionSummary[]>(["collections"], (old) =>
        old?.map((c) =>
          c.id === collectionId && wasPresent
            ? { ...c, trackCount: Math.max(0, c.trackCount - 1) }
            : c
        )
      );
      return { previousTracks, previousCollections };
    },
    onError: (_err, { collectionId }, context) => {
      if (context?.previousTracks) {
        qc.setQueryData(["collection-tracks", collectionId], context.previousTracks);
      }
      if (context?.previousCollections) {
        qc.setQueryData(["collections"], context.previousCollections);
      }
    },
    onSettled: (_data, _err, { collectionId }) => {
      qc.invalidateQueries({ queryKey: ["collection-tracks", collectionId] });
      qc.invalidateQueries({ queryKey: ["collections"] });
    },
  });
}

export function useAddPlaylistToCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, spotifyPlaylistId }: { collectionId: string; spotifyPlaylistId: string }) =>
      fetchJson(`/api/collections/${collectionId}/playlists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotifyPlaylistId }),
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections"] }),
  });
}

export function useExportCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (collectionId: string) =>
      fetchJson<{ spotifyUrl: string; created: boolean; exportedAt: string }>(
        `/api/collections/${collectionId}/export`,
        { method: "POST" }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["collections"] }),
  });
}
