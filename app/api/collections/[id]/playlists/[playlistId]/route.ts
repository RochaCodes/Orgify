import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { requireOwnedCollection } from "@/lib/collections/ownership";
import { Prisma } from "@/app/generated/prisma/client";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; playlistId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id, playlistId } = await params;
  const collection = await requireOwnedCollection(user.id, id);
  if (!collection) return Response.json({ error: "Not found" }, { status: 404 });

  try {
    await prisma.collectionPlaylist.delete({
      where: { collectionId_spotifyPlaylistId: { collectionId: id, spotifyPlaylistId: playlistId } },
    });
  } catch (error) {
    // P2025 = the playlist link was already removed; deleting it again is still success.
    // Anything else is a real failure and must not masquerade as one.
    if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2025") {
      throw error;
    }
  }

  return new Response(null, { status: 204 });
}
