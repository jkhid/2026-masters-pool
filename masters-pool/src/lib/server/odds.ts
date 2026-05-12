// The Odds API integration for golf majors.
// Free tier is 500 req/month, so we cache aggressively (30 min TTL).
//
// Markets: only outright winner is available for golf via this provider.
// The data shape supports more markets (top5, top10, etc.) so future
// integrations can plug in additional providers without UI changes.

import {
  BookmakerPrice,
  GolferMarketOdds,
  GolferOdds,
  MajorKey,
  MajorOddsSnapshot,
  OddsMarket,
} from "@/lib/types";

const ODDS_API_BASE = "https://api.the-odds-api.com/v4";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

// Map our MajorKey → The Odds API sport key
const SPORT_KEYS: Record<MajorKey, string> = {
  masters: "golf_masters_tournament_winner",
  "pga-championship": "golf_pga_championship_winner",
  "us-open": "golf_us_open_winner",
  "open-championship": "golf_the_open_championship_winner",
};

// Module-level cache (in-memory; resets on cold start)
const cache = new Map<MajorKey, { snapshot: MajorOddsSnapshot; timestamp: number }>();

function decimalToAmerican(decimal: number): number {
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseSnapshot(majorKey: MajorKey, raw: any[]): MajorOddsSnapshot | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;

  // The Odds API returns one event per future-style market.
  // Pick the first (there should usually only be one per sport key).
  const event = raw[0];
  const sportTitle: string = event?.sport_title ?? "";
  const commenceTime: string | null = event?.commence_time ?? null;

  // Aggregate: golferName → list of (bookmaker, price, decimal, updated)
  const winAggregate = new Map<string, BookmakerPrice[]>();

  for (const book of event?.bookmakers ?? []) {
    const bookmakerTitle: string = book?.title ?? book?.key ?? "";
    const lastUpdate: string = book?.last_update ?? new Date().toISOString();

    for (const market of book?.markets ?? []) {
      if (market?.key !== "outrights") continue;

      for (const outcome of market?.outcomes ?? []) {
        const golferName: string = outcome?.name ?? "";
        const decimal: number = Number(outcome?.price ?? 0);
        if (!golferName || !decimal || decimal <= 1) continue;

        const price: BookmakerPrice = {
          bookmaker: bookmakerTitle,
          decimal,
          price: decimalToAmerican(decimal),
          lastUpdate,
        };

        const key = normalizeName(golferName);
        const arr = winAggregate.get(key) ?? [];
        arr.push(price);
        winAggregate.set(key, arr);
      }
    }
  }

  const byGolfer: Record<string, GolferOdds> = {};
  const displayNameByKey: Record<string, string> = {};

  // We need display names — reconstruct from the first bookmaker's outcomes
  for (const book of event?.bookmakers ?? []) {
    for (const market of book?.markets ?? []) {
      if (market?.key !== "outrights") continue;
      for (const outcome of market?.outcomes ?? []) {
        const golferName: string = outcome?.name ?? "";
        if (!golferName) continue;
        const key = normalizeName(golferName);
        if (!displayNameByKey[key]) displayNameByKey[key] = golferName;
      }
    }
  }

  for (const [key, prices] of winAggregate) {
    // Sort: longest odds (highest decimal) first for "best for bettor"?
    // Actually, the bettor wants the BIGGEST payout, which is the LONGEST odds.
    // For odds-comparison UI we want longest (most positive) on top.
    prices.sort((a, b) => b.decimal - a.decimal);

    const market: GolferMarketOdds = {
      best: prices[0],
      all: prices,
    };

    byGolfer[key] = {
      name: displayNameByKey[key] ?? key,
      markets: { win: market } as Partial<Record<OddsMarket, GolferMarketOdds>>,
    };
  }

  return {
    majorKey,
    sportTitle,
    commenceTime,
    fetchedAt: new Date().toISOString(),
    byGolfer,
    displayNameByKey,
    source: "the-odds-api",
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function fetchMajorOdds(majorKey: MajorKey): Promise<MajorOddsSnapshot | null> {
  // Check cache first
  const cached = cache.get(majorKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.snapshot;
  }

  const apiKey = process.env.ODDS_API_KEY;
  if (!apiKey) {
    console.warn("ODDS_API_KEY not set — skipping odds fetch.");
    return null;
  }

  const sportKey = SPORT_KEYS[majorKey];
  if (!sportKey) return null;

  const url = `${ODDS_API_BASE}/sports/${sportKey}/odds?regions=us&markets=outrights&oddsFormat=decimal&apiKey=${apiKey}`;

  try {
    const response = await fetch(url, { next: { revalidate: 1800 } });
    if (!response.ok) {
      console.error("Odds API error:", response.status, await response.text());
      return cached?.snapshot ?? null;
    }
    const raw = await response.json();
    const snapshot = parseSnapshot(majorKey, raw);
    if (snapshot) {
      cache.set(majorKey, { snapshot, timestamp: Date.now() });
    }
    return snapshot;
  } catch (error) {
    console.error("Odds API fetch error:", error);
    return cached?.snapshot ?? null;
  }
}

// Look up odds for a specific golfer by name (handles diacritic + minor variations)
export function lookupGolferOdds(
  snapshot: MajorOddsSnapshot | null,
  golferName: string,
): GolferOdds | null {
  if (!snapshot || !golferName) return null;
  const key = normalizeName(golferName);
  return snapshot.byGolfer[key] ?? null;
}

// Helpers exported for the route to use
export { normalizeName };
