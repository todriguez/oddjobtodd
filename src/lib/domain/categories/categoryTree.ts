/**
 * Universal Commerce Taxonomy — Category Tree
 *
 * Three orthogonal dimensions:
 *   WHAT  — the thing being transacted (goods, services, resources, rights, capital)
 *   HOW   — the transaction shape (sale, rental, hire, licence, meter, exchange, grant, bond)
 *   INST  — the commercial document (contract, quote, invoice, receipt, order, certificate, channel, escrow, claim)
 *
 * This module defines the trunk (L0-L1 axioms) and the OJT services.trades subtree (L2).
 * The WHAT tree self-grows at L2+. The HOW and INSTRUMENT trees are fixed.
 *
 * Spec: docs/universal-commerce-taxonomy-spec.md
 */

// ── Types ────────────────────────────────────────

export interface CategoryAttribute {
  name: string;
  type: "string" | "number" | "boolean" | "enum";
  required: boolean;
  description: string;
  enumValues?: string[];
  extractionHint?: string;
}

export interface CategoryNode {
  slug: string;
  name: string;
  path: string;              // LTREE-compatible dotted path
  dimension: "what" | "how" | "instrument";
  level: number;
  parent: string | null;     // parent path
  description: string;
  attributes: CategoryAttribute[];
  keywords: string[];

  // Governance (WHAT nodes only)
  valueMultiplier: number;
  siteVisitLikely: boolean;
  licensedTrade: boolean;

  // Transaction (WHAT nodes only)
  validTxTypes: string[];
  modalTemplate: string;

  // Embedding source text
  embeddingText: string;

  // Tags
  tags: string[];
}

export interface TransactionType {
  slug: string;
  path: string;
  name: string;
  description: string;
  settlementPattern: string;
  keywords: string[];
}

export interface InstrumentType {
  slug: string;
  path: string;
  name: string;
  description: string;
  subtypes: { slug: string; path: string; name: string }[];
}

// ── HOW: Transaction Types (axiomatic, 8 primitives) ─

export const TRANSACTION_TYPES: TransactionType[] = [
  {
    slug: "sale",
    path: "tx.sale",
    name: "Sale",
    description: "Ownership transfers permanently",
    settlementPattern: "one-time payment (immediate, escrow, or installment)",
    keywords: ["buy", "purchase", "sell", "for sale", "how much", "price"],
  },
  {
    slug: "rental",
    path: "tx.rental",
    name: "Rental",
    description: "Temporary possession with return obligation",
    settlementPattern: "periodic payment (daily, weekly, monthly)",
    keywords: ["rent", "lease", "hire out", "borrow", "let"],
  },
  {
    slug: "hire",
    path: "tx.hire",
    name: "Hire",
    description: "Service engagement — labour or expertise exchanged",
    settlementPattern: "fixed price, hourly, milestone, or completion",
    keywords: ["need a", "looking for someone", "get a quote", "help with", "fix", "install", "build"],
  },
  {
    slug: "licence",
    path: "tx.licence",
    name: "Licence",
    description: "Rights granted for bounded use",
    settlementPattern: "subscription, per-seat, per-use, or perpetual",
    keywords: ["subscribe", "access", "licence", "membership", "join", "unlock"],
  },
  {
    slug: "meter",
    path: "tx.meter",
    name: "Metered",
    description: "Continuous flow — pay per unit consumed",
    settlementPattern: "MFP payment channel with per-tick settlement",
    keywords: ["per kWh", "per MB", "per hour", "metered", "usage", "consumption"],
  },
  {
    slug: "exchange",
    path: "tx.exchange",
    name: "Exchange",
    description: "Mutual transfer — both parties give and receive",
    settlementPattern: "atomic swap or escrow-mediated trade",
    keywords: ["trade", "swap", "exchange", "barter"],
  },
  {
    slug: "grant",
    path: "tx.grant",
    name: "Grant",
    description: "Unilateral transfer — no reciprocation expected",
    settlementPattern: "no settlement (donation, gift, freebie)",
    keywords: ["free", "giving away", "donate", "giveaway", "no charge"],
  },
  {
    slug: "bond",
    path: "tx.bond",
    name: "Bond",
    description: "Commitment without immediate transfer",
    settlementPattern: "held funds (escrow, deposit, guarantee, retainer)",
    keywords: ["deposit", "hold", "escrow", "retainer", "bond", "guarantee"],
  },
];

