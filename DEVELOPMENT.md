# LedgerMind Development Guide

## Project Setup

### Prerequisites

- Node.js 20+
- PostgreSQL 15+ with pgvector extension
- OpenAI API key (for embeddings)

### Installation

```bash
# Install dependencies
npm install

# Set up database
psql -U postgres -c "CREATE DATABASE ledgermind;"
psql -U postgres -d ledgermind -f packages/db/schema.sql

# Configure environment
cp services/api/.env.example services/api/.env
# Edit .env with your configuration
```

### Development

```bash
# Start all services
npm run dev

# Or start individually:
npm run dev --workspace=@ledgermind/api
npm run dev --workspace=@ledgermind/sdk
```

## Architecture

### Packages

- **`@ledgermind/types`** - Shared TypeScript types
- **`@ledgermind/sdk`** - Client library for agent integration
- **`@ledgermind/db`** - Database schema and repositories

### Services

- **`api`** - REST API (Express + PostgreSQL + OpenAI)
- **`ui`** - Web dashboard (Next.js) [TODO]

### Key Concepts

#### 1. Decision Events (Immutable Log)

Every agent action creates an append-only event:

```typescript
{
  event_id: "uuid",
  trace_id: "workflow-id",
  step_id: "agent-step-id",
  actor_name: "InvoiceApprover",
  event_type: "decision_made",
  input_summary: { amount: 5000 },
  output_summary: { approved: true },
  reasoning: "Within threshold",
  confidence: 0.95,
  outcome: "approved"
}
```

#### 2. Traces (Workflow DAG)

Groups events into ordered workflows:

```
Trace: invoice_approval_workflow
├─ Step 1: Classification (Agent A)
├─ Step 2: Risk Assessment (Agent B)
└─ Step 3: Approval (Agent C)
```

#### 3. Similarity Search (Precedent Memory)

Vector embeddings enable semantic similarity:

```typescript
// Query: "Should I approve this $5000 invoice?"
const precedents = await client.getSimilarCases({
  input_context: { amount: 5000, vendor: "Acme" },
  limit: 5
});

// Returns: Past similar decisions with outcomes
```

#### 4. Override Learning

Human corrections adjust future confidence:

```typescript
// Agent: 95% confident → approved
// Human: Override → rejected (vendor watchlist)
// Future: Similar cases → confidence reduced
```

## API Reference

### Endpoints

#### `POST /api/traces`
Create workflow trace

```json
{
  "trace_id": "trace_123",
  "workflow_name": "invoice_approval"
}
```

#### `POST /api/events`
Log decision event

```json
{
  "trace_id": "trace_123",
  "step_id": "step_456",
  "actor_name": "InvoiceApprover",
  "event_type": "decision_made",
  "input_summary": { "amount": 5000 },
  "output_summary": { "approved": true },
  "confidence": 0.95,
  "outcome": "approved"
}
```

#### `POST /api/similarity/query`
Find similar decisions

```json
{
  "input_context": { "amount": 5000 },
  "limit": 5,
  "min_similarity": 0.7
}
```

**Response:**
```json
{
  "cases": [...],
  "precedent_alignment_score": 0.85,
  "override_rate": 12.5
}
```

#### `POST /api/overrides`
Log human override

```json
{
  "original_event_id": "event_789",
  "trace_id": "trace_123",
  "actor_name": "Jane Doe",
  "new_outcome": "rejected",
  "reason": "Vendor on watchlist"
}
```

## SDK Usage

### Basic Integration

```typescript
import { LedgerMindClient } from '@ledgermind/sdk';

const client = new LedgerMindClient({
  apiUrl: 'http://localhost:3000/api',
  apiKey: 'your-key',
  tenantId: 'your-tenant'
});

// Create trace
const traceId = client.generateTraceId();
await client.createTrace({ trace_id: traceId, workflow_name: 'approval' });

// Log decision
await client.logDecision(traceId, stepId, 'AgentName', {
  input: { amount: 5000 },
  output: { approved: true },
  confidence: 0.95,
  outcome: 'approved'
});

// Query precedents
const precedents = await client.getSimilarCases({
  tenant_id: 'your-tenant',
  input_context: { amount: 5000 },
  limit: 5
});
```

### Agent Wrapper

```typescript
import { wrapAgent } from '@ledgermind/sdk';

const memoryAgent = wrapAgent(yourAgent, client, {
  enablePrecedentLookup: true,
  confidenceThreshold: 0.7
});

const result = await memoryAgent.execute(input, traceId);
// result.confidence is precedent-adjusted
// result.precedent contains similar cases
```

## Database Schema

### Core Tables

- **`decision_events`** - Immutable event log
- **`trace_views`** - Materialized workflow timelines
- **`decision_vectors`** - pgvector embeddings for similarity
- **`override_events`** - Human correction records
- **`policy_versions`** - Policy context tracking

### Indexes

- Vector similarity: HNSW index on embeddings
- Time-series: Partitioned by tenant + timestamp
- Tenant isolation: All queries filtered by tenant_id

## Testing

```bash
# Run unit tests
npm test

# Run integration tests
npm run test:integration

# Run examples
cd examples
npm run invoice
npm run multi-agent
```

## Deployment

### Docker (Recommended)

```bash
docker-compose up -d
```

### Manual

1. Set up PostgreSQL with pgvector
2. Run migrations: `npm run db:migrate`
3. Build: `npm run build`
4. Start API: `npm start --workspace=@ledgermind/api`

### Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@host:5432/ledgermind
OPENAI_API_KEY=sk-...
API_KEY_SECRET=your-secret
PORT=3000
```

## Contributing

See `CONTRIBUTING.md`

## License

MIT
