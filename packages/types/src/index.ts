/**
 * Core type definitions for LedgerMind
 */

// ============================================================================
// Core Primitives
// ============================================================================

export type ActorType = 'agent' | 'human' | 'system';

export type EventType =
  | 'step_started'
  | 'step_completed'
  | 'decision_made'
  | 'override'
  | 'policy_used'
  | 'escalation';

export type OutcomeType =
  | 'approved'
  | 'rejected'
  | 'escalated'
  | 'pending'
  | 'error';

// ============================================================================
// Decision Event (Core Data Model)
// ============================================================================

export interface DecisionEvent {
  event_id: string;
  tenant_id: string;
  trace_id: string;
  step_id: string;
  parent_step_id?: string;
  timestamp: Date;
  
  // Actor information
  actor_type: ActorType;
  actor_name: string;
  
  // Event details
  event_type: EventType;
  input_summary: Record<string, any>;
  output_summary: Record<string, any>;
  reasoning?: string;
  confidence?: number; // 0.0 - 1.0
  outcome?: OutcomeType;
  
  // Context
  policy_version_id?: string;
  metadata?: Record<string, any>;
  
  // Tamper evidence (optional)
  hash?: string;
}

// ============================================================================
// Trace (Workflow Timeline)
// ============================================================================

export interface Trace {
  trace_id: string;
  tenant_id: string;
  workflow_name: string;
  started_at: Date;
  ended_at?: Date;
  final_outcome?: OutcomeType;
  risk_score?: number;
  
  // Compacted events for UI rendering
  events_summary?: TraceEventSummary[];
  
  metadata?: Record<string, any>;
}

export interface TraceEventSummary {
  step_id: string;
  actor_name: string;
  event_type: EventType;
  timestamp: Date;
  outcome?: OutcomeType;
  confidence?: number;
}

// ============================================================================
// Similarity Query
// ============================================================================

export interface SimilarityQuery {
  tenant_id: string;
  
  // Context to match against
  input_context: Record<string, any>;
  decision_type?: string;
  
  // Filters
  workflow_name?: string;
  policy_version_id?: string;
  outcome_filter?: OutcomeType[];
  
  // Search parameters
  limit?: number; // default: 10
  min_similarity?: number; // default: 0.7
  time_decay?: boolean; // default: true
}

export interface SimilarCase {
  event_id: string;
  trace_id: string;
  similarity_score: number; // 0.0 - 1.0
  
  // Original decision details
  timestamp: Date;
  actor_name: string;
  input_summary: Record<string, any>;
  output_summary: Record<string, any>;
  reasoning?: string;
  outcome?: OutcomeType;
  confidence?: number;
  
  // Override information
  was_overridden: boolean;
  override_reason?: string;
  
  // Policy context
  policy_version_id?: string;
}

export interface SimilarityResult {
  cases: SimilarCase[];
  
  // Aggregate statistics
  total_found: number;
  avg_confidence: number;
  override_rate: number; // percentage
  outcome_distribution: Record<OutcomeType, number>;
  
  // Precedent signal
  precedent_alignment_score: number; // 0.0 - 1.0
}

// ============================================================================
// Override Event
// ============================================================================

export interface OverrideEvent {
  override_id: string;
  tenant_id: string;
  original_event_id: string;
  trace_id: string;
  
  timestamp: Date;
  actor_name: string; // human who overrode
  
  original_outcome: OutcomeType;
  new_outcome: OutcomeType;
  reason: string;
  
  metadata?: Record<string, any>;
}

// ============================================================================
// Policy Version
// ============================================================================

export interface PolicyVersion {
  policy_version_id: string;
  tenant_id: string;
  policy_name: string;
  version: string;
  
  content: any; // JSON/YAML policy definition
  
  created_at: Date;
  deprecated_at?: Date;
  
  metadata?: Record<string, any>;
}

// ============================================================================
// SDK Client Configuration
// ============================================================================

export interface LedgerMindConfig {
  apiUrl: string;
  apiKey: string;
  tenantId: string;
  
  // Optional
  timeout?: number; // ms
  retryAttempts?: number;
  enableTamperProof?: boolean;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateEventRequest {
  trace_id: string;
  step_id: string;
  parent_step_id?: string;
  
  actor_type: ActorType;
  actor_name: string;
  event_type: EventType;
  
  input_summary: Record<string, any>;
  output_summary: Record<string, any>;
  reasoning?: string;
  confidence?: number;
  outcome?: OutcomeType;
  
  policy_version_id?: string;
  metadata?: Record<string, any>;
}

export interface CreateTraceRequest {
  trace_id: string;
  workflow_name: string;
  metadata?: Record<string, any>;
}

export interface CreateOverrideRequest {
  original_event_id: string;
  trace_id: string;
  actor_name: string;
  original_outcome: OutcomeType;
  new_outcome: OutcomeType;
  reason: string;
  metadata?: Record<string, any>;
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface DecisionDriftMetrics {
  tenant_id: string;
  workflow_name: string;
  time_period: {
    start: Date;
    end: Date;
  };
  
  // Drift indicators
  outcome_variance: number; // 0.0 - 1.0
  confidence_trend: 'increasing' | 'decreasing' | 'stable';
  override_trend: 'increasing' | 'decreasing' | 'stable';
  
  // Signals
  policy_confusion_detected: boolean;
  agent_misalignment_detected: boolean;
}
