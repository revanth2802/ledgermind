-- LedgerMind Database Schema
-- PostgreSQL with pgvector extension

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Decision Events (append-only ledger)
CREATE TABLE decision_events (
  event_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(255) NOT NULL,
  trace_id UUID NOT NULL,
  step_id UUID NOT NULL,
  parent_step_id UUID,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Actor
  actor_type VARCHAR(50) NOT NULL CHECK (actor_type IN ('agent', 'human', 'system')),
  actor_name VARCHAR(255) NOT NULL,
  
  -- Event details
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'step_started', 'step_completed', 'decision_made', 'override', 'policy_used', 'escalation'
  )),
  input_summary JSONB NOT NULL DEFAULT '{}',
  output_summary JSONB NOT NULL DEFAULT '{}',
  reasoning TEXT,
  confidence REAL CHECK (confidence >= 0 AND confidence <= 1),
  outcome VARCHAR(50) CHECK (outcome IN (
    'approved', 'rejected', 'escalated', 'pending', 'error'
  )),
  
  -- Context
  policy_version_id UUID,
  metadata JSONB DEFAULT '{}',
  
  -- Tamper evidence (optional)
  hash VARCHAR(64),
  
  -- Indexes
  CONSTRAINT fk_parent_step FOREIGN KEY (parent_step_id) REFERENCES decision_events(step_id)
);

-- Indexes for decision_events
CREATE INDEX idx_events_tenant ON decision_events(tenant_id);
CREATE INDEX idx_events_trace ON decision_events(trace_id);
CREATE INDEX idx_events_step ON decision_events(step_id);
CREATE INDEX idx_events_timestamp ON decision_events(timestamp DESC);
CREATE INDEX idx_events_actor ON decision_events(actor_type, actor_name);
CREATE INDEX idx_events_outcome ON decision_events(outcome);
CREATE INDEX idx_events_policy ON decision_events(policy_version_id);

-- Partition by tenant + time for scale (optional, enable when needed)
-- CREATE TABLE decision_events PARTITION BY RANGE (timestamp);

-- ============================================================================
-- TRACE VIEWS (materialized for fast UI reads)
-- ============================================================================

CREATE TABLE trace_views (
  trace_id UUID PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  workflow_name VARCHAR(255) NOT NULL,
  
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  final_outcome VARCHAR(50),
  risk_score REAL,
  
  -- Compacted event summary for timeline UI
  events_summary JSONB DEFAULT '[]',
  
  metadata JSONB DEFAULT '{}',
  
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_traces_tenant ON trace_views(tenant_id);
CREATE INDEX idx_traces_workflow ON trace_views(workflow_name);
CREATE INDEX idx_traces_started ON trace_views(started_at DESC);
CREATE INDEX idx_traces_outcome ON trace_views(final_outcome);

-- ============================================================================
-- DECISION VECTORS (for similarity search)
-- ============================================================================

CREATE TABLE decision_vectors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES decision_events(event_id),
  tenant_id VARCHAR(255) NOT NULL,
  
  -- Vector embedding (1536 dimensions for OpenAI ada-002)
  embedding vector(1536) NOT NULL,
  
  -- Searchable metadata
  decision_type VARCHAR(255),
  workflow_name VARCHAR(255),
  outcome VARCHAR(50),
  was_overridden BOOLEAN DEFAULT FALSE,
  
  -- For filtering
  policy_version_id UUID,
  timestamp TIMESTAMPTZ NOT NULL,
  
  metadata JSONB DEFAULT '{}'
);

-- Vector similarity index (HNSW for fast approximate search)
CREATE INDEX idx_vectors_embedding ON decision_vectors 
  USING hnsw (embedding vector_cosine_ops);

-- Additional indexes
CREATE INDEX idx_vectors_tenant ON decision_vectors(tenant_id);
CREATE INDEX idx_vectors_type ON decision_vectors(decision_type);
CREATE INDEX idx_vectors_outcome ON decision_vectors(outcome);
CREATE INDEX idx_vectors_timestamp ON decision_vectors(timestamp DESC);

-- ============================================================================
-- OVERRIDE EVENTS (human corrections)
-- ============================================================================

