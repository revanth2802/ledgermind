-- ============================================================================
-- LedgerMind – Query Optimization Indexes
-- ============================================================================
-- These composite indexes support the filter-first query strategy used by
-- VectorRepository.findSimilar(). They allow Postgres to use a single
-- index scan to satisfy multi-column WHERE clauses instead of intersecting
-- multiple single-column indexes.
--
-- Run this migration against your existing LedgerMind database:
--   psql $DATABASE_URL -f packages/db/schema-indexes.sql
-- ============================================================================

-- Composite: tenant + workflow (most common filter combination)
CREATE INDEX IF NOT EXISTS idx_vectors_tenant_workflow
  ON decision_vectors (tenant_id, workflow_name);

-- Composite: tenant + outcome
CREATE INDEX IF NOT EXISTS idx_vectors_tenant_outcome
  ON decision_vectors (tenant_id, outcome);

-- Composite: tenant + timestamp descending (for recency-biased candidate fetch)
CREATE INDEX IF NOT EXISTS idx_vectors_tenant_timestamp
  ON decision_vectors (tenant_id, timestamp DESC);

-- Composite: tenant + workflow + outcome (three-way filter)
CREATE INDEX IF NOT EXISTS idx_vectors_tenant_workflow_outcome
  ON decision_vectors (tenant_id, workflow_name, outcome);

-- Composite on decision_events for the JOIN path
CREATE INDEX IF NOT EXISTS idx_events_tenant_trace_timestamp
  ON decision_events (tenant_id, trace_id, timestamp DESC);

-- Composite on override_events for the LEFT JOIN
CREATE INDEX IF NOT EXISTS idx_overrides_original_event
  ON override_events (original_event_id);

-- ============================================================================
-- EXPLAIN Analysis Notes (for documentation)
-- ============================================================================
-- With these indexes, a typical findSimilar query should show:
--
--   Index Scan using idx_vectors_tenant_workflow on decision_vectors dv
--     Index Cond: (tenant_id = 'tenant_123' AND workflow_name = 'loan_approval')
--   → Nested Loop
--     → Index Scan using decision_events_pkey on decision_events de
--         Index Cond: (event_id = dv.event_id)
--   → Nested Loop Left Join
--     → Index Scan using idx_overrides_original_event on override_events oe
--         Index Cond: (original_event_id = de.event_id)
--
-- Without composite indexes, Postgres may fall back to:
--   Seq Scan on decision_vectors (costly for large tables)
--   or
--   Bitmap Index Scan intersecting multiple single-column indexes (slower)
-- ============================================================================
