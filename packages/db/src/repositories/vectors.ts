import { Pool } from 'pg';
import { SimilarCase, SimilarityQuery } from '@ledgermind/types';

/**
 * VectorRepository – Query-Optimized
 *
 * Query Strategy:
 * ───────────────
 * 1. FILTER-FIRST: Metadata filters (tenant, workflow, outcome) are applied
 *    BEFORE vector similarity. This reduces the candidate set that needs
 *    cosine computation, drastically cutting CPU time when filters are selective.
 *
 * 2. CANDIDATE SET REDUCTION: The `candidateLimit` parameter caps how many
 *    rows are fetched from Postgres. Without this, a broad filter could pull
 *    the entire table for in-app similarity calculation.
 *
 * 3. INDEX USAGE:
 *    - idx_vectors_tenant            → tenant_id equality (partition-like)
 *    - idx_vectors_tenant_workflow    → (tenant_id, workflow_name) composite
 *    - idx_vectors_tenant_outcome    → (tenant_id, outcome) composite
 *    - idx_vectors_tenant_timestamp  → (tenant_id, timestamp DESC) for recency
 *    - idx_vectors_embedding (HNSW)  → pgvector ANN when available
 *
 * Tradeoffs:
 * ──────────
 * - Filter-first vs ANN-first:
 *     Filter-first is better when metadata is highly selective (e.g., specific
 *     workflow with <1000 vectors). ANN-first is better when metadata is broad
 *     but semantic similarity is the main discriminator. We default to filter-first
 *     because most LedgerMind queries include tenant + workflow context.
 *
 * - candidateLimit:
 *     Too low → misses semantically relevant results that are older
 *     Too high → slow cosine computation in app, high memory
 *     Default 200 balances recall and performance for typical workloads.
 *
 * - Latency amplification risk:
 *     Without candidate reduction, a 10ms DB query + 50ms similarity over 10k
 *     vectors = 60ms. With reduction to 200 candidates, similarity drops to ~1ms.
 */
export class VectorRepository {
  constructor(private pool: Pool) {}

  /**
   * Store a decision vector
   */
  async storeVector(
    eventId: string,
    tenantId: string,
    embedding: number[],
    metadata: {
      decision_type?: string;
      workflow_name?: string;
      outcome?: string;
      policy_version_id?: string;
      timestamp: Date;
    }
  ): Promise<void> {
    const query = `
      INSERT INTO decision_vectors (
        event_id, tenant_id, embedding,
        decision_type, workflow_name, outcome,
        policy_version_id, timestamp, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
    `;

    await this.pool.query(query, [
      eventId,
      tenantId,
      JSON.stringify(embedding),
      metadata.decision_type,
      metadata.workflow_name,
      metadata.outcome,
      metadata.policy_version_id,
      metadata.timestamp,
      JSON.stringify({}),
    ]);
  }

