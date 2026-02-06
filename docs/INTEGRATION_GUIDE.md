# LedgerMind Integration Guide

> How to connect your AI agents to LedgerMind - works with **any language, any framework**.

## Quick Start (5 minutes)

### 1. Get Your API Key

```bash
# Sign up and get credentials
curl -X POST https://api.ledgermind.io/auth/register \
  -d '{"email": "dev@company.com", "company": "Acme Inc"}'

# Response: { "api_key": "lm_live_xxx", "tenant_id": "acme-inc" }
```

### 2. Log Your First Decision

```bash
curl -X POST https://api.ledgermind.io/api/events \
  -H "Authorization: Bearer lm_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "trace_id": "order-12345",
    "actor_name": "FraudDetectionAgent",
    "event_type": "decision_made",
    "outcome": "approved",
    "confidence": 0.94,
    "reasoning": "Low risk score, verified customer",
    "input_summary": {"order_id": "12345", "amount": 150},
    "output_summary": {"risk_score": 0.12, "action": "approve"}
  }'
```

That's it! Your decision is now logged, searchable, and auditable.

---

## Integration Options

### Option 1: REST API (Any Language)

Works with Python, Go, Java, Rust, Ruby, PHP, or any HTTP client.

#### Python Example

```python
import requests
from datetime import datetime

class LedgerMindClient:
    def __init__(self, api_key: str, base_url: str = "https://api.ledgermind.io"):
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
    
    def start_trace(self, workflow_name: str, metadata: dict = None) -> str:
        """Start a new decision trace"""
        response = requests.post(
            f"{self.base_url}/api/traces",
            headers=self.headers,
            json={
                "workflow_name": workflow_name,
                "metadata": metadata or {}
            }
        )
        return response.json()["trace_id"]
    
    def log_decision(
        self,
        trace_id: str,
        agent_name: str,
        outcome: str,
        confidence: float,
        reasoning: str,
        input_data: dict = None,
        output_data: dict = None
    ):
        """Log an AI agent decision"""
        requests.post(
            f"{self.base_url}/api/events",
            headers=self.headers,
            json={
                "trace_id": trace_id,
                "step_id": f"step_{datetime.now().timestamp()}",
                "actor_type": "agent",
                "actor_name": agent_name,
                "event_type": "decision_made",
                "outcome": outcome,
                "confidence": confidence,
                "reasoning": reasoning,
                "input_summary": input_data or {},
                "output_summary": output_data or {}
            }
        )
    
    def find_similar(self, context: str, limit: int = 5) -> list:
        """Find similar past decisions"""
        response = requests.post(
            f"{self.base_url}/api/similarity/query",
            headers=self.headers,
            json={"input_context": context, "limit": limit}
        )
        return response.json()
    
    def end_trace(self, trace_id: str, final_outcome: str):
        """Complete a trace with final outcome"""
        requests.patch(
            f"{self.base_url}/api/traces/{trace_id}",
            headers=self.headers,
            json={"final_outcome": final_outcome}
        )


# Usage in your agent
ledger = LedgerMindClient("lm_live_xxx")

class MyFraudAgent:
    def analyze_transaction(self, transaction):
        # Start trace
        trace_id = ledger.start_trace(
            workflow_name="fraud_detection",
            metadata={"channel": "web", "region": "US"}
        )
        
        # Your AI does its work
        risk_score = self.model.predict(transaction)
        outcome = "approved" if risk_score < 0.3 else "rejected"
        
        # Log to LedgerMind
        ledger.log_decision(
            trace_id=trace_id,
            agent_name="FraudDetectionAgent",
            outcome=outcome,
            confidence=1 - risk_score,
            reasoning=f"Risk score: {risk_score:.2f}",
            input_data={"amount": transaction["amount"]},
            output_data={"risk_score": risk_score}
        )
        
        ledger.end_trace(trace_id, outcome)
        return outcome
```