// ── INSTRUMENT: Document Types (axiomatic) ───────

export const INSTRUMENT_TYPES: InstrumentType[] = [
  {
    slug: "contract", path: "inst.contract", name: "Contract",
    description: "Binding agreement between parties",
    subtypes: [
      { slug: "service-agreement", path: "inst.contract.service-agreement", name: "Service Agreement" },
      { slug: "purchase-agreement", path: "inst.contract.purchase-agreement", name: "Purchase Agreement" },
      { slug: "rental-agreement", path: "inst.contract.rental-agreement", name: "Rental Agreement" },
      { slug: "nda", path: "inst.contract.nda", name: "Non-Disclosure Agreement" },
      { slug: "partnership", path: "inst.contract.partnership", name: "Partnership Agreement" },
      { slug: "employment", path: "inst.contract.employment", name: "Employment Contract" },
      { slug: "independent-contractor", path: "inst.contract.independent-contractor", name: "Independent Contractor" },
    ],
  },
  {
    slug: "quote", path: "inst.quote", name: "Quote",
    description: "Non-binding offer with terms and pricing",
    subtypes: [
      { slug: "rom", path: "inst.quote.rom", name: "Rough Order of Magnitude" },
      { slug: "fixed-price", path: "inst.quote.fixed-price", name: "Fixed Price Quote" },
      { slug: "itemised", path: "inst.quote.itemised", name: "Itemised Quote" },
      { slug: "time-and-materials", path: "inst.quote.time-and-materials", name: "Time & Materials" },
    ],
  },
  {
    slug: "invoice", path: "inst.invoice", name: "Invoice",
    description: "Payment request from provider to customer",
    subtypes: [
      { slug: "standard", path: "inst.invoice.standard", name: "Standard Invoice" },
      { slug: "progress", path: "inst.invoice.progress", name: "Progress Invoice" },
      { slug: "recurring", path: "inst.invoice.recurring", name: "Recurring Invoice" },
      { slug: "final", path: "inst.invoice.final", name: "Final Invoice" },
    ],
  },
  {
    slug: "receipt", path: "inst.receipt", name: "Receipt",
    description: "Confirmation of payment or delivery",
    subtypes: [],
  },
  {
    slug: "order", path: "inst.order", name: "Order",
    description: "Purchase order or work order",
    subtypes: [
      { slug: "purchase-order", path: "inst.order.purchase-order", name: "Purchase Order" },
      { slug: "work-order", path: "inst.order.work-order", name: "Work Order" },
      { slug: "change-order", path: "inst.order.change-order", name: "Change Order" },
    ],
  },
  {
    slug: "certificate", path: "inst.certificate", name: "Certificate",
    description: "Attestation, credential, K-Asset",
    subtypes: [],
  },
  {
    slug: "channel", path: "inst.channel", name: "Payment Channel",
    description: "MFP metered flow channel",
    subtypes: [
      { slug: "prepaid", path: "inst.channel.prepaid", name: "Prepaid Channel" },
      { slug: "postpaid", path: "inst.channel.postpaid", name: "Postpaid Channel" },
      { slug: "bidirectional", path: "inst.channel.bidirectional", name: "Bidirectional Channel" },
    ],
  },
  {
    slug: "escrow", path: "inst.escrow", name: "Escrow",
    description: "Held funds with conditional release",
    subtypes: [
      { slug: "time-locked", path: "inst.escrow.time-locked", name: "Time-Locked Escrow" },
      { slug: "milestone-gated", path: "inst.escrow.milestone-gated", name: "Milestone-Gated Escrow" },
      { slug: "dual-party-release", path: "inst.escrow.dual-party-release", name: "Dual-Party Release" },
      { slug: "arbitrated", path: "inst.escrow.arbitrated", name: "Arbitrated Escrow" },
    ],
  },
  {
    slug: "claim", path: "inst.claim", name: "Claim",
    description: "Dispute, insurance claim, warranty claim",
    subtypes: [],
  },
];

