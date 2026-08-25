"use client";

import { useQuery, keepPreviousData } from "@tanstack/react-query";
import type { NowPlayingDto, PagedDto, PlaylistDto, RecentlyPlayedItemDto } from "./dto";

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Request failed with status ${res.status}`);
  return res.json() as Promise<T>;
}

export function useNowPlaying() {
  return useQuery({
    queryKey: ["spotify", "now-playing"],
    queryFn: () => fetchJson<NowPlayingDto | null>("/api/spotify/now-playing"),
    refetchInterval: 7_000,
  });
}

export function useRecentlyPlayed() {
  return useQuery({
    queryKey: ["spotify", "recently-played"],
    queryFn: () => fetchJson<RecentlyPlayedItemDto[]>("/api/spotify/recently-played"),
    refetchInterval: 60_000,
  });
}

export function usePlaylists(offset: number, limit = 20) {
  return useQuery({
    queryKey: ["spotify", "playlists", offset, limit],
    queryFn: () =>
      fetchJson<PagedDto<PlaylistDto>>(`/api/spotify/library/playlists?offset=${offset}&limit=${limit}`),
    placeholderData: keepPreviousData,
  });
}
