# LedgerMind

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue.svg)](https://www.postgresql.org/)

**Decision Intelligence for AI Systems**

> "AI decides. LedgerMind captures, analyzes, and learns why."

---

## 🧠 What is LedgerMind?

LedgerMind is an **open-source decision intelligence platform** that captures, analyzes, and provides insights into AI decisions. It enables AI products to:

- **Capture every decision** — Log inputs, outputs, reasoning, and confidence with full context
- **Track human overrides** — Record when and why humans correct AI decisions
- **Analyze patterns** — Understand decision trends, override rates, and performance over time
- **Search by meaning** — Find similar past decisions using semantic search
- **Full audit trail** — Complete timeline for compliance and debugging

**Not another observability tool.** LedgerMind captures *decisions as structured records* — the what, why, and outcome of every AI judgment, not just logs of what happened.

---

## 🎯 Why LedgerMind?

| Without LedgerMind | With LedgerMind |
|--------------------|-----------------|
| Decisions happen in a black box | Every decision captured with context |
| Human overrides lost in tickets | Override tracking with reasoning |
| "Why did the AI do this?" → Nobody knows | Complete decision audit trail |
| No visibility into AI performance | Analytics dashboard with trends |
| Similar cases decided inconsistently | Semantic search finds precedents |
| Debugging is guesswork | Full reasoning transparency |

---

## ⏰ Why Now?

AI is scaling faster than trust.

- **Problem:** Companies are deploying AI in critical workflows (approvals, fraud, claims, pricing)
- **Gap:** When auditors ask "why did the AI decide this?" — nobody can answer
- **Reality:** Logs exist, but *reasoning* and *analysis* are missing

LedgerMind fills the gap between "AI that executes" and "decisions you can understand."

---

## 🏭 Works for ANY Industry

| Industry | Example Workflows |
|----------|------------------|
| 🛒 **E-commerce** | Refund processing, pricing decisions, recommendations |
| 🏥 **Healthcare** | Prior authorization, triage routing, claims processing |
| 👥 **HR & Recruiting** | Resume screening, compensation, performance reviews |
| 🔒 **Security** | Access control, threat detection, compliance checks |
| 🚚 **Logistics** | Route optimization, inventory allocation, demand forecasting |
| 🎫 **Customer Support** | Ticket routing, escalation, auto-response |
| 🏦 **Finance** | Loan decisions, fraud detection, AML compliance |
| 🏭 **Manufacturing** | Quality control, predictive maintenance, safety alerts |

---

## ✨ Core Features

### 1. Decision Capture

Every agent decision is recorded with full context:

```typescript
await client.logDecision(traceId, stepId, 'CreditAgent', {
  input: { loan_amount: 250000, credit_score: 712 },
  output: { decision: 'approved', risk_level: 'moderate' },
  reasoning: 'Credit score 712 exceeds threshold, debt ratio 4.17% is healthy',
  confidence: 0.87,
  outcome: 'approved',
  policyVersionId: 'CREDIT_POLICY_v2.3'
});
```

### 2. Similar Decision Search (AI-Powered)

Before making a decision, ask: **"Have we seen this before?"**

```typescript
const similar = await client.findSimilar({
  context: { loan_amount: 250000, credit_score: 712, industry: 'Software' },
  workflowName: 'loan_approval',
  limit: 10
});

// Returns:
// {
//   similar_cases: 23,
//   approval_rate: 0.78,
//   default_rate: 0.09,
//   human_override_rate: 0.22,
//   recommendation: { action: 'approve', confidence_boost: 0.05 }
// }
```

### 3. Human Override Memory

When humans disagree with AI, capture *why* — creating a learning loop:

```typescript
await client.recordOverride(traceId, {
  originalDecision: 'approved',
  overrideDecision: 'rejected',
  overrideBy: 'risk_manager_sarah',
  reason: 'Customer has undisclosed pending litigation',
  category: 'missing_information'
});
```

Next time a similar case appears, LedgerMind warns:
> ⚠️ "Similar case was rejected. Reason: undisclosed litigation"

### 4. Outcome Tracking

Link decisions to real-world results for continuous learning:

```typescript
await client.recordOutcome(traceId, {
  outcome: 'defaulted',
  outcomeDate: '2026-07-22',
  details: { months_to_default: 6, amount_lost: 187500 }
});
```

### 5. Policy Versioning

Track which rules were active when each decision was made:

```typescript
await client.registerPolicy({
  policyId: 'CREDIT_POLICY',
  version: 'v2.4',
  effectiveDate: '2026-01-15',
  changes: ['Increased min credit score from 650 to 680'],
  rules: { min_credit_score: 680, max_debt_ratio: 0.35 }
});
```

### 6. Audit Timeline

Get the complete decision chain for any workflow:

```typescript
const timeline = await client.getTimeline('trace_abc123');

// Returns full decision chain:
// CreditAgent → RiskAgent → PolicyAgent → Human Decision
// With reasoning, confidence, and policy context at each step
```

---

## 🔌 Works With Any Agent Framework

LedgerMind is **orchestrator-agnostic**. It works with:

- ✅ **LangGraph**
- ✅ **CrewAI**
- ✅ **AutoGen**
- ✅ **Custom orchestrators**
- ✅ Any `async execute()` function

### TypeScript/Node.js

```typescript
import { LedgerMindClient } from '@ledgermind/sdk';

const client = new LedgerMindClient({
  apiUrl: 'http://localhost:3000/api',
  apiKey: 'your-api-key',
  tenantId: 'your-org'
});

// Start a workflow trace
const traceId = await client.startTrace('loan_approval', {
  loan_amount: 250000,
  applicant: 'TechGrowth Solutions'
});

// Log each agent decision
await client.logDecision(traceId, 'step_1', 'CreditAgent', {
  input: { credit_score: 712 },
  output: { rating: 'good' },
  reasoning: 'Score exceeds threshold',
  confidence: 0.87,
  outcome: 'approved'
});

// Check similar past decisions
const similar = await client.findSimilar({
  context: { loan_amount: 250000, credit_score: 712 },
  workflowName: 'loan_approval'
});

// Complete the trace
await client.completeTrace(traceId, {
  finalDecision: 'approved',
  decidedBy: 'loan_officer_mike',
  humanOverride: false
});
```

### Python

```python
from ledgermind import LedgerMindClient

client = LedgerMindClient(
    api_url="http://localhost:3000/api",
    api_key="your-api-key",
    tenant_id="your-org"
)

# Start a workflow trace
trace_id = client.start_trace("loan_approval", {
    "loan_amount": 250000,
    "applicant": "TechGrowth Solutions"
})

# Log each agent decision
client.log_decision(trace_id, "step_1", "CreditAgent", {
    "input": {"credit_score": 712},
    "output": {"rating": "good"},
    "reasoning": "Score exceeds threshold",
    "confidence": 0.87,
    "outcome": "approved"
})

# Check similar past decisions
similar = client.find_similar(
    context={"loan_amount": 250000, "credit_score": 712},
    workflow_name="loan_approval"
)

print(f"Found {similar['similar_cases']} similar cases")
print(f"Historical approval rate: {similar['approval_rate']:.0%}")
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│          Any Agent Orchestrator                                 │
│          (LangGraph, CrewAI, AutoGen, Custom)                   │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           │ SDK (TypeScript / Python)
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    LEDGERMIND CORE                              │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Event     │  │  Similarity │  │  Override   │             │
│  │   Store     │  │   Engine    │  │   Memory    │             │
│  │ (immutable) │  │ (AI-powered)│  │  (learning) │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Trace     │  │   Policy    │  │   Outcome   │             │
│  │   Builder   │  │  Versioning │  │   Tracker   │             │
│  │ (workflow)  │  │  (context)  │  │  (feedback) │             │
│  └─────────────┘  └─────────────┘  └─────────────┘             │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                     DATA LAYER                                  │
│                                                                 │
│     ┌──────────────┐         ┌──────────────┐                  │
│     │  PostgreSQL  │         │   pgvector   │                  │
│     │  (decisions) │         │ (embeddings) │                  │
│     └──────────────┘         └──────────────┘                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Composability & Enterprise Integration

LedgerMind is designed to be **composable** — you can use it with or without our SDK, bring your own embedding provider, and import historical data.

### Pluggable Embedding Providers

Choose your embedding provider based on your needs:

```bash
# Environment variables
EMBEDDING_PROVIDER=openai|cohere|custom|none
EMBEDDING_ENDPOINT=https://your-model.example.com/embed  # for custom
COHERE_API_KEY=your-cohere-key  # for cohere
OPENAI_API_KEY=your-openai-key  # for openai
```

**Available Providers:**

| Provider | Use Case | Notes |
|----------|----------|-------|
| `openai` | Production (default) | Uses `text-embedding-ada-002` |
| `cohere` | Alternative AI | Uses `embed-english-v3.0` |
| `custom` | Self-hosted / specialized | Any HTTP endpoint that returns vectors |
| `none` | Testing / no AI | Returns zero vectors |

**Custom Provider Example:**

```typescript
// Configure a custom embedding endpoint
const config = {
  provider: 'custom',
  endpoint: 'https://your-ml-service.com/embed',
  headers: { 'Authorization': 'Bearer your-token' }
};

// Your endpoint should accept: POST { text: "string" }
// And return: { embedding: [0.1, 0.2, ...] }
```

### Batch Import Historical Decisions

Import decisions from external systems:

```bash
# Batch import via REST API
curl -X POST http://localhost:3000/api/decisions/batch \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: your-org" \
  -d '{
    "decisions": [
      {
        "agent_name": "CreditAgent",
        "input": {"loan_amount": 50000, "credit_score": 720},
        "output": {"decision": "approved"},
        "reasoning": "Good credit score",
        "outcome": "approved",
        "confidence": 0.9,
        "workflow_name": "loan_approval"
      }
    ],
    "generate_embeddings": true
  }'
