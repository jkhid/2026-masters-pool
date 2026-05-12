import { NextResponse } from "next/server";
import { fetchMajorsCalendar } from "@/lib/espn";

export async function GET() {
  try {
    const calendar = await fetchMajorsCalendar();
    return NextResponse.json(
      { calendar },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=7200",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load calendar.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
