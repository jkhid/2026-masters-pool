"use client";
import { PoolPlayerStanding } from "@/lib/types";
import { formatScore } from "@/lib/scoring";
import { useScorecard } from "@/contexts/ScorecardContext";

interface LeaderboardProps {
  standings: PoolPlayerStanding[];
  onSelectPlayer: (name: string) => void;
  selectedPlayer: string | null;
}

function getRankDisplay(rank: number): string {
  if (rank === 1) return "1st";
  if (rank === 2) return "2nd";
  if (rank === 3) return "3rd";
  return `${rank}th`;
}

function getRankColor(rank: number): string {
  if (rank === 1) return "text-masters-yellow";
  if (rank === 2) return "text-gray-300";
  if (rank === 3) return "text-amber-600";
  return "text-text-muted";
}

export default function Leaderboard({ standings, onSelectPlayer, selectedPlayer }: LeaderboardProps) {
  const { openScorecard } = useScorecard();
  return (
    <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
      <div className="bg-masters-green/20 border-b border-card-border px-4 py-3">
        <h2 className="text-lg sm:text-xl font-serif text-masters-yellow">Pool Leaderboard</h2>
      </div>

      {/* Header row */}
      <div className="hidden sm:grid grid-cols-[60px_1fr_repeat(6,minmax(0,1fr))_80px] gap-2 px-4 py-2 text-xs text-text-muted border-b border-card-border/50 uppercase tracking-wider">
        <div>Pos</div>
        <div>Player</div>
        <div className="col-span-6 text-center">Golfers</div>
        <div className="text-right">Total</div>
      </div>

      {standings.map((player) => {
        const isSelected = selectedPlayer === player.name;

        // Sort: counting first, then non-counting, each sub-sorted by score
        const sorted = [...player.golfers].sort((a, b) => {
          if (a.counting !== b.counting) return a.counting ? -1 : 1;
          const aTotal = a.score?.total ?? 999;
          const bTotal = b.score?.total ?? 999;
          return aTotal - bTotal;
        });

        return (
          <div
            key={player.name}
            onClick={() => onSelectPlayer(player.name)}
            className={`
              border-b border-card-border/30 px-4 py-3 cursor-pointer
              transition-colors duration-200
              ${isSelected ? "bg-masters-green/15 border-l-2 border-l-masters-yellow" : "hover:bg-white/5"}
              ${player.rank === 1 ? "bg-masters-yellow/5" : ""}
            `}
          >
            {/* Mobile layout */}
            <div className="sm:hidden">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className={`font-bold text-lg ${getRankColor(player.rank)}`}>
                    {getRankDisplay(player.rank)}
                  </span>
                  <span className="font-semibold text-lg">{player.name}</span>
                </div>
                <span className={`text-xl font-bold font-serif ${
                  player.countingTotal !== null && player.countingTotal < 0 ? "text-red-400" :
                  player.countingTotal !== null && player.countingTotal > 0 ? "text-blue-400" :
                  "text-masters-yellow"
                }`}>
                  {player.countingTotal !== null ? formatScore(player.countingTotal) : "-"}
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {sorted.map(g => {
                  const hasScore = g.score?.total !== null && g.score?.total !== undefined;
                  const isDropped = hasScore && !g.counting;
                  return (
                    <span
                      key={g.name}
                      className={`text-xs px-2 py-0.5 rounded cursor-pointer hover:underline ${
                        g.counting
                          ? "bg-counting/15 text-counting"
                          : isDropped
                            ? "bg-dropped/10 text-dropped line-through"
                            : "bg-white/5 text-text-muted"
                      }`}
                      onClick={(e) => { e.stopPropagation(); openScorecard(g.name); }}
                    >
                      {g.name.split(" ").pop()} {g.score ? formatScore(g.score.total) : ""}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Desktop layout */}
            <div className="hidden sm:grid grid-cols-[60px_1fr_repeat(6,minmax(0,1fr))_80px] gap-2 items-center">
              <span className={`font-bold text-lg ${getRankColor(player.rank)}`}>
                {getRankDisplay(player.rank)}
              </span>
              <span className="font-semibold text-lg">{player.name}</span>
              {sorted.map(g => {
                const hasScore = g.score?.total !== null && g.score?.total !== undefined;
                const isDropped = hasScore && !g.counting;
                return (
                  <div key={g.name} className={`text-sm ${isDropped ? "opacity-40" : !hasScore && !g.counting ? "opacity-50" : ""}`}>
                    <div
                      className={`truncate cursor-pointer hover:underline ${
                        g.counting ? "text-counting" : isDropped ? "text-dropped line-through" : "text-text-muted"
                      }`}
                      onClick={(e) => { e.stopPropagation(); openScorecard(g.name); }}
                    >
                      {g.name.split(" ").pop()}
                    </div>
                    <div className="text-xs text-text-muted">
                      {g.score ? formatScore(g.score.total) : "-"}
                      {g.score?.thru && g.score.thru !== "F" && (
                        <span className="ml-1 text-masters-yellow/60">{g.score.thru}</span>
                      )}
                    </div>
                  </div>
                );
              })}
              <span className={`text-right text-xl font-bold font-serif ${
                player.countingTotal !== null && player.countingTotal < 0 ? "text-red-400" :
                player.countingTotal !== null && player.countingTotal > 0 ? "text-blue-400" :
                "text-masters-yellow"
              }`}>
                {player.countingTotal !== null ? formatScore(player.countingTotal) : "-"}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
