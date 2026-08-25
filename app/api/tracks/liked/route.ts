import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { toTrackDtoFromRow, type PagedDto, type SavedTrackDto } from "@/lib/spotify/dto";
import type { LikedTrack } from "@/app/generated/prisma/client";

function toSavedTrackDto(item: LikedTrack): SavedTrackDto {
  return { track: toTrackDtoFromRow(item), addedAt: item.addedAt.toISOString() };
}

/**
 * Local search/paginate over the synced LikedTrack cache (see app/api/spotify/library/sync).
 * SQLite's LIKE — what Prisma's `contains` compiles to here — is case-insensitive for ASCII by
 * default, so no extra lower-casing is needed for typical searches.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = Math.min(50, Number(searchParams.get("limit") ?? 30));
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0));
  const q = searchParams.get("q")?.trim();

  const where = {
    userId: user.id,
    ...(q ? { OR: [{ trackName: { contains: q } }, { trackArtists: { contains: q } }] } : {}),
  };

  const [items, total, currentUser] = await Promise.all([
    prisma.likedTrack.findMany({ where, orderBy: { addedAt: "desc" }, skip: offset, take: limit }),
    prisma.likedTrack.count({ where }),
    prisma.user.findUnique({ where: { id: user.id }, select: { likedTracksSyncedAt: true } }),
  ]);

  const response: PagedDto<SavedTrackDto> & { syncedAt: string | null } = {
    items: items.map(toSavedTrackDto),
    total,
    limit,
    offset,
    hasMore: offset + items.length < total,
    syncedAt: currentUser?.likedTracksSyncedAt?.toISOString() ?? null,
  };

  return Response.json(response);
}
