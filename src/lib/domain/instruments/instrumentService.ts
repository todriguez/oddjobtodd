/**
 * Instrument Service — Codegen Phase
 *
 * Takes the lowered IR (scoring pipeline result + accumulated state + category resolution)
 * and emits typed commercial instruments: quotes, contracts, invoices.
 *
 * This is the compiler's code generator. It does not decide WHAT to emit (that's the
 * optimiser's job via recommendation). It decides HOW to render the emitted instrument
 * given the (WHAT, HOW, INSTRUMENT) triple and the accumulated context.
 *
 * Currently renders:
 *   inst.quote.rom            — ROM estimate (delegates to existing estimateService)
 *   inst.quote.fixed-price    — Fixed-price formal quote
 *   inst.quote.itemised       — Itemised quote with line items
 *   inst.contract.service-agreement — Service agreement (post-acceptance)
 *   inst.invoice.standard     — Standard invoice (post-completion)
 *   inst.invoice.progress     — Progress invoice (mid-job, multi-day)
 */

import type { AccumulatedJobState } from "../../ai/extractors/extractionSchema";
import type { CategoryResolution } from "../categories/categoryResolver";
import type { ScoringPipelineResult } from "../scoring/scoringPipelineService";
import { generateRomEstimate, friendlyCost, type RomEstimate } from "../estimates/estimateService";
import { generateEstimateWording, type EstimateWording } from "../estimates/estimateWordingService";
import { inferEffortBand } from "../estimates/effortBandService";

// ── Instrument IR Types ────────────────────────────

/** A rendered line item (for itemised quotes and invoices) */
export interface LineItem {
  description: string;
  quantity: number;
  unit: string;         // "hours", "each", "sqm", "metres", etc.
  unitPrice: number;    // cents
  total: number;        // cents
  category: "labour" | "materials" | "disposal" | "travel" | "other";
}

/** Common fields shared by all rendered instruments */
interface InstrumentBase {
  instrumentPath: string;        // e.g. "inst.quote.rom"
  instrumentName: string;        // e.g. "Rough Order of Magnitude"
  categoryPath: string;          // WHAT path
  txType: string;                // HOW slug
  generatedAt: string;           // ISO timestamp
  version: number;               // increments on re-generation
}

/** ROM quote — the existing estimate, now typed as an instrument */
export interface RomQuoteInstrument extends InstrumentBase {
  instrumentPath: "inst.quote.rom";
  rom: RomEstimate;
  wording: EstimateWording;
}

/** Fixed-price formal quote */
export interface FixedPriceQuoteInstrument extends InstrumentBase {
  instrumentPath: "inst.quote.fixed-price";
  labourTotal: number;           // cents
  materialsTotal: number;        // cents
  totalExGst: number;            // cents
  gst: number;                   // cents
  totalIncGst: number;           // cents
  lineItems: LineItem[];
  validDays: number;             // quote validity period
  scopeSummary: string;
  inclusions: string[];
  exclusions: string[];
  conditions: string[];
  paymentTerms: string;
}

/** Itemised quote (detailed breakdown) */
export interface ItemisedQuoteInstrument extends InstrumentBase {
  instrumentPath: "inst.quote.itemised";
  lineItems: LineItem[];
  labourSubtotal: number;
  materialsSubtotal: number;
  totalExGst: number;
  gst: number;
  totalIncGst: number;
  validDays: number;
  scopeSummary: string;
  inclusions: string[];
  exclusions: string[];
  conditions: string[];
  paymentTerms: string;
}

/** Service agreement (generated when estimate accepted) */
export interface ServiceAgreementInstrument extends InstrumentBase {
  instrumentPath: "inst.contract.service-agreement";
  parties: {
    provider: { name: string; abn?: string; licence?: string };
    client: { name: string; address?: string; phone?: string; email?: string };
  };
  scope: string;
  siteAddress: string;
  estimatedCost: { min: number; max: number; basis: string };
  paymentTerms: string;
  startDate: string | null;
  estimatedDuration: string;
  variations: string;     // how variations are handled
  cancellation: string;   // cancellation terms
  warranty: string;       // warranty/defects clause
  conditions: string[];
}

