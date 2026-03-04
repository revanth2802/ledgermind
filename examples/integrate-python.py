"""
LedgerMind Integration Example — Python

This shows how to wrap ANY AI system with LedgerMind
to capture decisions, track overrides, and query history.

Usage:
    1. Start LedgerMind: docker-compose up -d
    2. Replace your_ai_function() with your actual AI logic
    3. Run: python integrate-python.py

Requirements:
    pip install requests
"""

import os
import time
import random
import requests

LEDGERMIND_URL = os.getenv("LEDGERMIND_URL", "http://localhost:3000")
API_KEY = os.getenv("LEDGERMIND_API_KEY", "my-api-key")
TENANT_ID = os.getenv("LEDGERMIND_TENANT", "my-tenant")

HEADERS = {
    "Content-Type": "application/json",
    "Authorization": f"Bearer {API_KEY}",
    "X-Tenant-ID": TENANT_ID,
}


def lm(method, path, body=None):
    """Call the LedgerMind API."""
    url = f"{LEDGERMIND_URL}/api{path}"
    resp = requests.request(method, url, json=body, headers=HEADERS)
    return resp.json()


# ─── Step 1: Your AI function (replace this) ────────────────────
def your_ai_function(input_data: dict) -> dict:
    """
    Replace this with your actual AI logic:
      - LLM call (OpenAI, Anthropic, etc.)
      - ML model inference
      - Rule engine evaluation
      - Multi-agent workflow step
    """
    score = random.random()
    return {
        "decision": "approved" if score > 0.5 else "rejected",
        "confidence": round(score, 2),
        "reasoning": f"Score {score:.2f} {'exceeds' if score > 0.5 else 'below'} threshold 0.5",
        "factors": {"score": round(score, 2), "threshold": 0.5},
    }


# ─── Step 2: Wrap your AI with LedgerMind ───────────────────────
def decide_with_ledgermind(workflow_name: str, input_context: dict):
    """Run your AI and log the decision to LedgerMind."""
    trace_id = f"trace_{workflow_name}_{int(time.time() * 1000)}"

    # Start a trace
    lm("POST", "/traces", {
        "trace_id": trace_id,
        "workflow_name": workflow_name,
        "metadata": {"source": "python-integration"},
    })

    # Call your AI
    result = your_ai_function(input_context)

    # Log the decision
    event = lm("POST", "/events", {
        "trace_id": trace_id,
        "step_id": f"step_{int(time.time() * 1000)}",
        "actor_name": "my-ai-agent",
        "actor_type": "agent",
        "event_type": "decision_made",
        "input_summary": input_context,
        "output_summary": result,
        "reasoning": result["reasoning"],
        "confidence": result["confidence"],
        "outcome": result["decision"],
        "signals": {
            "factors": result["factors"],
            "thresholds": {
                "score": {
                    "value": result["factors"]["score"],
                    "limit": result["factors"]["threshold"],
                    "passed": result["factors"]["score"] > result["factors"]["threshold"],
                }
            },
            "triggered_rule": "below_threshold" if result["decision"] == "rejected" else None,
            "explanation": result["reasoning"],
        },
    })

    print(f"  Decision logged: {result['decision']} (confidence: {result['confidence']})")
    print(f"  Trace: {trace_id}")
    return trace_id, event, result


# ─── Step 3: Record human overrides ─────────────────────────────
def record_override(trace_id, event_id, original_outcome):
    """Record when a human corrects an AI decision."""
    new_outcome = "rejected" if original_outcome == "approved" else "approved"
    lm("POST", "/overrides", {
        "trace_id": trace_id,
        "original_event_id": event_id,
        "actor_name": "human_reviewer",
        "original_outcome": original_outcome,
        "new_outcome": new_outcome,
        "reason": "Manual review determined different outcome was appropriate",
    })
    print("  Override recorded")


# ─── Step 4: Query decision history ─────────────────────────────
def query_decisions():
    """Query what LedgerMind captured."""
    traces = lm("GET", "/traces?limit=5")
    print(f"\n  Recent traces: {len(traces.get('data', []))}")

    similar = lm("POST", "/similarity/query", {
        "input_context": {"score": 0.6, "threshold": 0.5},
        "workflow_name": "review",
        "limit": 5,
    })
    print(f"  Similar decisions: {len(similar.get('data', []))}")

    analytics = lm("GET", "/analytics/overview")
    total = analytics.get("data", {}).get("total_events", 0)
    print(f"  Total decisions: {total}")


# ─── Run ─────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=== LedgerMind Python Integration Demo ===\n")

    for i in range(1, 4):
        print(f"\n-- Decision {i} --")
        categories = ["refund", "claim", "approval"]
        trace_id, event, result = decide_with_ledgermind("review", {
            "item_id": f"item_{i}",
            "amount": random.randint(1000, 20000),
            "category": categories[i - 1],
        })

        # Override rejected decisions
        event_id = event.get("data", {}).get("event_id")
        if result["decision"] == "rejected" and event_id:
            record_override(trace_id, event_id, "rejected")

    query_decisions()
    print("\n=== Done! Open http://localhost:3001 for the dashboard ===")
