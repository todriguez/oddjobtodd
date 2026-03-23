/**
 * POST /api/upload
 *
 * Uploads photos to Vercel Blob storage.
 * Returns URLs that can be attached to chat messages.
 */

import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { randomUUID } from "crypto";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("photos") as File[];
    const jobId = (formData.get("jobId") as string) || "unlinked";

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    if (files.length > 5) {
      return NextResponse.json({ error: "Maximum 5 photos per upload" }, { status: 400 });
    }

    const uploaded = [];

    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: `${file.name}: only JPEG, PNG, and WebP images are accepted` },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          { error: `${file.name}: file too large (max 10MB)` },
          { status: 400 }
        );
      }

      const ext = file.name.split(".").pop() || "jpg";
      const path = `jobs/${jobId}/${randomUUID()}.${ext}`;

      const blob = await put(path, file, {
        access: "public",
        contentType: file.type,
      });

      uploaded.push({
        url: blob.url,
        filename: file.name,
        size: file.size,
        type: file.type,
      });
    }

    return NextResponse.json({
      success: true,
      files: uploaded,
      jobId,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    );
  }
}
