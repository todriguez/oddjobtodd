/**
 * POST /api/v2/admin/import-job/upload
 *
 * Upload a PDF job sheet and extract structured data via Claude.
 * Returns the extraction + gaps for admin review (does NOT create a job).
 */

import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";
import { withAdminAuth } from "@/lib/middleware/withAdminAuth";
import { extractFromPdf } from "@/lib/services/pdfImportService";

const MAX_PDF_SIZE = 10 * 1024 * 1024; // 10MB

export const POST = withAdminAuth(async (request: NextRequest) => {
  try {
    const formData = await request.formData();
    const file = formData.get("pdf") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No PDF file provided" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 400 });
    }

    if (file.size > MAX_PDF_SIZE) {
      return NextResponse.json({ error: "PDF too large (max 10MB)" }, { status: 400 });
    }

    // Upload to Vercel Blob
    const path = `imports/${randomUUID()}.pdf`;
    const blob = await put(path, file, {
      access: "public",
      contentType: "application/pdf",
    });

    // Extract structured data from the PDF
    const result = await extractFromPdf(blob.url);

    return NextResponse.json({
      success: true,
      pdfUrl: blob.url,
      extraction: result.extraction,
      jobState: result.jobState,
      gaps: result.gaps,
      confidence: result.confidence,
    });
  } catch (error) {
    console.error("PDF upload/extraction error:", error);
    return NextResponse.json(
      { error: `Import failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
});
