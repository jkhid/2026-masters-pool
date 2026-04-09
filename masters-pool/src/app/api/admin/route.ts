import { NextRequest, NextResponse } from "next/server";
import { ManualScores } from "@/lib/types";
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";

const SCORES_PATH = path.join(process.cwd(), "data", "manual-scores.json");

async function getManualScores(): Promise<ManualScores> {
  try {
    const raw = await readFile(SCORES_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { golfers: {}, lastUpdated: "" };
  }
}

export async function GET() {
  const scores = await getManualScores();
  return NextResponse.json(scores);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const current = await getManualScores();

    // Merge incoming golfer scores
    const updated: ManualScores = {
      golfers: { ...current.golfers, ...body.golfers },
      lastUpdated: new Date().toISOString(),
    };

    // Ensure data directory exists
    await mkdir(path.dirname(SCORES_PATH), { recursive: true });
    await writeFile(SCORES_PATH, JSON.stringify(updated, null, 2));

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Admin save error:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { golferName } = await request.json();
    const current = await getManualScores();

    if (golferName && current.golfers[golferName]) {
      delete current.golfers[golferName];
      current.lastUpdated = new Date().toISOString();
      await writeFile(SCORES_PATH, JSON.stringify(current, null, 2));
    }

    return NextResponse.json({ success: true, data: current });
  } catch (error) {
    console.error("Admin delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
