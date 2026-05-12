export interface TierCsvRow {
  tier: number;
  name: string;
  worldRank: number | null;
  seed: number | null;
  notes: string | null;
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === "\"" && next === "\"" && inQuotes) {
      current += "\"";
      i++;
    } else if (char === "\"") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values;
}

function parseOptionalNumber(value: string | undefined) {
  if (!value) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTierNumberFromHeader(header: string) {
  const normalized = header.toLowerCase().trim();
  const match = normalized.match(/^tier\s*([1-6])(?:\s|$)/);
  return match ? Number(match[1]) : null;
}

function parseWideTierCsv(lines: string[], headers: string[]): TierCsvRow[] | null {
  const tierColumns = headers
    .map((header, index) => ({ index, tier: getTierNumberFromHeader(header) }))
    .filter((column): column is { index: number; tier: number } => column.tier !== null);

  if (tierColumns.length === 0) return null;

  const rows: TierCsvRow[] = [];

  for (const [lineIndex, line] of lines.slice(1).entries()) {
    const values = parseCsvLine(line);

    for (const column of tierColumns) {
      const name = values[column.index]?.trim();
      if (!name) continue;

      rows.push({
        tier: column.tier,
        name,
        worldRank: null,
        seed: lineIndex + 1,
        notes: null,
      });
    }
  }

  return rows;
}

export function parseTierCsv(csv: string): TierCsvRow[] {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.toLowerCase());
  const wideRows = parseWideTierCsv(lines, headers);
  if (wideRows) return wideRows;

  const tierIdx = headers.indexOf("tier");
  const nameIdx = headers.indexOf("name");
  const worldRankIdx = headers.indexOf("world_rank");
  const seedIdx = headers.indexOf("seed");
  const notesIdx = headers.indexOf("notes");

  if (tierIdx === -1 || nameIdx === -1) {
    throw new Error("CSV must include tier and name columns.");
  }

  return lines.slice(1).map((line, index) => {
    const values = parseCsvLine(line);
    const tier = Number(values[tierIdx]);
    const name = values[nameIdx];

    if (!Number.isInteger(tier) || tier < 1 || tier > 6) {
      throw new Error(`Row ${index + 2} has an invalid tier. Use 1 through 6.`);
    }

    if (!name) {
      throw new Error(`Row ${index + 2} is missing a golfer name.`);
    }

    return {
      tier,
      name,
      worldRank: parseOptionalNumber(values[worldRankIdx]),
      seed: parseOptionalNumber(values[seedIdx]),
      notes: values[notesIdx] || null,
    };
  });
}
