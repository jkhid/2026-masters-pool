"use client";
import { CutLineInfo, GolferScore } from "@/lib/types";
import { ALL_GOLFERS, getGolferOwners } from "@/lib/pool-data";
import { formatScore } from "@/lib/scoring";

interface CutLineHeaderProps {
  cutLine: CutLineInfo;
  golfers: Record<string, GolferScore>;
  tournamentRound: number;
}

const NOPHOTO = "https://a.espncdn.com/i/headshots/nophoto.png";

function headshotUrl(espnId: string | null): string {
  return espnId
    ? `https://a.espncdn.com/combiner/i?img=/i/headshots/golf/players/full/${espnId}.png&w=96&h=70&cb=1`
    : NOPHOTO;
}

export default function CutLineHeader({ cutLine, golfers, tournamentRound }: CutLineHeaderProps) {
  // Find pool golfers near the cut line (at the line or 1 stroke away)
  const bubbleGolfers = ALL_GOLFERS
    .map(name => golfers[name])
    .filter((g): g is GolferScore =>
      g !== null &&
      g !== undefined &&
      g.total !== null &&
      g.status === "active" &&
      Math.abs(g.total - cutLine.projectedScore) <= 1
    )
    .sort((a, b) => (a.total ?? 0) - (b.total ?? 0));

  const safeGolfers = bubbleGolfers.filter(g => g.total! < cutLine.projectedScore);
  const onTheLineGolfers = bubbleGolfers.filter(g => g.total! === cutLine.projectedScore);
  const belowLineGolfers = bubbleGolfers.filter(g => g.total! > cutLine.projectedScore);

  const cutScoreDisplay = formatScore(cutLine.projectedScore);
  const label = cutLine.isProjected ? "Projected Cut" : "Cut Line";

  return (
    <div className="bg-gradient-to-b from-card-bg to-bg border border-card-border rounded-xl overflow-hidden">
      {/* Main cut line display */}
      <div className="px-6 py-5 flex items-center justify-between border-b border-card-border/50">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
            <span className={`text-3xl font-bold font-serif ${
              cutLine.projectedScore < 0 ? "text-red-400" :
              cutLine.projectedScore > 0 ? "text-blue-400" :
              "text-masters-yellow"
            }`}>
              {cutScoreDisplay}
            </span>
            <span className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">{label}</span>
          </div>
          <div className="h-10 w-px bg-card-border/60" />
          <div className="text-sm">
            <p className="text-white">
              Top {cutLine.playersMakingCut} {cutLine.isProjected ? "would make" : "made"} the cut
              {cutLine.playersAtLine > 1 && (
                <span className="text-text-muted"> ({cutLine.playersAtLine} tied at {cutScoreDisplay})</span>
              )}
            </p>
            <p className="text-text-muted text-xs mt-0.5">
              {cutLine.isProjected
                ? `Round ${tournamentRound} — cut after R2 (top 50 + ties)`
                : `${cutLine.totalField - cutLine.playersMakingCut} golfers eliminated`
              }
            </p>
          </div>
        </div>
        {cutLine.isProjected && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse-live" />
            <span className="text-xs text-amber-400 font-medium">Projected</span>
          </div>
        )}
      </div>

      {/* Pool golfers near the bubble */}
      {bubbleGolfers.length > 0 && (
        <div className="px-6 py-4">
          <p className="text-xs text-text-muted uppercase tracking-widest mb-3 font-medium">
            Your golfers on the bubble
          </p>
          <div className="flex flex-wrap gap-2">
            {bubbleGolfers.map(g => {
              const owners = getGolferOwners(g.name);
              const diff = g.total! - cutLine.projectedScore;
              // safe (below cut score), on the line, or in danger (above cut score)
              let ringColor = "";
              let bgColor = "";
              let tagText = "";
              if (diff < 0) {
                ringColor = "ring-counting";
                bgColor = "bg-counting/8";
                tagText = `${formatScore(g.total)} — safe by ${Math.abs(diff)}`;
              } else if (diff === 0) {
                ringColor = "ring-amber-400";
                bgColor = "bg-amber-400/8";
                tagText = `${formatScore(g.total)} — right on the line`;
              } else {
                ringColor = "ring-cut";
                bgColor = "bg-cut/8";
                tagText = `${formatScore(g.total)} — ${diff} over the line`;
              }

              return (
                <div
                  key={g.name}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg ${bgColor} border border-card-border/30`}
                >
                  <img
                    src={headshotUrl(g.espnId)}
                    alt={g.name}
                    onError={(e) => { (e.target as HTMLImageElement).src = NOPHOTO; }}
                    className={`w-9 h-9 rounded-full object-cover ring-2 ${ringColor} bg-card-border`}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-white truncate">{g.name}</div>
                    <div className="text-[10px] text-text-muted truncate">
                      {tagText} &middot; <span className="text-white/60">{owners.join(", ")}</span>
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
