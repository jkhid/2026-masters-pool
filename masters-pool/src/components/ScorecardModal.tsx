"use client";
import { useEffect, useState } from "react";
import { RoundScorecard } from "@/lib/types";
import { formatScore } from "@/lib/scoring";

interface ScorecardModalProps {
  golferName: string;
  scorecards: RoundScorecard[];
  onClose: () => void;
}

// Score symbols: circle for under par (gold), square for over par (cut), bare for par.
function ScoreCell({ strokes, toPar }: { strokes: number; toPar: number }) {
  const base = "w-10 h-10 flex items-center justify-center text-sm tabular";

  if (toPar <= -3) {
    return (
      <div className={base}>
        <div className="w-9 h-9 rounded-full border-2 border-gold flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-gold text-bg flex items-center justify-center font-bold text-sm">
            {strokes}
          </div>
        </div>
      </div>
    );
  }
  if (toPar === -2) {
    return (
      <div className={base}>
        <div className="w-9 h-9 rounded-full border-2 border-gold flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border border-gold flex items-center justify-center text-gold">
            {strokes}
          </div>
        </div>
      </div>
    );
  }
  if (toPar === -1) {
    return (
      <div className={base}>
        <div className="w-8 h-8 rounded-full border-2 border-gold flex items-center justify-center text-gold font-medium">
          {strokes}
        </div>
      </div>
    );
  }
  if (toPar === 1) {
    return (
      <div className={base}>
        <div className="w-8 h-8 border-2 border-cut flex items-center justify-center text-cut font-medium">
          {strokes}
        </div>
      </div>
    );
  }
  if (toPar >= 2) {
    return (
      <div className={base}>
        <div className="w-9 h-9 border-2 border-cut flex items-center justify-center">
          <div className="w-6 h-6 border border-cut flex items-center justify-center text-cut">
            {strokes}
          </div>
        </div>
      </div>
    );
  }
  return <div className={`${base} text-text-muted`}>{strokes}</div>;
}

interface Hole {
  hole: number;
  strokes: number;
  toPar: number;
  par: number;
}

