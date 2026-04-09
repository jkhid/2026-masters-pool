"use client";
import { ScoreData } from "@/lib/types";
import { ALL_GOLFERS, getGolferOwners } from "@/lib/pool-data";
import { formatScore, formatRoundScore } from "@/lib/scoring";
import { useScorecard } from "@/contexts/ScorecardContext";

interface GolferScoreboardProps {
  scoreData: ScoreData;
}

export default function GolferScoreboard({ scoreData }: GolferScoreboardProps) {
  const { openScorecard } = useScorecard();
  // Sort golfers by total score (ascending), N/A at bottom
  const sortedGolfers = [...ALL_GOLFERS].sort((a, b) => {
    const aScore = scoreData.golfers[a]?.total;
    const bScore = scoreData.golfers[b]?.total;
    if (aScore === null || aScore === undefined) return 1;
    if (bScore === null || bScore === undefined) return -1;
    return aScore - bScore;
  });

  return (
    <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
      <div className="bg-masters-green/20 border-b border-card-border px-4 py-3">
        <h2 className="text-lg sm:text-xl font-serif text-masters-yellow">All Golfers</h2>
        <p className="text-xs text-text-muted">{ALL_GOLFERS.length} golfers picked across all players</p>
      </div>

      {/* Header */}
      <div className="grid grid-cols-[30px_1fr_40px_40px_40px_40px_50px_40px_1fr] gap-1 px-4 py-2 text-xs text-text-muted border-b border-card-border/50 uppercase tracking-wider">
        <div>Pos</div>
        <div>Golfer</div>
        <div className="text-center">R1</div>
        <div className="text-center">R2</div>
        <div className="text-center">R3</div>
        <div className="text-center">R4</div>
        <div className="text-center">Tot</div>
        <div className="text-center">Thru</div>
        <div className="text-right">Pool Players</div>
      </div>

      <div className="max-h-[500px] overflow-y-auto">
        {sortedGolfers.map((name) => {
          const score = scoreData.golfers[name];
          const owners = getGolferOwners(name);
          const isCut = score?.status === "cut" || score?.status === "wd" || score?.status === "dq";

          return (
            <div
              key={name}
              className={`
                grid grid-cols-[30px_1fr_40px_40px_40px_40px_50px_40px_1fr] gap-1 px-4 py-2
                border-b border-card-border/20 items-center text-sm
                ${isCut ? "opacity-50" : ""}
              `}
            >
              <div className="text-xs text-text-muted">
                {score?.position || "-"}
              </div>
              <div
                className={`truncate cursor-pointer hover:underline ${isCut ? "line-through text-cut" : ""}`}
                onClick={() => openScorecard(name)}
              >
                {name}
                {isCut && (
                  <span className="ml-1 text-xs text-cut">({score?.status?.toUpperCase()})</span>
                )}
              </div>
              {[0, 1, 2, 3].map(r => (
                <div key={r} className="text-center text-xs">
                  {formatRoundScore(score?.rounds[r] ?? null)}
                </div>
              ))}
              <div className={`text-center font-bold ${
                score?.total !== null && score?.total !== undefined && score.total < 0 ? "text-red-400" :
                score?.total !== null && score?.total !== undefined && score.total > 0 ? "text-blue-400" :
                "text-masters-yellow"
              }`}>
                {score ? formatScore(score.total) : "N/A"}
              </div>
              <div className="text-center text-xs text-text-muted">
                {score?.thru || "-"}
              </div>
              <div className="text-right text-xs text-text-muted truncate">
                {owners.join(", ")}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
