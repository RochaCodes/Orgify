import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

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

  return Response.json(
    collections.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      color: c.color,
      icon: c.icon,
      trackCount: c._count.trackItems,
      playlistCount: c._count.playlistItems,
    }))
  );
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as { name?: string; color?: string; icon?: string };
  const name = body.name?.trim();
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });

  const collection = await prisma.collection.create({
    data: { userId: user.id, name, color: body.color, icon: body.icon },
  });

  return Response.json(collection, { status: 201 });
}
