/**
 * Categories Module — Universal Commerce Taxonomy
 *
 * Three dimensions: WHAT (domain), HOW (transaction), INSTRUMENT (document)
 */

// Tree: nodes, lookup, classification
export {
  type CategoryNode,
  type CategoryAttribute,
  type TransactionType,
  type InstrumentType,
  getCategoryBySlug,
  getCategoryByPath,
  getAllCategories,
  getTradeCategories,
  classifyJob,
  inferTxType,
  deriveInstrument,
  getExtractionHints,
  getScoringContext,
  getTxTypeBySlug,
  getInstrumentByPath,
  TRANSACTION_TYPES,
  INSTRUMENT_TYPES,
  TRADE_CATEGORIES,
  ENUM_TO_PATH,
} from "./categoryTree";

// Resolver: state → (WHAT, HOW, INSTRUMENT)
export {
  type CategoryResolution,
  resolveCategory,
  buildCategoryAwareExtractionHints,
} from "./categoryResolver";
