import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { boundedInt } from "@/lib/api/request";
import { toTrackDtoFromRow, type PagedDto, type SavedTrackDto } from "@/lib/spotify/dto";
import type { LikedTrack } from "@/app/generated/prisma/client";

function toSavedTrackDto(item: LikedTrack): SavedTrackDto {
  return { track: toTrackDtoFromRow(item), addedAt: item.addedAt.toISOString() };
}

/**
 * Local search/paginate over the synced LikedTrack cache (see app/api/spotify/library/sync).
 * Matching runs against the *Lower columns with a JS-lowercased query, because SQLite folds
 * only ASCII — "KAŽU" would otherwise miss "Kažu".
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = boundedInt(searchParams.get("limit"), { fallback: 30, min: 1, max: 50 });
  const offset = boundedInt(searchParams.get("offset"), { fallback: 0, min: 0, max: Number.MAX_SAFE_INTEGER });
  const q = searchParams.get("q")?.trim().toLowerCase();

  const where = {
    userId: user.id,
    ...(q
      ? {
          OR: [
            { trackNameLower: { contains: q } },
            { trackArtistsLower: { contains: q } },
          ],
        }
      : {}),
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
