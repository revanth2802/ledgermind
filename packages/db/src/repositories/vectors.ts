import { Pool } from 'pg';
import { SimilarCase, SimilarityQuery } from '@ledgermind/types';

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
      JSON.stringify(embedding), // Store as JSONB since we don't have pgvector
      metadata.decision_type,
      metadata.workflow_name,
      metadata.outcome,
      metadata.policy_version_id,
      metadata.timestamp,
      JSON.stringify({}),
    ]);
  }

  /**
   * Find similar decisions using cosine similarity (fallback without pgvector)
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
    }
  ): Promise<SimilarCase[]> {
    const limit = options.limit || 10;
    const minSimilarity = options.minSimilarity || 0.7;

    // Build filter conditions
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

    // Fetch all matching vectors and compute similarity in app (without pgvector)
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
        dv.embedding,
        oe.reason AS override_reason
      FROM decision_vectors dv
      JOIN decision_events de ON dv.event_id = de.event_id
      LEFT JOIN override_events oe ON de.event_id = oe.original_event_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY de.timestamp DESC
      LIMIT 100
    `;

    const result = await this.pool.query(query, params);

    // Compute cosine similarity for each result
    const withSimilarity = result.rows
      .map(row => {
        // embedding is already parsed from JSONB, but handle string case
        const embedding = typeof row.embedding === 'string' ? JSON.parse(row.embedding) : row.embedding;
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
        };
      })
      .filter(item => item.similarity_score >= minSimilarity)
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, limit);

    return withSimilarity;
  }

  /**
   * Compute cosine similarity between two vectors
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
