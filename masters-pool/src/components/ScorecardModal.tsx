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
  if (toPar <= -3) {
    // Albatross or better: filled double circle
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-yellow-400 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full bg-yellow-400 text-black flex items-center justify-center text-xs font-bold">
            {strokes}
          </div>
        </div>
      </div>
    );
  }
  if (toPar === -2) {
    // Eagle: double circle
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <div className="w-7 h-7 rounded-full border-2 border-yellow-400 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border border-yellow-400 flex items-center justify-center text-xs font-bold text-yellow-400">
            {strokes}
          </div>
        </div>
      </div>
    );
  }
  if (toPar === -1) {
    // Birdie: single circle
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-red-400 flex items-center justify-center text-xs font-bold text-red-400">
          {strokes}
        </div>
      </div>
    );
  }
  if (toPar === 1) {
    // Bogey: single square
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#5b9bd5] flex items-center justify-center text-xs font-bold text-[#5b9bd5]">
          {strokes}
        </div>
      </div>
    );
  }
  if (toPar >= 2) {
    // Double bogey+: double square
    return (
      <div className="w-8 h-8 flex items-center justify-center">
        <div className="w-7 h-7 border-2 border-[#5b9bd5] flex items-center justify-center">
          <div className="w-5 h-5 border border-[#5b9bd5] flex items-center justify-center text-xs font-bold text-[#5b9bd5]">
            {strokes}
          </div>
        </div>
      </div>
    );
  }
  // Par: plain number
  return (
    <div className="w-8 h-8 flex items-center justify-center text-xs text-text-muted">
      {strokes}
    </div>
  );
}

export default function ScorecardModal({ golferName, scorecards, onClose }: ScorecardModalProps) {
  const [selectedRound, setSelectedRound] = useState(0);

  // Default to the latest round with data
  useEffect(() => {
    if (scorecards.length > 0) {
      setSelectedRound(scorecards.length - 1);
    }
  }, [scorecards]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll
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
        className="relative bg-card-bg border border-card-border rounded-xl overflow-hidden max-w-2xl w-full shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-masters-green/20 border-b border-card-border px-5 py-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-serif text-masters-yellow">{golferName}</h3>
            <p className="text-sm text-text-muted mt-0.5">
              Round {card.round} &middot; {formatScore(card.toPar)} ({totalStrokes})
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-white text-2xl leading-none px-2"
          >
            &times;
          </button>
        </div>

        {/* Round tabs */}
        {scorecards.length > 1 && (
          <div className="flex gap-1 px-5 pt-3">
            {scorecards.map((sc, i) => (
              <button
                key={sc.round}
                onClick={() => setSelectedRound(i)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  i === selectedRound
                    ? "bg-masters-green text-white"
                    : "bg-white/5 text-text-muted hover:text-white"
                }`}
              >
                R{sc.round} ({formatScore(sc.toPar)})
              </button>
            ))}
          </div>
        )}

        {/* Scorecard */}
        <div className="p-5 overflow-x-auto">
          {/* Front 9 */}
          <table className="w-full text-center text-xs border-collapse mb-3">
            <thead>
              <tr className="text-text-muted/60 uppercase tracking-wider">
                <th className="text-left py-1.5 px-1 w-12 font-medium">Hole</th>
                {front9.map(h => (
                  <th key={h.hole} className="py-1.5 px-0.5 font-medium w-8">{h.hole}</th>
                ))}
                <th className="py-1.5 px-1 font-bold w-10 border-l border-card-border">Out</th>
              </tr>
            </thead>
            <tbody>
              <tr className="text-text-muted/80 border-t border-card-border/30">
                <td className="text-left py-1.5 px-1 font-medium">Par</td>
                {front9.map(h => (
                  <td key={h.hole} className="py-1.5 px-0.5">{h.par}</td>
                ))}
                <td className="py-1.5 px-1 font-bold border-l border-card-border">{front9Par}</td>
              </tr>
              <tr className="border-t border-card-border/30">
                <td className="text-left py-2 px-1 font-medium text-white">Score</td>
                {front9.map(h => (
                  <td key={h.hole} className="py-1 px-0">
                    <div className="flex justify-center">
                      <ScoreCell strokes={h.strokes} toPar={h.toPar} />
                    </div>
                  </td>
                ))}
                <td className="py-1.5 px-1 font-bold text-white border-l border-card-border">{front9Strokes}</td>
              </tr>
            </tbody>
          </table>

          {/* Back 9 */}
          {back9.length > 0 && (
            <table className="w-full text-center text-xs border-collapse">
              <thead>
                <tr className="text-text-muted/60 uppercase tracking-wider">
                  <th className="text-left py-1.5 px-1 w-12 font-medium">Hole</th>
                  {back9.map(h => (
                    <th key={h.hole} className="py-1.5 px-0.5 font-medium w-8">{h.hole}</th>
                  ))}
                  <th className="py-1.5 px-1 font-bold w-10 border-l border-card-border">In</th>
                  <th className="py-1.5 px-1 font-bold w-10 border-l border-card-border">Tot</th>
                </tr>
              </thead>
              <tbody>
                <tr className="text-text-muted/80 border-t border-card-border/30">
                  <td className="text-left py-1.5 px-1 font-medium">Par</td>
                  {back9.map(h => (
                    <td key={h.hole} className="py-1.5 px-0.5">{h.par}</td>
                  ))}
                  <td className="py-1.5 px-1 font-bold border-l border-card-border">{back9Par}</td>
                  <td className="py-1.5 px-1 font-bold border-l border-card-border">{totalPar}</td>
                </tr>
                <tr className="border-t border-card-border/30">
                  <td className="text-left py-2 px-1 font-medium text-white">Score</td>
                  {back9.map(h => (
                    <td key={h.hole} className="py-1 px-0">
                      <div className="flex justify-center">
                        <ScoreCell strokes={h.strokes} toPar={h.toPar} />
                      </div>
                    </td>
                  ))}
                  <td className="py-1.5 px-1 font-bold text-white border-l border-card-border">{back9Strokes}</td>
                  <td className="py-1.5 px-1 font-bold text-white border-l border-card-border">{totalStrokes}</td>
                </tr>
              </tbody>
            </table>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-card-border/30 text-[10px] text-text-muted justify-center">
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full bg-yellow-400 flex items-center justify-center text-black text-[8px] font-bold">2</span>
              Albatross
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full border border-yellow-400 flex items-center justify-center text-yellow-400 text-[8px] font-bold">3</span>
              Eagle
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 rounded-full border border-red-400 flex items-center justify-center text-red-400 text-[8px] font-bold">3</span>
              Birdie
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-[8px]">4</span>
              Par
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 border border-[#5b9bd5] flex items-center justify-center text-[#5b9bd5] text-[8px] font-bold">5</span>
              Bogey
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-4 h-4 border-2 border-[#5b9bd5] flex items-center justify-center text-[#5b9bd5] text-[8px] font-bold">6</span>
              Dbl Bogey+
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
