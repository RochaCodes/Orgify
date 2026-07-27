/** Spotify OAuth scopes requested by the app, grouped by the feature phase that needs them. */
export const SPOTIFY_SCOPES = [
  // profile
  "user-read-email",
  "user-read-private",
  // dashboard (Phase 2)
  "user-read-currently-playing",
  "user-read-playback-state",
  "user-read-recently-played",
  // library organization (Phase 3)
  "user-library-read",
  "user-library-modify",
  "playlist-read-private",
  "playlist-read-collaborative",
  "playlist-modify-public",
  "playlist-modify-private",
].join(" ");