/** Standard invoice */
export interface InvoiceInstrument extends InstrumentBase {
  instrumentPath: "inst.invoice.standard" | "inst.invoice.progress";
  invoiceNumber: string;
  lineItems: LineItem[];
  labourSubtotal: number;
  materialsSubtotal: number;
  subtotal: number;
  gst: number;
  total: number;
  dueDate: string;
  paymentMethods: string[];
  notes: string;
}

/** Union of all renderable instruments */
export type RenderedInstrument =
  | RomQuoteInstrument
  | FixedPriceQuoteInstrument
  | ItemisedQuoteInstrument
  | ServiceAgreementInstrument
  | InvoiceInstrument;

// ── GST ────────────────────────────────────────────

const GST_RATE = 0.10; // Australian GST

function addGst(exGst: number): { gst: number; incGst: number } {
  const gst = Math.round(exGst * GST_RATE);
  return { gst, incGst: exGst + gst };
}

// ── Instrument Renderer ────────────────────────────

/**
 * Render the appropriate instrument for a given pipeline result.
 *
 * This is the main codegen entry point. It reads the instrument path
 * from the category resolution and dispatches to the appropriate renderer.
 */
export function renderInstrument(
  state: AccumulatedJobState,
  pipeline: ScoringPipelineResult,
  options: {
    version?: number;
    operatorName?: string;
    operatorAbn?: string;
    operatorLicence?: string;
  } = {}
): RenderedInstrument | null {
  const category = pipeline.category;
  if (!category) return null;

  const base: InstrumentBase = {
    instrumentPath: category.instrumentPath as InstrumentBase["instrumentPath"],
    instrumentName: instrumentDisplayName(category.instrumentPath),
    categoryPath: category.path,
    txType: category.txType,
    generatedAt: new Date().toISOString(),
    version: options.version ?? 1,
  };

  // Dispatch by instrument path
  if (category.instrumentPath === "inst.quote.rom") {
    return renderRomQuote(state, base);
  }
  if (category.instrumentPath === "inst.quote.fixed-price") {
    return renderFixedPriceQuote(state, category, base, {
      operatorName: options.operatorName,
      operatorAbn: options.operatorAbn,
    });
  }
  if (category.instrumentPath === "inst.quote.itemised") {
    return renderItemisedQuote(state, category, base);
  }
  if (category.instrumentPath === "inst.contract.service-agreement") {
    return renderServiceAgreement(state, category, base, {
      operatorName: options.operatorName,
      operatorAbn: options.operatorAbn,
      operatorLicence: options.operatorLicence,
    });
  }
  if (category.instrumentPath.startsWith("inst.invoice")) {
    return renderInvoice(state, category, base);
  }

  // Fallback: render as ROM if we don't have a specific renderer
  return renderRomQuote(state, { ...base, instrumentPath: "inst.quote.rom" });
}

/**
 * Force render a specific instrument type, regardless of what the category
 * resolution derived. Useful when the operator wants to upgrade from ROM to
 * formal quote, or generate an invoice post-completion.
 */
export function renderInstrumentAs(
  instrumentPath: string,
  state: AccumulatedJobState,
  pipeline: ScoringPipelineResult,
  options: {
    version?: number;
    operatorName?: string;
    operatorAbn?: string;
    operatorLicence?: string;
    lineItems?: LineItem[];
    invoiceNumber?: string;
    dueDate?: string;
  } = {}
): RenderedInstrument | null {
  const category = pipeline.category;
  if (!category) return null;

  const base: InstrumentBase = {
    instrumentPath: instrumentPath as InstrumentBase["instrumentPath"],
    instrumentName: instrumentDisplayName(instrumentPath),
    categoryPath: category.path,
    txType: category.txType,
    generatedAt: new Date().toISOString(),
    version: options.version ?? 1,
  };

  if (instrumentPath === "inst.quote.rom") return renderRomQuote(state, base);
  if (instrumentPath === "inst.quote.fixed-price") return renderFixedPriceQuote(state, category, base, options);
  if (instrumentPath === "inst.quote.itemised") return renderItemisedQuote(state, category, base, options);
  if (instrumentPath === "inst.contract.service-agreement") return renderServiceAgreement(state, category, base, options);
  if (instrumentPath.startsWith("inst.invoice")) return renderInvoice(state, category, base, options);

  return null;
}

