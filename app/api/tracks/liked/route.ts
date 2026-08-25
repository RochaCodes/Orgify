import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";
import { boundedInt } from "@/lib/api/request";
import { toTrackDtoFromRow, type PagedDto, type SavedTrackDto } from "@/lib/spotify/dto";
import { Prisma, type LikedTrack } from "@/app/generated/prisma/client";

function toSavedTrackDto(item: LikedTrack): SavedTrackDto {
  return { track: toTrackDtoFromRow(item), addedAt: item.addedAt.toISOString() };
}

const LIKE_ESCAPE = "\\";

/** Makes LIKE's metacharacters literal, so searching for "%" finds a track named "100%". */
function likePattern(query: string): string {
  return `%${query.replace(/[\\%_]/g, (char) => LIKE_ESCAPE + char)}%`;
}

/**
 * Local search/paginate over the synced LikedTrack cache (see app/api/spotify/library/sync).
 * Matching runs against the *Lower columns with a JS-lowercased query, because SQLite folds
 * only ASCII — "KAŽU" would otherwise miss "Kažu".
 *
 * The filter is hand-written SQL rather than Prisma's `contains` because `contains` compiles to
 * LIKE with no ESCAPE clause and does not escape the query: a "%" or "_" typed into the search
 * box then acts as a wildcard and matches the entire library. Prisma's query builder cannot
 * express ESCAPE, so the filter is one $queryRaw fragment shared by the page and the count.
 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const limit = boundedInt(searchParams.get("limit"), { fallback: 30, min: 1, max: 50 });
  const offset = boundedInt(searchParams.get("offset"), { fallback: 0, min: 0, max: Number.MAX_SAFE_INTEGER });
  const q = searchParams.get("q")?.trim().toLowerCase();

  const pattern = q ? likePattern(q) : null;
  const where = pattern
    ? Prisma.sql`WHERE userId = ${user.id} AND (trackNameLower LIKE ${pattern} ESCAPE ${LIKE_ESCAPE} OR trackArtistsLower LIKE ${pattern} ESCAPE ${LIKE_ESCAPE})`
    : Prisma.sql`WHERE userId = ${user.id}`;

  const [items, [{ total }], currentUser] = await Promise.all([
    prisma.$queryRaw<LikedTrack[]>`
      SELECT * FROM LikedTrack ${where} ORDER BY addedAt DESC LIMIT ${limit} OFFSET ${offset}
    `,
    prisma.$queryRaw<[{ total: number }]>`
      SELECT COUNT(*) AS total FROM LikedTrack ${where}
    `,
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
