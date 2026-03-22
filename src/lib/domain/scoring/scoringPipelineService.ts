/**
 * Scoring Pipeline Service
 *
 * Orchestrates the full scoring pipeline:
 * 1. Run customer fit scoring
 * 2. Run quote worthiness scoring
 * 3. Run recommendation generation
 * 4. Run confidence scoring
 * 5. Classify suburb group
 * 6. Build system scores snapshot
 * 7. Return everything needed for denormalized columns + job_outcomes
 *
 * This is the single entry point that the conversation handler and
 * re-score button should call.
 */

import type { AccumulatedJobState } from "../../ai/extractors/extractionSchema";
import type { SystemScoresSnapshot, ScoringContext } from "../policy/policyTypes";

import { scoreCustomerFit, type CustomerFitResult } from "./customerFitService";
import { scoreQuoteWorthiness, type QuoteWorthinessResult } from "./quoteWorthinessService";
import { generateRecommendation, type RecommendationResult } from "./recommendationService";
import { scoreConfidence, type ConfidenceResult } from "./confidenceService";
import { classifySuburb, type SuburbGroup } from "./suburbGroupService";
import { resolveCategory, type CategoryResolution } from "../categories/categoryResolver";

export interface ScoringPipelineResult {
  fit: CustomerFitResult;
  worthiness: QuoteWorthinessResult;
  recommendation: RecommendationResult;
  confidence: ConfidenceResult;
  suburbGroup: SuburbGroup;
  category: CategoryResolution | null;
  snapshot: SystemScoresSnapshot;
}

/**
 * Run the full scoring pipeline for a lead.
 */
export function runScoringPipeline(
  state: AccumulatedJobState,
  _context?: ScoringContext // reserved for Phase 2 context-aware scoring
): ScoringPipelineResult {
  // 0. Category resolution (WHAT/HOW/INSTRUMENT triple)
  const category = resolveCategory(state);

  // 1. Customer fit
  const fit = scoreCustomerFit(state);

  // 2. Quote worthiness (needs fit score + category as input)
  const worthiness = scoreQuoteWorthiness(state, fit.score, category);

  // 3. Recommendation (needs all three)
  const recommendation = generateRecommendation(state, fit, worthiness);

  // 4. Confidence
  const confidence = scoreConfidence(state);

  // 5. Suburb group
  const suburbGroup = classifySuburb(state.suburb, state.locationClue);

  // 6. Build snapshot for storage
  const snapshot = buildSnapshot(state, fit, worthiness, recommendation, confidence, category);

  return { fit, worthiness, recommendation, confidence, suburbGroup, category, snapshot };
}

/**
 * Build the SystemScoresSnapshot for storage in job_outcomes.
 */
function buildSnapshot(
  state: AccumulatedJobState,
  fit: CustomerFitResult,
  worthiness: QuoteWorthinessResult,
  recommendation: RecommendationResult,
  confidence: ConfidenceResult,
  category: CategoryResolution | null
): SystemScoresSnapshot {
  // Calculate completeness sub-scores
  const scopeClarity = state.scopeClarity ?? 0;
  const locationClarity = state.locationClarity ?? 0;

  const contactReadiness =
    state.contactReadiness === "offered" ? 100 :
    state.contactReadiness === "willing" ? 70 :
    state.contactReadiness === "reluctant" ? 30 :
    state.contactReadiness === "refused" ? 10 : 0;

  const estimateReadiness =
    state.estimatePresented && state.estimateAckStatus === "accepted" ? 100 :
    state.estimatePresented && state.estimateAckStatus === "tentative" ? 70 :
    state.estimatePresented ? 40 : 0;

  const decisionReadiness =
    state.estimateAckStatus === "accepted" ? 100 :
    state.estimateAckStatus === "tentative" ? 60 :
    state.estimatePresented ? 30 : 0;

  const completenessTotal = Math.round(
    scopeClarity * 0.30 +
    locationClarity * 0.15 +
    contactReadiness * 0.15 +
    estimateReadiness * 0.20 +
    decisionReadiness * 0.20
  );

  return {
    fit: {
      score: fit.score,
      label: fit.label,
      reasoning: fit.reasoning,
      positiveSignals: fit.positiveSignals,
      negativeSignals: fit.negativeSignals,
    },
    worthiness: {
      score: worthiness.score,
      label: worthiness.label,
      reasoning: worthiness.reasoning,
    },
    recommendation: {
      value: recommendation.recommendation,
      reason: recommendation.reason,
      actionHint: recommendation.actionHint,
    },
    confidence: {
      score: confidence.score,
      label: confidence.label,
      factors: confidence.factors,
    },
    completeness: {
      total: completenessTotal,
      scopeClarity,
      locationClarity,
      contactReadiness,
      estimateReadiness,
      decisionReadiness,
    },
    estimateAck: {
      status: state.estimateAckStatus ?? null,
      presented: state.estimatePresented ?? false,
      acknowledged: state.estimateAckStatus === "accepted" || state.estimateAckStatus === "tentative",
    },
    category: category ? {
      path: category.path,
      name: category.name,
      confidence: category.confidence,
      valueMultiplier: category.scoringContext.valueMultiplier,
      siteVisitLikely: category.scoringContext.siteVisitLikely,
      licensedTrade: category.scoringContext.licensedTrade,
    } : null,
  };
}