// ── Individual Renderers ───────────────────────────

function renderRomQuote(
  state: AccumulatedJobState,
  base: InstrumentBase
): RomQuoteInstrument {
  const effort = inferEffortBand({
    jobType: state.jobType,
    scopeDescription: state.scopeDescription,
    quantity: state.quantity,
    materials: state.materials,
  });

  const rom = generateRomEstimate({
    effortBand: effort.band,
    jobType: state.jobType,
    materials: state.materials,
    quantity: state.quantity,
  });

  const wording = generateEstimateWording({
    estimate: rom,
    jobType: state.jobType,
    scopeDescription: state.scopeDescription,
    quantity: state.quantity,
    materials: state.materials,
  });

  return {
    ...base,
    instrumentPath: "inst.quote.rom",
    rom,
    wording,
  };
}

function renderFixedPriceQuote(
  state: AccumulatedJobState,
  category: CategoryResolution,
  base: InstrumentBase,
  options: { lineItems?: LineItem[]; operatorName?: string; operatorAbn?: string } = {}
): FixedPriceQuoteInstrument {
  // If explicit line items provided (operator reviewed), use those
  // Otherwise, auto-generate from ROM + category context
  const lineItems = options.lineItems ?? autoGenerateLineItems(state, category);

  const labourTotal = lineItems
    .filter((li) => li.category === "labour")
    .reduce((sum, li) => sum + li.total, 0);
  const materialsTotal = lineItems
    .filter((li) => li.category === "materials")
    .reduce((sum, li) => sum + li.total, 0);
  const otherTotal = lineItems
    .filter((li) => li.category !== "labour" && li.category !== "materials")
    .reduce((sum, li) => sum + li.total, 0);

  const totalExGst = labourTotal + materialsTotal + otherTotal;
  const { gst, incGst } = addGst(totalExGst);

  return {
    ...base,
    instrumentPath: "inst.quote.fixed-price",
    labourTotal,
    materialsTotal,
    totalExGst,
    gst,
    totalIncGst: incGst,
    lineItems,
    validDays: 14,
    scopeSummary: buildScopeSummary(state, category),
    inclusions: buildInclusions(state, category),
    exclusions: buildExclusions(category),
    conditions: buildConditions(category),
    paymentTerms: "50% deposit, balance on completion",
  };
}

function renderItemisedQuote(
  state: AccumulatedJobState,
  category: CategoryResolution,
  base: InstrumentBase,
  options: { lineItems?: LineItem[] } = {}
): ItemisedQuoteInstrument {
  const lineItems = options.lineItems ?? autoGenerateLineItems(state, category);

  const labourSubtotal = lineItems
    .filter((li) => li.category === "labour")
    .reduce((sum, li) => sum + li.total, 0);
  const materialsSubtotal = lineItems
    .filter((li) => li.category === "materials")
    .reduce((sum, li) => sum + li.total, 0);

  const totalExGst = lineItems.reduce((sum, li) => sum + li.total, 0);
  const { gst, incGst } = addGst(totalExGst);

  return {
    ...base,
    instrumentPath: "inst.quote.itemised",
    lineItems,
    labourSubtotal,
    materialsSubtotal,
    totalExGst,
    gst,
    totalIncGst: incGst,
    validDays: 14,
    scopeSummary: buildScopeSummary(state, category),
    inclusions: buildInclusions(state, category),
    exclusions: buildExclusions(category),
    conditions: buildConditions(category),
    paymentTerms: "50% deposit, balance on completion",
  };
}