CREATE TABLE override_events (
  override_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(255) NOT NULL,
  original_event_id UUID NOT NULL REFERENCES decision_events(event_id),
  trace_id UUID NOT NULL,
  
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  actor_name VARCHAR(255) NOT NULL, -- human who overrode
  
  original_outcome VARCHAR(50) NOT NULL,
  new_outcome VARCHAR(50) NOT NULL,
  reason TEXT NOT NULL,
  
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_overrides_tenant ON override_events(tenant_id);
CREATE INDEX idx_overrides_event ON override_events(original_event_id);
CREATE INDEX idx_overrides_trace ON override_events(trace_id);
CREATE INDEX idx_overrides_timestamp ON override_events(timestamp DESC);

-- ============================================================================
-- POLICY VERSIONS (context tracking)
-- ============================================================================

CREATE TABLE policy_versions (
  policy_version_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(255) NOT NULL,
  policy_name VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  
  content JSONB NOT NULL, -- policy definition
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deprecated_at TIMESTAMPTZ,
  
  metadata JSONB DEFAULT '{}',
  
  UNIQUE(tenant_id, policy_name, version)
);

CREATE INDEX idx_policies_tenant ON policy_versions(tenant_id);
CREATE INDEX idx_policies_name ON policy_versions(policy_name);
CREATE INDEX idx_policies_active ON policy_versions(deprecated_at) WHERE deprecated_at IS NULL;

-- ============================================================================
-- ANALYTICS / AGGREGATION TABLES (optional, for performance)
-- ============================================================================

-- Decision drift metrics (pre-computed)
CREATE TABLE decision_drift_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id VARCHAR(255) NOT NULL,
  workflow_name VARCHAR(255) NOT NULL,
  
  time_window_start TIMESTAMPTZ NOT NULL,
  time_window_end TIMESTAMPTZ NOT NULL,
  
  outcome_variance REAL, -- 0.0 - 1.0
  avg_confidence REAL,
  override_rate REAL, -- percentage
  
  confidence_trend VARCHAR(50), -- 'increasing' | 'decreasing' | 'stable'
  override_trend VARCHAR(50),
  
  policy_confusion_detected BOOLEAN DEFAULT FALSE,
  agent_misalignment_detected BOOLEAN DEFAULT FALSE,
  
  computed_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(tenant_id, workflow_name, time_window_start)
);

CREATE INDEX idx_drift_tenant_workflow ON decision_drift_metrics(tenant_id, workflow_name);
CREATE INDEX idx_drift_time ON decision_drift_metrics(time_window_start DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Trigger to update trace_views when events are added
CREATE OR REPLACE FUNCTION update_trace_view()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO trace_views (trace_id, tenant_id, workflow_name, started_at, events_summary)
  VALUES (
    NEW.trace_id,
    NEW.tenant_id,
    COALESCE(NEW.metadata->>'workflow_name', 'unknown'),
    NEW.timestamp,
    jsonb_build_array(
      jsonb_build_object(
        'step_id', NEW.step_id,
        'actor_name', NEW.actor_name,
        'event_type', NEW.event_type,
        'timestamp', NEW.timestamp,
        'outcome', NEW.outcome,
        'confidence', NEW.confidence
      )
    )
  )
  ON CONFLICT (trace_id) DO UPDATE
  SET
    ended_at = NEW.timestamp,
    final_outcome = COALESCE(NEW.outcome, trace_views.final_outcome),
    events_summary = trace_views.events_summary || jsonb_build_array(
      jsonb_build_object(
        'step_id', NEW.step_id,
        'actor_name', NEW.actor_name,
        'event_type', NEW.event_type,
        'timestamp', NEW.timestamp,
        'outcome', NEW.outcome,
        'confidence', NEW.confidence
      )
    ),
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_trace_view
AFTER INSERT ON decision_events
FOR EACH ROW
EXECUTE FUNCTION update_trace_view();

-- Function to mark event as overridden
CREATE OR REPLACE FUNCTION mark_event_overridden()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the vector record to mark as overridden
  UPDATE decision_vectors
  SET was_overridden = TRUE
  WHERE event_id = NEW.original_event_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_mark_overridden
AFTER INSERT ON override_events
FOR EACH ROW
EXECUTE FUNCTION mark_event_overridden();

-- ============================================================================
-- VIEWS (read-optimized)
-- ============================================================================

-- Recent decisions with override status
CREATE VIEW recent_decisions_with_overrides AS
SELECT 
  de.event_id,
  de.tenant_id,
  de.trace_id,
  de.step_id,
  de.timestamp,
  de.actor_name,
  de.event_type,
  de.outcome,
  de.confidence,
  de.reasoning,
  oe.override_id IS NOT NULL AS was_overridden,
  oe.new_outcome AS override_outcome,
  oe.reason AS override_reason,
  oe.actor_name AS override_by
FROM decision_events de
LEFT JOIN override_events oe ON de.event_id = oe.original_event_id
WHERE de.event_type = 'decision_made'
ORDER BY de.timestamp DESC;

-- ============================================================================
-- SAMPLE DATA (for testing)
-- ============================================================================

-- Insert sample tenant
-- INSERT INTO policy_versions (tenant_id, policy_name, version, content)
-- VALUES (
--   'demo-tenant',
--   'invoice_approval_policy',
--   'v1.0',
--   '{"threshold": 10000, "require_review_above": 50000}'::jsonb
-- );
