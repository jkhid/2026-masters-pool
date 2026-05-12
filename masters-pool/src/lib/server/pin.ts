import { randomBytes, scryptSync, timingSafeEqual } from "crypto";

const KEY_LENGTH = 32;

export function normalizeParticipantName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function hashPin(pin: string) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(pin, salt, KEY_LENGTH).toString("hex");
  return { salt, hash };
}

export function verifyPin(pin: string, salt: string, expectedHash: string) {
  const actual = scryptSync(pin, salt, KEY_LENGTH);
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) return false;
  return timingSafeEqual(actual, expected);
}
