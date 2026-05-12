import { NextRequest, NextResponse } from "next/server";
import { createContest, listContests, listMajors } from "@/lib/server/contests";
import { isAdminRequest } from "@/lib/server/admin";
import { MajorKey } from "@/lib/types";

export async function GET() {
  try {
    const [majors, contests] = await Promise.all([listMajors(), listContests()]);
    return NextResponse.json({ majors, contests });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load contests.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const expected = body.expectedParticipants;
    const contest = await createContest({
      majorKey: body.majorKey as MajorKey,
      year: Number(body.year),
      startsAt: body.startsAt || null,
      expectedParticipants:
        expected === null || expected === undefined || expected === ""
          ? null
          : Math.max(1, Math.floor(Number(expected))),
    });

    return NextResponse.json({ contest });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create contest.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
