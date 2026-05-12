"use client";
import { PoolPlayerStanding } from "@/lib/types";
import { formatScore, formatRoundScore } from "@/lib/scoring";
import { useScorecard } from "@/contexts/ScorecardContext";

interface PlayerDetailProps {
  player: PoolPlayerStanding;
  onClose: () => void;
}

function scoreColor(total: number | null | undefined): string {
  if (total === null || total === undefined) return "text-text-faint";
  if (total < 0) return "text-counting";
  if (total > 0) return "text-cut";
  return "text-gold";
}

export default function PlayerDetail({ player, onClose }: PlayerDetailProps) {
  const { openScorecard } = useScorecard();

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 bg-bg-elev/40 border-b border-divider flex items-center justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-text">{player.name}&apos;s Picks</h2>
          <p className="text-xs text-text-muted mt-0.5">
            Best 4 of 6 count · Total{" "}
            <span className={`font-medium ${scoreColor(player.countingTotal)}`}>
              {player.countingTotal !== null ? formatScore(player.countingTotal) : "—"}
            </span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-2xl text-text-muted hover:text-text leading-none px-2 transition-colors"
        >
          ×
        </button>
      </div>

      {/* Header row */}
      <div className="hidden sm:grid grid-cols-[1fr_45px_45px_45px_45px_60px_45px] gap-2 px-5 py-2 text-[10px] uppercase tracking-wider text-text-faint border-b border-divider">
        <div>Golfer</div>
        <div className="text-center">R1</div>
        <div className="text-center">R2</div>
        <div className="text-center">R3</div>
        <div className="text-center">R4</div>
        <div className="text-right">Total</div>
        <div className="text-center">Thru</div>
      </div>

      <div className="divide-y divide-divider">
        {player.golfers.map((g) => {
          const isCut = g.score?.status === "cut" || g.score?.status === "wd" || g.score?.status === "dq";
          const hasScore = g.score?.total !== null && g.score?.total !== undefined;
          const isDropped = hasScore && !g.counting;

          return (
            <div
              key={g.name}
              className={`grid grid-cols-[1fr_45px_45px_45px_45px_60px_45px] gap-2 px-5 py-2.5 items-center ${
                isDropped ? "opacity-45" : ""
              } ${isCut ? "bg-cut/[0.03]" : ""}`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span
                  className={`w-[3px] h-6 rounded-full shrink-0 ${
                    g.counting ? "bg-counting" : "bg-border-strong"
                  }`}
                />
                <button
                  onClick={() => openScorecard(g.name)}
                  className={`truncate text-sm hover:text-gold transition-colors text-left ${
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
              </div>
              {[0, 1, 2, 3].map((r) => (
                <div
                  key={r}
                  className={`text-center text-xs tabular ${
                    isCut && r >= 2 && g.score?.rounds[r] === null
                      ? "text-cut/60"
                      : "text-text-muted"
                  }`}
                >
                  {isCut && r >= 2 && !g.score?.rounds[r]
                    ? "80"
                    : formatRoundScore(g.score?.rounds[r] ?? null)}
                </div>
              ))}
              <div className={`text-right text-sm font-serif tabular ${scoreColor(g.score?.total)}`}>
                {g.score ? formatScore(g.score.total) : "—"}
              </div>
              <div className="text-center text-[10px] tabular text-text-faint">
                {g.score?.thru || "—"}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
