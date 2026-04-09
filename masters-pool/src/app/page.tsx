"use client";
import { useState } from "react";
import { useScores } from "@/hooks/useScores";
import { calculateStandings } from "@/lib/scoring";
import Header from "@/components/Header";
import Leaderboard from "@/components/Leaderboard";
import PlayerDetail from "@/components/PlayerDetail";
import GolferScoreboard from "@/components/GolferScoreboard";
import PicksGrid from "@/components/PicksGrid";

type Tab = "leaderboard" | "picks" | "golfers";

export default function Home() {
  const { scoreData, loading, error, lastFetch, isRefreshing } = useScores();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("picks");

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-masters-green border-t-masters-yellow rounded-full animate-spin mx-auto mb-4" />
          <p className="text-text-muted font-serif italic">Loading scores from Augusta...</p>
        </div>
      </div>
    );
  }

  if (error && !scoreData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg">
        <div className="text-center bg-card-bg p-8 rounded-lg border border-card-border max-w-md">
          <p className="text-cut text-lg mb-2">Unable to load scores</p>
          <p className="text-text-muted text-sm">{error}</p>
          <p className="text-text-muted text-sm mt-4">
            The tournament may not have started yet, or scores are being updated.
          </p>
        </div>
      </div>
    );
  }

  const standings = scoreData ? calculateStandings(scoreData) : [];
  const selectedStanding = standings.find(s => s.name === selectedPlayer) || null;

  return (
    <div className="min-h-screen bg-bg">
      <Header
        lastFetch={lastFetch}
        isRefreshing={isRefreshing}
        source={scoreData?.source}
      />

      {/* Error banner */}
      {error && scoreData && (
        <div className="bg-amber-900/50 border-b border-amber-600 px-4 py-2 text-center text-sm text-amber-200">
          Using cached data — live updates temporarily unavailable
        </div>
      )}

      {/* Tournament status */}
      {scoreData?.tournamentStatus === "pre" && (
        <div className="bg-masters-green/30 border-b border-masters-green px-4 py-3 text-center">
          <p className="text-masters-yellow font-serif">
            Tournament has not started yet — Starts Thursday
          </p>
        </div>
      )}

      {/* Tab navigation */}
      <div className="max-w-6xl mx-auto px-4 pt-4">
        <div className="flex gap-1 bg-card-bg rounded-lg p-1 border border-card-border w-fit">
          <button
            onClick={() => { setTab("picks"); setSelectedPlayer(null); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "picks"
                ? "bg-masters-green text-white"
                : "text-text-muted hover:text-white"
            }`}
          >
            Picks
          </button>
          <button
            onClick={() => { setTab("leaderboard"); setSelectedPlayer(null); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "leaderboard"
                ? "bg-masters-green text-white"
                : "text-text-muted hover:text-white"
            }`}
          >
            Pool Standings
          </button>
          <button
            onClick={() => { setTab("golfers"); setSelectedPlayer(null); }}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              tab === "golfers"
                ? "bg-masters-green text-white"
                : "text-text-muted hover:text-white"
            }`}
          >
            All Golfers
          </button>
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 py-4 space-y-4">
        {tab === "leaderboard" && (
          <>
            <Leaderboard
              standings={standings}
              onSelectPlayer={(name) => setSelectedPlayer(
                selectedPlayer === name ? null : name
              )}
              selectedPlayer={selectedPlayer}
            />
            {selectedStanding && (
              <PlayerDetail
                player={selectedStanding}
                onClose={() => setSelectedPlayer(null)}
              />
            )}
          </>
        )}

        {tab === "picks" && (
          <PicksGrid standings={standings} />
        )}

        {tab === "golfers" && scoreData && (
          <GolferScoreboard scoreData={scoreData} />
        )}
      </main>

      <footer className="border-t border-card-border mt-8 py-4 text-center text-xs text-text-muted">
        <p>Best 4 of 6 golfer scores count &middot; Cut golfers get 80 for R3 &amp; R4 &middot; Lowest score wins</p>
        <p className="mt-1 font-serif italic text-masters-green">A Tradition Unlike Any Other</p>
      </footer>
    </div>
  );
}