// ── WHAT: Domain Taxonomy ────────────────────────
// L0 roots and L1 branches are axiomatic (trunk).
// L2+ self-grows. This file defines the OJT-relevant subtree: services.trades.*

// The five WHAT roots
const WHAT_ROOTS: Pick<CategoryNode, "slug" | "name" | "path" | "description">[] = [
  { slug: "goods", name: "Goods", path: "goods", description: "Physical or digital objects that transfer ownership" },
  { slug: "services", name: "Services", path: "services", description: "Labour, expertise, creative output, professional work" },
  { slug: "resources", name: "Resources", path: "resources", description: "Space, time, energy, compute, bandwidth, capacity" },
  { slug: "rights", name: "Rights", path: "rights", description: "Licences, access, permissions, memberships, IP" },
  { slug: "capital", name: "Capital", path: "capital", description: "Money, equity, debt, tokens, financial instruments" },
];

// The services L1 branches
const SERVICES_BRANCHES: Pick<CategoryNode, "slug" | "name" | "path" | "description">[] = [
  { slug: "trades", name: "Trades", path: "services.trades", description: "Licensed and unlicensed trade work" },
  { slug: "professional", name: "Professional", path: "services.professional", description: "White-collar professional services" },
  { slug: "creative", name: "Creative", path: "services.creative", description: "Design, media, content, artistic services" },
  { slug: "tech", name: "Tech", path: "services.tech", description: "Software, IT, data, engineering services" },
  { slug: "education", name: "Education", path: "services.education", description: "Teaching, tutoring, training, coaching" },
  { slug: "health", name: "Health", path: "services.health", description: "Health, wellness, fitness, therapy" },
  { slug: "care", name: "Care", path: "services.care", description: "Childcare, aged care, pet care, disability support" },
  { slug: "transport", name: "Transport", path: "services.transport", description: "Moving, delivery, courier, logistics" },
  { slug: "cleaning", name: "Cleaning", path: "services.cleaning", description: "Residential, commercial, specialized cleaning" },
  { slug: "events", name: "Events", path: "services.events", description: "Event planning, catering, entertainment" },
  { slug: "beauty", name: "Beauty", path: "services.beauty", description: "Hair, beauty, grooming, cosmetic services" },
  { slug: "automotive", name: "Automotive", path: "services.automotive", description: "Vehicle repair, detailing, mechanical" },
];

// ── L2: services.trades.* (OJT operational subtree) ─

function makeTradeNode(
  slug: string,
  name: string,
  opts: {
    description: string;
    attributes: CategoryAttribute[];
    keywords: string[];
    valueMultiplier: number;
    siteVisitLikely: boolean;
    licensedTrade: boolean;
    tags?: string[];
  }
): CategoryNode {
  return {
    slug,
    name,
    path: `services.trades.${slug}`,
    dimension: "what",
    level: 2,
    parent: "services.trades",
    description: opts.description,
    attributes: opts.attributes,
    keywords: opts.keywords,
    valueMultiplier: opts.valueMultiplier,
    siteVisitLikely: opts.siteVisitLikely,
    licensedTrade: opts.licensedTrade,
    validTxTypes: ["hire", "meter"],
    modalTemplate: "service-intake",
    embeddingText: `services trades ${slug} — ${opts.description}. Keywords: ${opts.keywords.join(", ")}`,
    tags: opts.tags || [],
  };
}

