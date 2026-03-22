/**
 * GET /api/v2/customers/jobs
 *
 * Returns jobs for the authenticated customer.
 * Protected by edge middleware (customer session required).
 */

import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { eq, desc } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const customerId = request.headers.get("x-session-customer-id");
  if (!customerId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  try {
    const db = await getDb();

    const customerJobs = await db
      .select({
        id: jobs.id,
        status: jobs.status,
        jobType: jobs.jobType,
        descriptionSummary: jobs.descriptionSummary,
        effortBand: jobs.effortBand,
        metadata: jobs.metadata,
        lastCustomerMessageAt: jobs.lastCustomerMessageAt,
        createdAt: jobs.createdAt,
        updatedAt: jobs.updatedAt,
      })
      .from(jobs)
      .where(eq(jobs.customerId, customerId))
      .orderBy(desc(jobs.updatedAt))
      .limit(20);

    const result = customerJobs.map((job) => {
      const meta = (job.metadata as Record<string, unknown>) || {};
      return {
        id: job.id,
        status: job.status,
        jobType: job.jobType,
        scopeSummary:
          (meta.scopeDescription as string)?.substring(0, 100) ||
          job.descriptionSummary ||
          null,
        effortBand: job.effortBand,
        lastMessageAt: job.lastCustomerMessageAt || job.updatedAt,
        createdAt: job.createdAt,
      };
    });

    return NextResponse.json({ jobs: result });
  } catch (error: unknown) {
    console.error("GET /api/v2/customers/jobs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch jobs" },
      { status: 500 }
    );
  }
}
