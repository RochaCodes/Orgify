import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const tags = await prisma.tag.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
  });

  return Response.json(tags);
}

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const body = (await req.json()) as { name?: string; color?: string };
  const name = body.name?.trim();
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });

  const tag = await prisma.tag
    .create({ data: { userId: user.id, name, color: body.color } })
    .catch(() => null);

  if (!tag) return Response.json({ error: "A tag with that name already exists" }, { status: 409 });

  return Response.json(tag, { status: 201 });
}
