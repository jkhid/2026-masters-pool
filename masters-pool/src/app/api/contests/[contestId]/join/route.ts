import { NextResponse } from "next/server";
import { joinContest } from "@/lib/server/contests";

interface RouteContext {
  params: Promise<{ contestId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { contestId } = await context.params;
    const body = await request.json();
    const result = await joinContest(contestId, body.name ?? "", body.pin ?? "");

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to join contest.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
