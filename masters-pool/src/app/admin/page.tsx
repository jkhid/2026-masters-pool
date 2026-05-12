"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Contest, Major, MajorKey, MajorsCalendar } from "@/lib/types";

// Converts an ISO datetime to a value suitable for <input type="datetime-local">
// (local time zone). E.g. "2026-04-09T12:00:00Z" → "2026-04-09T08:00"
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const STATUS_STYLES: Record<Contest["status"], { label: string; className: string }> = {
  setup: { label: "Setup", className: "bg-bg-elev text-text-muted border-border" },
  open: { label: "Open", className: "bg-counting/10 text-counting border-counting/30" },
  revealed: { label: "Revealed", className: "bg-gold/10 text-gold border-gold/30" },
  complete: { label: "Complete", className: "bg-bg-elev text-text-muted border-border" },
  archived: { label: "Archived", className: "bg-bg-elev text-text-faint border-border" },
};

export default function AdminPage() {
  const [password, setPassword] = useState("");
  const [majors, setMajors] = useState<Major[]>([]);
  const [contests, setContests] = useState<Contest[]>([]);
  const [majorKey, setMajorKey] = useState<MajorKey>("masters");
  const [year, setYear] = useState(new Date().getFullYear());
  const [startsAt, setStartsAt] = useState("");
  const [expectedParticipants, setExpectedParticipants] = useState("");
  const [selectedContestId, setSelectedContestId] = useState("");
  const [csv, setCsv] = useState("");
  const [openAfterImport, setOpenAfterImport] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [editExpected, setEditExpected] = useState<Record<string, string>>({});
  const [calendar, setCalendar] = useState<MajorsCalendar>({});

  // Fetch the ESPN majors calendar once on mount
  useEffect(() => {
    fetch("/api/calendar")
      .then((res) => res.json())
      .then((data) => setCalendar(data.calendar ?? {}))
      .catch(() => {/* non-fatal */});
  }, []);

  // The detected entry for whatever major+year is currently selected in the form.
  // ESPN only publishes the current/upcoming season, so this matches when year aligns.
  const detectedEntry = useMemo(() => {
    const entry = calendar[majorKey];
    if (!entry) return null;
    const entryYear = new Date(entry.rawStartDate).getUTCFullYear();
    return entryYear === year ? entry : null;
  }, [calendar, majorKey, year]);

  const autoFillFromCalendar = () => {
    if (!detectedEntry) return;
    setStartsAt(isoToLocalInput(detectedEntry.startDate));
  };

  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch("/api/contests");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to load contests.");
      setMajors(data.majors);
      setContests(data.contests);
      if (!selectedContestId && data.contests[0]) setSelectedContestId(data.contests[0].id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contests.");
    }
  }, [selectedContestId]);

  useEffect(() => {
    load();
  }, [load]);

  const adminHeaders = {
    "Content-Type": "application/json",
    "x-admin-password": password,
  };

  const createContest = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/contests", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({
          majorKey,
          year,
          startsAt: startsAt ? new Date(startsAt).toISOString() : null,
          expectedParticipants: expectedParticipants ? Number(expectedParticipants) : null,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to create contest.");
      setSelectedContestId(data.contest.id);
      setMessage(`Created ${data.contest.name}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create contest.");
    } finally {
      setSaving(false);
    }
  };

  const updateExpected = async (contestId: string, value: string) => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/contests/${contestId}`, {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({
          expectedParticipants: value === "" ? null : Number(value),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to update contest.");
      setMessage("Expected participants updated.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update contest.");
    } finally {
      setSaving(false);
    }
  };

  const deleteContestAction = async (contestId: string, name: string) => {
    if (!confirm(`Delete "${name}"? This permanently removes all tiers, participants, and picks. This cannot be undone.`)) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/contests/${contestId}`, {
        method: "DELETE",
        headers: adminHeaders,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to delete contest.");
      if (selectedContestId === contestId) setSelectedContestId("");
      setMessage(`Deleted "${name}".`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete contest.");
    } finally {
      setSaving(false);
    }
  };

  const revealContest = async (contestId: string) => {
    if (!confirm("Reveal picks for this contest now? This cannot be undone.")) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/contests/${contestId}/reveal`, {
        method: "POST",
        headers: adminHeaders,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to reveal contest.");
      setMessage("Contest revealed.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reveal contest.");
    } finally {
      setSaving(false);
    }
  };

  const importCsv = async () => {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(`/api/admin/contests/${selectedContestId}/tiers`, {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ csv, openContest: openAfterImport }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Failed to import tiers.");
      setMessage(`Imported ${data.imported} golfers${openAfterImport ? " and opened picks" : ""}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import tiers.");
    } finally {
      setSaving(false);
    }
  };

  const hasPassword = !!password;

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-bg-elev/60 backdrop-blur-sm">
        <div className="mx-auto max-w-6xl px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="font-serif text-2xl text-text leading-tight">Admin</h1>
            <p className="text-xs text-text-muted mt-0.5">Manage contests, rosters, and reveals.</p>
          </div>
          <Link href="/" className="text-sm text-text-muted hover:text-gold transition-colors">
            ← Back to pool
          </Link>
        </div>
      </header>

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

        {!hasPassword && (
          <div className="card border-warning/40 bg-warning/[0.04] p-4">
            <p className="text-sm text-text">
              Enter the admin password below to unlock contest management.
            </p>
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
          {/* LEFT: Password + Create */}
          <section className="space-y-4">
            {/* Password */}
            <div className="card p-5">
              <h2 className="font-serif text-xl text-text mb-1">Admin password</h2>
              <p className="text-xs text-text-muted mb-3">
                Set on Vercel as <code className="text-gold/80">ADMIN_PASSWORD</code>. Stored only this session.
              </p>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input"
              />
            </div>

            {/* Upcoming majors from ESPN */}
            {Object.keys(calendar).length > 0 && (
              <div className="card p-5">
                <h2 className="font-serif text-xl text-text mb-1">Upcoming majors</h2>
                <p className="text-xs text-text-muted mb-3">From ESPN&apos;s {new Date(Object.values(calendar)[0]?.rawStartDate ?? "").getFullYear()} season calendar.</p>
                <div className="space-y-0">
                  {(["masters", "pga-championship", "us-open", "open-championship"] as MajorKey[]).map((key) => {
                    const entry = calendar[key];
                    const majorName = majors.find((m) => m.key === key)?.name ?? key;
                    if (!entry) {
                      return (
                        <div
                          key={key}
                          className="flex items-center justify-between py-2 border-b border-divider last:border-b-0"
                        >
                          <span className="text-sm text-text-muted">{majorName}</span>
                          <span className="text-xs text-text-faint italic">Not listed</span>
                        </div>
                      );
                    }
                    const isSelected = majorKey === key &&
                      year === new Date(entry.rawStartDate).getUTCFullYear();
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => {
                          setMajorKey(key);
                          setYear(new Date(entry.rawStartDate).getUTCFullYear());
                          setStartsAt(isoToLocalInput(entry.startDate));
                        }}
                        className={`w-full text-left flex items-baseline justify-between py-2 border-b border-divider last:border-b-0 hover:bg-bg-elev/40 -mx-1 px-1 rounded transition-colors ${
                          isSelected ? "bg-gold/[0.04]" : ""
                        }`}
                      >
                        <span className="text-sm text-text">{majorName}</span>
                        <span className="text-xs text-gold tabular">
                          {new Date(entry.rawStartDate).toLocaleDateString(undefined, {
                            month: "short", day: "numeric",
                          })}
                          {" – "}
                          {new Date(entry.rawEndDate).toLocaleDateString(undefined, {
                            month: "short", day: "numeric",
                          })}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Create */}
            <div className="card p-5">
              <h2 className="font-serif text-xl text-text mb-3">Create contest</h2>
              <div className="space-y-3">
                <div>
                  <label className="label block mb-1.5">Major</label>
                  <select
                    value={majorKey}
                    onChange={(e) => setMajorKey(e.target.value as MajorKey)}
                    className="input"
                  >
                    {majors.map((major) => (
                      <option key={major.key} value={major.key}>
                        {major.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="label block mb-1.5">Year</label>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="input"
                    />
                  </div>
                  <div>
                    <label className="label block mb-1.5">Expected</label>
                    <input
                      type="number"
                      min={1}
                      value={expectedParticipants}
                      onChange={(e) => setExpectedParticipants(e.target.value)}
                      placeholder="auto"
                      className="input"
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-baseline justify-between mb-1.5">
                    <label className="label">Tees off</label>
                    {detectedEntry && (
                      <button
                        type="button"
                        onClick={autoFillFromCalendar}
                        className="text-[11px] text-gold hover:text-gold-soft transition-colors"
                      >
                        Auto-fill from ESPN →
                      </button>
                    )}
                  </div>
                  <input
                    type="datetime-local"
                    value={startsAt}
                    onChange={(e) => setStartsAt(e.target.value)}
                    className="input"
                  />
                  {detectedEntry && (
                    <p className="text-xs text-text-muted mt-1.5">
                      ESPN has{" "}
                      <span className="text-text">{detectedEntry.label}</span>{" "}
                      on{" "}
                      <span className="text-gold tabular">
                        {new Date(detectedEntry.rawStartDate).toLocaleDateString(undefined, {
                          month: "short", day: "numeric", year: "numeric",
                        })}
                      </span>
                      . Suggested first tee:{" "}
                      <span className="text-text tabular">
                        {new Date(detectedEntry.startDate).toLocaleTimeString(undefined, {
                          hour: "numeric", minute: "2-digit", timeZoneName: "short",
                        })}
                      </span>
                      .
                    </p>
                  )}
                </div>
                <p className="text-xs text-text-muted leading-relaxed">
                  Picks auto-reveal once the expected count submits. Leave blank to wait for all participants.
                </p>
                <button
                  onClick={createContest}
                  disabled={saving || !hasPassword}
                  className="btn btn-primary w-full"
                >
                  Create
                </button>
              </div>
            </div>
          </section>

          {/* RIGHT: CSV + Contests */}
          <section className="space-y-4">
            {/* CSV */}
            <div className="card p-5">
              <h2 className="font-serif text-xl text-text mb-1">Tier CSV import</h2>
              <p className="text-xs text-text-muted mb-3">
                Supports normalized rows (<code className="text-gold/80">tier,name,…</code>) or printable pick sheets.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="label block mb-1.5">Target contest</label>
                  <select
                    value={selectedContestId}
                    onChange={(e) => setSelectedContestId(e.target.value)}
                    className="input"
                  >
                    <option value="">— select a contest —</option>
                    {contests.map((contest) => (
                      <option key={contest.id} value={contest.id}>
                        {contest.name} — {STATUS_STYLES[contest.status].label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label block mb-1.5">Upload file</label>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) setCsv(await file.text());
                    }}
                    className="input cursor-pointer"
                  />
                </div>
                <div>
                  <label className="label block mb-1.5">Or paste CSV</label>
                  <textarea
                    value={csv}
                    onChange={(e) => setCsv(e.target.value)}
                    rows={8}
                    placeholder="tier,name,world_rank,seed,notes&#10;1,Scottie Scheffler,1,1,&#10;1,Rory McIlroy,2,2,"
                    className="input font-mono text-xs"
                  />
                </div>
                <label className="flex items-center gap-2 text-sm text-text-muted cursor-pointer">
                  <input
                    type="checkbox"
                    checked={openAfterImport}
                    onChange={(e) => setOpenAfterImport(e.target.checked)}
                    className="accent-masters-green"
                  />
                  Open picks immediately after import
                </label>
                <button
                  onClick={importCsv}
                  disabled={saving || !hasPassword || !selectedContestId || !csv.trim()}
                  className="btn btn-gold w-full"
                >
                  Import tiers
                </button>
              </div>
            </div>

            {/* Contests list */}
            <div className="card p-5">
              <div className="flex items-baseline justify-between mb-3">
                <h2 className="font-serif text-xl text-text">Existing contests</h2>
                <span className="label tabular">{contests.length}</span>
              </div>

              {contests.length === 0 ? (
                <p className="text-sm text-text-muted italic">None yet — create one above.</p>
              ) : (
                <div className="space-y-2">
                  {contests.map((contest) => {
                    const editValue = editExpected[contest.id];
                    const currentValue =
                      editValue !== undefined
                        ? editValue
                        : contest.expectedParticipants !== null
                          ? String(contest.expectedParticipants)
                          : "";
                    const canReveal = !["revealed", "complete", "archived"].includes(contest.status);
                    const status = STATUS_STYLES[contest.status];

                    return (
                      <div
                        key={contest.id}
                        className="rounded-lg border border-divider bg-bg-elev/40 p-3.5"
                      >
                        <div className="flex items-baseline justify-between gap-3 mb-2.5">
                          <Link
                            href={`/contests/${contest.id}`}
                            className="font-serif text-base text-text hover:text-gold transition-colors truncate"
                          >
                            {contest.name}
                          </Link>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded-full border shrink-0 ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <label className="text-xs text-text-muted">Expected:</label>
                          <input
                            type="number"
                            min={1}
                            value={currentValue}
                            placeholder="auto"
                            onChange={(e) =>
                              setEditExpected((prev) => ({
                                ...prev,
                                [contest.id]: e.target.value,
                              }))
                            }
                            className="input !w-16 !py-1 !px-2 !text-xs tabular"
                          />
                          <button
                            onClick={() => updateExpected(contest.id, currentValue)}
                            disabled={saving || !hasPassword}
                            className="btn btn-ghost !py-1 !px-2.5 !text-xs"
                          >
                            Save
                          </button>
                          <div className="flex-1" />
                          {canReveal && (
                            <button
                              onClick={() => revealContest(contest.id)}
                              disabled={saving || !hasPassword}
                              className="btn btn-gold !py-1 !px-2.5 !text-xs"
                            >
                              Reveal
                            </button>
                          )}
                          <button
                            onClick={() => deleteContestAction(contest.id, contest.name)}
                            disabled={saving || !hasPassword}
                            className="btn btn-danger !py-1 !px-2.5 !text-xs"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <footer className="border-t border-border mt-8 py-6 text-center text-xs text-text-faint">
        <p className="font-serif italic text-sm text-text-muted">A tradition unlike any other.</p>
      </footer>
    </div>
  );
}