export const TRADE_CATEGORIES: CategoryNode[] = [
  makeTradeNode("plumbing", "Plumbing", {
    description: "Water supply, drainage, gas fitting, pipe repair, fixture installation",
    attributes: [
      { name: "fixture_type", type: "string", required: false, description: "Type of fixture (tap, toilet, shower, sink, hot water system)", extractionHint: "What specific fixture needs work?" },
      { name: "problem_type", type: "enum", required: false, description: "Nature of the problem", enumValues: ["leak", "blockage", "no_pressure", "noisy", "broken", "install_new", "replace", "relocate"], extractionHint: "What's actually wrong or what needs doing?" },
      { name: "pipe_material", type: "string", required: false, description: "Known pipe material (copper, PVC, galvanised, PEX)", extractionHint: "Do they mention pipe material or age of house?" },
      { name: "water_shutoff_known", type: "boolean", required: false, description: "Whether customer knows where the water shutoff is", extractionHint: "Can they turn off the water if needed?" },
    ],
    keywords: ["plumber", "plumbing", "tap", "leak", "drain", "blocked", "pipe", "toilet", "hot water", "gas", "water heater", "dripping", "burst"],
    valueMultiplier: 1.2,
    siteVisitLikely: false,
    licensedTrade: true,
  }),
  makeTradeNode("electrical", "Electrical", {
    description: "Wiring, lighting, switchboard, power points, safety switches, solar",
    attributes: [
      { name: "work_type", type: "enum", required: false, description: "Type of electrical work", enumValues: ["lighting", "power_points", "switchboard", "safety_switch", "rewire", "solar", "ev_charger", "smoke_alarm", "fan"], extractionHint: "What type of electrical work is needed?" },
      { name: "property_age", type: "string", required: false, description: "Approximate age of property", extractionHint: "Age of property (older homes may need rewiring)?" },
    ],
    keywords: ["electrician", "electrical", "wiring", "lights", "downlights", "fan", "ceiling fan", "power point", "switchboard", "safety switch", "rewire", "solar", "smoke alarm"],
    valueMultiplier: 1.3,
    siteVisitLikely: false,
    licensedTrade: true,
    tags: ["high-risk"],
  }),
  makeTradeNode("carpentry", "Carpentry", {
    description: "Structural and finishing timber work, decking, pergolas, cabinetry, framing",
    attributes: [
      { name: "timber_type", type: "string", required: false, description: "Preferred timber species or material", extractionHint: "Any preference on timber type (hardwood, pine, composite)?" },
      { name: "dimensions", type: "string", required: false, description: "Approximate dimensions of the project", extractionHint: "What are the rough dimensions?" },
      { name: "structural", type: "boolean", required: false, description: "Whether the work is structural", extractionHint: "Is this structural work requiring engineering?" },
    ],
    keywords: ["carpenter", "carpentry", "deck", "decking", "pergola", "timber", "framing", "shelving", "cabinet", "door frame", "stairs", "handrail", "wood"],
    valueMultiplier: 1.4,
    siteVisitLikely: true,
    licensedTrade: false,
  }),
  makeTradeNode("painting", "Painting", {
    description: "Interior and exterior painting, staining, wallpaper, surface prep",
    attributes: [
      { name: "surface_type", type: "enum", required: false, description: "Surface to be painted", enumValues: ["interior_walls", "exterior_walls", "ceiling", "trim", "deck", "fence", "roof"], extractionHint: "What surfaces need painting?" },
      { name: "area_sqm", type: "number", required: false, description: "Approximate area in square metres", extractionHint: "Roughly how many rooms or square metres?" },
      { name: "paint_supplied", type: "boolean", required: false, description: "Whether customer is supplying paint", extractionHint: "Are they supplying paint or want you to?" },
    ],
    keywords: ["painter", "painting", "paint", "repaint", "interior", "exterior", "stain", "wallpaper", "colour", "walls", "ceiling"],
    valueMultiplier: 1.1,
    siteVisitLikely: true,
    licensedTrade: false,
  }),
  makeTradeNode("tiling", "Tiling", {
    description: "Floor and wall tiling, waterproofing, grouting, tile repair",
    attributes: [
      { name: "tile_type", type: "string", required: false, description: "Type of tile (ceramic, porcelain, natural stone)", extractionHint: "What type of tile?" },
      { name: "area_sqm", type: "number", required: false, description: "Approximate area in square metres", extractionHint: "How many square metres roughly?" },
      { name: "waterproofing", type: "boolean", required: false, description: "Whether waterproofing is needed", extractionHint: "Is this a wet area (bathroom, laundry)?" },
    ],
    keywords: ["tiler", "tiling", "tile", "tiles", "grout", "bathroom tiles", "floor tiles", "splashback", "waterproof"],
    valueMultiplier: 1.3,
    siteVisitLikely: true,
    licensedTrade: false,
  }),
  makeTradeNode("fencing", "Fencing", {
    description: "Colorbond, timber, pool, chain-link fencing and gates",
    attributes: [
      { name: "fence_type", type: "enum", required: false, description: "Type of fencing", enumValues: ["colorbond", "timber", "pool", "chain_link", "glass", "brick_pier", "retaining"], extractionHint: "What type of fence (colorbond, timber, pool)?" },
      { name: "metres", type: "number", required: false, description: "Approximate length in metres", extractionHint: "Roughly how many metres?" },
      { name: "access", type: "string", required: false, description: "Site access conditions", extractionHint: "Any access issues (slope, tight access, trees)?" },
    ],
    keywords: ["fence", "fencing", "colorbond", "timber fence", "pool fence", "gate", "paling", "retaining wall", "boundary"],
    valueMultiplier: 1.5,
    siteVisitLikely: true,
    licensedTrade: false,
  }),
  makeTradeNode("roofing", "Roofing", {
    description: "Roof repair, replacement, gutters, downpipes, flashing, insulation",
    attributes: [
      { name: "roof_type", type: "enum", required: false, description: "Roof material", enumValues: ["metal", "tile", "colorbond", "slate", "flat"], extractionHint: "What type of roof (metal, tile, flat)?" },
      { name: "issue", type: "enum", required: false, description: "Type of issue", enumValues: ["leak", "replace", "repair", "gutters", "downpipes", "flashing", "insulation", "whirlybird"], extractionHint: "What's the roof issue?" },
    ],
    keywords: ["roof", "roofing", "roofer", "gutter", "gutters", "downpipe", "leak", "flashing", "ridge cap", "whirlybird", "insulation"],
    valueMultiplier: 1.4,
    siteVisitLikely: true,
    licensedTrade: false,
  }),
  makeTradeNode("doors-windows", "Doors & Windows", {
    description: "Door and window installation, repair, security screens, locks",
    attributes: [
      { name: "item_type", type: "enum", required: false, description: "Type of item", enumValues: ["door", "window", "screen_door", "security_screen", "lock", "sliding_door", "bifold"], extractionHint: "Door, window, or security screen?" },
      { name: "material", type: "enum", required: false, description: "Material", enumValues: ["timber", "aluminium", "upvc", "steel"], extractionHint: "What material?" },
    ],
    keywords: ["door", "window", "doors", "windows", "screen door", "security screen", "lock", "sliding door", "bifold", "glass replacement"],
    valueMultiplier: 1.1,
    siteVisitLikely: false,
    licensedTrade: false,
  }),
  makeTradeNode("gardening", "Gardening & Landscaping", {
    description: "Garden maintenance, landscaping, lawn care, tree services",
    attributes: [
      { name: "work_type", type: "enum", required: false, description: "Type of garden work", enumValues: ["mow", "hedge_trim", "weeding", "landscaping", "tree_removal", "stump_grinding", "irrigation", "turf"], extractionHint: "What garden work is needed?" },
      { name: "area_sqm", type: "number", required: false, description: "Garden area in square metres", extractionHint: "Roughly how big is the area?" },
    ],
    keywords: ["garden", "gardening", "lawn", "mow", "mowing", "hedge", "tree", "landscaping", "turf", "weeding", "mulch", "irrigation"],
    valueMultiplier: 0.8,
    siteVisitLikely: false,
    licensedTrade: false,
  }),
  makeTradeNode("cleaning", "Cleaning", {
    description: "Residential and commercial cleaning, end-of-lease, carpet, pressure washing",
    attributes: [
      { name: "clean_type", type: "enum", required: false, description: "Type of cleaning", enumValues: ["regular", "deep_clean", "end_of_lease", "carpet", "pressure_wash", "window", "oven", "commercial"], extractionHint: "What type of cleaning?" },
      { name: "bedrooms", type: "number", required: false, description: "Number of bedrooms (residential)", extractionHint: "How many bedrooms?" },
    ],
    keywords: ["clean", "cleaning", "cleaner", "end of lease", "bond clean", "carpet clean", "pressure wash", "window cleaning", "deep clean"],
    valueMultiplier: 0.9,
    siteVisitLikely: false,
    licensedTrade: false,
  }),
  makeTradeNode("general-handyman", "General Handyman", {
    description: "General repairs, odd jobs, assembly, mounting, minor fixes",
    attributes: [
      { name: "task_list", type: "string", required: false, description: "List of tasks", extractionHint: "What specific tasks need doing?" },
    ],
    keywords: ["handyman", "odd job", "fix", "repair", "mount", "assemble", "install", "hang", "general", "small job", "patch", "touch up"],
    valueMultiplier: 0.9,
    siteVisitLikely: false,
    licensedTrade: false,
  }),
];

