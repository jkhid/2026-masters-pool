"use client";
import { PoolPlayerStanding } from "@/lib/types";
import { formatScore, formatRoundScore } from "@/lib/scoring";
import { useScorecard } from "@/contexts/ScorecardContext";

interface PicksGridProps {
  standings: PoolPlayerStanding[];
}

function getRankSuffix(rank: number): string {
  if (rank === 1) return "st";
  if (rank === 2) return "nd";
  if (rank === 3) return "rd";
  return "th";
}

function scoreColor(total: number | null | undefined): string {
  if (total === null || total === undefined) return "text-text-faint";
  if (total < 0) return "text-counting";
  if (total > 0) return "text-cut";
  return "text-gold";
}

function PlayerCard({ player }: { player: PoolPlayerStanding }) {
  const { openScorecard } = useScorecard();
  const isLeader = player.rank === 1;

  const sorted = [...player.golfers].sort((a, b) => {
    if (a.counting !== b.counting) return a.counting ? -1 : 1;
    const aTotal = a.score?.total ?? 999;
    const bTotal = b.score?.total ?? 999;
    return aTotal - bTotal;
  });

  return (
    <div className={`card overflow-hidden ${isLeader ? "card-leader" : ""}`}>
      {/* Header */}
      <div
        className={`px-4 py-3 flex items-center justify-between border-b border-divider ${
          isLeader ? "bg-gold/[0.06]" : "bg-bg-elev/40"
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-serif font-semibold shrink-0 ${
              isLeader
                ? "bg-gold text-bg"
                : "bg-masters-green/40 text-text"
            }`}
          >
            {player.rank}
          </div>
          <div className="min-w-0">
            <h3 className="font-serif text-lg text-text leading-tight truncate">
              {player.name}
            </h3>
            <div className="text-[10px] text-text-faint">
              {player.rank}{getRankSuffix(player.rank)} place
            </div>
          </div>
        </div>
        <div className="text-right shrink-0 ml-3">
          <div
            className={`text-2xl font-serif tabular leading-none ${scoreColor(player.countingTotal)}`}
          >
            {player.countingTotal !== null ? formatScore(player.countingTotal) : "—"}
          </div>
          <div className="text-[10px] text-text-faint mt-0.5">Best 4</div>
        </div>
      </div>

      {/* Golfer rows */}
      <div className="divide-y divide-divider">
        {sorted.map((g) => {
          const isCut = g.score?.status === "cut" || g.score?.status === "wd" || g.score?.status === "dq";
          const hasScore = g.score?.total !== null && g.score?.total !== undefined;
          const isDropped = hasScore && !g.counting;
          const espnId = g.score?.espnId;
          const headshotUrl = espnId
            ? `https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/${espnId}.png&w=96&h=70&cb=1`
            : "https://a.espncdn.com/i/headshots/nophoto.png";

          return (
            <div
              key={g.name}
              className={`px-4 py-2.5 flex items-center gap-3 transition-opacity ${
                isDropped ? "opacity-45" : ""
              }`}
            >
              {/* Counting indicator */}
              <span
                className={`w-[3px] h-9 rounded-full shrink-0 ${
                  g.counting ? "bg-counting" : "bg-border-strong"
                }`}
              />

              {/* Headshot */}
              <img
                src={headshotUrl}
                alt={g.name}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "https://a.espncdn.com/i/headshots/nophoto.png";
                }}
                className={`w-9 h-9 rounded-full object-cover bg-bg-elev shrink-0 ${
                  isDropped ? "grayscale opacity-70" : ""
                }`}
              />

              {/* Name + rounds */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openScorecard(g.score?.name ?? g.name)}
                    className={`text-left text-sm font-medium truncate hover:text-gold transition-colors ${
                      isCut ? "line-through text-cut" : "text-text"
                    }`}
                  >
                    {g.name}
                  </button>
                  {isCut && (
                    <span className="text-[10px] bg-cut/15 text-cut px-1.5 py-0.5 rounded shrink-0 font-medium">
                      {g.score?.status?.toUpperCase()}
                    </span>
                  )}
                  {g.score?.thru && !isCut && (
                    <span
                      className={`text-[10px] tabular shrink-0 px-1.5 py-0.5 rounded ${
                        g.score.thru === "F"
                          ? "bg-bg-elev text-text-muted"
                          : "bg-gold/10 text-gold"
                      }`}
                    >
                      {g.score.thru}
                    </span>
                  )}
                </div>
                <div className="flex gap-3 mt-0.5 text-[11px]">
                  {["R1", "R2", "R3", "R4"].map((label, i) => (
                    <span key={label} className="tabular">
                      <span className="text-text-faint">{label}</span>{" "}
                      <span className="text-text-muted">
                        {isCut && i >= 2 && !g.score?.rounds[i]
                          ? <span className="text-cut/70">80</span>
                          : formatRoundScore(g.score?.rounds[i] ?? null)
                        }
                      </span>
                    </span>
                  ))}
                </div>
              </div>

              {/* Score */}
              <div className="text-right shrink-0">
                <div className={`text-base font-serif tabular ${scoreColor(g.score?.total)}`}>
                  {g.score ? formatScore(g.score.total) : "—"}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-divider flex items-center gap-3 text-[10px] text-text-faint">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-[3px] bg-counting rounded-full" /> Counting
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-[3px] bg-border-strong rounded-full" /> Dropped
        </span>
      </div>
    </div>
  );
}

export default function PicksGrid({ standings }: PicksGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 stagger">
      {standings.map((player) => (
        <PlayerCard key={player.name} player={player} />
      ))}
    </div>
  );
}
