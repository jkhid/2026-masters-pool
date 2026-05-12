import { NextRequest, NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/server/admin";
import { deleteContest, updateContestSettings } from "@/lib/server/contests";

interface RouteContext {
  params: Promise<{ contestId: string }>;
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { contestId } = await context.params;
    const body = await request.json();

    const updates: { expectedParticipants?: number | null; startsAt?: string | null } = {};

    if ("expectedParticipants" in body) {
      const value = body.expectedParticipants;
      if (value === null || value === "" || value === undefined) {
        updates.expectedParticipants = null;
      } else {
        const parsed = Math.floor(Number(value));
        if (!Number.isFinite(parsed) || parsed < 1) {
          throw new Error("Expected participants must be a positive integer.");
        }
        updates.expectedParticipants = parsed;
      }
    }

    if ("startsAt" in body) {
      updates.startsAt = body.startsAt || null;
    }

    const contest = await updateContestSettings(contestId, updates);
    return NextResponse.json({ contest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update contest.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { contestId } = await context.params;
    await deleteContest(contestId);
    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete contest.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
