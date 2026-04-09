export interface HoleScore {
  hole: number;       // 1-18
  strokes: number;    // actual strokes taken
  toPar: number;      // relative to par (-2, -1, 0, +1, +2, etc.)
  par: number;        // par for this hole
}

export interface RoundScorecard {
  round: number;          // 1-4
  holes: HoleScore[];     // up to 18 holes
  total: number | null;   // total strokes for the round
  toPar: number | null;   // round score relative to par
}

export interface GolferScore {
  name: string;
  rounds: (number | null)[]; // [R1, R2, R3, R4] - null if not played
  total: number | null; // total relative to par
  thru: string | null; // "F", "Thru 12", etc.
  status: "active" | "cut" | "wd" | "dq";
  position: string | null; // "T3", "1", "CUT", etc.
  today: number | null; // today's score relative to par
  espnId: string | null; // ESPN athlete ID for headshot URLs
  scorecards?: RoundScorecard[]; // hole-by-hole data per round
}

export interface PoolPlayerStanding {
  name: string;
  golfers: GolferWithStatus[];
  countingTotal: number | null;
  rank: number;
  previousRank?: number;
}

export interface GolferWithStatus {
  name: string;
  score: GolferScore | null;
  counting: boolean;
}

export interface ScoreData {
  golfers: Record<string, GolferScore>;
  lastUpdated: string;
  tournamentStatus: "pre" | "in_progress" | "complete";
  tournamentRound: number;
  source: "espn" | "manual" | "mixed";
}

export interface ManualScoreEntry {
  rounds: (number | null)[];
  total: number | null;
  status: "active" | "cut" | "wd" | "dq";
  thru: string | null;
  position: string | null;
  today: number | null;
}

export interface ManualScores {
  golfers: Record<string, ManualScoreEntry>;
  lastUpdated: string;
}
