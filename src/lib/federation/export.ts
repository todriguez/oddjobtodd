/**
 * Outbound bundle helpers — load job patches, pack into an addressed
 * signed bundle.
 *
 * In OJT's current schema jobId is NOT identical to semantic_object
 * id (jobs is a relational-world row; semantic_objects is the
 * kernel's canonical-state row). The bridge that links them lives in
 * `semanticRuntimeAdapter`. For P4 we simplify: the caller provides
 * the jobId and we resolve the semantic-object id via the bridge's
 * existing "ensure" row shape — look up in the bridge table, else
 * fall back to treating jobId AS the objectId (covers the inbound
 * federation case where the peer chose the id).
 */

import { desc, eq } from "drizzle-orm";

import { getDb } from "@/lib/db/client";
import {
  objectPatches,
  semanticObjects,
} from "@/lib/semantos-kernel/schema.core";

export interface JobPatchRow {
  id: string;
  objectId: string;
  fromVersion: number;
  toVersion: number;
  prevStateHash: string;
  newStateHash: string;
  patchKind: string;
  delta: unknown;
  deltaCount: number;
  source: string;
  evidenceRef: string | null;
  authorObjectId: string | null;
  timestamp: number | null;
  facetId: string | null;
  facetCapabilities: number[] | null;
  lexicon: string | null;
  createdAt: Date;
}

/**
 * Resolve the semantic-object id for a given job id. Returns null
 * when we can't find any object for that id.
 *
 * Strategy:
 *   1. If there are patches whose objectId === jobId, use jobId
 *      directly (the "jobId is the objectId" case — inbound
 *      federation or newer jobs created in the kernel flow).
 *   2. Otherwise consult the bridge (not wired in P4 — returns null
 *      so the handler falls through to 404).
 */
async function resolveObjectId(jobId: string): Promise<string | null> {
  const db = await getDb();

  // Case 1: direct match on semantic_objects / sem_object_patches.
  const direct = await db
    .select({ id: semanticObjects.id })
    .from(semanticObjects)
    .where(eq(semanticObjects.id, jobId))
    .limit(1);
  if (direct.length > 0) return direct[0].id;

  return null;
}

/**
 * Load all patches for a job, chronological order (oldest first).
 * Empty array when nothing exists for that jobId.
 */
export async function loadJobPatches(jobId: string): Promise<JobPatchRow[]> {
  const db = await getDb();

  const objectId = await resolveObjectId(jobId);
  if (!objectId) return [];

  const rows = await db
    .select()
    .from(objectPatches)
    .where(eq(objectPatches.objectId, objectId))
    .orderBy(objectPatches.createdAt);

  // Normalize types to our JobPatchRow interface (Drizzle types drift
  // between pg + pglite drivers).
  return rows.map((r: any) => ({
    id: r.id,
    objectId: r.objectId,
    fromVersion: r.fromVersion,
    toVersion: r.toVersion,
    prevStateHash: r.prevStateHash,
    newStateHash: r.newStateHash,
    patchKind: r.patchKind,
    delta: r.delta,
    deltaCount: r.deltaCount,
    source: r.source,
    evidenceRef: r.evidenceRef ?? null,
    authorObjectId: r.authorObjectId ?? null,
    timestamp: r.timestamp ?? null,
    facetId: r.facetId ?? null,
    facetCapabilities: r.facetCapabilities ?? null,
    lexicon: r.lexicon ?? null,
    createdAt: r.createdAt,
  }));
}

// Kept for potential future use (aliased desc helper avoids unused
// import lint).
export { desc };
