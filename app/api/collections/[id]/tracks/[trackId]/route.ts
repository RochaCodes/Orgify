import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { requireOwnedCollection, SMART_COLLECTION_READONLY_ERROR } from "@/lib/collections/ownership";
import { Prisma } from "@/app/generated/prisma/client";

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

  try {
    await prisma.collectionTrack.delete({
      where: { collectionId_spotifyTrackId: { collectionId: id, spotifyTrackId: trackId } },
    });
  } catch (error) {
    // P2025 = the track was already removed; deleting it again is still a successful delete.
    // Anything else is a real failure and must not masquerade as one.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2025") {
      throw error;
    }
  }

  return new Response(null, { status: 204 });
}
