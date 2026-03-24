/**
 * POST /api/v2/admin/import-job/send-sms
 *
 * Send an SMS to a customer with a link to continue their conversation.
 * Manually triggered by Todd from the admin UI.
 */

import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getDb } from "@/lib/db/client";
import { jobs, messages } from "@/lib/db/schema";
import { withAdminAuth } from "@/lib/middleware/withAdminAuth";
import { getSmsService, normalizePhone } from "@/lib/services/smsService";
import { createLogger } from "@/lib/logger";

const log = createLogger("import-job.sms");

const sendSmsSchema = z.object({
  jobId: z.string().uuid(),
  phone: z.string().min(6),
  message: z.string().min(10).max(640),
});

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const { jobId, phone, message: smsBody } = sendSmsSchema.parse(body);

    // Verify job exists
    const db = await getDb();
    const [job] = await db.select().from(jobs).where(eq(jobs.id, jobId)).limit(1);
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Send the SMS
    const sms = getSmsService();
    const normalized = normalizePhone(phone);
    const result = await sms.sendMessage(normalized, smsBody);

    if (!result.success) {
      return NextResponse.json({ error: "SMS delivery failed" }, { status: 502 });
    }

    // Record the outbound SMS as a system message on the job
    await db.insert(messages).values({
      jobId,
      customerId: job.customerId || undefined,
      senderType: "system",
      messageType: "text",
      rawContent: `[SMS sent to ${normalized}] ${smsBody}`,
    });

    // Update job status to awaiting_customer if currently partial_intake
    if (job.status === "partial_intake" || job.status === "new_lead") {
      await db
        .update(jobs)
        .set({ status: "awaiting_customer" })
        .where(eq(jobs.id, jobId));
    }

    log.info({ jobId, messageSid: result.messageSid }, "import-job.sms.sent");

    return NextResponse.json({
      success: true,
      messageSid: result.messageSid,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid data", details: error.issues }, { status: 400 });
    }
    console.error("Send SMS error:", error);
    return NextResponse.json(
      { error: `SMS failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
});
