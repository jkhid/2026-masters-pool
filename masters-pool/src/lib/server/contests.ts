import {
  Contest,
  ContestPick,
  ContestStatus,
  Major,
  MajorKey,
  Participant,
  ParticipantPickSet,
  PublicContestState,
  Tier,
  TierGolfer,
} from "@/lib/types";
import { hashPin, normalizeParticipantName, verifyPin } from "./pin";
import { supabaseRequest } from "./supabase";
import { TierCsvRow } from "./csv";

type ContestRow = {
  id: string;
  major_key: MajorKey;
  year: number;
  name: string;
  status: ContestStatus;
  starts_at: string | null;
  reveal_at: string | null;
  expected_participants: number | null;
  created_at: string;
  updated_at: string;
};

type TierRow = {
  id: string;
  contest_id: string;
  tier_number: number;
  label: string;
};

type TierGolferRow = {
  id: string;
  tier_id: string;
  name: string;
  world_rank: number | null;
  seed: number | null;
  notes: string | null;
};

type ParticipantRow = {
  id: string;
  contest_id: string;
  name_key: string;
  display_name: string;
  pin_salt: string;
  pin_hash: string;
  is_booted: boolean;
  submitted_at: string | null;
  created_at: string;
};

type PickRow = {
  id: string;
  participant_id: string;
  tier_id: string;
  golfer_name: string;
  created_at: string;
  updated_at: string;
};

