import { NextResponse } from "next/server";
import { saveParticipantPicks } from "@/lib/server/contests";

interface RouteContext {
  params: Promise<{ contestId: string }>;
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const { contestId } = await context.params;
    const body = await request.json();

    await saveParticipantPicks({
      contestId,
      name: body.name ?? "",
      pin: body.pin ?? "",
      picksByTierId: body.picksByTierId ?? {},
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to save picks.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