```

**Or provide pre-computed embeddings:**

```json
{
  "decisions": [{
    "agent_name": "YourAgent",
    "input": {...},
    "output": {...},
    "embedding": [0.1, 0.2, 0.3, ...]  // Your own vectors
  }],
  "generate_embeddings": false
}
```

### REST API Without SDK

Use LedgerMind as a pure REST service:

```bash
# Log a decision
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: your-org" \
  -d '{
    "event_type": "decision_made",
    "actor_type": "agent",
    "actor_name": "YourAgent",
    "input_summary": {"key": "value"},
    "output_summary": {"decision": "approved"},
    "reasoning": "Because...",
    "confidence": 0.85
  }'

# Find similar decisions
curl -X POST http://localhost:3000/api/ai/similar \
  -H "Content-Type: application/json" \
  -H "X-Tenant-Id: your-org" \
  -d '{"query": "loan approval for tech company", "limit": 10}'

# Check system status
curl http://localhost:3000/api/status
# Returns: {"embedding_provider": "openai", "database": "connected", ...}
```

---

## 📊 What Gets Captured

Every decision is stored with:

| Field | Description | Example |
|-------|-------------|---------|
| `workflow_id` | Links all decisions in a workflow | `loan_78432` |
| `step_id` | Identifies this step | `credit_check` |
| `agent_name` | Which agent decided | `CreditAgent` |
| `input_summary` | What the agent received | `{credit_score: 712}` |
| `output_summary` | What the agent decided | `{rating: "good"}` |
| `reasoning` | Human-readable explanation | `"Score exceeds threshold"` |
| `confidence` | Numerical certainty (0-1) | `0.87` |
| `outcome` | Result category | `approved` |
| `policy_version_id` | Which rules were in effect | `CREDIT_v2.3` |
| `embedding` | Vector for similarity search | `[0.023, -0.041, ...]` |
| `timestamp` | When it happened | `2026-01-14T09:15:23Z` |

---

## 📁 Repository Structure

```
ledgermind/
├── packages/
│   ├── sdk/               # Client SDK (TypeScript)
│   ├── types/             # Shared TypeScript types
│   └── db/                # Database schema & migrations
├── services/
│   └── api/               # Core REST API
├── examples/
│   ├── industry-examples.ts    # Multi-industry demos
│   ├── invoice-approval.ts     # Simple single-agent
│   └── multi-agent-workflow.ts # Complex multi-agent
├── scripts/
│   └── test-ai-features.ts     # AI components test
└── docker-compose.yml     # Local development setup
```

---

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone the repo
git clone https://github.com/yourusername/ledgermind.git
cd ledgermind

# Start everything with Docker
docker-compose up -d

# API is now running at http://localhost:3000
```

