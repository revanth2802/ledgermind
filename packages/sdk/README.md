# @ledgermind/sdk

**Client SDK for LedgerMind decision memory**

## Installation

```bash
npm install @ledgermind/sdk
```

## Quick Start

```typescript
import { LedgerMindClient, wrapAgent } from '@ledgermind/sdk';

// Initialize client
const client = new LedgerMindClient({
  apiUrl: 'https://api.ledgermind.io',
  apiKey: process.env.LEDGERMIND_API_KEY,
  tenantId: 'your-tenant-id',
});

// Wrap any agent to add memory
const myAgent = {
  name: 'InvoiceApprover',
  async execute(input: any) {
    // Your agent logic
    return {
      approved: input.amount < 10000,
      confidence: 0.9,
      reasoning: 'Amount within threshold',
    };
  },
};

const memoryAgent = wrapAgent(myAgent, client, {
  enablePrecedentLookup: true,
  confidenceThreshold: 0.7,
});

// Execute with precedent context
const traceId = client.generateTraceId();
const result = await memoryAgent.execute({ amount: 5000 }, traceId);

console.log(result.confidence); // Adjusted by precedent
console.log(result.precedent?.similar_cases); // Past decisions
```

## Core Methods

### Trace Management

```typescript
// Create workflow trace
const trace = await client.createTrace({
  trace_id: 'trace_123',
  workflow_name: 'invoice_approval',
});

// Get trace timeline
const timeline = await client.getTrace('trace_123');
```

### Event Logging

```typescript
// Log decision
await client.logDecision(traceId, stepId, 'AgentName', {
  input: { amount: 5000 },
  output: { approved: true },
  reasoning: 'Within policy limits',
  confidence: 0.95,
  outcome: 'approved',
});

// Log override
await client.logOverride({
  original_event_id: 'event_123',
  trace_id: traceId,
  actor_name: 'Jane Doe',
  new_outcome: 'rejected',
  reason: 'Vendor on watchlist',
});
```

### Precedent Search

```typescript
// Query similar decisions
const precedents = await client.getSimilarCases({
  tenant_id: 'your-tenant-id',
  input_context: { amount: 5000, vendor: 'Acme Corp' },
  decision_type: 'invoice_approval',
  limit: 5,
});

console.log(precedents.override_rate); // 15%
console.log(precedents.precedent_alignment_score); // 0.92
```

## Agent Wrapper

The `wrapAgent` function adds precedent-aware execution:

```typescript
const wrapped = wrapAgent(agent, client, {
  enablePrecedentLookup: true,  // Query past decisions
  confidenceThreshold: 0.7,      // Escalate below this
  autoLogStart: true,            // Auto-log step start
  autoLogResult: true,           // Auto-log step result
});
```

**Result includes:**

- `output`: Original agent output
- `confidence`: Precedent-adjusted confidence
- `precedent.similar_cases`: Matched historical decisions
- `precedent.should_escalate`: Whether to flag for review

## Orchestrator-Agnostic

Works with any agent framework:

- **LangGraph**: Wrap nodes
- **CrewAI**: Wrap crew members
- **Custom**: Wrap any `async execute(input)` function

## License

MIT
