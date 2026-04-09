"use client";
import { PoolPlayerStanding } from "@/lib/types";
import { formatScore, formatRoundScore } from "@/lib/scoring";
import { useScorecard } from "@/contexts/ScorecardContext";

interface PlayerDetailProps {
  player: PoolPlayerStanding;
  onClose: () => void;
}

export default function PlayerDetail({ player, onClose }: PlayerDetailProps) {
  const { openScorecard } = useScorecard();
  return (
    <div className="bg-card-bg border border-card-border rounded-lg overflow-hidden">
      <div className="bg-masters-green/20 border-b border-card-border px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-serif text-masters-yellow">{player.name}&apos;s Picks</h2>
          <p className="text-sm text-text-muted">
            Best 4 of 6 count &middot; Total:{" "}
            <span className="text-masters-yellow font-bold">
              {player.countingTotal !== null ? formatScore(player.countingTotal) : "-"}
            </span>
          </p>
        </div>
        <button
          onClick={onClose}
          className="text-text-muted hover:text-white text-2xl leading-none px-2"
        >
          &times;
        </button>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-[1fr_50px_50px_50px_50px_60px_50px] gap-1 px-4 py-2 text-xs text-text-muted border-b border-card-border/50 uppercase tracking-wider">
        <div>Golfer</div>
        <div className="text-center">R1</div>
        <div className="text-center">R2</div>
        <div className="text-center">R3</div>
        <div className="text-center">R4</div>
        <div className="text-center">Total</div>
        <div className="text-center">Thru</div>
      </div>

      {player.golfers.map((g) => {
        const isCut = g.score?.status === "cut" || g.score?.status === "wd" || g.score?.status === "dq";
        const hasScore = g.score?.total !== null && g.score?.total !== undefined;
        const isDropped = hasScore && !g.counting;
        return (
          <div
            key={g.name}
            className={`
              grid grid-cols-[1fr_50px_50px_50px_50px_60px_50px] gap-1 px-4 py-2.5
              border-b border-card-border/20 items-center
              ${isDropped ? "opacity-50" : ""}
              ${isCut ? "bg-cut/5" : ""}
            `}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                g.counting ? "bg-counting" : "bg-dropped"
              }`} />
              <span
                className={`truncate text-sm cursor-pointer hover:underline ${isCut ? "line-through text-cut" : ""}`}
                onClick={() => openScorecard(g.name)}
              >
                {g.name}
              </span>
              {isCut && (
                <span className="text-xs bg-cut/20 text-cut px-1.5 py-0.5 rounded flex-shrink-0">
                  {g.score?.status?.toUpperCase()}
                </span>
              )}
              {g.counting && (
                <span className="text-xs text-counting hidden sm:inline flex-shrink-0">counting</span>
              )}
            </div>
            {[0, 1, 2, 3].map(r => (
              <div key={r} className={`text-center text-sm ${
                isCut && r >= 2 && g.score?.rounds[r] === null ? "text-cut/60" : ""
              }`}>
                {isCut && r >= 2 && !g.score?.rounds[r] ? "80" : formatRoundScore(g.score?.rounds[r] ?? null)}
              </div>
            ))}
            <div className={`text-center font-bold text-sm ${
              g.score?.total !== null && g.score?.total !== undefined && g.score.total < 0 ? "text-red-400" :
              g.score?.total !== null && g.score?.total !== undefined && g.score.total > 0 ? "text-blue-400" :
              "text-masters-yellow"
            }`}>
              {g.score ? formatScore(g.score.total) : "-"}
            </div>
            <div className="text-center text-xs text-text-muted">
              {g.score?.thru || "-"}
            </div>
          </div>
        );
      })}

      <div className="px-4 py-3 text-xs text-text-muted">
        <span className="inline-flex items-center gap-1 mr-4">
          <span className="w-2 h-2 rounded-full bg-counting" /> Counting
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-dropped" /> Dropped (worst 2)
        </span>
      </div>
    </div>
  );
}