### Option 2: Manual Setup

```bash
# Clone and install
git clone https://github.com/yourusername/ledgermind.git
cd ledgermind
npm install

# Set up PostgreSQL
createdb ledgermind
psql -d ledgermind -f packages/db/schema-simple.sql

# Configure environment
cp services/api/.env.example services/api/.env
# Edit .env with your database credentials and OpenAI key

# Build packages
npm run build

# Start API server
cd services/api
npm run dev

# Run examples (in another terminal)
cd examples
npm run industries
```

### Option 3: CLI (Interactive)

```bash
# Build and link the CLI
cd packages/cli
npm run build
npm link

# Initialize
ledgermind init

# Check status
ledgermind status

# View traces
ledgermind traces list

# Create policies interactively
ledgermind policies create

# Find similar decisions
ledgermind similar "approve refund request"

# Open dashboard
ledgermind dashboard
```

---

## 💻 CLI Reference

LedgerMind includes an interactive CLI for managing decision memory:

```bash
# Configuration
ledgermind init              # Configure API URL, API key, tenant
ledgermind status            # Check API connection & stats
ledgermind quickstart        # Show getting started guide

# Traces
ledgermind traces list       # List recent decision traces
ledgermind traces view <id>  # View trace details with events
ledgermind traces search <q> # Search traces by content

# Policies
ledgermind policies list     # List all policies
ledgermind policies create   # Create policy (interactive)
ledgermind policies toggle   # Toggle policy active/inactive

# Overrides
ledgermind overrides list    # List human overrides
ledgermind overrides record  # Record new override (interactive)

# AI Features
ledgermind similar <query>   # Find similar past decisions
ledgermind explain <traceId> # Get AI explanation

# Dashboard
ledgermind dashboard         # Open web dashboard in browser
```

