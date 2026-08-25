import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { requireOwnedCollection } from "@/lib/collections/ownership";
import { nonEmptyString, readJson } from "@/lib/api/request";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const collection = await requireOwnedCollection(user.id, id);
  if (!collection) return Response.json({ error: "Not found" }, { status: 404 });

  const body = await readJson<{
    name?: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
  }>(req);
  if (!body) return Response.json({ error: "Invalid JSON body" }, { status: 400 });

  // Same rule as POST /api/collections: a name must be present and non-empty once trimmed.
  let name: string | undefined;
  if (body.name !== undefined) {
    const trimmedName = nonEmptyString(body.name);
    if (trimmedName === null) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }
    name = trimmedName;
  }

  const updated = await prisma.collection.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.color !== undefined ? { color: body.color } : {}),
      ...(body.icon !== undefined ? { icon: body.icon } : {}),
    },
  });

  return Response.json(updated);
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const collection = await requireOwnedCollection(user.id, id);
  if (!collection) return Response.json({ error: "Not found" }, { status: 404 });

  await prisma.collection.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
