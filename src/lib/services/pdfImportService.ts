import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createLogger } from "@/lib/logger";
import {
  accumulatedJobStateSchema,
  type AccumulatedJobState,
  JOB_TYPE_VALUES,
} from "@/lib/ai/extractors/extractionSchema";
import { PDF_EXTRACTION_PROMPT } from "@/lib/ai/prompts/pdfExtractionPrompt";

const log = createLogger("pdf-import");

// ─────────────────────────────────────────────
// PDF Extraction Schema (raw LLM output)
// ─────────────────────────────────────────────

const pdfTaskSchema = z.object({
  description: z.string(),
  location: z.string().nullable().default(null),
  category: z.string().nullable().default(null),
  urgency: z.string().nullable().default(null),
  repairOrReplace: z.string().nullable().default(null),
  quantityHint: z.string().nullable().default(null),
});

export const pdfExtractionSchema = z.object({
  propertyAddress: z.string().nullable().default(null),
  suburb: z.string().nullable().default(null),
  postcode: z.string().nullable().default(null),
  state: z.string().nullable().default(null),

  tenantName: z.string().nullable().default(null),
  tenantPhone: z.string().nullable().default(null),
  tenantEmail: z.string().nullable().default(null),

  agentName: z.string().nullable().default(null),
  agentPhone: z.string().nullable().default(null),
  agentEmail: z.string().nullable().default(null),
  agencyName: z.string().nullable().default(null),

  accessNotes: z.string().nullable().default(null),

  tasks: z.array(pdfTaskSchema).default([]),

  overallUrgency: z.string().default("unspecified"),
  additionalNotes: z.string().nullable().default(null),
  confidence: z.enum(["high", "medium", "low"]).default("medium"),
});

export type PdfExtraction = z.infer<typeof pdfExtractionSchema>;

// ─────────────────────────────────────────────
// Gap Analysis
// ─────────────────────────────────────────────

export interface GapItem {
  field: string;
  label: string;
  importance: "blocking_rom" | "nice_to_have";
  question: string;
}

function analyseGaps(extraction: PdfExtraction): GapItem[] {
  const gaps: GapItem[] = [];

  if (!extraction.suburb && !extraction.propertyAddress) {
    gaps.push({
      field: "location",
      label: "Property location",
      importance: "blocking_rom",
      question: "What's the property address or suburb?",
    });
  }

  if (extraction.tasks.length === 0) {
    gaps.push({
      field: "tasks",
      label: "Task list",
      importance: "blocking_rom",
      question: "What work needs to be done?",
    });
  }

  // Check for tasks lacking detail
  for (const task of extraction.tasks) {
    if (!task.quantityHint && /shelf|shelves|hook|bracket/i.test(task.description)) {
      gaps.push({
        field: `task_quantity`,
        label: `Quantity: ${task.description.slice(0, 40)}`,
        importance: "blocking_rom",
        question: `How many for: ${task.description}?`,
      });
    }
    if (!task.repairOrReplace && /door|fence|deck|gutter/i.test(task.description)) {
      gaps.push({
        field: `task_repair_replace`,
        label: `Repair or replace: ${task.description.slice(0, 40)}`,
        importance: "blocking_rom",
        question: `Is this a repair or a full replacement?`,
      });
    }
  }

  if (!extraction.tenantPhone && !extraction.tenantEmail) {
    gaps.push({
      field: "contact",
      label: "Tenant contact details",
      importance: "blocking_rom",
      question: "What's the best way to reach the tenant?",
    });
  }

  if (!extraction.accessNotes) {
    gaps.push({
      field: "access",
      label: "Property access",
      importance: "nice_to_have",
      question: "How do we access the property? Any keys or codes needed?",
    });
  }

  return gaps;
}

// ─────────────────────────────────────────────
// Map extraction → AccumulatedJobState
// ─────────────────────────────────────────────

function mapToJobState(extraction: PdfExtraction): AccumulatedJobState {
  // Determine primary job type from tasks
  const categories = extraction.tasks
    .map((t) => t.category)
    .filter((c): c is string => c !== null && (JOB_TYPE_VALUES as readonly string[]).includes(c));
  const primaryType = categories.length > 0 ? categories[0] : "general";

  // Build scope description from all tasks
  const scopeDesc = extraction.tasks.map((t) => {
    let line = t.description;
    if (t.location) line += ` (${t.location})`;
    if (t.quantityHint) line += ` — ${t.quantityHint}`;
    return line;
  }).join("; ");

  const base = accumulatedJobStateSchema.parse({
    customerName: extraction.tenantName,
    customerPhone: extraction.tenantPhone,
    customerEmail: extraction.tenantEmail,
    suburb: extraction.suburb,
    address: extraction.propertyAddress,
    postcode: extraction.postcode,
    accessNotes: extraction.accessNotes,
    jobType: primaryType,
    jobTypeConfidence: categories.length > 0 ? "high" : "medium",
    scopeDescription: scopeDesc || null,
    urgency: extraction.overallUrgency,

    // PDF import fields
    pdfImportSource: extraction.agencyName,
    referringAgentName: extraction.agentName,
    referringAgentPhone: extraction.agentPhone,
    referringAgentEmail: extraction.agentEmail,
    importedTasks: extraction.tasks.map((t) => ({
      description: t.description,
      category: t.category,
      urgency: t.urgency,
      location: t.location,
      repairOrReplace: t.repairOrReplace,
    })),

    // Set conversation phase to reflect PDF import state
    conversationPhase: "partial_intake",
  });

  return base;
}

// ─────────────────────────────────────────────
// Main extraction function
// ─────────────────────────────────────────────

export interface PdfImportResult {
  extraction: PdfExtraction;
  jobState: AccumulatedJobState;
  gaps: GapItem[];
  confidence: "high" | "medium" | "low";
}

export async function extractFromPdf(pdfUrl: string): Promise<PdfImportResult> {
  log.info({ pdfUrl }, "pdf-import.extract.start");

  // Fetch the PDF and convert to base64
  const response = await fetch(pdfUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
  }
  const buffer = await response.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  // Call Claude with the PDF as a document
  const anthropic = new Anthropic();
  const result = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: base64,
            },
          },
          {
            type: "text",
            text: PDF_EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });

  // Parse the response
  const text = result.content
    .filter((c): c is Anthropic.TextBlock => c.type === "text")
    .map((c) => c.text)
    .join("");

  // Extract JSON from the response (may be wrapped in ```json blocks)
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) {
    throw new Error("PDF extraction did not return valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[1]);
  const extraction = pdfExtractionSchema.parse(parsed);

  log.info(
    { taskCount: extraction.tasks.length, confidence: extraction.confidence },
    "pdf-import.extract.complete"
  );

  const jobState = mapToJobState(extraction);
  const gaps = analyseGaps(extraction);

  return {
    extraction,
    jobState,
    gaps,
    confidence: extraction.confidence,
  };
}