#### Go Example

```go
package ledgermind

import (
    "bytes"
    "encoding/json"
    "net/http"
    "time"
)

type Client struct {
    BaseURL string
    APIKey  string
}

type Decision struct {
    TraceID    string                 `json:"trace_id"`
    StepID     string                 `json:"step_id"`
    ActorType  string                 `json:"actor_type"`
    ActorName  string                 `json:"actor_name"`
    EventType  string                 `json:"event_type"`
    Outcome    string                 `json:"outcome"`
    Confidence float64                `json:"confidence"`
    Reasoning  string                 `json:"reasoning"`
    Input      map[string]interface{} `json:"input_summary"`
    Output     map[string]interface{} `json:"output_summary"`
}

func NewClient(apiKey string) *Client {
    return &Client{
        BaseURL: "https://api.ledgermind.io",
        APIKey:  apiKey,
    }
}

func (c *Client) LogDecision(d Decision) error {
    d.StepID = fmt.Sprintf("step_%d", time.Now().UnixNano())
    d.ActorType = "agent"
    d.EventType = "decision_made"
    
    body, _ := json.Marshal(d)
    req, _ := http.NewRequest("POST", c.BaseURL+"/api/events", bytes.NewBuffer(body))
    req.Header.Set("Authorization", "Bearer "+c.APIKey)
    req.Header.Set("Content-Type", "application/json")
    
    client := &http.Client{}
    _, err := client.Do(req)
    return err
}

// Usage
func main() {
    lm := ledgermind.NewClient("lm_live_xxx")
    
    lm.LogDecision(ledgermind.Decision{
        TraceID:    "order-12345",
        ActorName:  "PricingAgent",
        Outcome:    "approved",
        Confidence: 0.95,
        Reasoning:  "Dynamic pricing within acceptable range",
    })
}
```

#### Java Example

```java
import java.net.http.*;
import java.net.URI;

public class LedgerMindClient {
    private final String baseUrl;
    private final String apiKey;
    private final HttpClient client;
    
    public LedgerMindClient(String apiKey) {
        this.baseUrl = "https://api.ledgermind.io";
        this.apiKey = apiKey;
        this.client = HttpClient.newHttpClient();
    }
    
    public void logDecision(String traceId, String agentName, 
                           String outcome, double confidence, String reasoning) {
        String json = String.format("""
            {
                "trace_id": "%s",
                "step_id": "step_%d",
                "actor_type": "agent",
                "actor_name": "%s",
                "event_type": "decision_made",
                "outcome": "%s",
                "confidence": %.2f,
                "reasoning": "%s"
            }
            """, traceId, System.currentTimeMillis(), agentName, 
                 outcome, confidence, reasoning);
        
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/api/events"))
            .header("Authorization", "Bearer " + apiKey)
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();
        
        client.sendAsync(request, HttpResponse.BodyHandlers.ofString());
    }
}
```

---

### Option 2: TypeScript/JavaScript SDK

For Node.js agents, use our native SDK for the best experience:

```bash
npm install @ledgermind/sdk
```

```typescript
import { LedgerMind } from '@ledgermind/sdk';

const ledger = new LedgerMind({
  apiKey: 'lm_live_xxx',
  tenantId: 'acme-inc'
});

// Wrap your AI function to auto-log decisions
const analyzeResume = ledger.wrap(
  'ResumeScreeningAgent',
  async (resume: Resume) => {
    const score = await aiModel.evaluate(resume);
    return {
      outcome: score > 0.7 ? 'approved' : 'rejected',
      confidence: score,
      reasoning: `Skills match: ${score * 100}%`
    };
  }
);

// Every call is automatically logged!
const result = await analyzeResume(candidateResume);
```

---

### Option 3: Webhook Integration

For async systems, send events when they happen:

