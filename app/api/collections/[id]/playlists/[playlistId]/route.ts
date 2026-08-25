import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; playlistId: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id, playlistId } = await params;
  const collection = await prisma.collection.findUnique({ where: { id } });
  if (!collection || collection.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.collectionPlaylist
    .delete({
      where: { collectionId_spotifyPlaylistId: { collectionId: id, spotifyPlaylistId: playlistId } },
    })
    .catch(() => null);

  return new Response(null, { status: 204 });
}
