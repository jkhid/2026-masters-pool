import { PLAYERS } from "./pool-data";
import { GolferScore, GolferWithStatus, PoolPlayerStanding, ScoreData } from "./types";

const CUT_PENALTY_PER_ROUND = 8; // 80 strokes on a par-72 = +8 per round

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

export function calculateStandings(scoreData: ScoreData): PoolPlayerStanding[] {
  const standings: PoolPlayerStanding[] = PLAYERS.map((player) => {
    const golferScores: GolferWithStatus[] = player.golfers.map((golferName) => {
      const score = scoreData.golfers[golferName] || null;
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
  let currentRank = 1;
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
