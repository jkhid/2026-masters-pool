"use client";
import { useEffect, useState } from "react";
import { RoundScorecard } from "@/lib/types";
import { formatScore } from "@/lib/scoring";

interface ScorecardModalProps {
  golferName: string;
  scorecards: RoundScorecard[];
  onClose: () => void;
}

function ScoreCell({ strokes, toPar }: { strokes: number; toPar: number }) {
  const base = "w-10 h-10 flex items-center justify-center";
  if (toPar <= -3) {
    return (
      <div className={base}>
        <div className="w-9 h-9 rounded-full border-2 border-yellow-400 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-yellow-400 text-black flex items-center justify-center text-sm font-bold">
            {strokes}
          </div>
        </div>
      </div>
    );
  }
  if (toPar === -2) {
    return (
      <div className={base}>
        <div className="w-9 h-9 rounded-full border-2 border-yellow-400 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border border-yellow-400 flex items-center justify-center text-sm font-bold text-yellow-400">
            {strokes}
          </div>
        </div>
      </div>
    );
  }
  if (toPar === -1) {
    return (
      <div className={base}>
        <div className="w-8 h-8 rounded-full border-2 border-red-400 flex items-center justify-center text-sm font-bold text-red-400">
          {strokes}
        </div>
      </div>
    );
  }
  if (toPar === 1) {
    return (
      <div className={base}>
        <div className="w-8 h-8 border-2 border-[#5b9bd5] flex items-center justify-center text-sm font-bold text-[#5b9bd5]">
          {strokes}
        </div>
      </div>
    );
  }
  if (toPar >= 2) {
    return (
      <div className={base}>
        <div className="w-9 h-9 border-2 border-[#5b9bd5] flex items-center justify-center">
          <div className="w-6 h-6 border border-[#5b9bd5] flex items-center justify-center text-sm font-bold text-[#5b9bd5]">
            {strokes}
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className={`${base} text-sm text-white/70`}>
      {strokes}
    </div>
  );
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
  holes: { hole: number; strokes: number; toPar: number; par: number }[];
  holesStrokes: number;
  holesPar: number;
  showTotal?: boolean;
  totalStrokes?: number;
  totalPar?: number;
}) {
  return (
    <div className="rounded-lg border border-card-border/40 overflow-hidden">
      {/* Section header */}
      <div className="bg-masters-green/15 px-4 py-2 border-b border-card-border/30">
        <span className="text-xs font-semibold uppercase tracking-widest text-masters-yellow/80">{label}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-center border-collapse min-w-[480px]">
          {/* Hole numbers */}
          <thead>
            <tr className="bg-white/[0.03]">
              <th className="text-left py-3 px-4 w-16 text-xs font-semibold text-text-muted uppercase tracking-wider">Hole</th>
              {holes.map(h => (
                <th key={h.hole} className="py-3 px-1 text-sm font-semibold text-white/90 w-11">{h.hole}</th>
              ))}
              <th className="py-3 px-2 text-sm font-bold text-white w-14 border-l-2 border-card-border/60">
                {label === "Front Nine" ? "Out" : "In"}
              </th>
              {showTotal && (
                <th className="py-3 px-2 text-sm font-bold text-masters-yellow w-14 border-l-2 border-card-border/60">Tot</th>
              )}
            </tr>
          </thead>
          <tbody>
            {/* Par row */}
            <tr className="border-t border-card-border/20">
              <td className="text-left py-3 px-4 text-xs font-semibold text-text-muted uppercase tracking-wider">Par</td>
              {holes.map(h => (
                <td key={h.hole} className="py-3 px-1 text-sm text-text-muted/80">{h.par}</td>
              ))}
              <td className="py-3 px-2 text-sm font-bold text-text-muted border-l-2 border-card-border/60">{holesPar}</td>
              {showTotal && (
                <td className="py-3 px-2 text-sm font-bold text-text-muted border-l-2 border-card-border/60">{totalPar}</td>
              )}
            </tr>
            {/* Score row */}
            <tr className="border-t border-card-border/20 bg-white/[0.02]">
              <td className="text-left py-2 px-4 text-xs font-semibold text-white uppercase tracking-wider">Score</td>
              {holes.map(h => (
                <td key={h.hole} className="py-1 px-0">
                  <div className="flex justify-center">
                    <ScoreCell strokes={h.strokes} toPar={h.toPar} />
                  </div>
                </td>
              ))}
              <td className="py-3 px-2 text-base font-bold text-white border-l-2 border-card-border/60">{holesStrokes}</td>
              {showTotal && (
                <td className="py-3 px-2 text-base font-bold text-masters-yellow border-l-2 border-card-border/60">{totalStrokes}</td>
              )}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ScorecardModal({ golferName, scorecards, onClose }: ScorecardModalProps) {
  const [selectedRound, setSelectedRound] = useState(0);

  useEffect(() => {
    if (scorecards.length > 0) {
      setSelectedRound(scorecards.length - 1);
    }
  }, [scorecards]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (scorecards.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
        <div className="relative bg-card-bg border border-card-border rounded-xl p-6 text-center max-w-sm" onClick={e => e.stopPropagation()}>
          <h3 className="text-lg font-serif text-masters-yellow mb-2">{golferName}</h3>
          <p className="text-text-muted text-sm">Scorecard not yet available.</p>
          <button onClick={onClose} className="mt-4 px-4 py-2 bg-masters-green/30 text-white rounded-lg text-sm hover:bg-masters-green/50 transition-colors">
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
  const totalStrokes = card.total ?? (front9Strokes + back9Strokes);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className="relative bg-card-bg border border-card-border rounded-xl overflow-hidden max-w-3xl w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-masters-green/20 border-b border-card-border px-6 py-5 flex items-center justify-between">
          <div>
            <h3 className="text-2xl font-serif text-masters-yellow">{golferName}</h3>
            <p className="text-sm text-text-muted mt-1">
              Round {card.round} &middot;{" "}
              <span className={`font-bold ${
                card.toPar !== null && card.toPar < 0 ? "text-red-400" :
                card.toPar !== null && card.toPar > 0 ? "text-blue-400" :
                "text-masters-yellow"
              }`}>
                {formatScore(card.toPar)}
              </span>
              {" "}({totalStrokes})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white text-3xl leading-none px-2 transition-colors"
          >
            &times;
          </button>
        </div>

        {/* Round tabs */}
        {scorecards.length > 1 && (
          <div className="flex gap-1.5 px-6 pt-4">
            {scorecards.map((sc, i) => (
              <button
                key={sc.round}
                onClick={() => setSelectedRound(i)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  i === selectedRound
                    ? "bg-masters-green text-white"
                    : "bg-white/5 text-text-muted hover:text-white hover:bg-white/10"
                }`}
              >
                R{sc.round} ({formatScore(sc.toPar)})
              </button>
            ))}
          </div>
        )}

        {/* Scorecard sections */}
        <div className="p-6 space-y-4">
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
          <div className="flex flex-wrap gap-5 pt-2 text-xs text-text-muted justify-center">
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-black text-[9px] font-bold">2</span>
              Albatross
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full border-2 border-yellow-400 flex items-center justify-center text-yellow-400 text-[9px] font-bold">3</span>
              Eagle
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 rounded-full border-2 border-red-400 flex items-center justify-center text-red-400 text-[9px] font-bold">3</span>
              Birdie
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-white/70 text-sm">4</span>
              Par
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 border-2 border-[#5b9bd5] flex items-center justify-center text-[#5b9bd5] text-[9px] font-bold">5</span>
              Bogey
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-5 h-5 border-2 border-[#5b9bd5] flex items-center justify-center text-[#5b9bd5] text-[9px] font-bold">6</span>
              Dbl Bogey+
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
