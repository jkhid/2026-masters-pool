import { NextResponse } from "next/server";
import { getPublicContestState } from "@/lib/server/contests";

interface RouteContext {
  params: Promise<{ contestId: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { contestId } = await context.params;
    const state = await getPublicContestState(contestId);

    if (!state) {
      return NextResponse.json({ error: "Contest not found" }, { status: 404 });
    }

    return NextResponse.json(state);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load contest.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
