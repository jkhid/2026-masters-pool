import {
  GolferScore,
  ScoreData,
  ManualScores,
  HoleScore,
  RoundScorecard,
  CutLineInfo,
  MajorKey,
  MajorCalendarEntry,
  MajorsCalendar,
} from "./types";
import { recordGolferId } from "./server/golfer-roster";
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

    // Collect ALL competitor scores for cut line calculation
    const allScores: number[] = [];

    for (const comp of competitors) {
      const espnName = comp.athlete?.displayName || comp.athlete?.fullName || "";
      const espnId = comp.id || comp.athlete?.id || null;
      const total = parseTotal(comp);
      const status = parseStatus(comp);

      // Always record the name→ID mapping in the roster cache, regardless of
      // whether the golfer is in our pool. This builds up coverage over time.
      if (espnName && espnId) {
        recordGolferId(espnName, String(espnId));
      }

      // Track all active competitor scores for cut line
      if (total !== null && status === "active") {
        allScores.push(total);
      }

      const poolName = findPoolName(espnName, nameMap);

      const golferScore: GolferScore = {
        name: poolName ?? espnName,
        rounds: parseRounds(comp),
        total,
        thru: parseThru(comp),
        status,
        position: comp.status?.position?.displayName || comp.sortOrder?.toString() || null,
        today: parseToday(comp),
        espnId: espnId ? String(espnId) : null,
        scorecards: parseScorecards(comp),
      };

      if (espnName) {
        golfers[espnName] = { ...golferScore, name: espnName };
      }

      if (poolName) {
        golfers[poolName] = { ...golferScore, name: poolName };
      }
    }

    // Calculate cut line (top 50 + ties)
    let cutLine: CutLineInfo | null = null;
    if (allScores.length > 0) {
      allScores.sort((a, b) => a - b);
      const cutIndex = Math.min(49, allScores.length - 1); // position 50 (0-indexed: 49)
      const projectedScore = allScores[cutIndex];
      const playersAtLine = allScores.filter(s => s === projectedScore).length;
      const playersMakingCut = allScores.filter(s => s <= projectedScore).length;

      // Cut is official after round 2, projected during R1/R2
      const hasCutPlayers = competitors.some((c: any) => {
        const st = c.status?.type?.name?.toLowerCase() || "";
        return st === "cut";
      });

      cutLine = {
        projectedScore,
        isProjected: !hasCutPlayers,
        playersAtLine,
        playersMakingCut,
        totalField: competitors.length,
      };
    }

    // Determine tournament status - infer from data if status fields are missing
    const statusType = mastersEvent.status?.type?.name?.toLowerCase() || "";
    let tournamentStatus: "pre" | "in_progress" | "complete" = "pre";
    if (statusType === "in" || statusType === "in progress") {
      tournamentStatus = "in_progress";
    } else if (statusType === "post" || statusType === "complete" || statusType === "final") {
      tournamentStatus = "complete";
    } else {
      // Infer from data: if any competitor has scores, tournament is in progress
      const hasAnyScores = competitors.some((c: any) => {
        const ls = c.linescores || [];
        return ls.length > 0 && ls[0]?.linescores?.length > 0;
      });
      if (hasAnyScores) {
        // Check if all 4 rounds are complete for leaders
        const allRoundsComplete = competitors.some((c: any) => {
          const ls = c.linescores || [];
          return ls.length >= 4 && ls[3]?.linescores?.length === 18;
        });
        tournamentStatus = allRoundsComplete ? "complete" : "in_progress";
      }
    }

    // Infer current round from data
    const currentRound = mastersEvent.status?.period || competition.status?.period || (() => {
      // Find the max round that has any hole data
      let maxRound = 1;
      for (const comp of competitors) {
        const ls = comp.linescores || [];
        for (let i = 0; i < Math.min(ls.length, 4); i++) {
          if (ls[i]?.linescores?.length > 0) {
            maxRound = Math.max(maxRound, i + 1);
          }
        }
      }
      return maxRound;
    })();

    return {
      golfers,
      lastUpdated: new Date().toISOString(),
      tournamentStatus,
      tournamentRound: currentRound,
      source: "espn",
      cutLine,
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
    cutLine: null,
  };

  if (!manualScores || Object.keys(manualScores.golfers).length === 0) {
    return base;
  }

  const merged = { ...base, source: espnData ? "mixed" as const : "manual" as const };
  const mergedGolfers = { ...base.golfers };

  for (const [name, manual] of Object.entries(manualScores.golfers)) {
    // Manual overrides ESPN, but preserve scorecards and espnId from ESPN
    mergedGolfers[name] = {
      name,
      rounds: manual.rounds,
      total: manual.total,
      status: manual.status,
      thru: manual.thru,
      position: manual.position,
      today: manual.today,
      espnId: base.golfers[name]?.espnId ?? null,
      scorecards: base.golfers[name]?.scorecards,
    };
  }

  merged.golfers = mergedGolfers;
  return merged;
}

