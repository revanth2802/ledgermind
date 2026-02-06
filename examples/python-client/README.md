# LedgerMind Python Client Example

This folder contains a ready-to-use Python client for integrating any AI system with LedgerMind.

## Quick Start

```bash
# Just copy ledgermind.py to your project
cp ledgermind.py /your/project/

# Install dependency
pip install requests
```

## Usage

### Basic Decision Logging

```python
from ledgermind import LedgerMindClient

client = LedgerMindClient(
    api_key="your-api-key",
    base_url="https://api.ledgermind.io",  # or localhost:3000 for dev
    tenant_id="your-tenant-id"
)

# Start a trace
trace_id = client.start_trace("fraud_detection")

# Log a decision
client.log_decision(
    trace_id=trace_id,
    agent_name="FraudAgent",
    outcome="approved",
    confidence=0.95,
    reasoning="Low risk transaction"
)

# Complete the trace
client.end_trace(trace_id, "approved")
```

### Using the Decorator (Easiest!)

```python
from ledgermind import LedgerMindClient, track_decision

client = LedgerMindClient(api_key="your-key")

@track_decision(client, "MyAgent", "my_workflow")
def my_ai_function(data):
    # Your AI logic
    return {
        "outcome": "approved",
        "confidence": 0.9,
        "reasoning": "Looks good"
    }

# Every call is automatically logged!
result = my_ai_function(input_data)
```

### Find Similar Past Decisions

```python
similar = client.find_similar(
    context="Customer requesting large refund",
    limit=5
)
for case in similar:
    print(f"Similar case: {case['outcome']} ({case['similarity']})")
```

### Get AI Recommendations

```python
rec = client.get_recommendation("High-value loan application from new customer")
print(f"Recommended: {rec['recommendation']}")
print(f"Based on: {rec['similar_cases']}")
```

## Run the Example

```bash
# Make sure LedgerMind API is running
cd /path/to/ledgermind
npm run dev --workspace=@ledgermind/api

# Run the Python example
cd examples/python-client
python ledgermind.py
```

## API Methods

| Method | Description |
|--------|-------------|
| `start_trace(workflow_name)` | Start a new decision trace |
| `end_trace(trace_id, outcome)` | Complete a trace |
| `log_decision(...)` | Log an agent decision |
| `find_similar(context)` | Find similar past decisions |
| `get_recommendation(context)` | Get AI recommendation |
| `detect_patterns()` | Detect decision patterns |
| `generate_audit_report()` | Generate compliance report |
| `ask(question)` | Natural language query |
| `get_policies()` | List active policies |
| `record_override(...)` | Record human correction |

## Requirements

- Python 3.7+
- `requests` library
