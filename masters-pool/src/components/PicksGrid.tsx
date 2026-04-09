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

function PlayerCard({ player }: { player: PoolPlayerStanding }) {
  const { openScorecard } = useScorecard();
  const isLeader = player.rank === 1;

  return (
    <div className={`
      bg-card-bg border rounded-xl overflow-hidden transition-all
      ${isLeader ? "border-masters-yellow/60 shadow-[0_0_20px_rgba(255,242,0,0.08)]" : "border-card-border"}
    `}>
      {/* Card header */}
      <div className={`
        px-4 py-3 flex items-center justify-between
        ${isLeader ? "bg-masters-yellow/10 border-b border-masters-yellow/20" : "bg-masters-green/10 border-b border-card-border"}
      `}>
        <div className="flex items-center gap-3">
          <div className={`
            w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm font-serif
            ${isLeader ? "bg-masters-yellow text-masters-dark" : "bg-masters-green/40 text-white"}
          `}>
            {player.rank}
          </div>
          <h3 className="text-lg font-serif font-bold text-white">{player.name}</h3>
        </div>
        <div className="text-right">
          <div className={`text-xl font-bold font-serif ${
            player.countingTotal !== null && player.countingTotal < 0 ? "text-red-400" :
            player.countingTotal !== null && player.countingTotal > 0 ? "text-blue-400" :
            "text-masters-yellow"
          }`}>
            {player.countingTotal !== null ? formatScore(player.countingTotal) : "-"}
          </div>
          <div className="text-[10px] text-text-muted uppercase tracking-wider">Best 4 Total</div>
        </div>
      </div>

      {/* Golfer rows */}
      <div className="divide-y divide-card-border/30">
        {player.golfers.map((g) => {
          const isCut = g.score?.status === "cut" || g.score?.status === "wd" || g.score?.status === "dq";
          const hasScore = g.score?.total !== null && g.score?.total !== undefined;
          const isDropped = hasScore && !g.counting;
          return (
            <div
              key={g.name}
              className={`px-4 py-2.5 flex items-center gap-3 ${isDropped ? "opacity-45" : ""}`}
            >
              {/* Counting indicator */}
              <div className={`w-1.5 h-8 rounded-full flex-shrink-0 ${
                g.counting ? "bg-counting" : hasScore ? "bg-card-border" : "bg-card-border/40"
              }`} />

              {/* Golfer info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-sm font-medium truncate cursor-pointer hover:underline ${isCut ? "line-through text-cut" : "text-white"}`}
                    onClick={() => openScorecard(g.name)}
                  >
                    {g.name}
                  </span>
                  {isCut && (
                    <span className="text-[10px] bg-cut/20 text-cut px-1.5 py-0.5 rounded font-medium flex-shrink-0">
                      {g.score?.status?.toUpperCase()}
                    </span>
                  )}
                  {g.score?.thru && !isCut && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${
                      g.score.thru === "F"
                        ? "bg-white/5 text-text-muted"
                        : "bg-masters-yellow/10 text-masters-yellow/80"
                    }`}>
                      {g.score.thru}
                    </span>
                  )}
                </div>
                {/* Round scores */}
                <div className="flex gap-3 mt-0.5">
                  {["R1", "R2", "R3", "R4"].map((label, i) => (
                    <span key={label} className="text-[11px] text-text-muted">
                      <span className="text-text-muted/50">{label}</span>{" "}
                      {isCut && i >= 2 && !g.score?.rounds[i]
                        ? <span className="text-cut/60">80</span>
                        : formatRoundScore(g.score?.rounds[i] ?? null)
                      }
                    </span>
                  ))}
                </div>
              </div>

              {/* Score + thru */}
              <div className="text-right flex-shrink-0">
                <div className={`text-sm font-bold ${
                  g.score?.total !== null && g.score?.total !== undefined && g.score.total < 0 ? "text-red-400" :
                  g.score?.total !== null && g.score?.total !== undefined && g.score.total > 0 ? "text-blue-400" :
                  "text-masters-yellow"
                }`}>
                  {g.score ? formatScore(g.score.total) : "-"}
                </div>
                {g.score?.thru && (
                  <div className={`text-[10px] ${
                    g.score.thru === "F" || g.score.thru === "CUT" || g.score.thru === "WD" || g.score.thru === "DQ"
                      ? "text-text-muted"
                      : "text-masters-yellow/70"
                  }`}>
                    {g.score.thru}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Card footer */}
      <div className="px-4 py-2 bg-white/[0.02] border-t border-card-border/30 flex items-center justify-between">
        <div className="flex items-center gap-3 text-[10px] text-text-muted">
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-3 rounded-full bg-counting" /> Counting
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="w-1.5 h-3 rounded-full bg-card-border" /> Dropped
          </span>
        </div>
        <div className="text-[10px] text-text-muted">
          {player.rank}{getRankSuffix(player.rank)} Place
        </div>
      </div>
    </div>
  );
}

export default function PicksGrid({ standings }: PicksGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {standings.map((player) => (
        <PlayerCard key={player.name} player={player} />
      ))}
    </div>
  );
}