// ── Build the full tree ──────────────────────────

const ALL_WHAT_NODES: CategoryNode[] = [
  // L0 roots
  ...WHAT_ROOTS.map((r) => ({
    ...r,
    dimension: "what" as const,
    level: 0,
    parent: null,
    attributes: [],
    keywords: [],
    valueMultiplier: 1.0,
    siteVisitLikely: false,
    licensedTrade: false,
    validTxTypes: [] as string[],
    modalTemplate: "",
    embeddingText: `${r.name} — ${r.description}`,
    tags: [],
  })),
  // L1: services branches
  ...SERVICES_BRANCHES.map((b) => ({
    ...b,
    dimension: "what" as const,
    level: 1,
    parent: "services",
    attributes: [],
    keywords: [],
    valueMultiplier: 1.0,
    siteVisitLikely: false,
    licensedTrade: false,
    validTxTypes: ["hire", "meter"],
    modalTemplate: "service-intake",
    embeddingText: `services ${b.name} — ${b.description}`,
    tags: [],
  })),
  // L2: services.trades.* (OJT operational)
  ...TRADE_CATEGORIES,
];

// ── Indexes ──────────────────────────────────────

const bySlug = new Map<string, CategoryNode>();
const byPath = new Map<string, CategoryNode>();

for (const node of ALL_WHAT_NODES) {
  bySlug.set(node.slug, node);
  byPath.set(node.path, node);
}

