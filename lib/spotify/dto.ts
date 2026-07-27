import type {
  SpotifyCurrentlyPlayingResponse,
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

function toTrackDto(track: SpotifyTrack): TrackDto {
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
