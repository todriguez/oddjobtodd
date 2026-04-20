/**
 * Phone normalization + deterministic certId derivation.
 *
 * Every phone-derived identity flows through `normalizePhone` first so
 * that multiple surface forms of the same number (local, international,
 * with/without spaces) collapse to a single E.164 string before it's
 * hashed. The certId is `sha256("ojt:${role}:${normalizedPhone}")` as
 * lowercase hex — 64 chars.
 */

import { parsePhoneNumberFromString } from "libphonenumber-js";
import { sha256 } from "@noble/hashes/sha2";
import { bytesToHex } from "@noble/hashes/utils";

export type OjtRole = "tenant" | "rea";

/**
 * Normalize a raw phone input to canonical E.164. Accepts already-E.164
 * strings, local numbers (when `defaultCountry` is provided), or common
 * variants with spaces / dashes / parentheses.
 *
 * Throws when the input cannot be parsed to a valid phone number — the
 * alternative (returning the raw string) would silently bake a
 * different certId into the store per spelling.
 */
export function normalizePhone(
  raw: string,
  defaultCountry: "AU" | string = "AU",
): string {
  if (typeof raw !== "string" || raw.trim().length === 0) {
    throw new Error("normalizePhone: empty input");
  }
  const parsed = parsePhoneNumberFromString(
    raw,
    defaultCountry as Parameters<typeof parsePhoneNumberFromString>[1],
  );
  if (!parsed || !parsed.isValid()) {
    throw new Error(`normalizePhone: invalid phone number: ${raw}`);
  }
  return parsed.number; // E.164 form, e.g. "+61412345678"
}

/**
 * Derive the stable certId for a phone + role pair. Deterministic and
 * independent of the master derivation seed — the certId exists so that
 * peers can reference each other without holding pubkeys yet.
 */
export function certIdFromPhone(phone: string, role: OjtRole): string {
  const normalized = normalizePhone(phone);
  const preimage = `ojt:${role}:${normalized}`;
  const digest = sha256(new TextEncoder().encode(preimage));
  return bytesToHex(digest);
}
