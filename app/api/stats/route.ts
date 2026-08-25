import { getCurrentUser } from "@/lib/current-user";
import { prisma } from "@/lib/db";

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

  const likedOverTime = [...monthCounts.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, count]) => ({ month, count }));

  const tagNameById = new Map(tags.map((t) => [t.id, t.name]));
  const tagDistribution = tagRows
    .map((row) => ({ tag: tagNameById.get(row.tagId) ?? "Unknown", count: row._count }))
    .sort((a, b) => b.count - a.count);

  return Response.json({ totalLikedSongs, topArtists, likedOverTime, tagDistribution });
}
