import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { manuallyRevealContest } from "@/lib/server/contests";

interface RouteContext {
  params: Promise<{ contestId: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { contestId } = await context.params;
    const contest = await manuallyRevealContest(contestId);
    return NextResponse.json({ contest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to reveal contest.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
