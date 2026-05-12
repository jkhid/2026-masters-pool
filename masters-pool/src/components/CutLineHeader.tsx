"use client";
import { CutLineInfo, GolferScore } from "@/lib/types";
import { formatScore } from "@/lib/scoring";

interface CutLineHeaderProps {
  cutLine: CutLineInfo;
  golfers: Record<string, GolferScore>;
  tournamentRound: number;
  poolGolfers: string[];
  ownersByGolfer: Record<string, string[]>;
}

const NOPHOTO = "https://a.espncdn.com/i/headshots/nophoto.png";

function headshotUrl(espnId: string | null): string {
  return espnId
    ? `https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/${espnId}.png&w=96&h=70&cb=1`
    : NOPHOTO;
}

function scoreColor(score: number): string {
  if (score < 0) return "text-counting";
  if (score > 0) return "text-cut";
  return "text-gold";
}

export default function CutLineHeader({
  cutLine,
  golfers,
  tournamentRound,
  poolGolfers,
  ownersByGolfer,
}: CutLineHeaderProps) {
  const bubbleGolfers = poolGolfers
    .map((name) => golfers[name])
    .filter((g): g is GolferScore =>
      g !== null &&
      g !== undefined &&
      g.total !== null &&
      g.status === "active" &&
      Math.abs(g.total - cutLine.projectedScore) <= 1
    )
    .sort((a, b) => (a.total ?? 0) - (b.total ?? 0));

  const cutScoreDisplay = formatScore(cutLine.projectedScore);
  const label = cutLine.isProjected ? "Projected Cut" : "Cut Line";

  return (
    <div className="card overflow-hidden">
      {/* Top section */}
      <div className="px-5 py-4 flex flex-wrap items-center gap-5 border-b border-divider">
        <div className="flex items-baseline gap-3">
          <span className={`text-4xl font-serif tabular ${scoreColor(cutLine.projectedScore)}`}>
            {cutScoreDisplay}
          </span>
          <div className="label text-text-muted">{label}</div>
        </div>

        <div className="h-8 w-px bg-divider" />

        <div className="text-sm">
          <p className="text-text">
            Top <span className="text-gold tabular font-medium">{cutLine.playersMakingCut}</span>{" "}
            {cutLine.isProjected ? "would make" : "made"} the cut
            {cutLine.playersAtLine > 1 && (
              <span className="text-text-muted"> ({cutLine.playersAtLine} tied at {cutScoreDisplay})</span>
            )}
          </p>
          <p className="text-xs text-text-muted mt-0.5">
            {cutLine.isProjected
              ? `Round ${tournamentRound} · Top 50 & ties`
              : `${cutLine.totalField - cutLine.playersMakingCut} eliminated`}
          </p>
        </div>

        {cutLine.isProjected && (
          <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-warning/10 text-warning border border-warning/30">
            <span className="w-1.5 h-1.5 rounded-full bg-warning animate-pulse-live" />
            Projected
          </span>
        )}
      </div>

      {/* Bubble golfers */}
      {bubbleGolfers.length > 0 && (
        <div className="px-5 py-4">
          <div className="label mb-3">On the bubble (±1 from line)</div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {bubbleGolfers.map((g) => {
              const owners = ownersByGolfer[g.name] ?? [];
              const diff = g.total! - cutLine.projectedScore;
              let statusLabel = "";
              let ringColor = "";
              if (diff < 0) {
                ringColor = "ring-counting/60";
                statusLabel = `Safe by ${Math.abs(diff)}`;
              } else if (diff === 0) {
                ringColor = "ring-warning/60";
                statusLabel = "On the line";
              } else {
                ringColor = "ring-cut/60";
                statusLabel = `+${diff} over`;
              }

              return (
                <div
                  key={g.name}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-md bg-bg-elev border border-divider"
                >
                  <img
                    src={headshotUrl(g.espnId)}
                    alt={g.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = NOPHOTO;
                    }}
                    className={`w-9 h-9 rounded-full object-cover bg-bg ring-2 ${ringColor} shrink-0`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-sm text-text truncate">{g.name}</span>
                      <span className={`text-xs tabular font-medium ${scoreColor(g.total!)}`}>
                        {formatScore(g.total)}
                      </span>
                    </div>
                    <div className="flex items-baseline justify-between gap-2 mt-0.5">
                      <span className={`text-[10px] ${
                        diff < 0 ? "text-counting" : diff === 0 ? "text-warning" : "text-cut"
                      }`}>
                        {statusLabel}
                      </span>
                      <span className="text-[10px] text-text-faint truncate">
                        {owners.join(", ")}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
