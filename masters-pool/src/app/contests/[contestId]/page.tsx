"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ContestPick, GolferScore, PublicContestState, ScoreData } from "@/lib/types";
import { calculateStandingsForPlayers, ScoringPlayerPicks } from "@/lib/scoring";
import { useScores } from "@/hooks/useScores";
import PicksGrid from "@/components/PicksGrid";
import Leaderboard from "@/components/Leaderboard";
import GolferScoreboard from "@/components/GolferScoreboard";
import CutLineHeader from "@/components/CutLineHeader";
import PlayerDetail from "@/components/PlayerDetail";
import { ScorecardProvider } from "@/contexts/ScorecardContext";

type RevealedTab = "picks" | "leaderboard" | "golfers";

const EMPTY_SCORE_DATA: ScoreData = {
  golfers: {},
  lastUpdated: "",
  tournamentStatus: "pre",
  tournamentRound: 1,
  source: "manual",
  cutLine: null,
};

export default function ContestPage() {
  const params = useParams<{ contestId: string }>();
  const contestId = params.contestId;
  const [state, setState] = useState<PublicContestState | null>(null);
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [signedIn, setSignedIn] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [picksByTierId, setPicksByTierId] = useState<Record<string, string>>({});
  const [revealedTab, setRevealedTab] = useState<RevealedTab>("picks");
  const [selectedPoolPlayer, setSelectedPoolPlayer] = useState<string | null>(null);
  const { scoreData } = useScores();

  const loadContest = useCallback(async () => {
    if (!contestId) return;
    setError("");
    try {
      const response = await fetch(`/api/contests/${contestId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load contest.");
      setState(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contest.");
    }
  }, [contestId]);

  useEffect(() => {
    loadContest();
  }, [loadContest]);

  const hasStarted = useMemo(() => {
    if (!state?.contest.startsAt) return false;
    return new Date(state.contest.startsAt).getTime() <= Date.now();
  }, [state]);

  const { players, poolGolfers, ownersByGolfer } = useMemo(() => {
    if (!state?.revealPicks) {
      return { players: [] as ScoringPlayerPicks[], poolGolfers: [] as string[], ownersByGolfer: {} as Record<string, string[]> };
    }
    const players: ScoringPlayerPicks[] = state.pickSets.map((pickSet) => ({
      name: pickSet.participant.displayName,
      golfers: pickSet.picks.map((pick) => pick.golferName),
    }));
    const owners: Record<string, string[]> = {};
    for (const player of players) {
      for (const golfer of player.golfers) {
        (owners[golfer] ??= []).push(player.name);
      }
    }
    const golfers = Object.keys(owners).sort();
    return { players, poolGolfers: golfers, ownersByGolfer: owners };
  }, [state]);

  // Effective score data for display:
  // - If tournament has started: use real ESPN data (scores + IDs)
  // - If not started: blank scores, but preserve espnIds from ESPN so headshots still load
  //   (ESPN IDs are stable per-golfer regardless of which event is currently on the scoreboard)
  const effectiveScoreData: ScoreData = useMemo(() => {
    if (hasStarted && scoreData) return scoreData;
    if (!scoreData) return EMPTY_SCORE_DATA;

    const golfers: Record<string, GolferScore> = {};
    for (const [name, g] of Object.entries(scoreData.golfers)) {
      golfers[name] = {
        name,
        rounds: [null, null, null, null],
        total: null,
        thru: null,
        status: "active",
        position: null,
        today: null,
        espnId: g.espnId,
      };
    }
    return { ...EMPTY_SCORE_DATA, golfers };
  }, [hasStarted, scoreData]);

  const liveScoringActive = hasStarted && !!scoreData;

  const standings = useMemo(() => {
    if (!state?.revealPicks) return [];
    return calculateStandingsForPlayers(effectiveScoreData, players);
  }, [state, players, effectiveScoreData]);

  const selectedStanding = standings.find((s) => s.name === selectedPoolPlayer) || null;

  const handleSignIn = async () => {
    if (!name.trim() || !pin) {
      setError("Enter your name and PIN.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/contests/${contestId}/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to sign in.");

      const tierIdToGolfer: Record<string, string> = {};
      for (const pick of (data.picks ?? []) as ContestPick[]) {
        tierIdToGolfer[pick.tierId] = pick.golferName;
      }
      setPicksByTierId(tierIdToGolfer);
      setSignedIn(true);

      if (data.isNew) {
        setMessage("Welcome. Pick one golfer from each tier and save.");
      } else if (Object.keys(tierIdToGolfer).length > 0) {
        setMessage("Signed in. Your existing picks are loaded — edit them below.");
      } else {
        setMessage("Signed in. Make your picks and save.");
      }

      await loadContest();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in.");
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitPicks = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/contests/${contestId}/picks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, pin, picksByTierId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to save picks.");
      setMessage("Picks saved. You can edit them until the contest reveals.");
      await loadContest();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save picks.");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    setSignedIn(false);
    setName("");
    setPin("");
    setPicksByTierId({});
    setMessage("Signed out.");
  };

  if (!state && !error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-text-muted">
        Loading…
      </div>
    );
  }

  const hasExistingPicks = signedIn && Object.keys(picksByTierId).length > 0;
  const submitLabel = hasExistingPicks ? "Update Picks" : "Save Picks";

  return (
    <ScorecardProvider scoreData={effectiveScoreData}>
      <div className="min-h-screen flex flex-col">
        {/* Top bar */}
        <div className="border-b border-border bg-bg-elev/60 backdrop-blur-sm">
          <div className="mx-auto max-w-6xl px-6 py-4 flex items-center justify-between">
            <Link href="/" className="text-sm text-text-muted hover:text-gold transition-colors">
              ← Contests
            </Link>
            {liveScoringActive && (
              <span className="inline-flex items-center gap-1.5 text-xs text-counting">
                <span className="w-1.5 h-1.5 rounded-full bg-counting animate-pulse-live" />
                Live
              </span>
            )}
          </div>
        </div>

        {/* Hero */}
        {state && (
          <header className="border-b border-border bg-bg-elev/40">
            <div className="mx-auto max-w-6xl px-6 py-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
                <div>
                  <div className="label text-gold mb-2">{state.contest.year} · {state.revealPicks ? "Picks Revealed" : "Picks Open"}</div>
                  <h1 className="font-serif text-4xl sm:text-5xl text-text leading-tight">
                    {state.contest.name}
                  </h1>
                  {state.contest.startsAt && (
                    <p className="text-sm text-text-muted mt-2">
                      Tees off{" "}
                      <span className="tabular text-text">
                        {new Date(state.contest.startsAt).toLocaleDateString(undefined, {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                        })}
                      </span>
                    </p>
                  )}
                </div>
                <div className="card-elev px-5 py-3 inline-flex items-baseline gap-5">
                  <div>
                    <div className="text-2xl font-serif text-text tabular">
                      {state.submittedCount}
                    </div>
                    <div className="label text-text-faint text-[10px]">Submitted</div>
                  </div>
                  <div className="text-text-faint">/</div>
                  <div>
                    <div className="text-2xl font-serif text-text-muted tabular">
                      {state.contest.expectedParticipants ?? state.activeParticipantCount}
                    </div>
                    <div className="label text-text-faint text-[10px]">
                      {state.contest.expectedParticipants ? "Required" : "Active"}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>
        )}

        <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-6 space-y-4">
          {error && (
            <div className="card border-cut/40 bg-cut/[0.04] p-4">
              <div className="label text-cut mb-0.5">Error</div>
              <p className="text-sm">{error}</p>
            </div>
          )}
          {message && (
            <div className="card border-gold/30 bg-gold/[0.04] p-4">
              <p className="text-sm text-text">{message}</p>
            </div>
          )}

          {state && state.revealPicks && (
            <RevealedView
              tab={revealedTab}
              onTabChange={setRevealedTab}
              standings={standings}
              players={players}
              poolGolfers={poolGolfers}
              ownersByGolfer={ownersByGolfer}
              scoreData={effectiveScoreData}
              hasStarted={hasStarted}
              liveScoringActive={liveScoringActive}
              startsAt={state.contest.startsAt}
              selectedPoolPlayer={selectedPoolPlayer}
              setSelectedPoolPlayer={setSelectedPoolPlayer}
              selectedStanding={selectedStanding}
            />
          )}

          {state && !state.revealPicks && (
            <PrePickView
              state={state}
              name={name}
              setName={setName}
              pin={pin}
              setPin={setPin}
              signedIn={signedIn}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              saving={saving}
              picksByTierId={picksByTierId}
              setPicksByTierId={setPicksByTierId}
              onSubmitPicks={handleSubmitPicks}
              submitLabel={submitLabel}
            />
          )}
        </main>

        <footer className="border-t border-border mt-8 py-6 text-center text-xs text-text-faint">
          <p className="font-serif italic text-sm text-text-muted">A tradition unlike any other.</p>
        </footer>
      </div>
    </ScorecardProvider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// REVEALED VIEW
// ─────────────────────────────────────────────────────────────────────────────

interface RevealedViewProps {
  tab: RevealedTab;
  onTabChange: (tab: RevealedTab) => void;
  standings: ReturnType<typeof calculateStandingsForPlayers>;
  players: ScoringPlayerPicks[];
  poolGolfers: string[];
  ownersByGolfer: Record<string, string[]>;
  scoreData: ScoreData;
  hasStarted: boolean;
  liveScoringActive: boolean;
  startsAt: string | null;
  selectedPoolPlayer: string | null;
  setSelectedPoolPlayer: (name: string | null) => void;
  selectedStanding: ReturnType<typeof calculateStandingsForPlayers>[number] | null;
}

function RevealedView({
  tab,
  onTabChange,
  standings,
  players,
  poolGolfers,
  ownersByGolfer,
  scoreData,
  hasStarted,
  liveScoringActive,
  startsAt,
  selectedPoolPlayer,
  setSelectedPoolPlayer,
  selectedStanding,
}: RevealedViewProps) {
  return (
    <div className="space-y-4">
      {!hasStarted && (
        <div className="card border-gold/30 bg-gold/[0.04] p-5">
          <div className="label text-gold mb-1">Pre-tournament</div>
          <p className="text-sm text-text">
            {startsAt
              ? <>The tournament tees off <span className="tabular text-gold">{new Date(startsAt).toLocaleString()}</span>. Live scoring begins then.</>
              : "Live scoring will begin once the tournament tees off."}
          </p>
        </div>
      )}

      {liveScoringActive && scoreData.cutLine && (
        <CutLineHeader
          cutLine={scoreData.cutLine}
          golfers={scoreData.golfers}
          tournamentRound={scoreData.tournamentRound}
          poolGolfers={poolGolfers}
          ownersByGolfer={ownersByGolfer}
        />
      )}

      {/* Tabs */}
      <div className="flex gap-1 bg-bg-elev/60 border border-border rounded-lg p-1 w-fit">
        <TabButton active={tab === "picks"} onClick={() => onTabChange("picks")}>Picks</TabButton>
        <TabButton active={tab === "leaderboard"} onClick={() => onTabChange("leaderboard")}>Standings</TabButton>
        <TabButton active={tab === "golfers"} onClick={() => onTabChange("golfers")}>All Golfers</TabButton>
      </div>

      {tab === "picks" && (
        players.length === 0 ? (
          <EmptyCard>No picks recorded yet.</EmptyCard>
        ) : (
          <PicksGrid standings={standings} />
        )
      )}

      {tab === "leaderboard" && (
        <div className="space-y-4">
          <Leaderboard
            standings={standings}
            onSelectPlayer={(name) =>
              setSelectedPoolPlayer(selectedPoolPlayer === name ? null : name)
            }
            selectedPlayer={selectedPoolPlayer}
          />
          {selectedStanding && (
            <PlayerDetail
              player={selectedStanding}
              onClose={() => setSelectedPoolPlayer(null)}
            />
          )}
        </div>
      )}

      {tab === "golfers" && (
        poolGolfers.length === 0 ? (
          <EmptyCard>No golfers picked yet.</EmptyCard>
        ) : (
          <GolferScoreboard
            scoreData={scoreData}
            golfers={poolGolfers}
            ownersByGolfer={ownersByGolfer}
          />
        )
      )}
    </div>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? "bg-masters-green text-white"
          : "text-text-muted hover:text-text"
      }`}
    >
      {children}
    </button>
  );
}

function EmptyCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="card p-10 text-center text-text-muted">
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PRE-REVEAL VIEW
// ─────────────────────────────────────────────────────────────────────────────

interface PrePickViewProps {
  state: PublicContestState;
  name: string;
  setName: (name: string) => void;
  pin: string;
  setPin: (pin: string) => void;
  signedIn: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  saving: boolean;
  picksByTierId: Record<string, string>;
  setPicksByTierId: (picks: Record<string, string>) => void;
  onSubmitPicks: () => void;
  submitLabel: string;
}

function PrePickView({
  state,
  name,
  setName,
  pin,
  setPin,
  signedIn,
  onSignIn,
  onSignOut,
  saving,
  picksByTierId,
  setPicksByTierId,
  onSubmitPicks,
  submitLabel,
}: PrePickViewProps) {
  const isOpen = state.contest.status === "open";
  const picksCount = Object.keys(picksByTierId).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
      {/* LEFT: Sign-in + participants */}
      <section className="space-y-4">
        {/* Sign in */}
        <div className="card p-5">
          <h2 className="font-serif text-xl text-text mb-1">
            {signedIn ? "Signed in" : "Sign in or join"}
          </h2>
          <p className="text-sm text-text-muted mb-4">
            {signedIn
              ? "Your existing picks are loaded. Edit and update at will."
              : "Use the same name & PIN to retrieve picks. A new name creates a new entry."}
          </p>

          <div className="space-y-3">
            <div>
              <label className="label block mb-1.5">Name</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                disabled={signedIn}
                className="input"
              />
            </div>
            <div>
              <label className="label block mb-1.5">PIN</label>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="••••"
                type="password"
                disabled={signedIn}
                className="input"
              />
            </div>
            {!signedIn ? (
              <button
                onClick={onSignIn}
                disabled={saving || !isOpen || !name.trim() || !pin}
                className="btn btn-primary w-full"
              >
                {isOpen ? "Sign in / Join" : "Picks locked"}
              </button>
            ) : (
              <button onClick={onSignOut} className="btn btn-ghost w-full">
                Sign out
              </button>
            )}
          </div>
        </div>

        {/* Participants */}
        <div className="card p-5">
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="font-serif text-xl text-text">Participants</h2>
            <span className="label tabular">{state.participants.length}</span>
          </div>
          {state.participants.length === 0 ? (
            <p className="text-sm text-text-muted italic">No one has joined yet.</p>
          ) : (
            <ul className="space-y-0">
              {state.participants.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between py-2.5 border-b border-divider last:border-b-0"
                >
                  <span
                    className={`text-sm ${
                      p.isBooted ? "text-text-faint line-through" : "text-text"
                    }`}
                  >
                    {p.displayName}
                  </span>
                  <span
                    className={`text-xs ${
                      p.isBooted
                        ? "text-cut"
                        : p.submittedAt
                          ? "text-counting"
                          : "text-text-faint"
                    }`}
                  >
                    {p.isBooted ? "Booted" : p.submittedAt ? "✓ Submitted" : "Pending"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* RIGHT: Tier picker */}
      <section className="space-y-4">
        <div className="card border-gold/30 bg-gold/[0.04] p-4 flex items-center justify-between">
          <div className="text-sm text-text">
            Picks stay hidden until{" "}
            <span className="text-gold">
              {state.contest.expectedParticipants
                ? `${state.contest.expectedParticipants} participants submit`
                : "everyone submits"}
            </span>
            .
          </div>
          <div className="text-right shrink-0 ml-3">
            <div className="font-serif text-2xl text-gold tabular">{picksCount}/6</div>
            <div className="label text-text-faint text-[10px]">Picked</div>
          </div>
        </div>

        <fieldset disabled={!signedIn || !isOpen} className="space-y-3 disabled:opacity-50">
          {state.tiers.map((tier) => {
            const selectedGolfer = picksByTierId[tier.id];
            return (
              <div key={tier.id} className="card overflow-hidden">
                <div className="px-5 py-3 border-b border-border flex items-baseline justify-between">
                  <h3 className="font-serif text-lg text-text">{tier.label}</h3>
                  <span className="label tabular">{tier.golfers.length} golfers</span>
                </div>
                <div className="p-2 grid gap-1 sm:grid-cols-2">
                  {tier.golfers.map((golfer) => {
                    const isSelected = selectedGolfer === golfer.name;
                    return (
                      <label
                        key={golfer.id}
                        className={`relative cursor-pointer px-3.5 py-2.5 rounded-md text-sm transition-all border ${
                          isSelected
                            ? "border-gold/60 bg-gold/10 text-gold"
                            : "border-transparent hover:bg-surface-2 text-text"
                        }`}
                      >
                        <input
                          type="radio"
                          name={tier.id}
                          value={golfer.name}
                          checked={isSelected}
                          onChange={() =>
                            setPicksByTierId({ ...picksByTierId, [tier.id]: golfer.name })
                          }
                          className="sr-only"
                        />
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate">
                            {golfer.name}
                          </span>
                          {golfer.worldRank && (
                            <span className="text-xs text-text-faint tabular shrink-0">
                              #{golfer.worldRank}
                            </span>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <button
            onClick={onSubmitPicks}
            disabled={saving || !signedIn || !isOpen || picksCount !== 6}
            className="btn btn-gold w-full text-sm py-3"
          >
            {picksCount !== 6
              ? `Pick ${6 - picksCount} more`
              : submitLabel}
          </button>
        </fieldset>

        {!signedIn && (
          <p className="text-center text-xs text-text-muted">
            Sign in to make or edit your picks.
          </p>
        )}
      </section>
    </div>
  );
}