function renderServiceAgreement(
  state: AccumulatedJobState,
  category: CategoryResolution,
  base: InstrumentBase,
  options: { operatorName?: string; operatorAbn?: string; operatorLicence?: string } = {}
): ServiceAgreementInstrument {
  const effort = inferEffortBand({
    jobType: state.jobType,
    scopeDescription: state.scopeDescription,
    quantity: state.quantity,
    materials: state.materials,
  });

  const rom = generateRomEstimate({
    effortBand: effort.band,
    jobType: state.jobType,
    materials: state.materials,
    quantity: state.quantity,
  });

  const durationMap: Record<string, string> = {
    quick: "Under 1 hour",
    short: "1–2 hours",
    quarter_day: "2–3 hours",
    half_day: "Half day (3–5 hours)",
    full_day: "Full day (5–8 hours)",
    multi_day: "Multiple days (to be confirmed)",
    unknown: "To be confirmed after site visit",
  };

  return {
    ...base,
    instrumentPath: "inst.contract.service-agreement",
    parties: {
      provider: {
        name: options.operatorName ?? "Odd Job Todd",
        abn: options.operatorAbn,
        licence: category.scoringContext.licensedTrade ? (options.operatorLicence ?? "QBCC licence required") : undefined,
      },
      client: {
        name: state.customerName ?? "Customer",
        address: state.address ?? state.suburb ?? undefined,
        phone: state.customerPhone ?? undefined,
        email: state.customerEmail ?? undefined,
      },
    },
    scope: buildScopeSummary(state, category),
    siteAddress: [state.address, state.suburb, state.postcode].filter(Boolean).join(", ") || "To be confirmed",
    estimatedCost: {
      min: rom.costMin,
      max: rom.costMax,
      basis: rom.labourOnly ? "Labour only, materials additional" : "Including materials",
    },
    paymentTerms: rom.costMax > 500
      ? "50% deposit prior to commencement, balance on completion"
      : "Payment on completion",
    startDate: null, // operator fills this in
    estimatedDuration: durationMap[effort.band] ?? "To be confirmed",
    variations: "Any work outside the agreed scope will be quoted separately before proceeding",
    cancellation: "Either party may cancel with 24 hours notice. Deposit refundable if cancelled before work commences.",
    warranty: "12 months warranty on workmanship from date of completion",
    conditions: buildConditions(category),
  };
}

function renderInvoice(
  state: AccumulatedJobState,
  category: CategoryResolution,
  base: InstrumentBase,
  options: { lineItems?: LineItem[]; invoiceNumber?: string; dueDate?: string } = {}
): InvoiceInstrument {
  const lineItems = options.lineItems ?? autoGenerateLineItems(state, category);

  const labourSubtotal = lineItems
    .filter((li) => li.category === "labour")
    .reduce((sum, li) => sum + li.total, 0);
  const materialsSubtotal = lineItems
    .filter((li) => li.category === "materials")
    .reduce((sum, li) => sum + li.total, 0);
  const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0);
  const { gst, incGst } = addGst(subtotal);

  const dueDate = options.dueDate ?? new Date(Date.now() + 14 * 86400000).toISOString().split("T")[0];

  return {
    ...base,
    instrumentPath: base.instrumentPath as "inst.invoice.standard" | "inst.invoice.progress",
    invoiceNumber: options.invoiceNumber ?? `INV-${Date.now().toString(36).toUpperCase()}`,
    lineItems,
    labourSubtotal,
    materialsSubtotal,
    subtotal,
    gst,
    total: incGst,
    dueDate,
    paymentMethods: ["Bank transfer", "Cash"],
    notes: category.scoringContext.licensedTrade
      ? "All work performed by licensed tradesperson. QBCC licence details available on request."
      : "Thank you for choosing Odd Job Todd.",
  };
}

// ── Helper: Auto-generate line items from ROM ──────

