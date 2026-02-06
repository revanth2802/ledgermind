import { Pool } from 'pg';
import { OverrideEvent, CreateOverrideRequest } from '@ledgermind/types';

export class OverrideRepository {
  constructor(private pool: Pool) {}

  async createOverride(
    tenantId: string,
    override: CreateOverrideRequest
  ): Promise<OverrideEvent> {
    // First get the original outcome
    const originalQuery = `
      SELECT outcome FROM decision_events WHERE event_id = $1
    `;
    const originalResult = await this.pool.query(originalQuery, [
      override.original_event_id,
    ]);

    if (originalResult.rows.length === 0) {
      throw new Error('Original event not found');
    }

    const originalOutcome = originalResult.rows[0].outcome;

    // Insert override
    const query = `
      INSERT INTO override_events (
        tenant_id, original_event_id, trace_id,
        actor_name, original_outcome, new_outcome,
        reason, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      tenantId,
      override.original_event_id,
      override.trace_id,
      override.actor_name,
      originalOutcome,
      override.new_outcome,
      override.reason,
      JSON.stringify(override.metadata || {}),
    ];

    const result = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  async getOverridesByTrace(traceId: string): Promise<OverrideEvent[]> {
    const query = `
      SELECT * FROM override_events 
      WHERE trace_id = $1 
      ORDER BY timestamp ASC
    `;
    const result = await this.pool.query(query, [traceId]);
    return result.rows.map(this.mapRow);
  }

  async getOverrideRate(
    tenantId: string,
    workflowName?: string
  ): Promise<number> {
    let query = `
      SELECT 
        COUNT(DISTINCT oe.original_event_id)::float / 
        NULLIF(COUNT(DISTINCT de.event_id)::float, 0) AS override_rate
      FROM decision_events de
      LEFT JOIN override_events oe ON de.event_id = oe.original_event_id
      WHERE de.tenant_id = $1 AND de.event_type = 'decision_made'
    `;

    const params: any[] = [tenantId];

    if (workflowName) {
      query += ` AND de.metadata->>'workflow_name' = $2`;
      params.push(workflowName);
    }

    const result = await this.pool.query(query, params);
    return parseFloat(result.rows[0]?.override_rate || '0');
  }

  private mapRow(row: any): OverrideEvent {
    return {
      override_id: row.override_id,
      tenant_id: row.tenant_id,
      original_event_id: row.original_event_id,
      trace_id: row.trace_id,
      timestamp: row.timestamp,
      actor_name: row.actor_name,
      original_outcome: row.original_outcome,
      new_outcome: row.new_outcome,
      reason: row.reason,
      metadata: row.metadata,
    };
  }
}
