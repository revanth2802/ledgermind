# LedgerMind Examples

Demonstrations of LedgerMind integration across **multiple industries**.

> "AI decides. LedgerMind remembers why."

## 🚀 Quick Start

```bash
# Start the API server
cd ../services/api && npm run dev

# Run all industry examples
npm run industries
```

## 📚 Examples

### 1. Multi-Industry Showcase (`industry-examples.ts`) ⭐

Demonstrates LedgerMind across **6 different industries**:

| Industry | Workflow | Key Compliance |
|----------|----------|----------------|
| 🛒 E-commerce | Refund Processing | Customer satisfaction |
| 🏥 Healthcare | Prior Authorization | HIPAA audit trails |
| 👥 HR | Resume Screening | EEOC bias compliance |
| 🔒 Security | Access Requests | SOC2 audit logging |
| 🚚 Logistics | Route Optimization | Cost tracking |
| 🎫 Support | Ticket Escalation | SLA compliance |

**Run:**
```bash
npm run industries
```

### 2. Invoice Approval (`invoice-approval.ts`)

Simple single-agent workflow showing:
- Basic LedgerMind integration
- Precedent-based confidence adjustment
- Human override capture

**Run:**
```bash
npm run invoice
```

### 3. Multi-Agent Workflow (`multi-agent-workflow.ts`)

Complex workflow with multiple agents:
- Transaction classifier
- Risk assessor  
- Final approver
- Shared decision memory across agents

**Run:**
```bash
npm run multi-agent
```

## 🏭 Supported Industries

LedgerMind works for **ANY workflow** where AI makes decisions:

### Already Implemented
- 🛒 **E-commerce**: Refunds, pricing, recommendations
- 🏥 **Healthcare**: Prior auth, triage, claims processing
- 👥 **HR**: Resume screening, compensation, performance reviews
- 🔒 **Security**: Access control, threat detection, compliance
- 🚚 **Logistics**: Route optimization, inventory, demand forecasting
- 🎫 **Support**: Ticket routing, escalation, resolution

### Coming Soon
- 🏦 **Finance**: Loan decisions, fraud detection, AML
- 🏭 **Manufacturing**: QC inspection, predictive maintenance
- 📊 **Insurance**: Claims processing, underwriting
- ⚖️ **Legal**: Contract review, compliance checking

## 🔧 Prerequisites

1. **Start LedgerMind API:**
```bash
cd ../services/api
npm run dev
```

2. **Set environment variables:**
```bash
export LEDGERMIND_API_URL=http://localhost:3000/api
export LEDGERMIND_API_KEY=your-api-key
```

3. **Set up database:**
```bash
cd ../packages/db
psql -U postgres -d ledgermind -f schema-simple.sql
```

## 📋 What Each Example Demonstrates

Every example shows:

1. **Decision Capture** - All agent steps logged immutably
2. **Reasoning Transparency** - Human-readable explanations
3. **Confidence Tracking** - Numerical certainty scores
4. **Outcome Recording** - approved/denied/escalated
5. **Trace Timeline** - Full workflow DAG for audit

## 🔍 After Running Examples

View your decision history:

```bash
# List all traces
curl http://localhost:3000/api/traces

# Get specific trace timeline
curl http://localhost:3000/api/traces/{trace_id}

# Query similar decisions (precedent search)
curl -X POST http://localhost:3000/api/similarity/query \
  -H "Content-Type: application/json" \
  -d '{"input_context": {"amount": 500}, "workflow_name": "refund_processing"}'
```

## 🔌 Custom Integration

### Wrap Any Agent

```typescript
import { wrapAgent, LedgerMindClient } from '@ledgermind/sdk';

const myAgent = {
  name: 'MyAgent',
  async execute(input: any) {
    // Your logic
    return { output: 'result', confidence: 0.9 };
  }
};

const client = new LedgerMindClient({
  apiUrl: 'http://localhost:3000/api',
  apiKey: 'your-key',
  tenantId: 'your-tenant'
});

const memoryAgent = wrapAgent(myAgent, client);
const result = await memoryAgent.execute(input, traceId);
```

### Direct Logging

```typescript
// Log a decision directly
await client.logDecision(traceId, stepId, 'MyAgent', {
  input: { order_id: '123' },
  output: { decision: 'approve' },
  reasoning: 'Customer is high-value with low return rate',
  confidence: 0.92,
  outcome: 'approved'
});
```

### Works With Any Framework

- LangGraph nodes
- CrewAI agents
- AutoGen agents
- Custom orchestrators
- Any `async execute()` function

## 📊 Sample Output

```
═══════════════════════════════════════════════════════════════════════
  🧠 LEDGERMIND - Multi-Industry Decision Memory Examples
═══════════════════════════════════════════════════════════════════════

🛒 E-COMMERCE: Refund Request Processing

   ✅ ClassifierAgent: legitimate_complaint (87% confidence)
   ✅ CustomerValueAgent: high_value customer (95% confidence)
   ✅ PolicyAgent: auto_approve (91% confidence)

   📋 Trace ID: trace_1737012345_abc123
   💰 Result: Full refund approved, no return required

🏥 HEALTHCARE: Prior Authorization

   ✅ ClinicalAgent: medically_necessary (92% confidence)
   ✅ GuidelineAgent: meets_criteria (88% confidence)
   ✅ CostAgent: covered (95% confidence)

   📋 Trace ID: trace_1737012346_def456
   ✅ Result: Prior authorization APPROVED
   🔒 HIPAA Audit Trail: Complete

...
```