// ── Public API ───────────────────────────────────

export function getCategoryBySlug(slug: string): CategoryNode | null {
  return bySlug.get(slug) ?? null;
}

export function getCategoryByPath(path: string): CategoryNode | null {
  return byPath.get(path) ?? null;
}

export function getAllCategories(): CategoryNode[] {
  return [...ALL_WHAT_NODES];
}

export function getTradeCategories(): CategoryNode[] {
  return [...TRADE_CATEGORIES];
}

export function getTxTypeBySlug(slug: string): TransactionType | null {
  return TRANSACTION_TYPES.find((t) => t.slug === slug) ?? null;
}

export function getInstrumentByPath(path: string): InstrumentType | null {
  return INSTRUMENT_TYPES.find((i) => i.path === path || path.startsWith(i.path + ".")) ?? null;
}

/**
 * Classify a job into the WHAT taxonomy based on jobType and description signals.
 *
 * Returns the best-matching CategoryNode from the services.trades subtree,
 * or null if no match found.
 */
export function classifyJob(
  jobType: string | null | undefined,
  description: string | null | undefined
): { node: CategoryNode; confidence: "high" | "medium" | "low" } | null {
  // 1. Direct jobType match (high confidence)
  if (jobType) {
    const slug = jobType.replace(/_/g, "-");
    const direct = TRADE_CATEGORIES.find((c) => c.slug === slug);
    if (direct) return { node: direct, confidence: "high" };
  }

  // 2. Keyword search from description (medium confidence)
  if (description) {
    const lower = description.toLowerCase();
    let best: CategoryNode | null = null;
    let bestScore = 0;

    for (const cat of TRADE_CATEGORIES) {
      let score = 0;
      for (const kw of cat.keywords) {
        if (lower.includes(kw.toLowerCase())) score++;
      }
      if (score > bestScore) {
        bestScore = score;
        best = cat;
      }
    }

    if (best && bestScore >= 2) return { node: best, confidence: "medium" };
    if (best && bestScore === 1) return { node: best, confidence: "low" };
  }

  return null;
}

