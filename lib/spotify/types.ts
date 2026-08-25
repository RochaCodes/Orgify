export interface SpotifyImage {
  url: string;
  width: number | null;
  height: number | null;
}

export interface SpotifyArtist {
  id: string;
  name: string;
}

export interface SpotifyAlbum {
  name: string;
  images: SpotifyImage[];
}

/**
 * A full catalog track: it has an id, artists, an album and a public URL. This is the only
 * shape that can become a TrackDto — narrow a SpotifyPlayableItem down to it with
 * `isSpotifyTrack` in ./dto before mapping.
 */
export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
  duration_ms: number;
  external_urls: { spotify: string };
}

/**
 * Anything the player can hold. Besides catalog tracks that is:
 * - podcast EpisodeObjects, which carry no `artists` and no `album`;
 * - local library files, whose `id` is null and whose `external_urls.spotify` is absent.
 * Both reach `/me/player/currently-playing` and `/me/player/recently-played`, so the raw type
 * has to admit them; the DTO layer is where they get filtered out.
 */
export interface SpotifyPlayableItem {
  id: string | null;
  name: string;
  type?: string;
  duration_ms: number;
  is_local?: boolean;
  artists?: SpotifyArtist[];
  album?: SpotifyAlbum;
  external_urls?: { spotify?: string };
}

export interface SpotifyCurrentlyPlayingResponse {
  is_playing: boolean;
  progress_ms: number | null;
  item: SpotifyPlayableItem | null;
}

export interface SpotifyRecentlyPlayedItem {
  track: SpotifyPlayableItem;
  played_at: string;
}

export interface SpotifyRecentlyPlayedResponse {
  items: SpotifyRecentlyPlayedItem[];
}

export interface SpotifySavedTrackItem {
  added_at: string;
  track: SpotifyTrack;
}

export interface SpotifyPagingResponse<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
}

export interface SpotifyTracksResponse {
  tracks: (SpotifyTrack | null)[];
}

export interface SpotifyPlaylistOwner {
  display_name: string | null;
}

export interface SpotifyPlaylist {
  id: string;
  name: string;
  description: string | null;
  images: SpotifyImage[];
  owner: SpotifyPlaylistOwner;
  tracks: { total: number };
  external_urls: { spotify: string };
}

export interface SpotifyCurrentUser {
  id: string;
}
