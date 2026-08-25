import type {
  SpotifyCurrentlyPlayingResponse,
  SpotifyPagingResponse,
  SpotifyPlaylist,
  SpotifyRecentlyPlayedResponse,
  SpotifySavedTrackItem,
  SpotifyTrack,
} from "./types";

export interface TrackDto {
  id: string;
  name: string;
  artists: string;
  albumName: string;
  albumImage: string | null;
  durationMs: number;
  spotifyUrl: string;
}

export interface NowPlayingDto {
  isPlaying: boolean;
  progressMs: number;
  track: TrackDto;
}

export interface RecentlyPlayedItemDto {
  track: TrackDto;
  playedAt: string;
}

export interface SavedTrackDto {
  track: TrackDto;
  addedAt: string;
}

export interface PlaylistDto {
  id: string;
  name: string;
  description: string | null;
  image: string | null;
  ownerName: string | null;
  trackCount: number;
  spotifyUrl: string;
}

export interface PagedDto<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export function toTrackDto(track: SpotifyTrack): TrackDto {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists.map((a) => a.name).join(", "),
    albumName: track.album.name,
    albumImage: track.album.images[0]?.url ?? null,
    durationMs: track.duration_ms,
    spotifyUrl: track.external_urls.spotify,
  };
}

export function toNowPlayingDto(
  response: SpotifyCurrentlyPlayingResponse | null
): NowPlayingDto | null {
  if (!response?.item) return null;
  return {
    isPlaying: response.is_playing,
    progressMs: response.progress_ms ?? 0,
    track: toTrackDto(response.item),
  };
}

export function toRecentlyPlayedDto(
  response: SpotifyRecentlyPlayedResponse | null
): RecentlyPlayedItemDto[] {
  if (!response) return [];
  return response.items.map((item) => ({
    track: toTrackDto(item.track),
    playedAt: item.played_at,
  }));
}

export function toSavedTracksPagedDto(
  response: SpotifyPagingResponse<SpotifySavedTrackItem>
): PagedDto<SavedTrackDto> {
  return {
    items: response.items
      .filter((item) => item.track)
      .map((item) => ({ track: toTrackDto(item.track), addedAt: item.added_at })),
    total: response.total,
    limit: response.limit,
    offset: response.offset,
    hasMore: response.next !== null,
  };
}

function toPlaylistDto(playlist: SpotifyPlaylist): PlaylistDto {
  return {
    id: playlist.id,
    name: playlist.name,
    description: playlist.description ?? null,
    image: playlist.images?.[0]?.url ?? null,
    ownerName: playlist.owner?.display_name ?? null,
    trackCount: playlist.tracks?.total ?? 0,
    spotifyUrl: playlist.external_urls?.spotify ?? "",
  };
}

export function toPlaylistsPagedDto(
  response: SpotifyPagingResponse<SpotifyPlaylist>
): PagedDto<PlaylistDto> {
  return {
    // Spotify's /me/playlists can include `null` entries for playlists that
    // became inaccessible (deleted/blocked) — skip those instead of crashing.
    items: response.items.filter((p): p is SpotifyPlaylist => p != null).map(toPlaylistDto),
    total: response.total,
    limit: response.limit,
    offset: response.offset,
    hasMore: response.next !== null,
  };
}