// ────────────────────────────────────────────────────────────────────────────
// MAJORS CALENDAR
// Pulls the PGA Tour season calendar from ESPN and extracts the four majors,
// applying a sensible first-tee-time default since ESPN doesn't publish actual
// tee times until close to the event.
// ────────────────────────────────────────────────────────────────────────────

// Match ESPN calendar labels to our MajorKey values (case-insensitive substring).
const MAJOR_LABEL_PATTERNS: Array<{ majorKey: MajorKey; pattern: RegExp }> = [
  { majorKey: "masters", pattern: /masters\s+tournament|the\s+masters/i },
  { majorKey: "pga-championship", pattern: /pga\s+championship/i },
  { majorKey: "us-open", pattern: /u\.?s\.?\s+open/i },
  { majorKey: "open-championship", pattern: /^the\s+open$|open\s+championship|british\s+open/i },
];

// Suggested first tee time per major (Thursday morning, in UTC).
// These are approximations — admin can override.
//
// Masters (Augusta GA, EDT UTC-4 in April):       8:00 AM ET → 12:00 UTC
// PGA Championship (varies US, EDT UTC-4 in May): 7:00 AM ET → 11:00 UTC
// U.S. Open (varies US, often UTC-7 in June):     7:00 AM local; default to 11:00 UTC
// The Open (UK, BST UTC+1 in July):               6:35 AM BST → 5:35 UTC
const DEFAULT_FIRST_TEE_UTC: Record<MajorKey, { hour: number; minute: number }> = {
  "masters": { hour: 12, minute: 0 },
  "pga-championship": { hour: 11, minute: 0 },
  "us-open": { hour: 11, minute: 0 },
  "open-championship": { hour: 5, minute: 35 },
};

function applyFirstTeeTime(majorKey: MajorKey, rawIsoDate: string): string {
  const date = new Date(rawIsoDate);
  if (isNaN(date.getTime())) return rawIsoDate;
  const { hour, minute } = DEFAULT_FIRST_TEE_UTC[majorKey];
  date.setUTCHours(hour, minute, 0, 0);
  return date.toISOString();
}

function matchMajorKey(label: string): MajorKey | null {
  for (const { majorKey, pattern } of MAJOR_LABEL_PATTERNS) {
    if (pattern.test(label)) return majorKey;
  }
  return null;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function parseCalendarEntries(data: any): MajorsCalendar {
  const calendar = data?.leagues?.[0]?.calendar || [];
  const result: MajorsCalendar = {};

  for (const entry of calendar) {
    const label: string = entry?.label || "";
    const majorKey = matchMajorKey(label);
    if (!majorKey || result[majorKey]) continue;

    const rawStart = entry?.startDate;
    const rawEnd = entry?.endDate;
    if (!rawStart || !rawEnd) continue;

    result[majorKey] = {
      majorKey,
      espnEventId: String(entry?.id ?? ""),
      label,
      rawStartDate: rawStart,
      rawEndDate: rawEnd,
      startDate: applyFirstTeeTime(majorKey, rawStart),
      endDate: rawEnd,
    };
  }

  return result;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function fetchMajorsCalendar(): Promise<MajorsCalendar> {
  try {
    // Reuse the existing cache from fetchESPNScores when fresh.
    if (cachedData && Date.now() - cachedData.timestamp < CACHE_TTL) {
      return parseCalendarEntries(cachedData.data);
    }
    const response = await fetch(ESPN_URL, {
      next: { revalidate: 3600 }, // calendar changes rarely — cache for an hour
      headers: { "User-Agent": "MajorsPool/1.0" },
    });
    if (!response.ok) {
      return cachedData ? parseCalendarEntries(cachedData.data) : {};
    }
    const data = await response.json();
    cachedData = { data, timestamp: Date.now() };
    return parseCalendarEntries(data);
  } catch (error) {
    console.error("ESPN calendar fetch error:", error);
    return cachedData ? parseCalendarEntries(cachedData.data) : {};
  }
}

export async function getMajorCalendarEntry(majorKey: MajorKey): Promise<MajorCalendarEntry | null> {
  const calendar = await fetchMajorsCalendar();
  return calendar[majorKey] ?? null;
}
