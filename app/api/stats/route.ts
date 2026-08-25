import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

/** Expands the sparse month buckets into a contiguous run, so the chart's evenly-spaced
 * bars stay proportional to elapsed time instead of collapsing empty months away. Works on
 * the same UTC basis as the bucketing below — local dates would drift by a month near the
 * start/end of a month for anyone east or west of UTC. */
function fillMonthGaps(monthCounts: Map<string, number>) {
  const months = [...monthCounts.keys()].sort();
  const first = months[0];
  const last = months[months.length - 1];
  if (!first || !last) return [];

  const series: { month: string; count: number }[] = [];
  const cursor = new Date(`${first}-01T00:00:00.000Z`);
  const end = new Date(`${last}-01T00:00:00.000Z`);
  while (cursor <= end) {
    const month = cursor.toISOString().slice(0, 7);
    series.push({ month, count: monthCounts.get(month) ?? 0 });
    // Always on day 1, so this rolls over the year without overflowing into the next month.
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return series;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Not authenticated" }, { status: 401 });

  const [totalLikedSongs, likedTracks, tagRows, tags] = await Promise.all([
    prisma.likedTrack.count({ where: { userId: user.id } }),
    prisma.likedTrack.findMany({
      where: { userId: user.id },
      select: { trackArtists: true, addedAt: true },
    }),
    prisma.trackTag.groupBy({
      by: ["tagId"],
      _count: true,
      where: { tag: { userId: user.id } },
    }),
    prisma.tag.findMany({ where: { userId: user.id }, select: { id: true, name: true } }),
  ]);

  const artistCounts = new Map<string, number>();
  const monthCounts = new Map<string, number>();
  for (const track of likedTracks) {
    const artist = track.trackArtists.split(",")[0]?.trim();
    if (artist) artistCounts.set(artist, (artistCounts.get(artist) ?? 0) + 1);

    const month = track.addedAt.toISOString().slice(0, 7); // YYYY-MM
    monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
  }

  const topArtists = [...artistCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([artist, count]) => ({ artist, count }));

  const likedOverTime = fillMonthGaps(monthCounts);

  const tagNameById = new Map(tags.map((t) => [t.id, t.name]));
  const tagDistribution = tagRows
    .map((row) => ({ tag: tagNameById.get(row.tagId) ?? "Unknown", count: row._count }))
    .sort((a, b) => b.count - a.count);

  return Response.json({ totalLikedSongs, topArtists, likedOverTime, tagDistribution });
}
