/**
 * Migration: Flat enum → Universal Commerce Taxonomy paths
 *
 * Migrates jobs.job_type (enum) → jobs.category_path (dotted LTREE path)
 * Seeds the categories table with the universal trunk + OJT services.trades subtree.
 *
 * Run: npx tsx scripts/migrate-category-paths.ts
 */

import { ENUM_TO_PATH, getAllCategories, TRANSACTION_TYPES, INSTRUMENT_TYPES } from "../src/lib/domain/categories/categoryTree";

// ── 1. Show enum-to-path mapping ─────────────────

console.log("── Enum → Path Migration Map ──");
for (const [enumVal, path] of Object.entries(ENUM_TO_PATH)) {
  console.log(`  ${enumVal.padEnd(15)} → ${path}`);
}
console.log();

// ── 2. Generate SQL for the migration ────────────

console.log("── SQL: Add columns to jobs table ──");
console.log(`
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS category_path VARCHAR(500);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS tx_type VARCHAR(20) DEFAULT 'hire';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS instrument_type VARCHAR(100);
CREATE INDEX IF NOT EXISTS idx_jobs_category_path ON jobs (category_path);
`);

console.log("── SQL: Migrate existing job_type values ──");
const cases = Object.entries(ENUM_TO_PATH)
  .map(([k, v]) => `    WHEN '${k}' THEN '${v}'`)
  .join("\n");

console.log(`
UPDATE jobs SET category_path = CASE job_type
${cases}
    ELSE 'services.trades.general-handyman'
  END
WHERE category_path IS NULL;

UPDATE jobs SET tx_type = 'hire' WHERE tx_type IS NULL;
`);

// ── 3. Generate category seed SQL ────────────────

console.log("── SQL: Seed categories table ──");
console.log("-- WHAT dimension (trunk + OJT subtree)");

const allCats = getAllCategories();
for (const cat of allCats) {
  const attrs = JSON.stringify(cat.attributes).replace(/'/g, "''");
  const kws = JSON.stringify(cat.keywords).replace(/'/g, "''");
  const txTypes = JSON.stringify(cat.validTxTypes).replace(/'/g, "''");
  console.log(`INSERT INTO categories (slug, name, path, dimension, level, parent_path, description, attributes, keywords, value_multiplier, site_visit_likely, licensed_trade, valid_tx_types, modal_template, embedding_text, patch_source)
VALUES ('${cat.slug}', '${cat.name.replace(/'/g, "''")}', '${cat.path}', 'what', ${cat.level}, ${cat.parent ? `'${cat.parent}'` : "NULL"}, '${cat.description.replace(/'/g, "''")}', '${attrs}'::jsonb, '${kws}'::jsonb, ${cat.valueMultiplier}, ${cat.siteVisitLikely}, ${cat.licensedTrade}, '${txTypes}'::jsonb, ${cat.modalTemplate ? `'${cat.modalTemplate}'` : "NULL"}, '${cat.embeddingText.replace(/'/g, "''")}', 'seed')
ON CONFLICT (path) DO NOTHING;`);
}

console.log("\n-- HOW dimension (transaction types)");
for (const tx of TRANSACTION_TYPES) {
  const kws = JSON.stringify(tx.keywords).replace(/'/g, "''");
  console.log(`INSERT INTO categories (slug, name, path, dimension, level, parent_path, description, keywords, patch_source)
VALUES ('${tx.slug}', '${tx.name}', '${tx.path}', 'how', 1, 'tx', '${tx.description.replace(/'/g, "''")}', '${kws}'::jsonb, 'seed')
ON CONFLICT (path) DO NOTHING;`);
}

console.log("\n-- INSTRUMENT dimension");
for (const inst of INSTRUMENT_TYPES) {
  console.log(`INSERT INTO categories (slug, name, path, dimension, level, parent_path, description, patch_source)
VALUES ('${inst.slug}', '${inst.name}', '${inst.path}', 'instrument', 1, 'inst', '${inst.description.replace(/'/g, "''")}', 'seed')
ON CONFLICT (path) DO NOTHING;`);
  for (const sub of inst.subtypes) {
    console.log(`INSERT INTO categories (slug, name, path, dimension, level, parent_path, description, patch_source)
VALUES ('${sub.slug}', '${sub.name}', '${sub.path}', 'instrument', 2, '${inst.path}', '${sub.name}', 'seed')
ON CONFLICT (path) DO NOTHING;`);
  }
}

// ── 4. Summary ───────────────────────────────────

console.log("\n── Summary ──");
console.log(`  WHAT nodes:       ${allCats.length} (5 roots + ${allCats.filter(c => c.level === 1).length} L1 + ${allCats.filter(c => c.level === 2).length} L2)`);
console.log(`  HOW types:        ${TRANSACTION_TYPES.length}`);
console.log(`  INSTRUMENT types: ${INSTRUMENT_TYPES.length} (+ ${INSTRUMENT_TYPES.reduce((n, i) => n + i.subtypes.length, 0)} subtypes)`);
console.log(`  Enum mappings:    ${Object.keys(ENUM_TO_PATH).length}`);
console.log("\nMigration SQL generated. Review and run against your database.");
