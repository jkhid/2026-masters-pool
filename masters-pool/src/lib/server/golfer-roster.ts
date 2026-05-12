// Server-side roster cache. Accumulates golfer name → ESPN ID mappings over time
// from any scoreboard data we encounter. Bootstrapped from a static seed file.
//
// In-memory only — survives the lifetime of a serverless function instance but
// not cold starts. Cold starts re-bootstrap from the seed file, and the cache
// rebuilds organically as scoreboards are fetched.

import { KNOWN_GOLFER_IDS } from "@/lib/golfer-ids-seed";

const NAME_NORM = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .toLowerCase()
    .trim();

// Authoritative cache: golfer's runtime espnId (preferred over seed if both exist).
// Keyed by normalized name to handle diacritic variations.
const runtimeCache = new Map<string, string>();

// Original-cased display names from the cache. Used so we can return both
// "Ludvig Aberg" and "Ludvig Åberg" entries when populating ScoreData.
const displayNames = new Map<string, Set<string>>(); // normalizedName → Set of displayNames

// Seed bootstrap — only entries the runtime hasn't observed take effect.
function seededLookup(normalized: string): string | undefined {
  for (const [name, id] of Object.entries(KNOWN_GOLFER_IDS)) {
    if (NAME_NORM(name) === normalized) return id;
  }
  return undefined;
}

export function recordGolferId(displayName: string, espnId: string | null | undefined) {
  if (!displayName || !espnId) return;
  const normalized = NAME_NORM(displayName);
  runtimeCache.set(normalized, espnId);
  const set = displayNames.get(normalized) ?? new Set<string>();
  set.add(displayName);
  displayNames.set(normalized, set);
}

export function getGolferId(displayName: string): string | null {
  if (!displayName) return null;
  const normalized = NAME_NORM(displayName);
  return runtimeCache.get(normalized) ?? seededLookup(normalized) ?? null;
}

// Returns the full known roster as a map of displayName → espnId.
// Combines runtime cache + seed file. Runtime entries win on conflict.
export function getFullRoster(): Map<string, string> {
  const result = new Map<string, string>();

  // Seed file first (lower priority)
  for (const [name, id] of Object.entries(KNOWN_GOLFER_IDS)) {
    result.set(name, id);
  }

  // Runtime cache overrides + adds
  for (const [normalized, id] of runtimeCache) {
    const names = displayNames.get(normalized);
    if (names) {
      for (const name of names) {
        result.set(name, id);
      }
    }
  }

  return result;
}