---

## 🔍 API Reference

### Start a Trace

```bash
curl -X POST http://localhost:3000/api/traces \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -H "X-Tenant-ID: your-tenant" \
  -d '{
    "trace_id": "trace_loan_78432",
    "workflow_name": "loan_approval",
    "metadata": {"loan_amount": 250000, "applicant": "TechGrowth"}
  }'
```

### Log a Decision

```bash
curl -X POST http://localhost:3000/api/events \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -H "X-Tenant-ID: your-tenant" \
  -d '{
    "trace_id": "trace_loan_78432",
    "step_id": "step_credit_check",
    "actor_name": "CreditAgent",
    "actor_type": "agent",
    "event_type": "decision_made",
    "input_summary": {"credit_score": 712},
    "output_summary": {"rating": "good"},
    "reasoning": "Score exceeds threshold",
    "confidence": 0.87,
    "outcome": "approved"
  }'
```

### Find Similar Decisions

```bash
curl -X POST http://localhost:3000/api/similarity/query \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -H "X-Tenant-ID: your-tenant" \
  -d '{
    "input_context": {"loan_amount": 250000, "credit_score": 712},
    "workflow_name": "loan_approval",
    "limit": 10
  }'
```

### Get Decision Timeline

```bash
curl http://localhost:3000/api/traces/trace_loan_78432 \
  -H "Authorization: Bearer your-api-key" \
  -H "X-Tenant-ID: your-tenant"
```

### Record Human Override

```bash
curl -X POST http://localhost:3000/api/overrides \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -H "X-Tenant-ID: your-tenant" \
  -d '{
    "trace_id": "trace_loan_78432",
    "original_event_id": "event_uuid",
    "actor_name": "risk_manager_sarah",
    "original_outcome": "approved",
    "new_outcome": "rejected",
    "reason": "Undisclosed pending litigation"
  }'
```

---

## 🧠 How Similarity Search Works

LedgerMind uses **AI-powered semantic similarity** to find related past decisions:

1. **Decision arrives** → Context is extracted
2. **Embedding generated** → OpenAI model converts context to vector
3. **Vector stored** → Saved in PostgreSQL (pgvector or JSONB)
4. **Query similar** → Cosine similarity finds related decisions
5. **Results returned** → Historical patterns, outcomes, override rates

This enables:
- Finding similar cases even with different wording
- Learning from past outcomes
- Surfacing relevant human overrides
- Confidence calibration based on history

---

## 🧪 AI Features (Verified Working)

All 5 AI components have been tested and verified:

| Component | Status | Description |
|-----------|--------|-------------|
| **Embedding Generation** | ✅ Pass | OpenAI text-embedding-3-small (1536 dims) |
| **Similarity Search** | ✅ Pass | Cosine similarity on decision vectors |
| **Reasoning Summarization** | ✅ Pass | GPT-4o-mini summarizes decision chains |
| **Pattern Detection** | ✅ Pass | Detects override rates, confidence drift |
| **Recommendation Engine** | ✅ Pass | Suggests actions based on similar cases |

