import { NextResponse } from "next/server";
import { fetchESPNScores, mergeWithManual } from "@/lib/espn";
import { ManualScores } from "@/lib/types";
import { readFile } from "fs/promises";
import path from "path";

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

  return NextResponse.json(merged, {
    headers: {
      "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
    },
  });
}
