import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { nonEmptyString, readJson } from "@/lib/api/request";
import { Prisma } from "@/app/generated/prisma/client";

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

  const body = await readJson<{ name?: string; color?: string }>(req);
  if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });

  const name = nonEmptyString(body.name);
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });

  try {
    const tag = await prisma.tag.create({ data: { userId: user.id, name, color: body.color } });
    return Response.json(tag, { status: 201 });
  } catch (error) {
    // Only the unique-name collision means "duplicate"; every other failure must surface
    // instead of hiding behind a misleading 409.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ error: "A tag with that name already exists" }, { status: 409 });
    }
    throw error;
  }
}