function NineHoleTable({
  label,
  holes,
  holesStrokes,
  holesPar,
  showTotal,
  totalStrokes,
  totalPar,
}: {
  label: string;
  holes: Hole[];
  holesStrokes: number;
  holesPar: number;
  showTotal?: boolean;
  totalStrokes?: number;
  totalPar?: number;
}) {
  return (
    <div className="rounded-lg border border-divider overflow-hidden">
      <div className="px-4 py-2 border-b border-divider bg-bg-elev/40">
        <span className="label text-text">{label}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse min-w-[460px]">
          <thead>
            <tr className="bg-bg-elev/20">
              <th className="text-left py-2.5 px-4 text-[10px] uppercase tracking-wider text-text-faint w-14">Hole</th>
              {holes.map((h) => (
                <th key={h.hole} className="py-2.5 px-1 text-xs tabular text-text w-10">
                  {h.hole}
                </th>
              ))}
              <th className="py-2.5 px-2 text-[10px] uppercase tracking-wider text-gold w-12 border-l border-divider">
                {label === "Front Nine" ? "Out" : "In"}
              </th>
              {showTotal && (
                <th className="py-2.5 px-2 text-[10px] uppercase tracking-wider text-gold w-12 border-l border-divider">Tot</th>
              )}
            </tr>
          </thead>
          <tbody>
            <tr className="border-t border-divider">
              <td className="text-left py-2 px-4 text-[10px] uppercase tracking-wider text-text-faint">Par</td>
              {holes.map((h) => (
                <td key={h.hole} className="py-2 px-1 text-xs tabular text-text-muted">
                  {h.par}
                </td>
              ))}
              <td className="py-2 px-2 text-xs tabular text-text-muted border-l border-divider">{holesPar}</td>
              {showTotal && (
                <td className="py-2 px-2 text-xs tabular text-text-muted border-l border-divider">{totalPar}</td>
              )}
            </tr>
            <tr className="border-t border-divider bg-bg-elev/30">
              <td className="text-left py-1.5 px-4 text-[10px] uppercase tracking-wider text-text">Score</td>
              {holes.map((h) => (
                <td key={h.hole} className="py-0.5 px-0">
                  <div className="flex justify-center">
                    <ScoreCell strokes={h.strokes} toPar={h.toPar} />
                  </div>
                </td>
              ))}
              <td className="py-2 px-2 text-sm font-serif tabular text-text border-l border-divider">
                {holesStrokes}
              </td>
              {showTotal && (
                <td className="py-2 px-2 text-sm font-serif tabular text-gold border-l border-divider">
                  {totalStrokes}
                </td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

function scoreColor(score: number | null): string {
  if (score === null) return "text-gold";
  if (score < 0) return "text-counting";
  if (score > 0) return "text-cut";
  return "text-gold";
}

export default function ScorecardModal({
  golferName,
  scorecards,
  onClose,
}: ScorecardModalProps) {
  const [selectedRound, setSelectedRound] = useState(() =>
    Math.max(0, scorecards.length - 1)
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (scorecards.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-bg/80 backdrop-blur-md" />
        <div
          className="relative card p-6 text-center max-w-sm"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="font-serif text-2xl text-text mb-2">{golferName}</h3>
          <p className="text-sm text-text-muted">
            No scorecard yet — live data will appear once the round begins.
          </p>
          <button onClick={onClose} className="btn btn-ghost mt-5">
            Close
          </button>
        </div>
      </div>
    );
  }

  const card = scorecards[selectedRound];
  const front9 = card.holes.slice(0, 9);
  const back9 = card.holes.slice(9, 18);

  const front9Strokes = front9.reduce((s, h) => s + h.strokes, 0);
  const back9Strokes = back9.reduce((s, h) => s + h.strokes, 0);
  const front9Par = front9.reduce((s, h) => s + h.par, 0);
  const back9Par = back9.reduce((s, h) => s + h.par, 0);
  const totalPar = front9Par + (back9.length > 0 ? back9Par : 0);
  const totalStrokes = card.total ?? front9Strokes + back9Strokes;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-up" onClick={onClose}>
      <div className="absolute inset-0 bg-bg/80 backdrop-blur-md" />
      <div
        className="relative card overflow-hidden max-w-3xl w-full shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-divider bg-bg-elev/40 flex items-start justify-between">
          <div>
            <h3 className="font-serif text-2xl text-text leading-tight">{golferName}</h3>
            <p className="text-sm text-text-muted mt-1">
              Round{" "}
              <span className="text-text tabular">{card.round}</span>
              <span className="text-text-faint mx-1.5">·</span>
              <span className={`tabular font-medium ${scoreColor(card.toPar)}`}>
                {formatScore(card.toPar)}
              </span>
              <span className="text-text-faint mx-1.5">·</span>
              <span className="text-text tabular">{totalStrokes}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl text-text-muted hover:text-text leading-none px-2 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Round tabs */}
        {scorecards.length > 1 && (
          <div className="flex gap-1 px-6 py-2 border-b border-divider">
            {scorecards.map((sc, i) => (
              <button
                key={sc.round}
                onClick={() => setSelectedRound(i)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  i === selectedRound
                    ? "bg-masters-green text-white"
                    : "text-text-muted hover:text-text"
                }`}
              >
                R{sc.round}{" "}
                <span className={`tabular ${i === selectedRound ? "" : scoreColor(sc.toPar)}`}>
                  ({formatScore(sc.toPar)})
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Scorecard */}
        <div className="p-5 space-y-4">
          <NineHoleTable
            label="Front Nine"
            holes={front9}
            holesStrokes={front9Strokes}
            holesPar={front9Par}
          />
          {back9.length > 0 && (
            <NineHoleTable
              label="Back Nine"
              holes={back9}
              holesStrokes={back9Strokes}
              holesPar={back9Par}
              showTotal
              totalStrokes={totalStrokes}
              totalPar={totalPar}
            />
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-x-4 gap-y-2 pt-3 border-t border-divider justify-center text-[11px] text-text-faint">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-gold flex items-center justify-center text-bg text-[9px] font-bold">2</span>
              Albatross
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full border border-gold flex items-center justify-center text-gold text-[9px]">3</span>
              Eagle
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full border border-gold flex items-center justify-center text-gold text-[9px]">3</span>
              Birdie
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-text-muted">4</span>
              Par
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 border border-cut flex items-center justify-center text-cut text-[9px]">5</span>
              Bogey
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 border border-cut flex items-center justify-center text-cut text-[9px]">6</span>
              Dbl Bogey+
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