  /**
   * Find similar decisions using cosine similarity with filter-first optimization.
   *
   * Query plan (intended):
   *   1. Index Scan on idx_vectors_tenant (or composite) to filter by metadata
   *   2. Nested Loop Join to decision_events via event_id PK
   *   3. Left Join to override_events via original_event_id index
   *   4. Limit candidate rows to `candidateLimit` (default 200)
   *   5. App-side cosine similarity computation on reduced set
   *   6. Filter by minSimilarity, sort desc, return top-k
   *
   * When pgvector HNSW index is available, replace step 1-4 with:
   *   SELECT ... ORDER BY embedding <=> $query_vector LIMIT k
   * to leverage ANN search directly in Postgres.
   */
  async findSimilar(
    tenantId: string,
    queryEmbedding: number[],
    options: {
      limit?: number;
      minSimilarity?: number;
      workflowName?: string;
      outcomeFilter?: string[];
      policyVersionId?: string;
      /** Max candidates to fetch before app-side cosine. Default 200 */
      candidateLimit?: number;
    }
  ): Promise<SimilarCase[]> {
    const limit = options.limit || 10;
    const minSimilarity = options.minSimilarity || 0.7;
    const candidateLimit = options.candidateLimit || 200;

    // ── Step 1: Build metadata pre-filter conditions ─────────────────────
    // These conditions are applied IN the database query to reduce the
    // candidate set before any cosine computation happens in app code.
    const conditions = ['dv.tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (options.workflowName) {
      conditions.push(`dv.workflow_name = $${paramIndex}`);
      params.push(options.workflowName);
      paramIndex++;
    }

    if (options.policyVersionId) {
      conditions.push(`dv.policy_version_id = $${paramIndex}`);
      params.push(options.policyVersionId);
      paramIndex++;
    }

    if (options.outcomeFilter && options.outcomeFilter.length > 0) {
      conditions.push(`dv.outcome = ANY($${paramIndex})`);
      params.push(options.outcomeFilter);
      paramIndex++;
    }

    // ── Step 2: Fetch pre-filtered candidates ────────────────────────────
    // ORDER BY timestamp DESC prioritizes recent decisions when candidate
    // set exceeds candidateLimit. This is a recency-biased heuristic
    // that works well for most compliance/audit use cases.
    params.push(candidateLimit);

    const query = `
      SELECT 
        de.event_id,
        de.trace_id,
        de.timestamp,
        de.actor_name,
        de.input_summary,
        de.output_summary,
        de.reasoning,
        de.outcome,
        de.confidence,
        de.policy_version_id,
        dv.was_overridden,
        dv.decision_type,
        dv.workflow_name AS vector_workflow_name,
        dv.embedding,
        oe.reason AS override_reason
      FROM decision_vectors dv
      JOIN decision_events de ON dv.event_id = de.event_id
      LEFT JOIN override_events oe ON de.event_id = oe.original_event_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY de.timestamp DESC
      LIMIT $${paramIndex}
    `;

    const result = await this.pool.query(query, params);

    // ── Step 3: App-side cosine similarity on reduced candidate set ──────
    const withSimilarity = result.rows
      .map(row => {
        const embedding = typeof row.embedding === 'string'
          ? JSON.parse(row.embedding)
          : row.embedding;
        const similarity = this.cosineSimilarity(queryEmbedding, embedding);
        
        return {
          event_id: row.event_id,
          trace_id: row.trace_id,
          similarity_score: similarity,
          timestamp: row.timestamp,
          actor_name: row.actor_name,
          input_summary: row.input_summary,
          output_summary: row.output_summary,
          reasoning: row.reasoning,
          outcome: row.outcome,
          confidence: row.confidence,
          was_overridden: row.was_overridden,
          override_reason: row.override_reason,
          policy_version_id: row.policy_version_id,
          // Extra fields for hybrid scoring
          decision_type: row.decision_type,
          workflow_name: row.vector_workflow_name,
        };
      })
      .filter(item => item.similarity_score >= minSimilarity)
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, limit);

    return withSimilarity;
  }

  /**
   * Explain the query plan for a similarity search (diagnostic tool).
   * Call this to verify that Postgres is using indexes effectively.
   *
   * Usage: GET /api/debug/explain-query?workflow_name=...
   */
  async explainSimilarityQuery(
    tenantId: string,
    options?: { workflowName?: string; outcomeFilter?: string[] }
  ): Promise<string[]> {
    const conditions = ['dv.tenant_id = $1'];
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (options?.workflowName) {
      conditions.push(`dv.workflow_name = $${paramIndex}`);
      params.push(options.workflowName);
      paramIndex++;
    }

    if (options?.outcomeFilter?.length) {
      conditions.push(`dv.outcome = ANY($${paramIndex})`);
      params.push(options.outcomeFilter);
      paramIndex++;
    }

    params.push(200);

    const explainQuery = `
      EXPLAIN ANALYZE
      SELECT de.event_id, dv.embedding
      FROM decision_vectors dv
      JOIN decision_events de ON dv.event_id = de.event_id
      LEFT JOIN override_events oe ON de.event_id = oe.original_event_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY de.timestamp DESC
      LIMIT $${paramIndex}
    `;

    const result = await this.pool.query(explainQuery, params);
    return result.rows.map(r => r['QUERY PLAN']);
  }

  /**
   * Get candidate count for a set of filters (useful for capacity planning).
   */
  async getCandidateCount(
    tenantId: string,
    options?: { workflowName?: string; outcome?: string }
  ): Promise<number> {
    const conditions = ['tenant_id = $1'];
    const params: any[] = [tenantId];
    let idx = 2;

    if (options?.workflowName) {
      conditions.push(`workflow_name = $${idx}`);
      params.push(options.workflowName);
      idx++;
    }
    if (options?.outcome) {
      conditions.push(`outcome = $${idx}`);
      params.push(options.outcome);
      idx++;
    }

    const result = await this.pool.query(
      `SELECT COUNT(*)::int as count FROM decision_vectors WHERE ${conditions.join(' AND ')}`,
      params
    );
    return result.rows[0].count;
  }

  /**
   * Compute cosine similarity between two vectors.
   * O(n) where n = vector dimensions (1536 for ada-002).
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }
}
