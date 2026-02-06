import { Pool } from 'pg';
import { DecisionEvent, CreateEventRequest } from '@ledgermind/types';

export class EventRepository {
  constructor(private pool: Pool) {}

  async createEvent(
    tenantId: string,
    event: CreateEventRequest
  ): Promise<DecisionEvent> {
    const query = `
      INSERT INTO decision_events (
        tenant_id, trace_id, step_id, parent_step_id,
        actor_type, actor_name, event_type,
        input_summary, output_summary, reasoning,
        confidence, outcome, policy_version_id, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `;

    const values = [
      tenantId,
      event.trace_id,
      event.step_id,
      event.parent_step_id,
      event.actor_type,
      event.actor_name,
      event.event_type,
      JSON.stringify(event.input_summary),
      JSON.stringify(event.output_summary),
      event.reasoning,
      event.confidence,
      event.outcome,
      event.policy_version_id,
      JSON.stringify(event.metadata || {}),
    ];

    const result = await this.pool.query(query, values);
    return this.mapRow(result.rows[0]);
  }

  async getEventById(eventId: string): Promise<DecisionEvent | null> {
    const query = 'SELECT * FROM decision_events WHERE event_id = $1';
    const result = await this.pool.query(query, [eventId]);
    return result.rows[0] ? this.mapRow(result.rows[0]) : null;
  }

  async getEventsByTrace(traceId: string): Promise<DecisionEvent[]> {
    const query = `
      SELECT * FROM decision_events 
      WHERE trace_id = $1 
      ORDER BY timestamp ASC
    `;
    const result = await this.pool.query(query, [traceId]);
    return result.rows.map(this.mapRow);
  }

  private mapRow(row: any): DecisionEvent {
    return {
      event_id: row.event_id,
      tenant_id: row.tenant_id,
      trace_id: row.trace_id,
      step_id: row.step_id,
      parent_step_id: row.parent_step_id,
      timestamp: row.timestamp,
      actor_type: row.actor_type,
      actor_name: row.actor_name,
      event_type: row.event_type,
      input_summary: row.input_summary,
      output_summary: row.output_summary,
      reasoning: row.reasoning,
      confidence: row.confidence,
      outcome: row.outcome,
      policy_version_id: row.policy_version_id,
      metadata: row.metadata,
      hash: row.hash,
    };
  }
}
