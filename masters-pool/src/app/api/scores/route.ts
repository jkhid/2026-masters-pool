import { NextResponse } from "next/server";
import { fetchESPNScores, mergeWithManual } from "@/lib/espn";
import { GolferScore, ManualScores } from "@/lib/types";
import { getFullRoster } from "@/lib/server/golfer-roster";
import { readFile } from "fs/promises";
import path from "path";

function normalizeGolferName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['.\-]/g, "")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function getManualScores(): Promise<ManualScores | null> {
  try {
    const filePath = path.join(process.cwd(), "data", "manual-scores.json");
    const raw = await readFile(filePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function GET() {
  const [espnData, manualScores] = await Promise.all([
    fetchESPNScores(),
    getManualScores(),
  ]);

  const merged = mergeWithManual(espnData, manualScores);

  // Enrich with stub entries for any known golfer (from seed + accumulated cache)
  // not present in the current ESPN scoreboard. This ensures headshots work for
  // golfers not in the current event.
  const roster = getFullRoster();
  const existingNormalizedNames = new Set(
    Object.keys(merged.golfers).map((name) => normalizeGolferName(name)),
  );
  for (const [name, espnId] of roster) {
    if (!merged.golfers[name]) {
      if (existingNormalizedNames.has(normalizeGolferName(name))) continue;
      const stub: GolferScore = {
        name,
        rounds: [null, null, null, null],
        total: null,
        thru: null,
        status: "active",
        position: null,
        today: null,
        espnId,
      };
      merged.golfers[name] = stub;
      existingNormalizedNames.add(normalizeGolferName(name));
    } else if (!merged.golfers[name].espnId && espnId) {
      // Fill in missing espnId on existing entry
      merged.golfers[name] = { ...merged.golfers[name], espnId };
    }
  }

  return NextResponse.json(merged, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