```javascript
// Your existing system sends webhooks to LedgerMind
// Configure in dashboard or via API:

POST /api/webhooks/configure
{
  "source_url": "https://your-system.com/events",
  "events": ["decision.made", "decision.overridden"],
  "transform": {
    "trace_id": "$.transaction_id",
    "actor_name": "$.agent_name",
    "outcome": "$.decision"
  }
}
```

---

## No Frontend Required!

LedgerMind works entirely via **API + CLI**. The dashboard is optional.

### CLI for Operations

```bash
# Install CLI
npm install -g @ledgermind/cli
ledgermind config set-api-key lm_live_xxx

# Daily operations
ledgermind status                    # System health
ledgermind traces list --today       # Today's decisions
ledgermind patterns                  # AI-detected patterns
ledgermind audit --days 30           # Compliance report

# When things go wrong
ledgermind similar "customer complained about loan denial"
ledgermind explain trace_abc123
```

### API for Automation

```bash
# Get recent decisions
curl https://api.ledgermind.io/api/traces?limit=100 \
  -H "Authorization: Bearer $API_KEY"

# Generate audit report
curl https://api.ledgermind.io/api/ai/audit-report?days=30 \
  -H "Authorization: Bearer $API_KEY"

# Find similar cases
curl -X POST https://api.ledgermind.io/api/similarity/query \
  -H "Authorization: Bearer $API_KEY" \
  -d '{"input_context": "high value refund request from new customer"}'
```

---

## Multi-Agent Workflows

For systems with multiple agents working together:

```python
# Start a workflow trace
trace_id = ledger.start_trace("loan_application")

# Agent 1: Document Verification
ledger.log_decision(
    trace_id=trace_id,
    agent_name="DocVerifyAgent",
    outcome="approved",
    confidence=0.98,
    reasoning="All documents verified authentic"
)

# Agent 2: Credit Analysis  
ledger.log_decision(
    trace_id=trace_id,
    agent_name="CreditAgent",
    outcome="approved", 
    confidence=0.85,
    reasoning="Credit score 720, DTI ratio 28%"
)

# Agent 3: Final Decision
ledger.log_decision(
    trace_id=trace_id,
    agent_name="UnderwritingAgent",
    outcome="approved",
    confidence=0.91,
    reasoning="All checks passed, approved for $50,000"
)

# Complete the trace
ledger.end_trace(trace_id, "approved")
```

---

## API Reference

### Core Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/traces` | Start a new decision trace |
| `PATCH` | `/api/traces/:id` | Update/complete a trace |
| `GET` | `/api/traces` | List traces with filtering |
| `POST` | `/api/events` | Log a decision event |
| `GET` | `/api/events` | List events |
| `POST` | `/api/similarity/query` | Find similar past decisions |
| `GET` | `/api/policies` | List active policies |
| `POST` | `/api/overrides` | Record human override |

### AI Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/ai/patterns` | AI-detected decision patterns |
| `GET` | `/api/ai/audit-report` | Generate compliance report |
| `POST` | `/api/ai/recommend` | Get recommendations for a decision |
| `POST` | `/api/ai/parse-query` | Natural language to API query |

---

## Authentication

All requests require an API key:

```bash
Authorization: Bearer lm_live_xxxxxxxxxxxxx
```

For multi-tenant setups, also include:

```bash
x-tenant-id: your-tenant-id
```

---

## Self-Hosted vs Cloud

| Feature | Self-Hosted | Cloud |
|---------|-------------|-------|
| Data Location | Your servers | LedgerMind cloud |
| Setup | Docker Compose | Instant |
| Maintenance | You manage | We manage |
| Compliance | Full control | SOC2, HIPAA ready |

### Self-Hosted Quick Start

```bash
git clone https://github.com/ledgermind/ledgermind
cd ledgermind
docker-compose up -d
# API available at http://localhost:3000
```

---

## Support

- 📧 Email: support@ledgermind.io
- 💬 Discord: discord.gg/ledgermind
- 📚 Docs: docs.ledgermind.io
