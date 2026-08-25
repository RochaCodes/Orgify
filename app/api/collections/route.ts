import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { countSmartCollectionTracks } from "@/lib/collections/smart";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const collections = await prisma.collection.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "asc" },
    include: {
      _count: { select: { trackItems: true, playlistItems: true } },
    },
  });

  const smartCounts = await Promise.all(
    collections
      .filter((c) => c.isSmart)
      .map(async (c) => [c.id, await countSmartCollectionTracks(c.id)] as const)
  );
  const smartCountById = new Map(smartCounts);

  return Response.json(
    collections.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      color: c.color,
      icon: c.icon,
      spotifyPlaylistId: c.spotifyPlaylistId,
      exportedAt: c.exportedAt,
      isSmart: c.isSmart,
      trackCount: c.isSmart ? (smartCountById.get(c.id) ?? 0) : c._count.trackItems,
      playlistCount: c._count.playlistItems,
    }))
  );
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as {
    name?: string;
    color?: string;
    icon?: string;
    isSmart?: boolean;
    tagId?: string;
  };
  const name = body.name?.trim();
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });

  if (body.isSmart) {
    if (!body.tagId) return Response.json({ error: "tagId is required for smart collections" }, { status: 400 });
    const tag = await prisma.tag.findUnique({ where: { id: body.tagId } });
    if (!tag || tag.userId !== user.id) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    const collection = await prisma.collection.create({
      data: {
        userId: user.id,
        name,
        color: body.color,
        icon: body.icon,
        isSmart: true,
        smartPlaylistRule: { create: { ruleJson: JSON.stringify({ type: "tag", tagId: body.tagId }) } },
      },
    });
    return Response.json(collection, { status: 201 });
  }

  const collection = await prisma.collection.create({
    data: { userId: user.id, name, color: body.color, icon: body.icon },
  });

  return Response.json(collection, { status: 201 });
}
