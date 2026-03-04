/**
 * Hybrid Scoring Module
 *
 * Combines three independent signals into a single retrieval score:
 *   final_score = (semantic_weight * vector_score)
 *               + (metadata_weight * structured_match_score)
 *               + (recency_weight * time_decay_score)
 *
 * Design Rationale:
 * ─────────────────
 * Pure vector similarity misses structured context (workflow match, outcome
 * alignment, policy version). Pure metadata matching misses semantic nuance.
 * Recency decaying prevents stale precedents from dominating results.
 *
 * Weight Balancing:
 * ─────────────────
 * Default weights (0.6 / 0.25 / 0.15) prioritize semantic relevance while
 * giving meaningful influence to structural matches and freshness.
 * In compliance-heavy domains you may increase metadata_weight; in rapidly
 * evolving systems increase recency_weight.
 *
 * Tradeoffs:
 * ─────────
 * - Higher semantic weight → better recall, risk of false positives
 * - Higher metadata weight → more precise filtering, risk of missing novel cases
 * - Higher recency weight  → favours recent decisions, risks ignoring historical patterns
 */

export interface ScoringWeights {
  /** Weight for vector cosine similarity (0–1). Default 0.60 */
  semantic: number;
  /** Weight for structured metadata match (0–1). Default 0.25 */
  metadata: number;
  /** Weight for time-decay freshness (0–1). Default 0.15 */
  recency: number;
}

export interface ScoringCandidate {
  /** Raw cosine similarity from vector search (0–1) */
  vectorScore: number;
  /** Timestamp of the candidate decision */
  timestamp: Date;
  /** Metadata fields for structured matching */
  workflowName?: string;
  decisionType?: string;
  outcome?: string;
  policyVersionId?: string;
  confidence?: number;
  wasOverridden?: boolean;
  /** Arbitrary metadata attached to the candidate */
  metadata?: Record<string, any>;
}

export interface ScoringQuery {
  /** Metadata filters from the query side */
  workflowName?: string;
  decisionType?: string;
  outcomeFilter?: string[];
  policyVersionId?: string;
}

export interface ScoredResult {
  /** Composite final score (0–1) */
  finalScore: number;
  /** Individual signal breakdown for observability */
  signals: {
    semanticScore: number;
    structuredMatchScore: number;
    timeDecayScore: number;
  };
}

const DEFAULT_WEIGHTS: ScoringWeights = {
  semantic: 0.60,
  metadata: 0.25,
  recency: 0.15,
};

/**
 * Half-life for exponential time decay (in days).
 * After this many days a candidate's recency score drops to 0.5.
 */
const DEFAULT_HALF_LIFE_DAYS = 30;

export class HybridScorer {
  private weights: ScoringWeights;
  private halfLifeMs: number;

  constructor(weights?: Partial<ScoringWeights>, halfLifeDays?: number) {
    const w = { ...DEFAULT_WEIGHTS, ...weights };

    // Normalize weights so they sum to 1
    const sum = w.semantic + w.metadata + w.recency;
    if (sum <= 0) throw new Error('Scoring weights must sum to a positive number');
    this.weights = {
      semantic: w.semantic / sum,
      metadata: w.metadata / sum,
      recency: w.recency / sum,
    };

    this.halfLifeMs = (halfLifeDays ?? DEFAULT_HALF_LIFE_DAYS) * 24 * 60 * 60 * 1000;
  }

  /**
   * Score a single candidate against the query context.
   */
  score(candidate: ScoringCandidate, query: ScoringQuery): ScoredResult {
    const semanticScore = candidate.vectorScore;
    const structuredMatchScore = this.computeStructuredMatch(candidate, query);
    const timeDecayScore = this.computeTimeDecay(candidate.timestamp);

    const finalScore =
      this.weights.semantic * semanticScore +
      this.weights.metadata * structuredMatchScore +
      this.weights.recency * timeDecayScore;

    return {
      finalScore: clamp(finalScore, 0, 1),
      signals: {
        semanticScore,
        structuredMatchScore,
        timeDecayScore,
      },
    };
  }

  /**
   * Score and rank an array of candidates. Returns them sorted by finalScore desc.
   */
  scoreAndRank(
    candidates: ScoringCandidate[],
    query: ScoringQuery,
    limit?: number
  ): Array<ScoringCandidate & ScoredResult> {
    const scored = candidates.map((c) => ({
      ...c,
      ...this.score(c, query),
    }));

    scored.sort((a, b) => b.finalScore - a.finalScore);

    return limit ? scored.slice(0, limit) : scored;
  }

  /**
   * Compute structured metadata match score (0–1).
   *
   * Each matching field contributes a weighted fraction:
   *   workflowName  → 0.35
   *   decisionType  → 0.25
   *   outcome match → 0.25
   *   policyVersion → 0.15
   *
   * Only fields present in the query contribute to the denominator,
   * so partial queries are not penalized.
   */
  private computeStructuredMatch(
    candidate: ScoringCandidate,
    query: ScoringQuery
  ): number {
    const fieldWeights: Array<{
      queryVal: any;
      candidateVal: any;
      weight: number;
      isArrayMatch?: boolean;
    }> = [
      {
        queryVal: query.workflowName,
        candidateVal: candidate.workflowName,
        weight: 0.35,
      },
      {
        queryVal: query.decisionType,
        candidateVal: candidate.decisionType,
        weight: 0.25,
      },
      {
        queryVal: query.outcomeFilter,
        candidateVal: candidate.outcome,
        weight: 0.25,
        isArrayMatch: true,
      },
      {
        queryVal: query.policyVersionId,
        candidateVal: candidate.policyVersionId,
        weight: 0.15,
      },
    ];

    let totalWeight = 0;
    let matchedWeight = 0;

    for (const field of fieldWeights) {
      if (field.queryVal === undefined || field.queryVal === null) continue;
      if (Array.isArray(field.queryVal) && field.queryVal.length === 0) continue;

      totalWeight += field.weight;

      if (field.isArrayMatch) {
        if (
          Array.isArray(field.queryVal) &&
          field.queryVal.includes(field.candidateVal)
        ) {
          matchedWeight += field.weight;
        }
      } else if (field.queryVal === field.candidateVal) {
        matchedWeight += field.weight;
      }
    }

    // If no query fields are specified, give neutral score (0.5)
    if (totalWeight === 0) return 0.5;

    return matchedWeight / totalWeight;
  }

  /**
   * Exponential time decay: score = 2^(-age / halfLife)
   * Returns 1.0 for brand-new decisions, 0.5 at half-life, approaches 0 as age → ∞
   */
  private computeTimeDecay(timestamp: Date): number {
    const ageMs = Date.now() - new Date(timestamp).getTime();
    if (ageMs <= 0) return 1.0;
    return Math.pow(2, -(ageMs / this.halfLifeMs));
  }

  /** Return current weights for diagnostics / logging */
  getWeights(): Readonly<ScoringWeights> {
    return { ...this.weights };
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