Run the test yourself:
```bash
cd scripts
npx tsx test-ai-features.ts
```

---

## 📚 Documentation

- [Development Guide](./DEVELOPMENT.md)
- [SDK Guide](./packages/sdk/README.md)
- [Examples](./examples/README.md)

---

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./CONTRIBUTING.md) for details.

```bash
# Run tests
npm test

# Run linter
npm run lint

# Build all packages
npm run build
```

---

## 📄 License

MIT License — see [LICENSE](./LICENSE) for details.

---

## 🙋 FAQ

<details>
<summary><b>How is LedgerMind different from LangSmith, Langfuse, or Helicone?</b></summary>

Those are **LLM observability** tools — they trace token usage, latency, and prompt/completion pairs. LedgerMind is a **decision intelligence** platform. It captures structured decision records (input context, outcome, reasoning, confidence) and lets you search by meaning, track overrides, and analyze patterns. Think of it this way: observability tells you *what your LLM did*, LedgerMind tells you *what your AI decided and why*.

</details>

<details>
<summary><b>Does this replace my AI framework (LangChain, CrewAI, etc.)?</b></summary>

No. LedgerMind works **alongside** any AI framework, product, or custom system. It's a layer that captures decisions — it doesn't make them. Your AI keeps doing its job, LedgerMind provides the visibility, audit trail, and analytics around it.

</details>

<details>
<summary><b>What does "decision intelligence" mean in practice?</b></summary>

It means you can answer questions like:
- "How many refund decisions did our AI make last month, and what was the override rate?"
- "Show me all decisions similar to this one — what happened in those cases?"
- "Which AI actor has the highest override rate, and why?"
- "Are we compliant? Generate an audit report."

These answers come from captured decision data + semantic search + AI-powered analysis.

</details>

<details>
<summary><b>What database do I need?</b></summary>

PostgreSQL 15+ is required. The `pgvector` extension is recommended for semantic search but not strictly required — the system falls back to JSONB-based storage without it. For production, pgvector is strongly recommended.

</details>

<details>
<summary><b>What AI provider do I need?</b></summary>

By default, OpenAI is used for embeddings (semantic search) and AI features (patterns, audit, ask). But the embedding provider is **pluggable** — you can switch to Cohere, a custom HTTP endpoint, or disable embeddings entirely for testing. Set `EMBEDDING_PROVIDER` in your `.env` file.

</details>

<details>
<summary><b>Can I use this without any AI provider?</b></summary>

Yes. Set `EMBEDDING_PROVIDER=none` to disable embeddings. You'll still get full decision capture, override tracking, analytics, and the audit trail. Semantic search won't be available, but keyword-based querying still works.

</details>

<details>
<summary><b>Can I self-host this?</b></summary>

Absolutely. LedgerMind is 100% open source (MIT license) and designed for self-hosting. Run it with Docker Compose or deploy each service independently. No external SaaS dependency required.

</details>

<details>
<summary><b>How does semantic search work?</b></summary>

When a decision is recorded, LedgerMind generates a vector embedding of the input context + output + reasoning. These embeddings are stored in PostgreSQL via pgvector. When you search for similar decisions, your query is embedded and compared using cosine similarity. This means "damaged product return" will match "broken item refund" even though they share no keywords.

</details>

<details>
<summary><b>Is this just a logging tool?</b></summary>

No. Logging tools capture raw events. LedgerMind captures **structured decisions** with context, reasoning, confidence, and outcomes. On top of that, it provides:
- Semantic similarity search (find precedents by meaning)
- Override tracking (who corrected what, and why)
- AI-powered analytics (patterns, audit reports, anomaly detection)
- A full CLI and dashboard for exploration

It's the difference between a log file and a decision intelligence platform.

</details>

<details>
<summary><b>What scale can it handle?</b></summary>

LedgerMind is built on PostgreSQL, which handles millions of rows comfortably. The schema supports partitioning by tenant and time range for larger deployments. For enterprise scale, you can shard by tenant ID and use connection pooling (PgBouncer).

</details>

---

<p align="center">
  <b>AI decides. LedgerMind captures, analyzes, and learns why.</b>
</p>
