const API_BASE = '/api'

export interface Trace {
  trace_id: string
  workflow_name: string
  started_at: string
  ended_at: string | null
  final_outcome: string | null
  risk_score: number | null
  events_summary: Array<{
    outcome: string
    step_id: string
    timestamp: string
    actor_name: string
    confidence: number
    event_type: string
  }>
  metadata: Record<string, unknown>
}

export interface Event {
  event_id: string
  trace_id: string
  step_id: string
  actor_name: string
  event_type: string
  input_context: Record<string, unknown>
  outcome: string | null
  confidence: number | null
  reasoning: string | null
  timestamp: string
  metadata: Record<string, unknown>
  embedding: number[] | null
}

export interface Override {
  override_id: string
  original_event_id: string
  trace_id: string
  original_outcome: string
  new_outcome: string
  reason: string
  actor_name: string
  timestamp: string
  metadata: Record<string, unknown>
}

export interface Policy {
  policy_version_id: string
  policy_name: string
  version: string
  content: Record<string, unknown>
  created_at: string
  deprecated_at: string | null
  metadata: Record<string, unknown>
}

export interface AnalyticsOverview {
  total_traces: number
  total_events: number
  total_overrides: number
  avg_confidence: number
  outcome_distribution: Record<string, number>
}

export interface AgentStats {
  agent_name: string
  total_decisions: number
  avg_confidence: number
  outcomes: Record<string, number>
  override_count: number
}

class ApiClient {
  private async fetch<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-key',
        'x-tenant-id': 'demo-tenant',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }

    return response.json()
  }

  // Traces
  async getTraces(limit = 50): Promise<Trace[]> {
    return this.fetch<Trace[]>(`/traces?limit=${limit}`)
  }

  async getTrace(traceId: string): Promise<Trace> {
    return this.fetch<Trace>(`/traces/${traceId}`)
  }

  // Events
  async getEvents(traceId?: string, limit = 100): Promise<Event[]> {
    const params = new URLSearchParams()
    if (traceId) params.set('trace_id', traceId)
    params.set('limit', String(limit))
    return this.fetch<Event[]>(`/events?${params}`)
  }

  async getEvent(eventId: string): Promise<Event> {
    return this.fetch<Event>(`/events/${eventId}`)
  }

  // Overrides
  async getOverrides(limit = 50): Promise<Override[]> {
    return this.fetch<Override[]>(`/overrides?limit=${limit}`)
  }

  async createOverride(override: {
    original_event_id: string
    trace_id: string
    original_outcome: string
    new_outcome: string
    reason: string
    actor_name: string
  }): Promise<Override> {
    return this.fetch<Override>('/overrides', {
      method: 'POST',
      body: JSON.stringify(override),
    })
  }

  // Policies
  async getPolicies(): Promise<Policy[]> {
    return this.fetch<Policy[]>('/policies')
  }

  async createPolicy(policy: { policy_name: string; version: string; content: Record<string, unknown>; metadata?: Record<string, unknown> }): Promise<Policy> {
    return this.fetch<Policy>('/policies', {
      method: 'POST',
      body: JSON.stringify(policy),
    })
  }

  // Analytics
  async getAnalyticsOverview(): Promise<AnalyticsOverview> {
    return this.fetch<AnalyticsOverview>('/analytics/overview')
  }

  async getAgentStats(): Promise<AgentStats[]> {
    return this.fetch<AgentStats[]>('/analytics/agents')
  }

  // Timeline
  async getTimeline(traceId: string): Promise<Event[]> {
    return this.fetch<Event[]>(`/traces/${traceId}/timeline`)
  }

  // Similarity search
  async findSimilar(eventId: string, limit = 5): Promise<{ event: Event; similarity: number }[]> {
    return this.fetch(`/events/${eventId}/similar?limit=${limit}`)
  }
}

export const api = new ApiClient()
