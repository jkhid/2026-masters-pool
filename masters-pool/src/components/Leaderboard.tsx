"use client";
import { PoolPlayerStanding } from "@/lib/types";
import { formatScore } from "@/lib/scoring";
import { useScorecard } from "@/contexts/ScorecardContext";

interface LeaderboardProps {
  standings: PoolPlayerStanding[];
  onSelectPlayer: (name: string) => void;
  selectedPlayer: string | null;
}

function getRankSuffix(rank: number): string {
  if (rank === 1) return "st";
  if (rank === 2) return "nd";
  if (rank === 3) return "rd";
  return "th";
}

function scoreColor(total: number | null): string {
  if (total === null) return "text-text-faint";
  if (total < 0) return "text-counting";
  if (total > 0) return "text-cut";
  return "text-gold";
}

export default function Leaderboard({ standings, onSelectPlayer, selectedPlayer }: LeaderboardProps) {
  const { openScorecard } = useScorecard();

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 bg-bg-elev/40 border-b border-divider">
        <h2 className="font-serif text-xl text-text">Pool Standings</h2>
      </div>

      {/* Desktop header */}
      <div className="hidden sm:grid grid-cols-[50px_1fr_repeat(6,minmax(0,1fr))_70px] gap-2 px-5 py-2 text-[10px] uppercase tracking-wider text-text-faint border-b border-divider">
        <div>Pos</div>
        <div>Player</div>
        <div className="col-span-6 text-center">Golfers</div>
        <div className="text-right">Total</div>
      </div>

      <div className="divide-y divide-divider">
        {standings.map((player) => {
          const isSelected = selectedPlayer === player.name;
          const isLeader = player.rank === 1;

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
              className={`px-5 py-3 cursor-pointer transition-colors relative ${
                isSelected ? "bg-surface-2" : "hover:bg-bg-elev/40"
              } ${isLeader ? "bg-gold/[0.03]" : ""}`}
            >
              {isSelected && <span className="absolute left-0 top-0 bottom-0 w-[2px] bg-gold" />}

              {/* Mobile */}
              <div className="sm:hidden">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-serif font-semibold shrink-0 ${
                        isLeader ? "bg-gold text-bg" : "bg-masters-green/40 text-text"
                      }`}
                    >
                      {player.rank}
                    </div>
                    <span className="font-serif text-base text-text truncate">{player.name}</span>
                  </div>
                  <span className={`text-xl font-serif tabular shrink-0 ${scoreColor(player.countingTotal)}`}>
                    {player.countingTotal !== null ? formatScore(player.countingTotal) : "—"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {sorted.map((g) => {
                    const hasScore = g.score?.total !== null && g.score?.total !== undefined;
                    const isDropped = hasScore && !g.counting;
                    return (
                      <button
                        key={g.name}
                        onClick={(e) => {
                          e.stopPropagation();
                          openScorecard(g.name);
                        }}
                        className={`text-[11px] px-2 py-0.5 rounded transition-colors ${
                          g.counting
                            ? "bg-counting/15 text-counting"
                            : isDropped
                              ? "bg-bg-elev text-text-faint line-through"
                              : "bg-bg-elev text-text-muted"
                        }`}
                      >
                        {g.name.split(" ").pop()}{" "}
                        <span className="tabular">{g.score ? formatScore(g.score.total) : ""}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Desktop */}
              <div className="hidden sm:grid grid-cols-[50px_1fr_repeat(6,minmax(0,1fr))_70px] gap-2 items-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-serif font-semibold ${
                    isLeader ? "bg-gold text-bg" : "bg-masters-green/40 text-text"
                  }`}
                >
                  {player.rank}
                </div>
                <span className="font-serif text-base text-text truncate">{player.name}</span>
                {sorted.map((g) => {
                  const hasScore = g.score?.total !== null && g.score?.total !== undefined;
                  const isDropped = hasScore && !g.counting;
                  return (
                    <button
                      key={g.name}
                      onClick={(e) => {
                        e.stopPropagation();
                        openScorecard(g.name);
                      }}
                      className={`text-left min-w-0 hover:opacity-80 transition-opacity ${
                        isDropped ? "opacity-40" : !hasScore && !g.counting ? "opacity-50" : ""
                      }`}
                    >
                      <div
                        className={`truncate text-xs ${
                          g.counting
                            ? "text-counting"
                            : isDropped
                              ? "text-text-faint line-through"
                              : "text-text-muted"
                        }`}
                      >
                        {g.name.split(" ").pop()}
                      </div>
                      <div className="text-[10px] tabular text-text-muted flex items-baseline gap-1.5">
                        <span>{g.score ? formatScore(g.score.total) : "—"}</span>
                        {g.score?.thru && g.score.thru !== "F" && (
                          <span className="text-gold/70 text-[9px]">{g.score.thru}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
                <span className={`text-right text-xl font-serif tabular ${scoreColor(player.countingTotal)}`}>
                  {player.countingTotal !== null ? formatScore(player.countingTotal) : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
