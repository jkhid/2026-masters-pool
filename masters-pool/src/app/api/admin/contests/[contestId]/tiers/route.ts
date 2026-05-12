import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { parseTierCsv } from "@/lib/server/csv";
import { importTierRows, openContest } from "@/lib/server/contests";

interface RouteContext {
  params: Promise<{ contestId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { contestId } = await context.params;
    const body = await request.json();
    const rows = parseTierCsv(body.csv ?? "");

    await importTierRows(contestId, rows);

    if (body.openContest) {
      await openContest(contestId);
    }

    return NextResponse.json({ success: true, imported: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to import tiers.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
