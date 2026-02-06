import { Pool } from 'pg';
import { Trace, CreateTraceRequest } from '@ledgermind/types';

export class TraceRepository {
  constructor(private pool: Pool) {}

  async createTrace(
    tenantId: string,
    trace: CreateTraceRequest
  ): Promise<Trace> {
    const query = `
      INSERT INTO trace_views (
        trace_id, tenant_id, workflow_name, started_at, metadata
      ) VALUES ($1, $2, $3, NOW(), $4)
      RETURNING *
    `;

    const values = [
      trace.trace_id,
      tenantId,
      trace.workflow_name,
      JSON.stringify(trace.metadata || {}),
    ];

    const result = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  async getTraceById(traceId: string): Promise<Trace | null> {
    const query = 'SELECT * FROM trace_views WHERE trace_id = $1';
    const result = await this.pool.query(query, [traceId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async getTracesByTenant(
    tenantId: string,
    limit: number = 50
  ): Promise<Trace[]> {
    const query = `
      SELECT * FROM trace_views 
      WHERE tenant_id = $1 
      ORDER BY started_at DESC 
      LIMIT $2
    `;
    const result = await this.pool.query(query, [tenantId, limit]);
    return result.rows.map(this.mapRow);
  }

  private mapRow(row: any): Trace {
    return {
      trace_id: row.trace_id,
      tenant_id: row.tenant_id,
      workflow_name: row.workflow_name,
      started_at: row.started_at,
      ended_at: row.ended_at,
      final_outcome: row.final_outcome,
      risk_score: row.risk_score,
      events_summary: row.events_summary,
      metadata: row.metadata,
    };
  }
}
