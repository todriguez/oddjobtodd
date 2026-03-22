/**
 * Verification: Universal Commerce Taxonomy
 *
 * Tests the three-dimension taxonomy (WHAT/HOW/INSTRUMENT),
 * category resolution, extraction hints, scoring integration,
 * and enum-to-path migration mapping.
 *
 * Run: npx tsx scripts/verify-universal-taxonomy.ts
 */

import {
  getCategoryBySlug,
  getCategoryByPath,
  getAllCategories,
  getTradeCategories,
  classifyJob,
  inferTxType,
  deriveInstrument,
  getExtractionHints,
  getScoringContext,
  TRANSACTION_TYPES,
  INSTRUMENT_TYPES,
  ENUM_TO_PATH,
} from "../src/lib/domain/categories/categoryTree";

import {
  resolveCategory,
  buildCategoryAwareExtractionHints,
} from "../src/lib/domain/categories/categoryResolver";

import type { AccumulatedJobState } from "../src/lib/ai/extractors/extractionSchema";

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✅ ${msg}`);
    passed++;
  } else {
    console.log(`  ❌ ${msg}`);
    failed++;
  }
}

// ── 1. Three Dimensions ──────────────────────────

console.log("── Dimension: WHAT (Domain Taxonomy) ──");

const allCats = getAllCategories();
assert(allCats.length >= 28, `Tree has ${allCats.length} WHAT nodes (expected ≥28)`);

const roots = allCats.filter(c => c.level === 0);
assert(roots.length === 5, `5 WHAT roots (got ${roots.length})`);
assert(roots.some(r => r.slug === "goods"), "goods root exists");
assert(roots.some(r => r.slug === "services"), "services root exists");
assert(roots.some(r => r.slug === "resources"), "resources root exists");
assert(roots.some(r => r.slug === "rights"), "rights root exists");
assert(roots.some(r => r.slug === "capital"), "capital root exists");

const l1 = allCats.filter(c => c.level === 1);
assert(l1.length >= 12, `≥12 L1 service branches (got ${l1.length})`);
assert(l1.some(b => b.path === "services.trades"), "services.trades branch exists");
assert(l1.some(b => b.path === "services.professional"), "services.professional branch exists");
assert(l1.some(b => b.path === "services.creative"), "services.creative branch exists");

const trades = getTradeCategories();
assert(trades.length === 11, `11 trade categories (got ${trades.length})`);

console.log("\n── Dimension: HOW (Transaction Types) ──");

assert(TRANSACTION_TYPES.length === 8, `8 transaction types (got ${TRANSACTION_TYPES.length})`);
assert(TRANSACTION_TYPES.some(t => t.slug === "sale"), "tx.sale exists");
assert(TRANSACTION_TYPES.some(t => t.slug === "rental"), "tx.rental exists");
assert(TRANSACTION_TYPES.some(t => t.slug === "hire"), "tx.hire exists");
assert(TRANSACTION_TYPES.some(t => t.slug === "licence"), "tx.licence exists");
assert(TRANSACTION_TYPES.some(t => t.slug === "meter"), "tx.meter exists");
assert(TRANSACTION_TYPES.some(t => t.slug === "exchange"), "tx.exchange exists");
assert(TRANSACTION_TYPES.some(t => t.slug === "grant"), "tx.grant exists");
assert(TRANSACTION_TYPES.some(t => t.slug === "bond"), "tx.bond exists");

for (const tx of TRANSACTION_TYPES) {
  assert(tx.keywords.length >= 2, `tx.${tx.slug} has ≥2 keywords`);
  assert(tx.settlementPattern.length > 0, `tx.${tx.slug} has settlement pattern`);
}

console.log("\n── Dimension: INSTRUMENT (Document Types) ──");

assert(INSTRUMENT_TYPES.length === 9, `9 instrument types (got ${INSTRUMENT_TYPES.length})`);
assert(INSTRUMENT_TYPES.some(i => i.slug === "contract"), "inst.contract exists");
assert(INSTRUMENT_TYPES.some(i => i.slug === "quote"), "inst.quote exists");
assert(INSTRUMENT_TYPES.some(i => i.slug === "invoice"), "inst.invoice exists");
assert(INSTRUMENT_TYPES.some(i => i.slug === "channel"), "inst.channel exists");
assert(INSTRUMENT_TYPES.some(i => i.slug === "escrow"), "inst.escrow exists");

const totalSubtypes = INSTRUMENT_TYPES.reduce((n, i) => n + i.subtypes.length, 0);
assert(totalSubtypes >= 20, `≥20 instrument subtypes (got ${totalSubtypes})`);

// ── 2. Universal Paths ───────────────────────────

console.log("\n── Universal Paths ──");

const plumbing = getCategoryByPath("services.trades.plumbing");
assert(plumbing !== null, "services.trades.plumbing exists by path");
assert(plumbing?.level === 2, "plumbing is level 2");
assert(plumbing?.parent === "services.trades", "plumbing parent is services.trades");
assert(plumbing?.dimension === "what", "plumbing dimension is 'what'");
assert(plumbing?.valueMultiplier === 1.2, "plumbing value multiplier: 1.2");
assert(plumbing?.licensedTrade === true, "plumbing is licensed");

const fencing = getCategoryByPath("services.trades.fencing");
assert(fencing !== null, "services.trades.fencing exists");
assert(fencing?.valueMultiplier === 1.5, "fencing value multiplier: 1.5");
assert(fencing?.siteVisitLikely === true, "fencing needs site visit");

const gardening = getCategoryByPath("services.trades.gardening");
assert(gardening?.valueMultiplier === 0.8, "gardening value multiplier: 0.8");

// Slug lookup
const bySlug = getCategoryBySlug("plumbing");
assert(bySlug?.path === "services.trades.plumbing", "slug lookup → correct path");

// ── 3. Classification ────────────────────────────

console.log("\n── Job Classification ──");

const c1 = classifyJob("plumbing", null);
assert(c1?.node.path === "services.trades.plumbing", "plumbing jobType → correct path");
assert(c1?.confidence === "high", "direct jobType → high confidence");

const c2 = classifyJob("doors_windows", null);
assert(c2?.node.path === "services.trades.doors-windows", "doors_windows → doors-windows path");

const c3 = classifyJob(null, "my kitchen tap is dripping and the drain is blocked");
assert(c3?.node.path === "services.trades.plumbing", "tap + drain description → plumbing");
assert(c3?.confidence === "medium", "keyword match → medium confidence");

const c4 = classifyJob(null, "need a new colorbond fence around the pool");
assert(c4?.node.path === "services.trades.fencing", "colorbond fence → fencing");

const c5 = classifyJob(null, null);
assert(c5 === null, "no signals → null classification");

// ── 4. HOW Inference ─────────────────────────────

console.log("\n── Transaction Type Inference ──");

const tx1 = inferTxType("I need someone to fix my tap");
assert(tx1.slug === "hire", "'need someone to fix' → tx.hire");

const tx2 = inferTxType("selling my 2019 HiLux");
assert(tx2.slug === "sale", "'selling' → tx.sale");

const tx3 = inferTxType("I want to rent a concrete mixer");
assert(tx3.slug === "rental", "'rent' → tx.rental");

const tx4 = inferTxType("want to trade my guitar for an amp");
assert(tx4.slug === "exchange", "'trade' → tx.exchange");

const tx5 = inferTxType("giving away a couch, free to a good home");
assert(tx5.slug === "grant", "'free' + 'giving away' → tx.grant");

const tx6 = inferTxType(null);
assert(tx6.slug === "hire", "null text → default tx.hire");

// ── 5. Instrument Derivation ─────────────────────

console.log("\n── Instrument Derivation ──");

const i1 = deriveInstrument("services.trades.plumbing", "hire", { estimateAccepted: true });
assert(i1 === "inst.contract.service-agreement", "hire + accepted → service agreement");

const i2 = deriveInstrument("services.trades.plumbing", "hire", { estimatePresented: true });
assert(i2 === "inst.quote.rom", "hire + presented → ROM quote");

const i3 = deriveInstrument("goods.vehicles.ute", "sale", {});
assert(i3 === "inst.contract.purchase-agreement", "sale → purchase agreement");

const i4 = deriveInstrument("resources.equipment", "rental", {});
assert(i4 === "inst.contract.rental-agreement", "rental → rental agreement");

const i5 = deriveInstrument("resources.energy.solar", "meter", {});
assert(i5 === "inst.channel.prepaid", "meter → prepaid channel");

const i6 = deriveInstrument("goods.instruments", "exchange", {});
assert(i6 === "inst.escrow.dual-party-release", "exchange → dual-party escrow");

const i7 = deriveInstrument("goods.furniture", "grant", {});
assert(i7 === "inst.receipt", "grant → receipt");

// ── 6. Extraction Hints ──────────────────────────

console.log("\n── Extraction Hints ──");

const hints = getExtractionHints("services.trades.plumbing");
assert(hints.attributes.length === 4, "plumbing has 4 extractable attributes");
assert(hints.attributes.some(a => a.name === "fixture_type"), "includes fixture_type");
assert(hints.followUpPrompts.length === 4, "plumbing has 4 follow-up prompts");

const carpHints = getExtractionHints("services.trades.carpentry");
assert(carpHints.attributes.some(a => a.name === "timber_type"), "carpentry includes timber_type");

const noHints = getExtractionHints("services.trades.nonexistent");
assert(noHints.attributes.length === 0, "nonexistent path → empty hints");

// ── 7. Category-Aware Prompt Injection ───────────

console.log("\n── Category-Aware Prompt Injection ──");

const mockState: AccumulatedJobState = {
  jobType: "plumbing",
  scopeDescription: "kitchen tap dripping",
  scopeClarity: 30,
} as AccumulatedJobState;

const promptHints = buildCategoryAwareExtractionHints(mockState);
assert(promptHints.includes("Plumbing"), "prompt hints mention Plumbing");
assert(promptHints.includes("fixture_type"), "prompt hints include fixture_type");
assert(promptHints.includes("licensed trade"), "prompt hints note licensed trade");

const emptyState = {} as AccumulatedJobState;
const emptyHints = buildCategoryAwareExtractionHints(emptyState);
assert(emptyHints === "", "no category → empty prompt hints");

// ── 8. Full Resolution (WHAT + HOW + INSTRUMENT) ─

console.log("\n── Full Category Resolution ──");

const fullState: AccumulatedJobState = {
  jobType: "carpentry",
  scopeDescription: "I need a new deck built, about 20sqm, hardwood",
  scopeClarity: 65,
  estimatePresented: true,
  estimateAck: "accepted",
  estimateAckStatus: "accepted",
} as AccumulatedJobState;

const resolution = resolveCategory(fullState);
assert(resolution !== null, "full state resolves");
assert(resolution!.path === "services.trades.carpentry", "WHAT: services.trades.carpentry");
assert(resolution!.confidence === "high", "confidence: high (direct jobType)");
assert(resolution!.txType === "hire", "HOW: hire");
assert(resolution!.instrumentPath === "inst.contract.service-agreement", "INSTRUMENT: service agreement (estimate accepted)");
assert(resolution!.scoringContext.valueMultiplier === 1.4, "value multiplier: 1.4");
assert(resolution!.scoringContext.siteVisitLikely === true, "site visit likely");

const emptyResolution = resolveCategory({} as AccumulatedJobState);
assert(emptyResolution === null, "empty state → null resolution");

// ── 9. Scoring Context ───────────────────────────

console.log("\n── Scoring Context ──");

const sc1 = getScoringContext("services.trades.fencing");
assert(sc1.valueMultiplier === 1.5, "fencing multiplier: 1.5");
assert(sc1.siteVisitLikely === true, "fencing: site visit likely");
assert(sc1.licensedTrade === false, "fencing: not licensed");

const sc2 = getScoringContext("services.trades.electrical");
assert(sc2.valueMultiplier === 1.3, "electrical multiplier: 1.3");
assert(sc2.licensedTrade === true, "electrical: licensed");

const sc3 = getScoringContext("nonexistent.path");
assert(sc3.valueMultiplier === 1.0, "unknown path → neutral multiplier");

// ── 10. Enum-to-Path Migration ───────────────────

console.log("\n── Enum-to-Path Migration ──");

assert(Object.keys(ENUM_TO_PATH).length === 12, "12 enum mappings");
assert(ENUM_TO_PATH["plumbing"] === "services.trades.plumbing", "plumbing → services.trades.plumbing");
assert(ENUM_TO_PATH["doors_windows"] === "services.trades.doors-windows", "doors_windows → services.trades.doors-windows");
assert(ENUM_TO_PATH["general"] === "services.trades.general-handyman", "general → services.trades.general-handyman");
assert(ENUM_TO_PATH["other"] === "services.trades.general-handyman", "other → services.trades.general-handyman");

// Verify every enum maps to a real node
for (const [enumVal, path] of Object.entries(ENUM_TO_PATH)) {
  const node = getCategoryByPath(path);
  assert(node !== null, `${enumVal} maps to existing node: ${path}`);
}

// ── 11. Data Integrity ───────────────────────────

console.log("\n── Data Integrity ──");

for (const cat of getTradeCategories()) {
  assert(cat.path.startsWith("services.trades."), `${cat.slug} path starts with services.trades.`);
  assert(cat.keywords.length >= 3, `${cat.slug} has ≥3 keywords`);
  assert(cat.valueMultiplier > 0 && cat.valueMultiplier <= 2, `${cat.slug} multiplier in range`);
  assert(typeof cat.siteVisitLikely === "boolean", `${cat.slug} has siteVisitLikely`);
  assert(typeof cat.licensedTrade === "boolean", `${cat.slug} has licensedTrade`);
  assert(cat.dimension === "what", `${cat.slug} dimension is 'what'`);
  assert(cat.validTxTypes.includes("hire"), `${cat.slug} supports tx.hire`);
}

// Verify root paths have no parent
for (const root of roots) {
  assert(root.parent === null, `${root.slug} root has null parent`);
}

// Verify L1 branches have correct parent
for (const branch of l1) {
  assert(branch.parent !== null, `${branch.slug} L1 has parent`);
}

// ══════════════════════════════════════════════════

console.log(`\n${"═".repeat(50)}`);
console.log(`Universal Taxonomy Tests: ${passed} passed, ${failed} failed`);
console.log(`${"═".repeat(50)}`);

if (failed > 0) process.exit(1);
