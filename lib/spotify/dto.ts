import type {
  SpotifyCurrentlyPlayingResponse,
  SpotifyPagingResponse,
  SpotifyPlayableItem,
  SpotifyPlaylist,
  SpotifyRecentlyPlayedItem,
  SpotifyRecentlyPlayedResponse,
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

/**
 * A liked song. Built from the local LikedTrack cache (app/api/tracks/liked), not from
 * /me/tracks — the library reads the cache so it can search and paginate offline.
 */
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

/**
 * Narrows what the player actually returned to a real catalog track. Podcast episodes have no
 * `artists`/`album` and local files have no id and no public URL, so neither can become a
 * TrackDto: the app keys collections, tags and the drag-and-drop ids off the Spotify track id,
 * and a placeholder-filled entry would just be an item the user can drag somewhere and never
 * resolve again. Callers drop what this rejects, the same way toPlaylistsPagedDto drops the
 * `null` entries Spotify returns for inaccessible playlists.
 */
function isSpotifyTrack(item: SpotifyPlayableItem | null | undefined): item is SpotifyTrack {
  return (
    item != null &&
    typeof item.id === "string" &&
    item.id !== "" &&
    Array.isArray(item.artists) &&
    item.album != null &&
    typeof item.external_urls?.spotify === "string"
  );
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

/**
 * Maps a denormalized track row (LikedTrack, CollectionTrack) back to a TrackDto. Both
 * models snapshot the same fields for the same reason (see prisma/schema.prisma) — this is
 * the single shared mapper for that shape, used instead of a per-route re-implementation.
 */
export function toTrackDtoFromRow(row: {
  spotifyTrackId: string;
  trackName: string;
  trackArtists: string;
  albumName?: string | null;
  albumImage: string | null;
  durationMs: number;
  spotifyUrl: string;
}): TrackDto {
  return {
    id: row.spotifyTrackId,
    name: row.trackName,
    artists: row.trackArtists,
    albumName: row.albumName ?? "",
    albumImage: row.albumImage,
    durationMs: row.durationMs,
    spotifyUrl: row.spotifyUrl,
  };
}

export function toNowPlayingDto(
  response: SpotifyCurrentlyPlayingResponse | null
): NowPlayingDto | null {
  // A podcast episode or a local file is playing as far as Spotify is concerned, but there is
  // no TrackDto that can describe it — report "nothing playing" instead of failing the poll.
  if (!response || !isSpotifyTrack(response.item)) return null;
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
  return response.items
    .filter((item): item is SpotifyRecentlyPlayedItem & { track: SpotifyTrack } =>
      isSpotifyTrack(item.track)
    )
    .map((item) => ({
      track: toTrackDto(item.track),
      playedAt: item.played_at,
    }));
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
