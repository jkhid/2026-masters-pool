import { GolferScore, ScoreData, ManualScores, HoleScore, RoundScorecard } from "./types";
import { ALL_GOLFERS } from "./pool-data";

const ESPN_URL = "https://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard";

// Augusta National pars (holes 1-18)
const AUGUSTA_PARS = [4, 5, 4, 3, 4, 3, 4, 5, 4, 4, 4, 3, 5, 4, 5, 3, 4, 4];

// Server-side cache
let cachedData: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

// Name normalization for fuzzy matching
function normalizeName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove diacritics
    .replace(/ø/g, "o")
    .replace(/Ø/g, "o")
    .replace(/æ/g, "ae")
    .replace(/Æ/g, "ae")
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .trim();
}

// Build a lookup map of normalized names -> our pool names
function buildNameMap(): Map<string, string> {
  const map = new Map<string, string>();
  for (const name of ALL_GOLFERS) {
    map.set(normalizeName(name), name);
  }
  return map;
}

function findPoolName(espnName: string, nameMap: Map<string, string>): string | null {
  const normalized = normalizeName(espnName);

  // Direct match
  if (nameMap.has(normalized)) return nameMap.get(normalized)!;

  // Try matching last name + first initial
  for (const [key, poolName] of nameMap.entries()) {
    const espnParts = normalized.split(" ");
    const poolParts = key.split(" ");

    // Last name match + first name starts with same letter
    if (
      espnParts.length >= 2 &&
      poolParts.length >= 2 &&
      espnParts[espnParts.length - 1] === poolParts[poolParts.length - 1] &&
      espnParts[0][0] === poolParts[0][0]
    ) {
      return poolName;
    }
  }

  return null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseStatus(competitor: any): "active" | "cut" | "wd" | "dq" {
  const statusText = competitor.status?.type?.name?.toLowerCase() || "";
  if (statusText === "cut") return "cut";
  if (statusText === "wd" || statusText === "withdrawn") return "wd";
  if (statusText === "dq" || statusText === "disqualified") return "dq";
  return "active";
}

function parseThru(competitor: any): string | null {
  const period = competitor.status?.period || 0;
  const thru = competitor.status?.thru;
  const statusType = competitor.status?.type?.name?.toLowerCase() || "";

  if (statusType === "cut" || statusType === "wd" || statusType === "dq") {
    return statusType.toUpperCase();
  }
  if (thru !== undefined && thru !== null) {
    if (thru === 18 || statusType === "complete") return "F";
    if (thru === 0 && statusType !== "in") return null;
    return `Thru ${thru}`;
  }
  return null;
}

function parseRounds(competitor: any): (number | null)[] {
  const rounds: (number | null)[] = [null, null, null, null];
  const linescores = competitor.linescores || [];

  for (let i = 0; i < Math.min(linescores.length, 4); i++) {
    const val = linescores[i]?.value;
    if (val !== undefined && val !== null && typeof val === "number") {
      rounds[i] = val;
    }
  }
  return rounds;
}

function parseToday(competitor: any): number | null {
  // Today's score relative to par
  const score = competitor.score;
  if (score !== undefined && score !== null) {
    if (String(score) === "E") return 0;
    const val = parseInt(score, 10);
    if (!isNaN(val)) return val;
  }
  // Try to get from statistics or other fields
  const todayScore = competitor.statistics?.[0]?.displayValue;
  if (todayScore) {
    if (todayScore === "E") return 0;
    const num = parseInt(todayScore, 10);
    if (!isNaN(num)) return num;
  }
  return null;
}

function parseTotal(competitor: any): number | null {
  // Total to par
  const totalToPar = competitor.totalToPar ?? competitor.score;
  if (totalToPar !== undefined && totalToPar !== null) {
    if (String(totalToPar) === "E") return 0;
    const val = parseInt(String(totalToPar), 10);
    if (!isNaN(val)) return val;
  }
  // Sometimes in score display value
  const scoreDisplay = competitor.scoreDisplayValue || competitor.totalScoreDisplayValue;
  if (scoreDisplay) {
    if (scoreDisplay === "E") return 0;
    const num = parseInt(scoreDisplay, 10);
    if (!isNaN(num)) return num;
  }
  return null;
}
function parseScorecards(competitor: any): RoundScorecard[] {
  const roundLinescores = competitor.linescores || [];
  const scorecards: RoundScorecard[] = [];

  for (let r = 0; r < Math.min(roundLinescores.length, 4); r++) {
    const roundData = roundLinescores[r];
    const holeScores = roundData?.linescores || [];

    if (holeScores.length === 0) continue;

    const holes: HoleScore[] = holeScores.map((h: any, idx: number) => {
      const strokes = h.value ?? 0;
      const par = AUGUSTA_PARS[idx] ?? 4;
      let toPar = strokes - par;

      // Prefer ESPN's scoreType if available
      const scoreTypeDisplay = h.scoreType?.displayValue;
      if (scoreTypeDisplay === "E") {
        toPar = 0;
      } else if (scoreTypeDisplay) {
        const parsed = parseInt(scoreTypeDisplay, 10);
        if (!isNaN(parsed)) toPar = parsed;
      }

      return { hole: idx + 1, strokes, toPar, par };
    });

    const totalStrokes = roundData.value ?? holes.reduce((s, h) => s + h.strokes, 0);
    const roundToPar = holes.reduce((s, h) => s + h.toPar, 0);

    scorecards.push({
      round: r + 1,
      holes,
      total: totalStrokes,
      toPar: roundToPar,
    });
  }

  return scorecards;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function fetchESPNScores(): Promise<ScoreData | null> {
  try {
    // Check cache
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return parseESPNData(cachedData.data);
    }

    const response = await fetch(ESPN_URL, {
      next: { revalidate: 30 },
      headers: { "User-Agent": "MastersPool/1.0" },
    });

    if (!response.ok) {
      console.error("ESPN API error:", response.status);
      return cachedData ? parseESPNData(cachedData.data) : null;
    }

    const data = await response.json();
    cachedData = { data, timestamp: Date.now() };
    return parseESPNData(data);
  } catch (error) {
    console.error("ESPN fetch error:", error);
    return cachedData ? parseESPNData(cachedData.data) : null;
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseESPNData(data: any): ScoreData | null {
  try {
    const events = data?.events || [];
    // Find Masters tournament
    const mastersEvent = events.find((e: any) => {
      const name = (e.name || e.shortName || "").toLowerCase();
      return name.includes("masters") || name.includes("augusta");
    }) || events[0]; // fallback to first event

    if (!mastersEvent) return null;

    const competition = mastersEvent.competitions?.[0];
    if (!competition) return null;

    const competitors = competition.competitors || [];
    const nameMap = buildNameMap();
    const golfers: Record<string, GolferScore> = {};

    for (const comp of competitors) {
      const espnName = comp.athlete?.displayName || comp.athlete?.fullName || "";
      const poolName = findPoolName(espnName, nameMap);

      if (poolName) {
        golfers[poolName] = {
          name: poolName,
          rounds: parseRounds(comp),
          total: parseTotal(comp),
          thru: parseThru(comp),
          status: parseStatus(comp),
          position: comp.status?.position?.displayName || comp.sortOrder?.toString() || null,
          today: parseToday(comp),
          scorecards: parseScorecards(comp),
        };
      }
    }

    // Determine tournament status
    const statusType = mastersEvent.status?.type?.name?.toLowerCase() || "";
    let tournamentStatus: "pre" | "in_progress" | "complete" = "pre";
    if (statusType === "in" || statusType === "in progress") {
      tournamentStatus = "in_progress";
    } else if (statusType === "post" || statusType === "complete" || statusType === "final") {
      tournamentStatus = "complete";
    }

    const currentRound = mastersEvent.status?.period || competition.status?.period || 1;

    return {
      golfers,
      lastUpdated: new Date().toISOString(),
      tournamentStatus,
      tournamentRound: currentRound,
      source: "espn",
    };
  } catch (error) {
    console.error("ESPN parse error:", error);
    return null;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export function mergeWithManual(espnData: ScoreData | null, manualScores: ManualScores | null): ScoreData {
  const base: ScoreData = espnData || {
    golfers: {},
    lastUpdated: new Date().toISOString(),
    tournamentStatus: "pre",
    tournamentRound: 1,
    source: "manual",
  };

  if (!manualScores || Object.keys(manualScores.golfers).length === 0) {
    return base;
  }

  const merged = { ...base, source: espnData ? "mixed" as const : "manual" as const };
  const mergedGolfers = { ...base.golfers };

  for (const [name, manual] of Object.entries(manualScores.golfers)) {
    // Manual overrides ESPN, but preserve scorecards from ESPN
    mergedGolfers[name] = {
      name,
      rounds: manual.rounds,
      total: manual.total,
      status: manual.status,
      thru: manual.thru,
      position: manual.position,
      today: manual.today,
      scorecards: base.golfers[name]?.scorecards,
    };
  }

  merged.golfers = mergedGolfers;
  return merged;
}
