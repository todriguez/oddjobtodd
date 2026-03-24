import { JOB_TYPE_VALUES } from "@/lib/ai/extractors/extractionSchema";

const jobTypeList = JOB_TYPE_VALUES.join(", ");

export const PDF_EXTRACTION_PROMPT = `You are a data extraction agent for a Sunshine Coast handyman business.
You are reading a PDF job sheet sent by a real estate agent or property manager.

Extract ALL structured data from this document into JSON format.

These PDFs typically contain:
- Property address and suburb
- Agent or property manager contact details
- Tenant contact details (the person at the property)
- A list of maintenance tasks or repair items
- Urgency indicators (URGENT, routine, etc.)
- Access notes (keys at office, tenant home M-F, etc.)

Return ONLY valid JSON matching this structure. Use null for genuinely unknown fields:

{
  "propertyAddress": string | null,
  "suburb": string | null,
  "postcode": string | null,
  "state": string | null,

  "tenantName": string | null,
  "tenantPhone": string | null,
  "tenantEmail": string | null,

  "agentName": string | null,
  "agentPhone": string | null,
  "agentEmail": string | null,
  "agencyName": string | null,

  "accessNotes": string | null,

  "tasks": [
    {
      "description": string,
      "location": string | null,
      "category": "${jobTypeList}" | null,
      "urgency": "emergency" | "urgent" | "next_week" | "flexible" | "unspecified" | null,
      "repairOrReplace": "repair" | "replace" | "install" | "inspect" | "unclear" | null,
      "quantityHint": string | null
    }
  ],

  "overallUrgency": "emergency" | "urgent" | "next_week" | "next_2_weeks" | "flexible" | "when_convenient" | "unspecified",
  "additionalNotes": string | null,
  "confidence": "high" | "medium" | "low"
}

EXTRACTION RULES:
1. Be thorough. Extract every maintenance item listed, even minor ones.
2. Map categories using the exact enum values: ${jobTypeList}.
3. For Australian addresses, infer state as "QLD" for Sunshine Coast suburbs.
4. Tenant is the customer (the person the handyman will work with on-site).
5. Agent is the referrer (the real estate agent or property manager).
6. If multiple tasks span different trades, list them all individually.
7. "confidence" reflects how readable and structured the PDF was.
8. For phone numbers, keep the original format — normalisation happens later.
9. If the PDF mentions keys, access codes, or timing constraints, put them in accessNotes.`;
