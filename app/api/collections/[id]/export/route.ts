import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { requireOwnedCollection } from "@/lib/collections/ownership";
import { resolveSmartCollectionTracks } from "@/lib/collections/smart";
import { SpotifyApiError } from "@/lib/spotify/client";
import {
  createPlaylist,
  replacePlaylistItems,
  updatePlaylistMetadata,
} from "@/lib/spotify/playlists";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const collection = await requireOwnedCollection(user.id, id);
  if (!collection) return Response.json({ error: "Not found" }, { status: 404 });

  const items = collection.smartPlaylistRule
    ? await resolveSmartCollectionTracks(user.id, collection.smartPlaylistRule.tagId)
    : await prisma.collectionTrack.findMany({
        where: { collectionId: id },
        orderBy: [{ position: "asc" }, { addedAt: "asc" }],
      });
  if (items.length === 0) {
    return Response.json({ error: "Collection is empty" }, { status: 400 });
  }

  const uris = items.map((i) => `spotify:track:${i.spotifyTrackId}`);
  const metadata = {
    name: collection.name,
    description: collection.description ?? "Exported from Spotiganizer",
  };

  try {
    let playlistId = collection.spotifyPlaylistId;
    let created = false;

    if (playlistId) {
      try {
        await updatePlaylistMetadata(playlistId, metadata);
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
      playlistId = (await createPlaylist(metadata)).id;
      created = true;
      // Link the playlist as soon as it exists so a failed track sync can be
      // retried against the same playlist instead of piling up duplicates.
      await prisma.collection.update({
        where: { id: collection.id },
        data: { spotifyPlaylistId: playlistId },
      });
    }

    await replacePlaylistItems(playlistId, uris);

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
