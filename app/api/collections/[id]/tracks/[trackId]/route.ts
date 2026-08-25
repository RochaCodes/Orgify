import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { requireOwnedCollection, SMART_COLLECTION_READONLY_ERROR } from "@/lib/collections/ownership";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; trackId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id, trackId } = await params;
  const collection = await requireOwnedCollection(user.id, id);
  if (!collection) return Response.json({ error: "Not found" }, { status: 404 });
  if (collection.smartPlaylistRule) {
    return Response.json({ error: SMART_COLLECTION_READONLY_ERROR }, { status: 400 });
  }

  await prisma.collectionTrack
    .delete({
      where: { collectionId_spotifyTrackId: { collectionId: id, spotifyTrackId: trackId } },
    })
    .catch(() => null);

  return new Response(null, { status: 204 });
}
