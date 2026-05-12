"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { PublicContestState } from "@/lib/types";

function getPickCounts(state: PublicContestState) {
  const counts = new Map<string, number>();
  for (const pickSet of state.pickSets) {
    for (const pick of pickSet.picks) {
      counts.set(pick.golferName, (counts.get(pick.golferName) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export default function HistoryDetailPage() {
  const params = useParams<{ contestId: string }>();
  const [state, setState] = useState<PublicContestState | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/contests/${params.contestId}`)
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Failed to load history.");
        setState(data);
      })
      .catch((err) => setError(err.message));
  }, [params.contestId]);

  const pickCounts = useMemo(() => (state ? getPickCounts(state) : []), [state]);
  const sleeperPicks = pickCounts.filter(([, count]) => count === 1).slice(0, 8);

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-card-border bg-[#111712]">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <Link href="/history" className="text-sm text-masters-gold hover:underline">
            Back to history
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-5xl">{state?.contest.name ?? "Major History"}</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6">
        {error && (
          <div className="rounded-md border border-cut/40 bg-cut/10 p-4 text-sm text-red-100">{error}</div>
        )}

        {state && !state.revealPicks && (
          <div className="rounded-lg border border-card-border bg-card-bg p-5 text-sm text-text-muted">
            This contest has not revealed picks yet.
          </div>
        )}

        {state?.revealPicks && (
          <>
            <section className="grid gap-4 md:grid-cols-3">
              <div className="rounded-lg border border-card-border bg-card-bg p-5">
                <p className="text-sm text-text-muted">Participants</p>
                <p className="mt-2 text-4xl font-bold text-white">{state.activeParticipantCount}</p>
              </div>
              <div className="rounded-lg border border-card-border bg-card-bg p-5">
                <p className="text-sm text-text-muted">Unique Golfers Picked</p>
                <p className="mt-2 text-4xl font-bold text-white">{pickCounts.length}</p>
              </div>
              <div className="rounded-lg border border-card-border bg-card-bg p-5">
                <p className="text-sm text-text-muted">Sleeper Picks</p>
                <p className="mt-2 text-4xl font-bold text-white">{sleeperPicks.length}</p>
              </div>
            </section>

            <section className="grid gap-5 lg:grid-cols-2">
              <div className="rounded-lg border border-card-border bg-card-bg p-5">
                <h2 className="text-xl font-bold text-white">Pick Popularity</h2>
                <div className="mt-4 space-y-2">
                  {pickCounts.slice(0, 12).map(([golfer, count]) => (
                    <div key={golfer} className="flex items-center justify-between border-b border-white/10 py-2">
                      <span className="text-sm text-white">{golfer}</span>
                      <span className="text-sm text-masters-gold">{count}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-card-border bg-card-bg p-5">
                <h2 className="text-xl font-bold text-white">Sleeper Board</h2>
                <div className="mt-4 space-y-2">
                  {sleeperPicks.map(([golfer]) => (
                    <div key={golfer} className="border-b border-white/10 py-2 text-sm text-white">
                      {golfer}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-lg border border-card-border bg-card-bg p-5">
              <h2 className="text-xl font-bold text-white">Participant Picks</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {state.pickSets.map((pickSet) => (
                  <div key={pickSet.participant.id} className="rounded-md border border-card-border bg-bg p-4">
                    <h3 className="font-bold text-white">{pickSet.participant.displayName}</h3>
                    <ol className="mt-3 space-y-1 text-sm text-text-muted">
                      {pickSet.picks.map((pick) => (
                        <li key={pick.id}>{pick.golferName}</li>
                      ))}
                    </ol>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
