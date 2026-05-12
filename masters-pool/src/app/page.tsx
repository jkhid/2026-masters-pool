"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Contest, Major } from "@/lib/types";

const STATUS_STYLES: Record<Contest["status"], { label: string; className: string }> = {
  setup: { label: "Setup", className: "bg-bg-elev text-text-muted border-border" },
  open: { label: "Picks Open", className: "bg-counting/10 text-counting border-counting/30" },
  revealed: { label: "Revealed", className: "bg-gold/10 text-gold border-gold/30" },
  complete: { label: "Complete", className: "bg-bg-elev text-text-muted border-border" },
  archived: { label: "Archived", className: "bg-bg-elev text-text-faint border-border" },
};

export default function Home() {
  const [majors, setMajors] = useState<Major[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/contests")
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error ?? "Failed to load contests.");
        setMajors(data.majors);
        setContests(data.contests);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  const activeContests = useMemo(
    () => contests.filter((c) => c.status !== "archived"),
    [contests],
  );
  const archivedCount = contests.filter((c) => c.status === "archived").length;

  return (
    <div className="min-h-screen flex flex-col">
      {/* ───── Header ───── */}
      <header className="border-b border-border bg-bg-elev/60 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-text leading-tight">
              Majors Pool
            </h1>
            <p className="text-xs text-text-muted mt-0.5">
              Pick six. Best four count.
            </p>
          </div>
          <Link href="/admin" className="btn btn-ghost text-xs">
            Admin
          </Link>
        </div>
      </header>

      {/* ───── Body ───── */}
      <main className="flex-1 mx-auto max-w-6xl w-full px-6 py-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Contests */}
        <section>
          <div className="flex items-baseline justify-between mb-5">
            <div>
              <h2 className="font-serif text-3xl text-text leading-tight">Contests</h2>
              <p className="text-sm text-text-muted mt-1">
                Join a contest with your name and PIN. Picks stay hidden until everyone submits.
              </p>
            </div>
            <span className="label tabular shrink-0">
              {activeContests.length} active
            </span>
          </div>

          {loading && (
            <div className="card p-10 text-center text-text-muted">
              Loading…
            </div>
          )}

          {error && (
            <div className="card border-cut/40 bg-cut/[0.04] p-5">
              <div className="label text-cut mb-1">Error</div>
              <p className="text-sm">{error}</p>
            </div>
          )}

          {!loading && !error && activeContests.length === 0 && (
            <div className="card p-10 text-center">
              <p className="font-serif text-xl text-text">No contests yet.</p>
              <p className="text-sm text-text-muted mt-1">
                Head to admin to create the first contest of the season.
              </p>
            </div>
          )}

          <div className="grid gap-3 stagger">
            {activeContests.map((contest) => {
              const major = majors.find((m) => m.key === contest.majorKey);
              const status = STATUS_STYLES[contest.status];

              return (
                <Link
                  key={contest.id}
                  href={`/contests/${contest.id}`}
                  className="card group hover:bg-surface-2 hover:border-border-strong px-6 py-5 flex items-center gap-5"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="label text-text-muted">
                        {major?.name ?? contest.majorKey}
                      </span>
                      <span className="text-text-faint">·</span>
                      <span className="label tabular text-text-muted">
                        {contest.year}
                      </span>
                    </div>
                    <h3 className="font-serif text-2xl text-text leading-tight group-hover:text-gold transition-colors">
                      {contest.name}
                    </h3>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-muted">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${status.className}`}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        {status.label}
                      </span>
                      {contest.startsAt && (
                        <span className="tabular">
                          Tees off{" "}
                          {new Date(contest.startsAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      )}
                      {contest.expectedParticipants && (
                        <span className="tabular">
                          {contest.expectedParticipants} entrants
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-text-muted group-hover:text-gold group-hover:translate-x-0.5 transition-all text-lg shrink-0">
                    →
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Sidebar */}
        <aside className="space-y-5">
          {/* Majors */}
          <div className="card p-5">
            <h3 className="font-serif text-lg text-text mb-3">The Four Majors</h3>
            <div className="space-y-0">
              {majors.map((major) => {
                const count = contests.filter((c) => c.majorKey === major.key).length;
                return (
                  <div
                    key={major.key}
                    className="flex items-center justify-between py-2.5 border-b border-divider last:border-b-0"
                  >
                    <span className="text-sm text-text">{major.name}</span>
                    <span className="text-xs text-text-muted tabular">
                      {count} {count === 1 ? "contest" : "contests"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Rules */}
          <div className="card p-5">
            <h3 className="font-serif text-lg text-text mb-3">How It Works</h3>
            <ul className="space-y-2.5 text-sm text-text-muted leading-relaxed">
              <li className="flex gap-2.5">
                <span className="text-gold shrink-0">1.</span>
                <span>Pick one golfer from each of six tiers.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-gold shrink-0">2.</span>
                <span>Your best four scores count toward your total.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-gold shrink-0">3.</span>
                <span>Cut, withdrawn, or DQ&apos;d golfers get +8 per unplayed round.</span>
              </li>
              <li className="flex gap-2.5">
                <span className="text-gold shrink-0">4.</span>
                <span>Lowest total wins the pot.</span>
              </li>
            </ul>
          </div>

          {/* Archive */}
          <Link
            href="/history"
            className="card group hover:border-gold/40 p-5 flex items-center justify-between"
          >
            <div>
              <h3 className="font-serif text-lg text-text group-hover:text-gold transition-colors">
                Archive
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Past contests
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl tabular text-text font-serif">{archivedCount}</div>
            </div>
          </Link>
        </aside>
      </main>

      {/* ───── Footer ───── */}
      <footer className="border-t border-border mt-8 py-6 text-center text-xs text-text-faint">
        <p className="font-serif italic text-sm text-text-muted">A tradition unlike any other.</p>
      </footer>
    </div>
  );
}
