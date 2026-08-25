import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { spotifyFetch, SpotifyApiError } from "@/lib/spotify/client";

interface CreatedPlaylist {
  id: string;
}

interface PlaylistSnapshot {
  snapshot_id: string;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
  return chunks;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection || collection.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const items = await prisma.collectionTrack.findMany({
    where: { collectionId: id },
    orderBy: [{ position: "asc" }, { addedAt: "asc" }],
  });
  if (items.length === 0) {
    return Response.json({ error: "Collection is empty" }, { status: 400 });
  }

  const uris = items.map((i) => `spotify:track:${i.spotifyTrackId}`);
  const description = collection.description ?? "Exported from Spotiganizer";

  try {
    let playlistId = collection.spotifyPlaylistId;

    if (playlistId) {
      try {
        await spotifyFetch(`/playlists/${playlistId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: collection.name, description, public: false }),
        });
      } catch (error) {
        // The linked playlist no longer exists on Spotify's side — recreate it below.
        if (error instanceof SpotifyApiError && error.status === 404) {
          playlistId = null;
        } else {
          throw error;
        }
      }
    }

    if (!playlistId) {
      const playlist = await spotifyFetch<CreatedPlaylist>(`/users/${user.spotifyId}/playlists`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: collection.name,
          description,
          public: false,
        }),
      });
      if (!playlist?.id) throw new SpotifyApiError(500, "Failed to create playlist");
      playlistId = playlist.id;
    }
    const created = collection.spotifyPlaylistId !== playlistId;

    // Link the playlist as soon as it exists so a failed track sync can be retried
    // against the same playlist instead of piling up duplicates.
    await prisma.collection.update({
      where: { id: collection.id },
      data: { spotifyPlaylistId: playlistId },
    });

    // The first batch replaces the playlist's entire track list; any further
    // batches are appended on top of it.
    let syncedTracks = 0;
    for (const [index, batch] of chunk(uris, 100).entries()) {
      try {
        await spotifyFetch<PlaylistSnapshot>(`/playlists/${playlistId}/tracks`, {
          method: index === 0 ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ uris: batch }),
        });
        syncedTracks += batch.length;
      } catch (error) {
        if (error instanceof SpotifyApiError) {
          throw new SpotifyApiError(
            error.status,
            `${error.message} (synced ${syncedTracks} of ${uris.length} tracks)`
          );
        }
        throw error;
      }
    }

    const exportedAt = new Date();
    await prisma.collection.update({
      where: { id: collection.id },
      data: { exportedAt },
    });

    return Response.json({
      spotifyUrl: `https://open.spotify.com/playlist/${playlistId}`,
      created,
      exportedAt: exportedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof SpotifyApiError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    throw error;
  }
}
