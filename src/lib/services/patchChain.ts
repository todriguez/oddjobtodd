/**
 * patchChain — read-side of the OJT conversation history.
 *
 * OJT-P5 companion to BRAP's `conversationPatches.ts`. OJT doesn't
 * need a separate `ConversationPatch` table — `sem_object_patches`
 * already has the federation columns (`timestamp`, `facetId`,
 * `lexicon`) from OJT-P1, and every LLM turn in P5 writes a patch
 * row there anyway. So the "conversation patch" table and the
 * "semantic patch" table are the same table; this helper scopes a
 * read to one object and renders a prompt-ready history block.
 *
 * Usage:
 *   const chain = await listRecentPatches(objectId, N);
 *   const block = formatHistoryBlock(chain);  // "[t-N] facet / kind / delta" lines
 *
 * Kept intentionally thin — no joins, no filtering beyond objectId +
 * limit, no dependency on runtime adapters. P6 will grow this to
 * accept a lexicon filter.
 */
import { desc, eq } from "drizzle-orm";

import { getDb } from "../db/client";
import { objectPatches } from "../semantos-kernel/schema.core";

export interface ObjectPatchRow {
  id: string;
  objectId: string;
  patchKind: string;
  delta: unknown;
  source: string;
  timestamp: number | null;
  facetId: string | null;
  lexicon: string | null;
  createdAt: Date;
}

/**
 * Load the most recent `n` patches for an object, newest-first in
 * the returned array. Callers that want oldest-first for rendering
 * just `.reverse()` — `formatHistoryBlock` does that itself.
 *
 * Returns `[]` when there are no rows. Never throws on empty reads.
 */
export async function listRecentPatches(
  objectId: string,
  n: number,
): Promise<ObjectPatchRow[]> {
  if (n <= 0) return [];
  const db = await getDb();
  const rows = await db
    .select({
      id: objectPatches.id,
      objectId: objectPatches.objectId,
      patchKind: objectPatches.patchKind,
      delta: objectPatches.delta,
      source: objectPatches.source,
      timestamp: objectPatches.timestamp,
      facetId: objectPatches.facetId,
      lexicon: objectPatches.lexicon,
      createdAt: objectPatches.createdAt,
    })
    .from(objectPatches)
    .where(eq(objectPatches.objectId, objectId))
    .orderBy(desc(objectPatches.createdAt))
    .limit(n);
  return rows as ObjectPatchRow[];
}

/**
 * Render a chain as the "CONVERSATION HISTORY" block that prepends
 * to the LLM system prompt. Oldest-first, one line per patch:
 *
 *   [1700000000000] tenant:+61412345678 / extraction / {"jobType":"carpentry"}
 *
 * Empty chain → empty string (so the prompt concat is a no-op).
 * Delta is JSON-stringified and truncated to keep the prompt small.
 */
export function formatHistoryBlock(
  patches: readonly ObjectPatchRow[],
): string {
  if (patches.length === 0) return "";
  const ordered = [...patches].reverse();
  const lines = ordered.map((p) => {
    const ts = p.timestamp ?? (p.createdAt ? p.createdAt.getTime() : 0);
    const facet = p.facetId ?? "unknown";
    const delta = truncate(safeJson(p.delta), 200);
    return `[${ts}] ${facet} / ${p.patchKind} / ${delta}`;
  });
  return `CONVERSATION HISTORY (last ${patches.length} turns):\n${lines.join("\n")}`;
}

function safeJson(v: unknown): string {
  try {
    return JSON.stringify(v);
  } catch {
    return "<unserialisable>";
  }
}

function truncate(s: string, max: number): string {
  return s.length <= max ? s : `${s.slice(0, max - 1)}…`;
}
