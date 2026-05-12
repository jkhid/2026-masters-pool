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

export interface CutLineInfo {
  projectedScore: number;   // the to-par score at position 50
  isProjected: boolean;     // true during R1/R2, false after cut is official
  playersAtLine: number;    // how many players are exactly at the cut score
  playersMakingCut: number; // total making the cut (including ties)
  totalField: number;       // total competitors in the field
}

export interface ScoreData {
  golfers: Record<string, GolferScore>;
  lastUpdated: string;
  tournamentStatus: "pre" | "in_progress" | "complete";
  tournamentRound: number;
  source: "espn" | "manual" | "mixed";
  cutLine: CutLineInfo | null;
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

export type MajorKey = "masters" | "pga-championship" | "us-open" | "open-championship";

export interface MajorCalendarEntry {
  majorKey: MajorKey;
  espnEventId: string;
  label: string;        // ESPN's label, e.g. "Masters Tournament"
  startDate: string;    // ISO datetime — first round start (with suggested tee time applied)
  endDate: string;      // ISO datetime — final round end
  rawStartDate: string; // ISO datetime from ESPN — typically midnight at venue
  rawEndDate: string;
}

export type MajorsCalendar = Partial<Record<MajorKey, MajorCalendarEntry>>;

export type ContestStatus = "setup" | "open" | "revealed" | "complete" | "archived";

export interface Major {
  key: MajorKey;
  name: string;
  displayOrder: number;
}

export interface Contest {
  id: string;
  majorKey: MajorKey;
  year: number;
  name: string;
  status: ContestStatus;
  startsAt: string | null;
  revealAt: string | null;
  expectedParticipants: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface TierGolfer {
  id: string;
  tierId: string;
  name: string;
  worldRank: number | null;
  seed: number | null;
  notes: string | null;
}

export interface Tier {
  id: string;
  contestId: string;
  tierNumber: number;
  label: string;
  golfers: TierGolfer[];
}

export interface Participant {
  id: string;
  contestId: string;
  name: string;
  displayName: string;
  isBooted: boolean;
  submittedAt: string | null;
  createdAt: string;
}

export interface ContestPick {
  id: string;
  participantId: string;
  tierId: string;
  golferName: string;
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantPickSet {
  participant: Participant;
  picks: ContestPick[];
}

export interface PublicContestState {
  contest: Contest;
  tiers: Tier[];
  participants: Pick<Participant, "id" | "displayName" | "isBooted" | "submittedAt">[];
  revealPicks: boolean;
  submittedCount: number;
  activeParticipantCount: number;
  pickSets: ParticipantPickSet[];
}
