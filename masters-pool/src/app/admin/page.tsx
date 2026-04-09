"use client";
import { useState, useEffect } from "react";
import { ALL_GOLFERS } from "@/lib/pool-data";
import { ManualScores, ManualScoreEntry } from "@/lib/types";

const EMPTY_ENTRY: ManualScoreEntry = {
  rounds: [null, null, null, null],
  total: null,
  status: "active",
  thru: null,
  position: null,
  today: null,
};

export default function AdminPage() {
  const [manualScores, setManualScores] = useState<ManualScores>({ golfers: {}, lastUpdated: "" });
  const [selectedGolfer, setSelectedGolfer] = useState(ALL_GOLFERS[0]);
  const [entry, setEntry] = useState<ManualScoreEntry>({ ...EMPTY_ENTRY });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    fetch("/api/admin")
      .then(r => r.json())
      .then(setManualScores)
      .catch(console.error);
  }, []);

  useEffect(() => {
    const existing = manualScores.golfers[selectedGolfer];
    setEntry(existing ? { ...existing } : { ...EMPTY_ENTRY });
  }, [selectedGolfer, manualScores]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          golfers: { [selectedGolfer]: entry },
        }),
      });
      const data = await res.json();
      if (data.success) {
        setManualScores(data.data);
        setMessage(`Saved ${selectedGolfer}`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setMessage("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ golferName: selectedGolfer }),
      });
      const data = await res.json();
      if (data.success) {
        setManualScores(data.data);
        setEntry({ ...EMPTY_ENTRY });
        setMessage(`Removed manual override for ${selectedGolfer}`);
        setTimeout(() => setMessage(""), 3000);
      }
    } catch (err) {
      setMessage("Failed to delete");
    } finally {
      setSaving(false);
    }
  };

  const setRound = (idx: number, value: string) => {
    const rounds = [...entry.rounds];
    rounds[idx] = value === "" ? null : parseInt(value, 10);
    setEntry({ ...entry, rounds });
  };

  const overrideCount = Object.keys(manualScores.golfers).length;

  return (
    <div className="min-h-screen bg-bg">
      <header className="bg-masters-green border-b-2 border-masters-yellow px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-serif text-masters-yellow">Admin — Score Entry</h1>
            <p className="text-sm text-white/70">Manual overrides for ESPN data</p>
          </div>
          <a href="/" className="text-sm text-masters-yellow hover:underline">&larr; Back to Pool</a>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6 space-y-6">
        {message && (
          <div className="bg-masters-green/30 border border-masters-green text-masters-yellow px-4 py-2 rounded text-sm">
            {message}
          </div>
        )}

        {overrideCount > 0 && (
          <div className="bg-card-bg border border-card-border rounded-lg p-4">
            <h3 className="text-sm text-text-muted mb-2">Active Manual Overrides ({overrideCount})</h3>
            <div className="flex flex-wrap gap-2">
              {Object.keys(manualScores.golfers).map(name => (
                <button
                  key={name}
                  onClick={() => setSelectedGolfer(name)}
                  className={`text-xs px-2 py-1 rounded border ${
                    selectedGolfer === name
                      ? "border-masters-yellow text-masters-yellow bg-masters-yellow/10"
                      : "border-card-border text-text-muted hover:text-white"
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="bg-card-bg border border-card-border rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">Golfer</label>
            <select
              value={selectedGolfer}
              onChange={e => setSelectedGolfer(e.target.value)}
              className="w-full bg-bg border border-card-border rounded px-3 py-2 text-text"
            >
              {ALL_GOLFERS.map(name => (
                <option key={name} value={name}>
                  {name} {manualScores.golfers[name] ? "(has override)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {["R1", "R2", "R3", "R4"].map((label, i) => (
              <div key={label}>
                <label className="block text-xs text-text-muted mb-1">{label} (strokes)</label>
                <input
                  type="number"
                  value={entry.rounds[i] ?? ""}
                  onChange={e => setRound(i, e.target.value)}
                  placeholder="-"
                  className="w-full bg-bg border border-card-border rounded px-3 py-2 text-text text-center"
                />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Total (to par)</label>
              <input
                type="number"
                value={entry.total ?? ""}
                onChange={e => setEntry({ ...entry, total: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
                placeholder="E = 0"
                className="w-full bg-bg border border-card-border rounded px-3 py-2 text-text text-center"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Status</label>
              <select
                value={entry.status}
                onChange={e => setEntry({ ...entry, status: e.target.value as ManualScoreEntry["status"] })}
                className="w-full bg-bg border border-card-border rounded px-3 py-2 text-text"
              >
                <option value="active">Active</option>
                <option value="cut">Cut</option>
                <option value="wd">Withdrawn</option>
                <option value="dq">Disqualified</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Thru</label>
              <input
                type="text"
                value={entry.thru ?? ""}
                onChange={e => setEntry({ ...entry, thru: e.target.value || null })}
                placeholder="F, Thru 12, etc"
                className="w-full bg-bg border border-card-border rounded px-3 py-2 text-text"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">Position</label>
              <input
                type="text"
                value={entry.position ?? ""}
                onChange={e => setEntry({ ...entry, position: e.target.value || null })}
                placeholder="T3, 1, CUT..."
                className="w-full bg-bg border border-card-border rounded px-3 py-2 text-text"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Today (to par)</label>
              <input
                type="number"
                value={entry.today ?? ""}
                onChange={e => setEntry({ ...entry, today: e.target.value === "" ? null : parseInt(e.target.value, 10) })}
                placeholder="E = 0"
                className="w-full bg-bg border border-card-border rounded px-3 py-2 text-text"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 bg-masters-green hover:bg-masters-dark text-white font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Override"}
            </button>
            {manualScores.golfers[selectedGolfer] && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="bg-cut/20 hover:bg-cut/30 text-cut font-medium py-2 px-4 rounded transition-colors disabled:opacity-50"
              >
                Remove Override
              </button>
            )}
          </div>
        </div>

        <div className="text-xs text-text-muted text-center">
          <p>Manual entries override ESPN live data for the specified golfer.</p>
          <p>Remove an override to revert to live ESPN scoring.</p>
        </div>
      </main>
    </div>
  );
}
