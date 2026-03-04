# LedgerMind — Future Product Vision

> AI decides. LedgerMind captures, analyzes, and learns why.

This document outlines the product evolution beyond Phase 1 (Capture + Analyze), which is already built and shipped.

---

## Current State (Phase 1 — DONE)

| Form | Status |
|------|--------|
| SDK (`npm install @ledgermind/sdk`) | ✅ Shipped |
| REST API (`POST /decisions`) | ✅ Shipped |
| CLI (`ledgermind ask "..."`) | ✅ Shipped |
| Dashboard (Web UI) | ✅ Shipped |

Phase 1 captures every AI decision as a structured record — inputs, outputs, signals, confidence, explanation, and outcome — with semantic search, override tracking, pattern detection, and audit trails.

---

## Phase 2 — Decision Gateway (Middleware)

### The Shift: Passive → Active

**Phase 1 (Passive):**
```
AI decides ──> Action happens ──> LedgerMind logs it (after the fact)
```

**Phase 2 (Active):**
```
AI decides ──> LedgerMind checks ──> Allow / Block / Escalate
                    │                        │
                    ├── Policy check          ├── ALLOW: action runs
                    ├── Risk threshold        ├── BLOCK: action stopped
                    └── Override history      └── ESCALATE: human review
```

### What It Does

LedgerMind sits **between the AI and the action** — intercepting every decision before it executes.

```
Application
    ↓
AI Model / Agent
    ↓
LedgerMind Gateway        ← NEW
    ↓
Action (API / Database / Payment / Email)
```

### Example Flow

```
AI:      "Approve $50,000 refund"
Gateway: "Policy says max auto-approve is $10,000"
Result:  ESCALATE to manager
```

### Key Capabilities

- **Policy enforcement** — Check decisions against configurable rules before execution
- **Risk thresholds** — Block decisions that exceed risk limits
- **Override history** — Factor in past human corrections for similar decisions
- **Real-time intervention** — Sub-100ms decision checks
- **Escalation routing** — Route blocked decisions to the right human reviewer

### When to Build

After LedgerMind has its first users on Phase 1. The gateway is the natural next request: "I can see what my AI decided — now I want to *control* it."

---

## Phase 3 — Decision Replay & Simulation

### The Problem

Companies changing AI models (e.g., GPT-4 → cheaper model) or updating policies have no way to test the impact before deploying.

They deploy, and suddenly:
- Approvals drop
- Fraud increases
- Customer complaints spike

### What Replay Does

Re-run past AI decisions with a new model or policy. Compare outcomes before deploying.

```
Step 1: Take last 10,000 decisions from LedgerMind
Step 2: Re-run inputs through new model
Step 3: Compare outcomes
```

### Example Replay Report

```
┌──────────────────────────────────────────────────────┐
│           REPLAY REPORT                              │
├──────────────────────────────────────────────────────┤
│                                                      │
│   Decisions replayed:     10,000                     │
│                                                      │
│   Same outcome:           8,742 (87.4%)              │
│   Different outcome:      1,258 (12.6%)              │
│                                                      │
│   Approvals changed:                                 │
│     Approve → Reject:     847                        │
│     Reject → Approve:     411                        │
│                                                      │
│   Risk assessment:                                   │
│     High risk changes:    23 (review recommended)    │
│     Low risk changes:     1,235 (acceptable)         │
│                                                      │
│   Recommendation:                                    │
│     SAFE TO DEPLOY with manual review of 23 cases    │
│                                                      │
└──────────────────────────────────────────────────────┘
```

### Key Capabilities

1. **Model comparison** — GPT-4 vs smaller model: which decisions change?
2. **Policy testing** — `risk_threshold 0.5 → 0.4`: what gets blocked now?
3. **Agent debugging** — Which decision path caused a failure?
4. **Decision drift detection** — Is model behavior changing over time?

### Analogy

Banks don't just log transactions — they run **risk simulations** and **stress tests**. LedgerMind does the same for AI decisions.

### Prerequisites

- Thousands of stored decisions (from Phase 1 users)
- Users who trust the platform (from Phase 1 + 2)
- Integration with model providers for re-execution

---

## Full Product Architecture

```
                    ANY AI SYSTEM
          (LLM, Agent, ML Model, Rule Engine)
                        │
                        ▼
┌─────────────────────────────────────────────────────┐
│            LEDGERMIND DECISION GATEWAY               │
│                                                     │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
│   │ CAPTURE  │  │ ANALYZE  │  │ CONTROL  │  │ REPLAY   │
│   │          │  │          │  │          │  │          │
│   │ Log      │  │ Patterns │  │ Policy   │  │ Re-run   │
│   │ Signals  │  │ Anomaly  │  │ Block    │  │ Compare  │
│   │ Context  │  │ Trends   │  │ Escalate │  │ Simulate │
│   └──────────┘  └──────────┘  └──────────┘  └──────────┘
│                                                     │
│   Phase 1 ✅     Phase 1 ✅    Phase 2       Phase 3  │
│   (DONE)         (DONE)        (Next)        (Later)  │
└─────────────────────────────────────────────────────┘
                        │
                        ▼
                 ACTION EXECUTES
          (Payment, Email, API Call, etc.)
```

---

## The Vision

LedgerMind evolves from a decision logger into **AI Decision Infrastructure**:

> **Capture decisions → Control decisions → Simulate decisions → Audit decisions**

The analogy: *"GitHub Actions + Stripe + Datadog — but for AI decisions."*

---

## Why This Matters

AI systems are moving toward autonomous agents. Companies like OpenAI and Anthropic are pushing agents that approve things, execute tasks, and make decisions.

But companies will never trust agents without:
- **Capture** — what did the agent decide? (Phase 1 ✅)
- **Control** — can we stop bad decisions? (Phase 2)
- **Simulation** — what happens if we change the model? (Phase 3)
- **Audit** — can we prove compliance? (Phase 1 ✅)

---

## Execution Order

| Phase | What | When |
|-------|------|------|
| 1 | Capture + Analyze | ✅ NOW (shipped) |
| 2 | Decision Gateway | After first users |
| 3 | Replay + Simulation | After real decision data |

Ship what's built. Get users. Build what they ask for.