function toContest(row: ContestRow): Contest {
  return {
    id: row.id,
    majorKey: row.major_key,
    year: row.year,
    name: row.name,
    status: row.status,
    startsAt: row.starts_at,
    revealAt: row.reveal_at,
    expectedParticipants: row.expected_participants,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toTier(row: TierRow, golfers: TierGolfer[]): Tier {
  return {
    id: row.id,
    contestId: row.contest_id,
    tierNumber: row.tier_number,
    label: row.label,
    golfers,
  };
}

function toTierGolfer(row: TierGolferRow): TierGolfer {
  return {
    id: row.id,
    tierId: row.tier_id,
    name: row.name,
    worldRank: row.world_rank,
    seed: row.seed,
    notes: row.notes,
  };
}

function toParticipant(row: ParticipantRow): Participant {
  return {
    id: row.id,
    contestId: row.contest_id,
    name: row.name_key,
    displayName: row.display_name,
    isBooted: row.is_booted,
    submittedAt: row.submitted_at,
    createdAt: row.created_at,
  };
}

function toPick(row: PickRow): ContestPick {
  return {
    id: row.id,
    participantId: row.participant_id,
    tierId: row.tier_id,
    golferName: row.golfer_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function listMajors(): Promise<Major[]> {
  const rows = await supabaseRequest<Array<{ key: MajorKey; name: string; display_order: number }>>("majors", {
    query: { select: "key,name,display_order", order: "display_order.asc" },
  });

  return rows.map((row) => ({
    key: row.key,
    name: row.name,
    displayOrder: row.display_order,
  }));
}

export async function listContests() {
  const rows = await supabaseRequest<ContestRow[]>("contests", {
    query: { select: "*", order: "year.desc,major_key.asc" },
  });

  return rows.map(toContest);
}

export async function getContest(contestId: string) {
  const rows = await supabaseRequest<ContestRow[]>("contests", {
    query: { id: `eq.${contestId}`, select: "*", limit: 1 },
  });

  return rows[0] ? toContest(rows[0]) : null;
}

async function getContestRows(contestId: string) {
  const [contest, tierRows, participantRows] = await Promise.all([
    getContest(contestId),
    supabaseRequest<TierRow[]>("tiers", {
      query: { contest_id: `eq.${contestId}`, select: "*", order: "tier_number.asc" },
    }),
    supabaseRequest<ParticipantRow[]>("participants", {
      query: { contest_id: `eq.${contestId}`, select: "*", order: "created_at.asc" },
    }),
  ]);

  if (!contest) return null;

  const tierIds = tierRows.map((tier) => tier.id);
  const golferRows = tierIds.length
    ? await supabaseRequest<TierGolferRow[]>("tier_golfers", {
        query: {
          tier_id: `in.(${tierIds.join(",")})`,
          select: "*",
          order: "seed.asc,name.asc",
        },
      })
    : [];

  const tierGolfers = golferRows.map(toTierGolfer);
  const tiers = tierRows.map((tier) =>
    toTier(
      tier,
      tierGolfers.filter((golfer) => golfer.tierId === tier.id),
    ),
  );

  return {
    contest,
    tiers,
    participants: participantRows,
  };
}

async function updateContestStatus(contest: Contest, status: ContestStatus) {
  const rows = await supabaseRequest<ContestRow[]>("contests", {
    method: "PATCH",
    query: { id: `eq.${contest.id}` },
    body: {
      status,
      reveal_at: status === "revealed" ? new Date().toISOString() : contest.revealAt,
    },
    prefer: "return=representation",
  });

  return toContest(rows[0]);
}

async function bootLateParticipants(contest: Contest, participants: ParticipantRow[]) {
  if (!contest.startsAt || contest.status !== "open") return participants;
  if (new Date(contest.startsAt).getTime() > Date.now()) return participants;

  const late = participants.filter((participant) => !participant.submitted_at && !participant.is_booted);
  if (late.length === 0) return participants;

  await supabaseRequest<null>("participants", {
    method: "PATCH",
    query: {
      contest_id: `eq.${contest.id}`,
      submitted_at: "is.null",
      is_booted: "eq.false",
    },
    body: { is_booted: true },
  });

  return participants.map((participant) =>
    late.some((lateParticipant) => lateParticipant.id === participant.id)
      ? { ...participant, is_booted: true }
      : participant,
  );
}

async function maybeReveal(contest: Contest, participants: ParticipantRow[]) {
  if (["revealed", "complete", "archived"].includes(contest.status)) return contest;
  if (contest.status !== "open") return contest;

  const activeParticipants = participants.filter((participant) => !participant.is_booted);
  const submittedCount = activeParticipants.filter((p) => Boolean(p.submitted_at)).length;
  const hasStarted = contest.startsAt
    ? new Date(contest.startsAt).getTime() <= Date.now()
    : false;

  // Reveal only when every active entrant has submitted. If expected_participants
  // is set, require the active field to have reached that size before tee time;
  // after tee time, non-submitters have already been booted, so reveal when the
  // remaining active entrants are complete.
  const hasFullExpectedField =
    hasStarted ||
    contest.expectedParticipants === null ||
    activeParticipants.length >= contest.expectedParticipants;
  const shouldReveal =
    activeParticipants.length > 0 &&
    hasFullExpectedField &&
    submittedCount === activeParticipants.length;

  return shouldReveal ? updateContestStatus(contest, "revealed") : contest;
}

export async function getPublicContestState(contestId: string): Promise<PublicContestState | null> {
  const rows = await getContestRows(contestId);
  if (!rows) return null;

  const bootedParticipants = await bootLateParticipants(rows.contest, rows.participants);
  const contest = await maybeReveal(rows.contest, bootedParticipants);
  const revealPicks = ["revealed", "complete", "archived"].includes(contest.status);
  const participants = bootedParticipants.map(toParticipant);
  const activeParticipants = participants.filter((participant) => !participant.isBooted);

  let pickSets: ParticipantPickSet[] = [];

  if (revealPicks) {
    const participantIds = activeParticipants.map((participant) => participant.id);
    const pickRows = participantIds.length
      ? await supabaseRequest<PickRow[]>("picks", {
          query: {
            participant_id: `in.(${participantIds.join(",")})`,
            select: "*",
          },
        })
      : [];
    const picks = pickRows.map(toPick);

    pickSets = activeParticipants.map((participant) => ({
      participant,
      picks: picks.filter((pick) => pick.participantId === participant.id),
    }));
  }

  return {
    contest,
    tiers: rows.tiers,
    participants: participants.map(({ id, displayName, isBooted, submittedAt }) => ({
      id,
      displayName,
      isBooted,
      submittedAt,
    })),
    revealPicks,
    submittedCount: activeParticipants.filter((participant) => participant.submittedAt).length,
    activeParticipantCount: activeParticipants.length,
    pickSets,
  };
}

export async function createContest(input: {
  majorKey: MajorKey;
  year: number;
  startsAt: string | null;
  expectedParticipants: number | null;
}) {
  const rows = await supabaseRequest<ContestRow[]>("contests", {
    method: "POST",
    body: {
      major_key: input.majorKey,
      year: input.year,
      name: `${input.year} ${majorName(input.majorKey)}`,
      status: "setup",
      starts_at: input.startsAt,
      expected_participants: input.expectedParticipants,
    },
    prefer: "return=representation",
  });

  return toContest(rows[0]);
}

export async function openContest(contestId: string) {
  const rows = await supabaseRequest<ContestRow[]>("contests", {
    method: "PATCH",
    query: { id: `eq.${contestId}` },
    body: { status: "open" },
    prefer: "return=representation",
  });

  return toContest(rows[0]);
}

export async function updateContestSettings(
  contestId: string,
  updates: { expectedParticipants?: number | null; startsAt?: string | null },
) {
  const body: Record<string, unknown> = {};
  if (updates.expectedParticipants !== undefined) {
    body.expected_participants = updates.expectedParticipants;
  }
  if (updates.startsAt !== undefined) {
    body.starts_at = updates.startsAt;
  }

  if (Object.keys(body).length === 0) {
    const contest = await getContest(contestId);
    if (!contest) throw new Error("Contest not found.");
    return contest;
  }

  const rows = await supabaseRequest<ContestRow[]>("contests", {
    method: "PATCH",
    query: { id: `eq.${contestId}` },
    body,
    prefer: "return=representation",
  });

  if (rows.length === 0) throw new Error("Contest not found.");

  // Re-evaluate reveal status in case expected_participants change crosses the threshold
  await getPublicContestState(contestId);

  return toContest(rows[0]);
}

export async function deleteContest(contestId: string) {
  const contest = await getContest(contestId);
  if (!contest) throw new Error("Contest not found.");

  // Cascading delete handles tiers, tier_golfers, participants, picks, snapshots
  await supabaseRequest<null>("contests", {
    method: "DELETE",
    query: { id: `eq.${contestId}` },
  });
}

export async function manuallyRevealContest(contestId: string) {
  const contest = await getContest(contestId);
  if (!contest) throw new Error("Contest not found.");
  if (["revealed", "complete", "archived"].includes(contest.status)) {
    return contest;
  }
  return updateContestStatus(contest, "revealed");
}

export async function importTierRows(contestId: string, rows: TierCsvRow[]) {
  const existingTierIds = await getTierIdList(contestId);
  if (existingTierIds) {
    await supabaseRequest<null>("tier_golfers", {
      method: "DELETE",
      query: { tier_id: `in.(${existingTierIds})` },
    });
  }

  await supabaseRequest<null>("tiers", {
    method: "DELETE",
    query: { contest_id: `eq.${contestId}` },
  });

  const tiers = await supabaseRequest<TierRow[]>("tiers", {
    method: "POST",
    body: [1, 2, 3, 4, 5, 6].map((tierNumber) => ({
      contest_id: contestId,
      tier_number: tierNumber,
      label: `Tier ${tierNumber}`,
    })),
    prefer: "return=representation",
  });

  const golferRows = rows.map((row) => {
    const tier = tiers.find((candidate) => candidate.tier_number === row.tier);
    if (!tier) throw new Error(`Could not create tier ${row.tier}.`);
    return {
      tier_id: tier.id,
      name: row.name,
      world_rank: row.worldRank,
      seed: row.seed,
      notes: row.notes,
    };
  });

  if (golferRows.length > 0) {
    await supabaseRequest<TierGolferRow[]>("tier_golfers", {
      method: "POST",
      body: golferRows,
      prefer: "return=representation",
    });
  }
}

async function getTierIdList(contestId: string) {
  const tiers = await supabaseRequest<TierRow[]>("tiers", {
    query: { contest_id: `eq.${contestId}`, select: "id" },
  });

  return tiers.map((tier) => tier.id).join(",");
}

export async function joinContest(contestId: string, name: string, pin: string) {
  const contest = await getContest(contestId);
  if (!contest) throw new Error("Contest not found.");

  const nameKey = normalizeParticipantName(name);
  if (!nameKey || pin.length < 4) {
    throw new Error("Enter a name and a PIN with at least 4 characters.");
  }

  // Check if participant already exists
  const existingRows = await supabaseRequest<ParticipantRow[]>("participants", {
    query: {
      contest_id: `eq.${contestId}`,
      name_key: `eq.${nameKey}`,
      select: "*",
      limit: 1,
    },
  });

  let participantRow: ParticipantRow;
  let isNew = false;

  if (existingRows.length > 0) {
    // Existing participant - verify PIN
    participantRow = existingRows[0];
    if (participantRow.is_booted) {
      throw new Error("This participant was removed from the contest.");
    }
    if (!verifyPin(pin, participantRow.pin_salt, participantRow.pin_hash)) {
      throw new Error("That PIN does not match this participant.");
    }
  } else {
    // New participant - contest must be open
    if (contest.status !== "open") {
      throw new Error("This contest is not open for new entries.");
    }
    if (contest.startsAt && new Date(contest.startsAt).getTime() <= Date.now()) {
      throw new Error("This contest has started. New entries are closed.");
    }
    if (contest.expectedParticipants !== null) {
      const activeCount = existingRows.length > 0
        ? 1
        : await getActiveParticipantCount(contestId);
      if (activeCount >= contest.expectedParticipants) {
        throw new Error("This contest is full.");
      }
    }
    isNew = true;
    const { salt, hash } = hashPin(pin);
    const rows = await supabaseRequest<ParticipantRow[]>("participants", {
      method: "POST",
      body: {
        contest_id: contestId,
        name_key: nameKey,
        display_name: name.trim(),
        pin_salt: salt,
        pin_hash: hash,
      },
      prefer: "return=representation",
    });
    participantRow = rows[0];
  }

  // Fetch existing picks for this participant
  const pickRows = await supabaseRequest<PickRow[]>("picks", {
    query: { participant_id: `eq.${participantRow.id}`, select: "*" },
  });

  return {
    participant: toParticipant(participantRow),
    picks: pickRows.map(toPick),
    isNew,
  };
}

export async function saveParticipantPicks(input: {
  contestId: string;
  name: string;
  pin: string;
  picksByTierId: Record<string, string>;
}) {
  const rows = await getContestRows(input.contestId);
  if (!rows || rows.contest.status !== "open") {
    throw new Error("Picks are locked for this contest.");
  }
  if (rows.contest.startsAt && new Date(rows.contest.startsAt).getTime() <= Date.now()) {
    throw new Error("Picks are locked because this contest has started.");
  }

  const participantRow = rows.participants.find(
    (participant) => participant.name_key === normalizeParticipantName(input.name),
  );

  if (!participantRow || participantRow.is_booted) {
    throw new Error("Participant not found for this open contest.");
  }

  if (!verifyPin(input.pin, participantRow.pin_salt, participantRow.pin_hash)) {
    throw new Error("That PIN does not match this participant.");
  }

  const tierIds = rows.tiers.map((tier) => tier.id);
  const selectedTierIds = Object.keys(input.picksByTierId);

  if (tierIds.length !== 6 || selectedTierIds.length !== 6) {
    throw new Error("Select exactly one golfer from each of the six tiers.");
  }

  const pickRows = rows.tiers.map((tier) => {
    const golferName = input.picksByTierId[tier.id];
    const isValidGolfer = tier.golfers.some((golfer) => golfer.name === golferName);

    if (!isValidGolfer) {
      throw new Error(`Invalid selection for ${tier.label}.`);
    }

    return {
      participant_id: participantRow.id,
      tier_id: tier.id,
      golfer_name: golferName,
    };
  });

  await supabaseRequest<null>("picks", {
    method: "DELETE",
    query: { participant_id: `eq.${participantRow.id}` },
  });

  await supabaseRequest<PickRow[]>("picks", {
    method: "POST",
    body: pickRows,
    prefer: "return=representation",
  });

  await supabaseRequest<ParticipantRow[]>("participants", {
    method: "PATCH",
    query: { id: `eq.${participantRow.id}` },
    body: { submitted_at: participantRow.submitted_at ?? new Date().toISOString() },
    prefer: "return=representation",
  });

  await getPublicContestState(input.contestId);
}

async function getActiveParticipantCount(contestId: string) {
  const rows = await supabaseRequest<Array<{ id: string }>>("participants", {
    query: {
      contest_id: `eq.${contestId}`,
      is_booted: "eq.false",
      select: "id",
    },
  });

  return rows.length;
}

function majorName(key: MajorKey) {
  const names: Record<MajorKey, string> = {
    masters: "Masters",
    "pga-championship": "PGA Championship",
    "us-open": "U.S. Open",
    "open-championship": "The Open Championship",
  };

  return names[key];
}
