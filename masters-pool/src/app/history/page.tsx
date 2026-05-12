"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Contest } from "@/lib/types";

export default function HistoryPage() {
  const [contests, setContests] = useState<Contest[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/contests")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Failed to load history.");
        setContests(data.contests);
      })
      .catch((err) => setError(err.message));
  }, []);

  const historicalContests = useMemo(
    () => contests.filter((contest) => ["revealed", "complete", "archived"].includes(contest.status)),
    [contests],
  );

  return (
    <div className="min-h-screen bg-bg text-text">
      <header className="border-b border-card-border bg-[#111712]">
        <div className="mx-auto max-w-6xl px-4 py-5">
          <Link href="/" className="text-sm text-masters-gold hover:underline">
            Back to majors
          </Link>
          <h1 className="mt-3 text-3xl font-bold text-white sm:text-5xl">History</h1>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        {error && (
          <div className="rounded-md border border-cut/40 bg-cut/10 p-4 text-sm text-red-100">{error}</div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {historicalContests.map((contest) => (
            <Link
              key={contest.id}
              href={`/history/${contest.id}`}
              className="rounded-lg border border-card-border bg-card-bg p-5 transition hover:border-masters-gold/70"
            >
              <p className="text-sm text-text-muted">{contest.year}</p>
              <h2 className="mt-1 text-2xl font-bold text-white">{contest.name}</h2>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-masters-gold">{contest.status}</p>
            </Link>
          ))}
        </div>

        {historicalContests.length === 0 && !error && (
          <div className="rounded-lg border border-card-border bg-card-bg p-5 text-sm text-text-muted">
            Completed majors will show here after picks reveal.
          </div>
        )}
      </main>
    </div>
  );
}