function autoGenerateLineItems(
  state: AccumulatedJobState,
  category: CategoryResolution
): LineItem[] {
  const effort = inferEffortBand({
    jobType: state.jobType,
    scopeDescription: state.scopeDescription,
    quantity: state.quantity,
    materials: state.materials,
  });

  const rom = generateRomEstimate({
    effortBand: effort.band,
    jobType: state.jobType,
    materials: state.materials,
    quantity: state.quantity,
  });

  const items: LineItem[] = [];

  // Labour line
  if (rom.costMin > 0) {
    const labourCost = Math.round((rom.costMin + rom.costMax) / 2);
    items.push({
      description: `${category.name} — ${state.scopeDescription || "as discussed"}`,
      quantity: (rom.hoursMin + rom.hoursMax) / 2,
      unit: "hours",
      unitPrice: Math.round((labourCost / ((rom.hoursMin + rom.hoursMax) / 2)) * 100), // cents
      total: labourCost * 100, // cents
      category: "labour",
    });
  }

  // Materials line (rough placeholder — operator should review)
  if (rom.materialsNote && rom.labourOnly) {
    items.push({
      description: `Materials — ${rom.materialsNote}`,
      quantity: 1,
      unit: "lot",
      unitPrice: 0, // TBD by operator
      total: 0,     // TBD by operator
      category: "materials",
    });
  }

  return items;
}

// ── Helper: Build scope/inclusions/exclusions ──────

function buildScopeSummary(state: AccumulatedJobState, category: CategoryResolution): string {
  const parts: string[] = [];
  if (state.scopeDescription) parts.push(state.scopeDescription);
  if (state.quantity) parts.push(`Quantity/size: ${state.quantity}`);
  if (state.materials) parts.push(`Materials: ${state.materials}`);
  if (parts.length === 0) parts.push(`${category.name} work as discussed`);
  return parts.join(". ");
}

function buildInclusions(state: AccumulatedJobState, category: CategoryResolution): string[] {
  const inc: string[] = [];
  inc.push("Labour as described in scope");
  if (state.materials) inc.push("Materials as specified");
  inc.push("Clean up of work area on completion");
  if (category.scoringContext.siteVisitLikely) inc.push("Initial site inspection");
  return inc;
}

function buildExclusions(category: CategoryResolution): string[] {
  const exc: string[] = [];
  exc.push("Work outside described scope");
  exc.push("Structural or engineering work");
  if (category.scoringContext.licensedTrade) {
    exc.push("Work requiring additional trade licences not held");
  }
  exc.push("Asbestos removal or handling");
  exc.push("Tree work over 4 metres");
  return exc;
}

function buildConditions(category: CategoryResolution): string[] {
  const cond: string[] = [];
  cond.push("Access to work area must be provided");
  cond.push("Power and water available on site");
  if (category.scoringContext.siteVisitLikely) {
    cond.push("Final price subject to site inspection");
  }
  if (category.scoringContext.licensedTrade) {
    cond.push("All work performed in accordance with relevant Australian Standards and QBCC requirements");
  }
  return cond;
}

// ── Helper: Display names ──────────────────────────

function instrumentDisplayName(path: string): string {
  const names: Record<string, string> = {
    "inst.quote.rom": "Rough Order of Magnitude",
    "inst.quote.fixed-price": "Fixed Price Quote",
    "inst.quote.itemised": "Itemised Quote",
    "inst.quote.time-and-materials": "Time & Materials Quote",
    "inst.contract.service-agreement": "Service Agreement",
    "inst.contract.purchase-agreement": "Purchase Agreement",
    "inst.contract.rental-agreement": "Rental Agreement",
    "inst.invoice.standard": "Invoice",
    "inst.invoice.progress": "Progress Invoice",
    "inst.invoice.recurring": "Recurring Invoice",
    "inst.invoice.final": "Final Invoice",
    "inst.receipt": "Receipt",
    "inst.receipt.standard": "Receipt",
  };
  return names[path] ?? path;
}
