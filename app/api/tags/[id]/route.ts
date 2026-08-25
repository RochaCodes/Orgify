import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag || tag.userId !== user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.tag.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
