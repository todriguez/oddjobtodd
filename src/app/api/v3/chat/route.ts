/**
 * POST /api/v3/chat
 *
 * Phone-identity aware chat endpoint for the OJT HTTP edge (P4).
 *
 * Request body:
 *   { phone: string, message: string, jobId?: string }
 *
 * 200: { reply, jobId }
 * 400: { code: "bad_request", detail }
 * 500: { code: "internal", detail }
 *
 * Additive — does not touch /api/v2/*. The body contract is stable;
 * P5 will rewire the internals of handleTenantMessage through the
 * semantic-object bridge.
 */

import { NextRequest, NextResponse } from "next/server";

import { handleTenantMessage } from "@/lib/services/chatService";
import { phoneToIdentity } from "@/lib/identity";
import { createLogger } from "@/lib/logger";

const log = createLogger("v3.chat");

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { code: "bad_request", detail: "invalid JSON body" },
      { status: 400 },
    );
  }

  const b = body as { phone?: unknown; message?: unknown; jobId?: unknown };
  if (typeof b.phone !== "string" || b.phone.length === 0) {
    return NextResponse.json(
      { code: "bad_request", detail: "missing phone" },
      { status: 400 },
    );
  }
  if (typeof b.message !== "string" || b.message.length === 0) {
    return NextResponse.json(
      { code: "bad_request", detail: "missing message" },
      { status: 400 },
    );
  }
  if (b.jobId !== undefined && typeof b.jobId !== "string") {
    return NextResponse.json(
      { code: "bad_request", detail: "jobId must be a string" },
      { status: 400 },
    );
  }

  try {
    const identity = phoneToIdentity(b.phone, "tenant");
    const result = await handleTenantMessage({
      identity,
      message: b.message,
      jobId: b.jobId,
    });
    return NextResponse.json(result, { status: 200 });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    log.error({ detail }, "v3.chat.error");
    return NextResponse.json(
      { code: "internal", detail },
      { status: 500 },
    );
  }
}
