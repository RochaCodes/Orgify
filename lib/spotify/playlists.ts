import { spotifyFetch, SpotifyApiError } from "@/lib/spotify/client";

const ITEMS_PER_REQUEST = 100;

interface CreatedPlaylistDto {
  id: string;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export interface PlaylistMetadata {
  name: string;
  description?: string;
}

/**
 * Creates a new private playlist owned by the current user. The February 2026
 * Dev Mode migration removed POST /users/{id}/playlists (it now returns 403);
 * creation goes through /me/playlists.
 */
export async function createPlaylist(metadata: PlaylistMetadata): Promise<{ id: string }> {
  const playlist = await spotifyFetch<CreatedPlaylistDto>("/me/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...metadata, public: false }),
  });
  if (!playlist?.id) throw new SpotifyApiError(500, "Failed to create playlist");
  return { id: playlist.id };
}

export async function updatePlaylistMetadata(
  playlistId: string,
  metadata: PlaylistMetadata
): Promise<void> {
  await spotifyFetch(`/playlists/${playlistId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...metadata, public: false }),
  });
}

/**
 * Replaces a playlist's entire track list with `uris`, in order. Uses the
 * /items endpoints — the legacy /tracks ones return 403 in Development Mode.
 *
 * The first batch replaces everything (PUT); any remaining batches are appended
 * (POST), because each PUT would otherwise discard the previous batches.
 */
export async function replacePlaylistItems(
  playlistId: string,
  uris: string[]
): Promise<void> {
  let synced = 0;
  for (const [index, batch] of chunk(uris, ITEMS_PER_REQUEST).entries()) {
    try {
      await spotifyFetch(`/playlists/${playlistId}/items`, {
        method: index === 0 ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uris: batch }),
      });
      synced += batch.length;
    } catch (error) {
      if (error instanceof SpotifyApiError) {
        throw new SpotifyApiError(
          error.status,
          `${error.message} (synced ${synced} of ${uris.length} tracks)`
        );
      }
      throw error;
    }
  }
}
