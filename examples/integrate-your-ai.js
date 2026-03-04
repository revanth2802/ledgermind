/**
 * LedgerMind Integration Example — Node.js
 * 
 * This shows how to wrap ANY AI system with LedgerMind
 * to capture decisions, track overrides, and query history.
 * 
 * Usage:
 *   1. Start LedgerMind: docker-compose up -d
 *   2. Replace yourAIFunction() with your actual AI logic
 *   3. Run: node integrate-your-ai.js
 */

const LEDGERMIND_URL = process.env.LEDGERMIND_URL || 'http://localhost:3000';
const API_KEY = process.env.LEDGERMIND_API_KEY || 'my-api-key';
const TENANT_ID = process.env.LEDGERMIND_TENANT || 'my-tenant';

// ─── Helper: call LedgerMind API ────────────────────────────────
async function lm(method, path, body) {
  const res = await fetch(`${LEDGERMIND_URL}/api${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'X-Tenant-ID': TENANT_ID,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ─── Step 1: Your AI function (replace this) ───────────────────
async function yourAIFunction(input) {
  // Replace this with your actual AI logic:
  //   - LLM call (OpenAI, Anthropic, etc.)
  //   - ML model inference
  //   - Rule engine evaluation
  //   - Multi-agent workflow step
  const score = Math.random();
  return {
    decision: score > 0.5 ? 'approved' : 'rejected',
    confidence: score,
    reasoning: `Score ${score.toFixed(2)} ${score > 0.5 ? 'exceeds' : 'below'} threshold 0.5`,
    factors: { score: parseFloat(score.toFixed(2)), threshold: 0.5 },
  };
}

// ─── Step 2: Wrap your AI with LedgerMind ───────────────────────
async function decideWithLedgerMind(workflowName, inputContext) {
  // Start a trace (groups related decisions together)
  const traceId = `trace_${workflowName}_${Date.now()}`;
  await lm('POST', '/traces', {
    trace_id: traceId,
    workflow_name: workflowName,
    metadata: { source: 'integration-example' },
  });

  // Call your AI
  const result = await yourAIFunction(inputContext);

  // Log the decision to LedgerMind
  const event = await lm('POST', '/events', {
    trace_id: traceId,
    step_id: `step_${Date.now()}`,
    actor_name: 'my-ai-agent',
    actor_type: 'agent',
    event_type: 'decision_made',
    input_summary: inputContext,
    output_summary: result,
    reasoning: result.reasoning,
    confidence: result.confidence,
    outcome: result.decision,
    signals: {
      factors: result.factors,
      thresholds: {
        score: {
          value: result.factors.score,
          limit: result.factors.threshold,
          passed: result.factors.score > result.factors.threshold,
        },
      },
      triggered_rule: result.decision === 'rejected' ? 'below_threshold' : null,
      explanation: result.reasoning,
    },
  });

  console.log(`✅ Decision logged: ${result.decision} (confidence: ${result.confidence.toFixed(2)})`);
  console.log(`   Trace: ${traceId}`);
  return { traceId, event, result };
}

// ─── Step 3: Register policies (optional) ───────────────────────
async function setupPolicies() {
  await lm('POST', '/policies', {
    name: 'High Value Review',
    description: 'Flag decisions over $10,000 for human review',
    policy_type: 'threshold',
    conditions: { min_amount: 10000 },
    actions: { require_review: true },
    is_active: true,
  });
  console.log('📋 Policy registered');
}

// ─── Step 4: Record human overrides ─────────────────────────────
async function recordOverride(traceId, eventId, originalOutcome) {
  await lm('POST', '/overrides', {
    trace_id: traceId,
    original_event_id: eventId,
    actor_name: 'human_reviewer',
    original_outcome: originalOutcome,
    new_outcome: originalOutcome === 'approved' ? 'rejected' : 'approved',
    reason: 'Manual review determined different outcome was appropriate',
  });
  console.log('🔄 Override recorded');
}

// ─── Step 5: Query decision history ─────────────────────────────
async function queryDecisions() {
  // Get recent traces
  const traces = await lm('GET', '/traces?limit=5');
  console.log(`\n📊 Recent traces: ${traces.data?.length || 0}`);

  // Find similar decisions
  const similar = await lm('POST', '/similarity/query', {
    input_context: { score: 0.6, threshold: 0.5 },
    workflow_name: 'review',
    limit: 5,
  });
  console.log(`🔍 Similar decisions found: ${similar.data?.length || 0}`);

  // Get analytics
  const analytics = await lm('GET', '/analytics/overview');
  console.log(`📈 Total decisions: ${analytics.data?.total_events || 0}`);
}

// ─── Run the demo ───────────────────────────────────────────────
async function main() {
  console.log('━━━ LedgerMind Integration Demo ━━━\n');

  // Register a policy
  await setupPolicies();

  // Make 3 AI decisions, each captured by LedgerMind
  for (let i = 1; i <= 3; i++) {
    console.log(`\n── Decision ${i} ──`);
    const { traceId, event, result } = await decideWithLedgerMind('review', {
      item_id: `item_${i}`,
      amount: Math.floor(Math.random() * 20000),
      category: ['refund', 'claim', 'approval'][i - 1],
    });

    // Simulate human override on rejected decisions
    if (result.decision === 'rejected' && event.data?.event_id) {
      await recordOverride(traceId, event.data.event_id, 'rejected');
    }
  }

  // Query what LedgerMind captured
  await queryDecisions();

  console.log('\n━━━ Done! Open http://localhost:3001 to see the dashboard ━━━');
}

main().catch(console.error);
