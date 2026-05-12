import { NextResponse } from "next/server";
import { fetchMajorOdds } from "@/lib/server/odds";
import { MajorKey } from "@/lib/types";

const VALID_KEYS: MajorKey[] = ["masters", "pga-championship", "us-open", "open-championship"];

interface RouteContext {
  params: Promise<{ majorKey: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { majorKey: rawKey } = await context.params;
    if (!VALID_KEYS.includes(rawKey as MajorKey)) {
      return NextResponse.json({ error: "Invalid major key" }, { status: 400 });
    }
    const snapshot = await fetchMajorOdds(rawKey as MajorKey);
    return NextResponse.json(
      { snapshot },
      {
        headers: {
          // 30-minute browser cache (matches server cache TTL)
          "Cache-Control": "public, s-maxage=1800, stale-while-revalidate=3600",
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load odds.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
