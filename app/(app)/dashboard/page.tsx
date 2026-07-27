import { NowPlayingTile } from "@/components/dashboard/now-playing-tile";
import { RecentlyPlayedList } from "@/components/dashboard/recently-played-list";
import { StatTiles } from "@/components/dashboard/stat-tiles";

export default function DashboardPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4">
      <NowPlayingTile />
      <StatTiles />
      <RecentlyPlayedList />
    </div>
  );
}