/**
 * Infer the HOW (transaction type) from text signals.
 * Returns 'hire' as default for OJT (services context).
 */
export function inferTxType(text: string | null | undefined): TransactionType {
  const defaultTx = TRANSACTION_TYPES.find((t) => t.slug === "hire")!;
  if (!text) return defaultTx;

  const lower = text.toLowerCase();
  for (const tx of TRANSACTION_TYPES) {
    for (const kw of tx.keywords) {
      if (lower.includes(kw.toLowerCase())) return tx;
    }
  }
  return defaultTx;
}

/**
 * Derive the instrument type from WHAT + HOW + conversation state.
 */
export function deriveInstrument(
  _whatPath: string,
  howSlug: string,
  state: { estimatePresented?: boolean; estimateAccepted?: boolean }
): string {
  // For hire transactions
  if (howSlug === "hire") {
    if (state.estimateAccepted) return "inst.contract.service-agreement";
    if (state.estimatePresented) return "inst.quote.rom";
    return "inst.quote.rom";
  }
  if (howSlug === "sale") return "inst.contract.purchase-agreement";
  if (howSlug === "rental") return "inst.contract.rental-agreement";
  if (howSlug === "licence") return "inst.contract.service-agreement";
  if (howSlug === "meter") return "inst.channel.prepaid";
  if (howSlug === "exchange") return "inst.escrow.dual-party-release";
  if (howSlug === "grant") return "inst.receipt";
  if (howSlug === "bond") return "inst.escrow.time-locked";
  return "inst.quote.rom";
}

/**
 * Get extraction hints for a category — used to inject category-specific
 * prompts into the LLM extraction pipeline.
 */
export function getExtractionHints(path: string): {
  attributes: CategoryAttribute[];
  followUpPrompts: string[];
} {
  const node = byPath.get(path);
  if (!node || node.attributes.length === 0) {
    return { attributes: [], followUpPrompts: [] };
  }

  const followUpPrompts = node.attributes
    .filter((a) => a.extractionHint)
    .map((a) => a.extractionHint!);

  return { attributes: node.attributes, followUpPrompts };
}

/**
 * Get scoring context from a category path — used by the scoring pipeline
 * to apply category-specific value multipliers and modifiers.
 */
export function getScoringContext(path: string): {
  valueMultiplier: number;
  siteVisitLikely: boolean;
  licensedTrade: boolean;
} {
  const node = byPath.get(path);
  if (!node) {
    return { valueMultiplier: 1.0, siteVisitLikely: false, licensedTrade: false };
  }
  return {
    valueMultiplier: node.valueMultiplier,
    siteVisitLikely: node.siteVisitLikely,
    licensedTrade: node.licensedTrade,
  };
}

// ── Enum-to-Path Migration Map ───────────────────
// Maps old OJT jobCategoryEnum values to universal paths

export const ENUM_TO_PATH: Record<string, string> = {
  carpentry: "services.trades.carpentry",
  plumbing: "services.trades.plumbing",
  electrical: "services.trades.electrical",
  painting: "services.trades.painting",
  general: "services.trades.general-handyman",
  fencing: "services.trades.fencing",
  tiling: "services.trades.tiling",
  roofing: "services.trades.roofing",
  doors_windows: "services.trades.doors-windows",
  gardening: "services.trades.gardening",
  cleaning: "services.trades.cleaning",
  other: "services.trades.general-handyman",
};
