"use client";
import { ScoreData } from "@/lib/types";
import { findGolferScore, formatScore, formatRoundScore } from "@/lib/scoring";
import { useScorecard } from "@/contexts/ScorecardContext";

interface GolferScoreboardProps {
  scoreData: ScoreData;
  golfers: string[];
  ownersByGolfer: Record<string, string[]>;
}

function scoreColor(total: number | null | undefined): string {
  if (total === null || total === undefined) return "text-text-faint";
  if (total < 0) return "text-counting";
  if (total > 0) return "text-cut";
  return "text-gold";
}

export default function GolferScoreboard({ scoreData, golfers, ownersByGolfer }: GolferScoreboardProps) {
  const { openScorecard } = useScorecard();

  const sortedGolfers = [...golfers].sort((a, b) => {
    const aScore = findGolferScore(scoreData, a)?.total;
    const bScore = findGolferScore(scoreData, b)?.total;
    if (aScore === null || aScore === undefined) return 1;
    if (bScore === null || bScore === undefined) return -1;
    return aScore - bScore;
  });

  return (
    <div className="card overflow-hidden">
      <div className="px-5 py-3.5 bg-bg-elev/40 border-b border-divider flex items-baseline justify-between">
        <div>
          <h2 className="font-serif text-xl text-text">All Golfers</h2>
          <p className="text-xs text-text-muted mt-0.5">
            {golfers.length} golfers picked across the field
          </p>
        </div>
      </div>

      {/* Desktop header */}
      <div className="hidden md:grid grid-cols-[40px_1fr_45px_45px_45px_45px_60px_45px_1fr] gap-2 px-5 py-2 text-[10px] uppercase tracking-wider text-text-faint border-b border-divider">
        <div>Pos</div>
        <div>Golfer</div>
        <div className="text-center">R1</div>
        <div className="text-center">R2</div>
        <div className="text-center">R3</div>
        <div className="text-center">R4</div>
        <div className="text-right">Total</div>
        <div className="text-center">Thru</div>
        <div className="text-right">Picked By</div>
      </div>

      <div className="max-h-[600px] overflow-y-auto divide-y divide-divider">
        {sortedGolfers.map((name, idx) => {
          const score = findGolferScore(scoreData, name);
          const owners = ownersByGolfer[name] ?? [];
          const isCut = score?.status === "cut" || score?.status === "wd" || score?.status === "dq";
          const espnId = score?.espnId;
          const headshotUrl = espnId
            ? `https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/${espnId}.png&w=96&h=70&cb=1`
            : "https://a.espncdn.com/i/headshots/nophoto.png";

          return (
            <div
              key={name}
              className={`px-5 py-2.5 hover:bg-bg-elev/40 transition-colors ${
                isCut ? "opacity-55" : ""
              }`}
            >
              {/* Desktop */}
              <div className="hidden md:grid grid-cols-[40px_1fr_45px_45px_45px_45px_60px_45px_1fr] gap-2 items-center">
                <span className="text-xs text-text-muted tabular">
                  {score?.position || "—"}
                </span>
                <div className="flex items-center gap-2.5 min-w-0">
                  <img
                    src={headshotUrl}
                    alt={name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "https://a.espncdn.com/i/headshots/nophoto.png";
                    }}
                    className={`w-7 h-7 rounded-full object-cover bg-bg-elev shrink-0 ${
                      isCut ? "grayscale" : ""
                    }`}
                  />
                  <button
                    onClick={() => openScorecard(score?.name ?? name)}
                    className={`truncate text-sm text-left hover:text-gold transition-colors ${
                      isCut ? "line-through text-cut" : "text-text"
                    }`}
                  >
                    {name}
                    {isCut && (
                      <span className="ml-1.5 text-[10px] text-cut">
                        ({score?.status?.toUpperCase()})
                      </span>
                    )}
                  </button>
                </div>
                {[0, 1, 2, 3].map((r) => (
                  <div key={r} className="text-center text-xs tabular text-text-muted">
                    {formatRoundScore(score?.rounds[r] ?? null)}
                  </div>
                ))}
                <div className={`text-right text-sm font-serif tabular ${scoreColor(score?.total)}`}>
                  {score ? formatScore(score.total) : "N/A"}
                </div>
                <div className="text-center text-[10px] tabular text-text-faint">
                  {score?.thru || "—"}
                </div>
                <div className="text-right text-[11px] text-text-muted truncate">
                  {owners.join(", ")}
                </div>
              </div>

              {/* Mobile */}
              <div className="md:hidden flex items-center gap-3">
                <span className="text-[10px] text-text-faint tabular w-5 shrink-0">
                  {idx + 1}
                </span>
                <img
                  src={headshotUrl}
                  alt={name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "https://a.espncdn.com/i/headshots/nophoto.png";
                  }}
                  className={`w-8 h-8 rounded-full object-cover bg-bg-elev shrink-0 ${
                    isCut ? "grayscale" : ""
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => openScorecard(name)}
                    className={`block text-sm truncate text-left ${
                      isCut ? "line-through text-cut" : "text-text"
                    }`}
                  >
                    {name}
                  </button>
                  <div className="text-[10px] text-text-faint truncate">
                    {owners.join(", ")}
                  </div>
                </div>
                <div className={`text-sm font-serif tabular text-right ${scoreColor(score?.total)}`}>
                  {score ? formatScore(score.total) : "N/A"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
