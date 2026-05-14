import { PLAYERS } from "./pool-data";
import { GolferScore, GolferWithStatus, PoolPlayerStanding, ScoreData } from "./types";

const CUT_PENALTY_PER_ROUND = 8; // 80 strokes on a par-72 = +8 per round

// ─── Fuzzy name lookup ──────────────────────────────────────────────────────
// Contest CSV names ("Hao-Tong Li") often don't exactly match ESPN's
// displayName ("Haotong Li"). Normalize both sides and fall back to a
// last-name + first-initial match for the trickier cases.

function normalizeGolferName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")     // strip diacritics
    .toLowerCase()
    .replace(/['.\-]/g, "")       // joiner punctuation removed entirely (Hao-Tong → Haotong, J.J. → JJ)
    .replace(/[^a-z0-9 ]/g, " ")  // other special chars → space
    .replace(/\s+/g, " ")
    .trim();
}

function findGolferScore(scoreData: ScoreData, golferName: string): GolferScore | null {
  // 1. Direct property access (fast path)
  const direct = scoreData.golfers[golferName];
  if (direct) return direct;

  // 2. Normalized match (handles hyphens, diacritics, case)
  const target = normalizeGolferName(golferName);
  const entries = Object.entries(scoreData.golfers);
  for (const [key, value] of entries) {
    if (normalizeGolferName(key) === target) return value;
  }

  // 3. Last name + first initial fallback
  const targetParts = target.split(" ");
  if (targetParts.length >= 2) {
    const targetLast = targetParts[targetParts.length - 1];
    const targetFirstInitial = targetParts[0][0];
    for (const [key, value] of entries) {
      const keyParts = normalizeGolferName(key).split(" ");
      if (keyParts.length < 2) continue;
      const keyLast = keyParts[keyParts.length - 1];
      const keyFirstInitial = keyParts[0][0];
      if (keyLast === targetLast && keyFirstInitial === targetFirstInitial) {
        return value;
      }
    }
  }

  return null;
}

// Get a golfer's effective to-par total, adding +8 for each cut/wd/dq penalty round
function getEffectiveToPar(golfer: GolferScore): number | null {
  if (golfer.total === null) return null;

  let total = golfer.total;

  // If cut/wd/dq, add +8 for each unplayed round (R3/R4)
  if (golfer.status === "cut" || golfer.status === "wd" || golfer.status === "dq") {
    if (golfer.rounds[2] === null) total += CUT_PENALTY_PER_ROUND;
    if (golfer.rounds[3] === null) total += CUT_PENALTY_PER_ROUND;
  }

  return total;
}

export interface ScoringPlayerPicks {
  name: string;
  golfers: string[];
}

export function calculateStandingsForPlayers(
  scoreData: ScoreData,
  players: ScoringPlayerPicks[],
): PoolPlayerStanding[] {
  const standings: PoolPlayerStanding[] = players.map((player) => {
    const golferScores: GolferWithStatus[] = player.golfers.map((golferName) => {
      const score = findGolferScore(scoreData, golferName);
      return { name: golferName, score, counting: false };
    });

    // Sort by effective total (ascending) - best scores first
    const scored = golferScores
      .map((g, idx) => ({
        ...g,
        effectiveToPar: g.score ? getEffectiveToPar(g.score) : null,
        originalIdx: idx,
      }))
      .sort((a, b) => {
        if (a.effectiveToPar === null && b.effectiveToPar === null) return 0;
        if (a.effectiveToPar === null) return 1;
        if (b.effectiveToPar === null) return -1;
        return a.effectiveToPar - b.effectiveToPar;
      });

    // Best 4 count — only mark golfers with actual scores
    const withScores = scored.filter((g) => g.effectiveToPar !== null);
    const counting = withScores.slice(0, 4);
    counting.forEach((g) => {
      golferScores[g.originalIdx].counting = true;
    });

    const countingTotals = counting
      .map((g) => g.effectiveToPar)
      .filter((t): t is number => t !== null);

    const countingTotal = countingTotals.length > 0
      ? countingTotals.reduce((a, b) => a + b, 0)
      : null;

    return {
      name: player.name,
      golfers: golferScores,
      countingTotal,
      rank: 0,
    };
  });

  // Sort by counting total
  standings.sort((a, b) => {
    if (a.countingTotal === null && b.countingTotal === null) return 0;
    if (a.countingTotal === null) return 1;
    if (b.countingTotal === null) return -1;
    return a.countingTotal - b.countingTotal;
  });

  // Assign ranks (handle ties)
  standings.forEach((s, i) => {
    if (i === 0) {
      s.rank = 1;
    } else if (s.countingTotal === standings[i - 1].countingTotal) {
      s.rank = standings[i - 1].rank;
    } else {
      s.rank = i + 1;
    }
  });

  return standings;
}

export function calculateStandings(scoreData: ScoreData): PoolPlayerStanding[] {
  return calculateStandingsForPlayers(scoreData, PLAYERS);
}

export function formatScore(score: number | null): string {
  if (score === null) return "-";
  if (score === 0) return "E";
  if (score > 0) return `+${score}`;
  return `${score}`;
}

export function formatRoundScore(score: number | null): string {
  if (score === null) return "-";
  return `${score}`;
}
