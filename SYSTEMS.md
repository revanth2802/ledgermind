# SYSTEMS.md — LedgerMind Infrastructure & Architecture

> **Version:** 0.2.0 (Infrastructure Maturity Upgrade)
> **Last Updated:** 2026-02-17
> **Status:** Production-conscious prototype — not yet horizontally scaled

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Bottleneck Analysis](#bottleneck-analysis)
3. [Scaling Roadmap](#scaling-roadmap)
4. [Failure Modes & Mitigations](#failure-modes--mitigations)
5. [Observability Plan](#observability-plan)
6. [Query Optimization Strategy](#query-optimization-strategy)
7. [Caching Architecture](#caching-architecture)
8. [Ingestion Pipeline](#ingestion-pipeline)
9. [Hybrid Scoring Design](#hybrid-scoring-design)

---

## Architecture Overview

### System Diagram

```
┌──────────────────────────────────────────────────────────┐
│                     API Layer (Express)                   │
│  ┌─────────┐  ┌──────────────┐  ┌──────────────────────┐ │
│  │  Auth    │  │  Metrics MW  │  │    Error Handler     │ │
│  └─────────┘  └──────────────┘  └──────────────────────┘ │
│                        │                                  │
│  ┌─────────────────────┼──────────────────────────────┐   │
│  │               Route Handlers                        │  │
│  │  /events  /traces  /similarity  /ai/*  /overrides  │  │
│  └─────────────────────┼──────────────────────────────┘   │
└────────────────────────┼──────────────────────────────────┘
                         │
          ┌──────────────┼──────────────┐
          │              │              │
          ▼              ▼              ▼
   ┌────────────┐ ┌────────────┐ ┌────────────┐
   │  Ingestion │ │  Scoring   │ │   Cache    │
   │   Queue    │ │  (Hybrid)  │ │   (LRU)   │
   └─────┬──────┘ └────────────┘ └────────────┘
         │
         ▼
   ┌────────────┐     ┌─────────────────────────────────┐
   │ Embedding  │────▶│       PostgreSQL + pgvector      │
   │  Service   │     │  ┌───────────┐ ┌──────────────┐  │
   │ (OpenAI/   │     │  │  Events   │ │   Vectors    │  │
   │  Cohere)   │     │  │  (JSONB)  │ │  (1536-dim)  │  │
   └────────────┘     │  └───────────┘ └──────────────┘  │
                      │  ┌───────────┐ ┌──────────────┐  │
                      │  │ Overrides │ │   Policies   │  │
                      │  └───────────┘ └──────────────┘  │
                      └─────────────────────────────────┘
```

### A. API Layer

- **Runtime:** Node.js (Express 4.x)
- **Auth:** Bearer token + X-Tenant-ID header middleware
- **Concurrency:** Single-process, async I/O via event loop
- **Serialization:** JSON (request/response)
- All routes are tenant-scoped; no cross-tenant data leakage

### B. Ingestion Path

**Synchronous path (original):**
```
POST /api/events → validate → insert event row → embed (API call) → store vector → respond
```
Latency: ~200-500ms (dominated by embedding API call)

**Async path (upgraded):**
```
POST /api/events → validate → insert event row → enqueue embedding job → respond 202
                                                            │
  Background worker pool ◄──────────────────────────────────┘
       │
       ▼
  embed → store vector → mark processed
  (retry w/ exponential backoff on failure)
```
Latency: ~10-30ms for API response; embedding happens asynchronously

### C. Storage Design

| Table | Purpose | Key Indexes |
|-------|---------|-------------|
| `decision_events` | Append-only audit ledger | tenant_id, trace_id, timestamp DESC |
| `decision_vectors` | Embedding storage for similarity search | tenant+workflow composite, HNSW on embedding |
| `trace_views` | Materialized trace summaries | tenant_id, workflow_name |
| `override_events` | Human correction records | original_event_id, tenant_id |
| `policy_versions` | Policy version tracking | tenant_id, policy_name |
| `decision_drift_metrics` | Pre-computed analytics | tenant+workflow, time window |

**Storage format:**
- Embeddings: `vector(1536)` via pgvector extension (with JSON fallback)
- Metadata: JSONB columns for flexible schema evolution
- Timestamps: `TIMESTAMPTZ` for timezone-safe ordering

### D. Retrieval Path

```
Query → [Cache Check] → Embed query text → [Metadata Pre-filter] → Candidate Fetch
                                                                         │
                           ┌─────────────────────────────────────────────┘
                           ▼
                   Cosine Similarity (app-side on reduced set)
                           │
                           ▼
                   Hybrid Scoring (semantic + metadata + recency)
                           │
                           ▼
                   Top-K Selection → [Cache Store] → Response
```

---

## Bottleneck Analysis

### 1. Embedding Latency (PRIMARY BOTTLENECK)

- **Impact:** 150-400ms per embedding API call (OpenAI)
- **Where:** Ingestion path and query path
- **Why it matters:** Every ingestion and every query requires at least one embedding call
- **Current mitigation:**
  - Async ingestion decouples embedding from API response time
  - Batch embedding for bulk imports (up to 50 texts per API call)
  - Query result caching avoids re-embedding identical queries
- **Future mitigation:**
  - Local embedding model (e.g., sentence-transformers) eliminates API dependency
  - Pre-computed query embeddings for known dashboard queries

### 2. Database I/O

- **Impact:** 5-50ms per query depending on result set size
- **Where:** All read/write operations
- **Why it matters:** Multiple queries per request (events + vectors + overrides)
- **Current mitigation:**
  - Connection pooling (max 20 connections)
  - Composite indexes for filter-first queries
  - Candidate limit (200) prevents full-table scans
- **Future mitigation:**
  - Read replicas for query load distribution
  - Prepared statements for frequently-used queries

### 3. Vector Search Cost

- **Impact:** O(n) cosine similarity in app when pgvector HNSW unavailable
- **Where:** Similarity search endpoints
- **Why it matters:** At 10k+ vectors, in-app cosine becomes noticeable (>10ms)
- **Current mitigation:**
  - Metadata pre-filtering reduces candidate set to ~200
  - Sort by timestamp DESC + LIMIT caps the scan window
- **Future mitigation:**
  - pgvector HNSW index for O(log n) approximate nearest neighbors
  - Candidate set reduction via LSH or product quantization

### 4. Memory Pressure

- **Impact:** LRU cache + ingestion queue + metrics histograms consume RAM
- **Where:** API process heap
- **Estimated footprint:**
  - LRU cache: ~5MB (500 entries × ~10KB average)
  - Ingestion queue: ~10MB peak (10k jobs × ~1KB)
  - Metrics histograms: ~1MB (10k samples × 8 bytes × 5 histograms)
  - Total overhead: ~16MB (acceptable for a 512MB container)
- **Current mitigation:**
  - Bounded LRU with configurable maxSize
  - Bounded ingestion queue with backpressure
  - Ring-buffer histograms with fixed capacity

---

## Scaling Roadmap

### Phase 1: Current (Single Node)
- Single Express process
- Single PostgreSQL instance
- In-memory cache and queue
- Target: <1000 events/day, <100 queries/minute

### Phase 2: Vertical Scaling
- **Move to ANN index (HNSW)**
  - Enable `CREATE INDEX ... USING hnsw (embedding vector_cosine_ops)` on decision_vectors
  - Replace app-side cosine with `ORDER BY embedding <=> $query LIMIT k`
  - Expected improvement: 100x for >10k vectors
- **Connection pooling upgrade** (PgBouncer)
- **Cluster mode** via PM2 or Node.js cluster module
- Target: <10k events/day, <1000 queries/minute

### Phase 3: Horizontal Scaling
- **Sharding by tenant**
  - Partition decision_vectors by tenant_id (Postgres declarative partitioning)
  - Each partition has its own HNSW index
  - Eliminates cross-tenant interference
- **Sharding by time**
  - Range-partition by timestamp for historical queries
  - Drop/archive old partitions without affecting live writes
- **Redis cache** replacing in-memory LRU
  - Shared state across multiple API instances
  - Pub/Sub for cache invalidation
- **BullMQ** replacing in-memory ingestion queue
  - Persistent job storage
  - Dead-letter queue with dashboard
  - Priority lanes
- Target: <100k events/day, <10k queries/minute

### Phase 4: Advanced (Document Only — Do NOT Implement)
- **Hot vs cold storage**
  - Recent vectors (< 90 days) in PostgreSQL with HNSW
  - Archival vectors in object storage (S3/GCS) with batch-queryable format
  - Tiered retrieval: hot first, cold on-demand
- **Object storage for archival**
  - Parquet/Arrow format for decision events
  - Queryable via DuckDB or Athena for compliance audits
- **Query fanout handling**
  - For multi-shard queries, scatter-gather pattern with timeout
  - Merge results from multiple partitions with score normalization
- **Multi-region replication**
  - Active-passive with async replication
  - Region-local reads, cross-region writes
- **Streaming ingestion engine**
  - Kafka/Redpanda for durable event stream
  - Separate embedding workers consuming from topic
  - Exactly-once semantics with idempotent writes

---

## Failure Modes & Mitigations

### 1. Embedding API Outage

| Aspect | Detail |
|--------|--------|
| **Impact** | New events accepted but not embedded; similarity search on new data unavailable |
| **Detection** | Embedding latency timer > 10s; error counter spike |
| **Mitigation** | Async queue with retry (3 attempts, exponential backoff). Events stored in DB immediately regardless of embedding success |
| **Recovery** | Dead-letter queue holds failed jobs; `retryDeadLetter()` replays once API recovers |
| **Worst case** | Extended outage: events accumulate without vectors. Backfill script needed to embed historical events |

### 2. Database Latency Spike

| Aspect | Detail |
|--------|--------|
| **Impact** | All operations degrade (reads and writes) |
| **Detection** | db_query latency P95 > 200ms; connection pool exhaustion |
| **Mitigation** | Connection pool with 5s timeout; circuit breaker on read paths returning stale cache |
| **Recovery** | Automatic once DB recovers; connection pool recycles |
| **Worst case** | Write failures cause data loss for non-queued operations. Queued items retry |

### 3. Cache Corruption / Stale Data

| Aspect | Detail |
|--------|--------|
| **Impact** | Similarity search returns outdated results |
| **Detection** | Cache hit ratio anomaly; user reports of missing recent results |
| **Mitigation** | TTL-based expiry (5 min default); cache invalidation on ingestion write path |
| **Recovery** | `cache.clear()` or restart; automatic after TTL expiry |
| **Worst case** | Stale results served for up to TTL duration. No data loss |

### 4. Queue Overflow (Backpressure)

| Aspect | Detail |
|--------|--------|
| **Impact** | New ingestion submissions rejected with 503 |
| **Detection** | ingestion.queued counter spike; queue depth > 80% of maxSize |
| **Mitigation** | Bounded queue (10k max); backpressure signal to caller; events still stored in DB |
| **Recovery** | Workers drain queue as embedding API processes; scaling workers increases throughput |
| **Worst case** | Sustained 503s during embedding outage. Events are in DB but unembedded |

### 5. Memory Exhaustion (OOM)

| Aspect | Detail |
|--------|--------|
| **Impact** | Process crash, all in-flight operations lost |
| **Detection** | Process memory monitoring; heap usage alerts |
| **Mitigation** | Bounded cache/queue sizes; ring-buffer histograms |
| **Recovery** | Process restart (PM2/systemd); queue jobs lost (move to Redis for durability) |
| **Worst case** | Up to 10k queued embedding jobs lost on OOM crash |

---

## Observability Plan

### What Metrics Matter

| Metric | Type | Why It Matters |
|--------|------|---------------|
| `request_count` | Counter | Traffic volume & growth tracking |
| `request_latency` (P50/P95/P99) | Histogram | User experience & SLA compliance |
| `error_rate` (4xx/5xx) | Counter | Service health |
| `embedding_latency` | Timer | External dependency health |
| `db_query_latency` | Timer | Storage layer performance |
| `ingestion_latency` | Timer | End-to-end ingestion path |
| `retrieval_latency` | Timer | Search path performance |
| `cache_hit_ratio` | Gauge | Cache effectiveness |
| `queue_depth` | Gauge | Backpressure indicator |
| `ingestion_failed` | Counter | Embedding reliability |

### What Alerts Would Trigger

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| High Error Rate | 5xx rate > 5% over 5 min | P1 | Page on-call |
| Embedding Degradation | embedding_latency P95 > 5s | P2 | Check OpenAI status page |
| Queue Backlog | queue_depth > 8000 (80%) | P2 | Scale workers or investigate bottleneck |
| DB Slow | db_query_latency P95 > 500ms | P2 | Check connections, vacuum, indexes |
| Cache Miss Spike | cache_hit_ratio < 0.1 for > 10 min | P3 | Review query patterns, check TTL |
| OOM Risk | heap_used > 80% of limit | P2 | Check for memory leaks, resize container |
| Ingestion Failures | ingestion_failed > 100/hour | P2 | Check embedding API, review dead-letter queue |

### What Dashboards Would Exist

**1. Service Health Dashboard**
- Request rate (RPS)
- Error rate (percentage)
- Latency distribution (P50/P95/P99)
- Active connections
- Uptime

**2. Ingestion Pipeline Dashboard**
- Events ingested per minute
- Queue depth (current)
- Queue throughput (processed/min)
- Dead-letter queue size
- Embedding API latency
- Retry rate

**3. Retrieval Performance Dashboard**
- Queries per minute
- Retrieval latency breakdown (cache vs DB vs embedding)
- Cache hit ratio trend
- Candidate set sizes
- Hybrid score distribution

**4. Business Metrics Dashboard**
- Decisions per agent
- Override rate trend
- Confidence distribution
- Outcome patterns
- Policy adoption rate

---

## Query Optimization Strategy

### Filter-First vs ANN-First

LedgerMind uses a **filter-first** retrieval strategy:

```
1. Apply metadata filters (tenant, workflow, outcome) → reduces to ~N candidates
2. Fetch top-200 by recency from filtered set
3. Compute cosine similarity in application code
4. Apply hybrid scoring (semantic + metadata + recency weights)
5. Return top-K
```

**Why filter-first:**
- Most queries include tenant_id (mandatory) + workflow_name (common)
- These filters are highly selective (typically <1000 vectors per tenant+workflow)
- Metadata filtering in Postgres uses B-tree indexes (microsecond-level)
- ANN-first would require post-filtering, potentially discarding many results

**When to switch to ANN-first:**
- When vector count per tenant exceeds 100k
- When queries rarely include metadata filters
- When pgvector HNSW index is available and tuned

### Index Usage

| Query Pattern | Index Used | Notes |
|---------------|-----------|-------|
| `tenant_id = X` | `idx_vectors_tenant` | Single-column, always used |
| `tenant_id = X AND workflow_name = Y` | `idx_vectors_tenant_workflow` | Composite eliminates index intersection |
| `tenant_id = X AND outcome = Y` | `idx_vectors_tenant_outcome` | For outcome-filtered searches |
| `tenant_id = X AND workflow = Y AND outcome = Z` | `idx_vectors_tenant_workflow_outcome` | Three-way composite |
| `embedding <=> query_vector` | `idx_vectors_embedding` (HNSW) | ANN search (when pgvector available) |

### Candidate Set Reduction

The `candidateLimit` parameter (default 200) is a critical knob:

- **Too low (e.g., 50):** May miss semantically relevant results that are older
- **Too high (e.g., 5000):** Pulls too many rows; cosine computation becomes expensive
- **Sweet spot (100-500):** Captures recent + relevant candidates without overwhelming app-side compute

The ORDER BY timestamp DESC heuristic ensures we always consider the most recent decisions, which aligns with the typical use case of "how have we handled cases like this recently?"

---

## Caching Architecture

### Current Implementation

```
LRU Cache (in-memory)
├── Max size: 500 entries
├── TTL: 5 minutes
├── Key: SHA-256 hash of (tenant_id, query_text, embedding_fingerprint, filters)
├── Value: Full similarity search result set
└── Eviction: Least Recently Used
```

### Cache Lifecycle

```
Query arrives
    │
    ▼
  Hash query params → cache_key
    │
    ├─ HIT (within TTL) → return cached result (0ms vs 200ms+)
    │
    └─ MISS → execute full pipeline
                │
                ▼
          embed query → filter → cosine → score → top-K
                │
                ▼
          store in cache → return result
```

### Invalidation Strategy

- **TTL-based:** Entries expire after 5 minutes automatically
- **Write-through:** Ingestion path invalidates tenant's cache entries
- **Manual:** `POST /api/cache/clear` for operational use

### Tradeoffs Documented

| Concern | Risk | Mitigation |
|---------|------|-----------|
| Stale results | Decisions ingested after cache fill won't appear until TTL expiry | Short TTL (5 min); invalidation on write; operators can force-clear |
| Memory usage | Each entry ~10KB; 500 entries = ~5MB | Bounded by maxSize; LRU eviction prevents growth |
| Cache stampede | Many concurrent cache misses for same key | Acceptable at current scale; add singleflight/coalescing for Phase 3 |
| Cold start | No cache after restart | Acceptable; first queries take full latency; add warming for Phase 3 |

---

## Ingestion Pipeline

### Architecture

```
┌────────────┐     ┌───────────────┐     ┌────────────────┐
│ API Handler │────▶│  Event Repo   │────▶│  PostgreSQL    │
│ POST /events│     │  (sync write) │     │ decision_events│
└──────┬─────┘     └───────────────┘     └────────────────┘
       │
       │ (async)
       ▼
┌──────────────┐     ┌───────────────┐     ┌────────────────┐
│  Ingestion   │────▶│  Embedding    │────▶│  PostgreSQL    │
│  Queue       │     │  Service      │     │ decision_vectors│
│ (in-memory)  │     │  (OpenAI/etc) │     └────────────────┘
└──────────────┘     └───────────────┘
       │
       │ (on failure)
       ▼
┌──────────────┐
│  Dead Letter  │
│  Queue        │
└──────────────┘
```

### Guarantees

| Property | Guarantee | Notes |
|----------|-----------|-------|
| Event durability | Events are always stored synchronously | Even if embedding fails |
| Embedding at-least-once | Retry with exponential backoff (3 attempts) | Idempotency guard prevents duplicate vectors |
| Ordering | Best-effort within queue | Not strictly ordered; acceptable for embedding |
| Backpressure | 503 when queue full (10k jobs) | Caller can retry or buffer |

### Retry Strategy

```
Attempt 1: immediate
Attempt 2: ~1s + jitter  (base × 2^0)
Attempt 3: ~2s + jitter  (base × 2^1)
→ Dead Letter Queue (after 3 failures)
```

Max backoff capped at 30s to prevent unbounded delays.

---

## Hybrid Scoring Design

### Formula

```
final_score = (semantic_weight × vector_score)
            + (metadata_weight × structured_match_score)
            + (recency_weight × time_decay_score)
```

### Default Weights

| Signal | Weight | Rationale |
|--------|--------|-----------|
| Semantic (vector cosine) | 0.60 | Primary signal — captures meaning beyond keywords |
| Metadata (structured match) | 0.25 | Ensures workflow/policy/outcome context matters |
| Recency (time decay) | 0.15 | Recent decisions are more relevant for compliance |

### Signal Computation

**Semantic Score:** Raw cosine similarity from vector comparison (0–1)

**Structured Match Score:** Weighted field matching
- workflow_name match: 0.35
- decision_type match: 0.25
- outcome match: 0.25
- policy_version match: 0.15
- Only query-present fields contribute to denominator (partial queries not penalized)

**Time Decay Score:** Exponential decay with 30-day half-life
- `score = 2^(-age_days / 30)`
- 1 day old → 0.977
- 7 days old → 0.851
- 30 days old → 0.500
- 90 days old → 0.125

### When to Tune Weights

| Scenario | Adjustment |
|----------|-----------|
| Compliance-heavy domain | Increase metadata_weight to 0.35+; policy version match critical |
| Rapidly changing environment | Increase recency_weight to 0.25+; old decisions less relevant |
| Exploratory queries (no filters) | Increase semantic_weight to 0.75+; let meaning drive results |

---

## Appendix: Module Dependency Graph

```
services/api/src/
├── index.ts              ← Express app setup, middleware wiring
├── routes/index.ts       ← All API route handlers
├── middleware/
│   ├── auth.ts           ← Bearer token + tenant extraction
│   └── error.ts          ← Global error handler
├── services/
│   └── embedding.ts      ← Multi-provider embedding abstraction
├── scoring/
│   └── index.ts          ← Hybrid scoring (semantic + metadata + recency)
├── observability/
│   └── index.ts          ← Metrics registry, counters, histograms, middleware
├── cache/
│   └── index.ts          ← LRU cache with TTL, query hashing
└── ingestion/
    └── index.ts          ← Async queue, retry logic, dead-letter

packages/db/src/
├── index.ts              ← Database class, connection pooling
└── repositories/
    ├── events.ts         ← Decision event CRUD
    ├── traces.ts         ← Trace management
    ├── vectors.ts        ← Vector storage + optimized similarity search
    └── overrides.ts      ← Override event tracking

packages/types/src/
└── index.ts              ← Shared TypeScript interfaces

packages/sdk/src/
├── index.ts              ← Public API exports
├── client.ts             ← HTTP client for LedgerMind API
├── ai.ts                 ← AI-powered features (OpenAI)
└── wrapper.ts            ← Agent wrapping with precedent lookup
```
