#!/usr/bin/env node

/**
 * ============================================================================
 * LedgerMind Tax Decision Demo
 * ============================================================================
 * 
 * Runs a realistic tax processing scenario through LedgerMind:
 *   - TaxClassifierAgent: classifies returns into risk tiers
 *   - DeductionAgent: verifies deduction claims
 *   - AuditRiskAgent: scores audit probability
 *   - RefundAgent: approves or escalates refund
 *   - Human override: tax examiner overrides an AI decision
 *
 * Usage:
 *   node scripts/tax-demo.js
 *
 * Requires:
 *   - PostgreSQL running with ledgermind schema
 *   - API running on http://localhost:3000
 */

const API = 'http://localhost:3000/api';
const HEADERS = {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer tax-demo-key',
  'X-Tenant-ID': 'irs-demo',
};

// ============================================================================
// Tax Dataset (20 realistic tax returns)
// ============================================================================

const TAX_RETURNS = [
  { id: 'TR-2026-001', name: 'Alice Johnson',   filing: 'single',   income: 52000,  deductions: 14200, w2_income: 52000, self_employment: 0,     charitable: 1200, medical: 3500,  home_office: 0,    prior_audit: false, amended: false },
  { id: 'TR-2026-002', name: 'Bob Martinez',     filing: 'married',  income: 128000, deductions: 42000, w2_income: 110000,self_employment: 18000, charitable: 8000, medical: 2400,  home_office: 4800, prior_audit: false, amended: false },
  { id: 'TR-2026-003', name: 'Carol Chen',       filing: 'single',   income: 245000, deductions: 78000, w2_income: 200000,self_employment: 45000, charitable: 25000,medical: 1200,  home_office: 9600, prior_audit: true,  amended: false },
  { id: 'TR-2026-004', name: 'David Kim',        filing: 'head',     income: 67000,  deductions: 18500, w2_income: 67000, self_employment: 0,     charitable: 2500, medical: 5200,  home_office: 0,    prior_audit: false, amended: false },
  { id: 'TR-2026-005', name: 'Emma Wilson',      filing: 'married',  income: 340000, deductions: 145000,w2_income: 180000,self_employment: 160000,charitable: 52000,medical: 800,   home_office: 14400,prior_audit: false, amended: true },
  { id: 'TR-2026-006', name: 'Frank Patel',      filing: 'single',   income: 38000,  deductions: 12800, w2_income: 38000, self_employment: 0,     charitable: 800,  medical: 4200,  home_office: 0,    prior_audit: false, amended: false },
  { id: 'TR-2026-007', name: 'Grace Thompson',   filing: 'married',  income: 92000,  deductions: 28000, w2_income: 92000, self_employment: 0,     charitable: 4500, medical: 3100,  home_office: 2400, prior_audit: false, amended: false },
  { id: 'TR-2026-008', name: 'Henry Nguyen',     filing: 'single',   income: 175000, deductions: 95000, w2_income: 120000,self_employment: 55000, charitable: 35000,medical: 1800,  home_office: 7200, prior_audit: true,  amended: true },
  { id: 'TR-2026-009', name: 'Iris Lopez',       filing: 'head',     income: 44000,  deductions: 15200, w2_income: 44000, self_employment: 0,     charitable: 1100, medical: 6800,  home_office: 0,    prior_audit: false, amended: false },
  { id: 'TR-2026-010', name: 'Jack O\'Brien',    filing: 'single',   income: 89000,  deductions: 22000, w2_income: 75000, self_employment: 14000, charitable: 3200, medical: 2100,  home_office: 3600, prior_audit: false, amended: false },
  { id: 'TR-2026-011', name: 'Karen Davis',      filing: 'married',  income: 156000, deductions: 38000, w2_income: 156000,self_employment: 0,     charitable: 6200, medical: 4100,  home_office: 0,    prior_audit: false, amended: false },
  { id: 'TR-2026-012', name: 'Leo Ramirez',      filing: 'single',   income: 72000,  deductions: 48000, w2_income: 45000, self_employment: 27000, charitable: 18000,medical: 900,   home_office: 6000, prior_audit: false, amended: false },
  { id: 'TR-2026-013', name: 'Mia Anderson',     filing: 'head',     income: 61000,  deductions: 16800, w2_income: 61000, self_employment: 0,     charitable: 1800, medical: 7200,  home_office: 0,    prior_audit: false, amended: false },
  { id: 'TR-2026-014', name: 'Nathan Brooks',    filing: 'married',  income: 420000, deductions: 168000,w2_income: 300000,self_employment: 120000,charitable: 65000,medical: 3200,  home_office: 12000,prior_audit: true,  amended: false },
  { id: 'TR-2026-015', name: 'Olivia Foster',    filing: 'single',   income: 31000,  deductions: 12600, w2_income: 31000, self_employment: 0,     charitable: 400,  medical: 2800,  home_office: 0,    prior_audit: false, amended: false },
  { id: 'TR-2026-016', name: 'Paul Young',       filing: 'single',   income: 195000, deductions: 112000,w2_income: 95000, self_employment: 100000,charitable: 42000,medical: 1500,  home_office: 9600, prior_audit: false, amended: true },
  { id: 'TR-2026-017', name: 'Quinn Garcia',     filing: 'married',  income: 78000,  deductions: 19500, w2_income: 78000, self_employment: 0,     charitable: 2800, medical: 3400,  home_office: 0,    prior_audit: false, amended: false },
  { id: 'TR-2026-018', name: 'Rachel Lee',       filing: 'head',     income: 55000,  deductions: 14000, w2_income: 55000, self_employment: 0,     charitable: 1500, medical: 4800,  home_office: 0,    prior_audit: false, amended: false },
  { id: 'TR-2026-019', name: 'Sam Turner',       filing: 'single',   income: 285000, deductions: 105000,w2_income: 160000,self_employment: 125000,charitable: 38000,medical: 2200,  home_office: 10800,prior_audit: true,  amended: true },
  { id: 'TR-2026-020', name: 'Tina Mitchell',    filing: 'married',  income: 104000, deductions: 26000, w2_income: 104000,self_employment: 0,     charitable: 5000, medical: 3600,  home_office: 2400, prior_audit: false, amended: false },
];

// ============================================================================
// Tax Policy Rules
// ============================================================================

const POLICY = {
  version: 'tax-policy-v2026',
  rules: {
    deduction_ratio_limit: 0.40,        // Deductions > 40% of income → flag
    charitable_ratio_limit: 0.15,        // Charitable > 15% of income → flag
    auto_approve_income_cap: 100000,     // Auto-approve if income < $100K and low risk
    audit_risk_threshold: 0.60,          // Risk score > 0.60 → manual review
    high_income_threshold: 200000,       // Income > $200K → extra scrutiny
    medical_deduction_floor: 0.075,      // Medical must exceed 7.5% of AGI
    home_office_max_sqft_rate: 5,        // $5/sqft, max 300 sqft = $1500 simplified
  },
};

// ============================================================================
// Agent Logic (simulated AI decisions with structured signals)
// ============================================================================

function classifyReturn(ret) {
  const deductionRatio = ret.deductions / ret.income;
  const charitableRatio = ret.charitable / ret.income;
  const hasFlags = ret.prior_audit || ret.amended || ret.self_employment > 0;

  let tier = 'standard';
  let riskScore = 0.1;

  if (ret.income > POLICY.rules.high_income_threshold) {
    tier = 'complex';
    riskScore += 0.2;
  }
  if (deductionRatio > POLICY.rules.deduction_ratio_limit) {
    tier = 'complex';
    riskScore += 0.25;
  }
  if (charitableRatio > POLICY.rules.charitable_ratio_limit) {
    riskScore += 0.15;
  }
  if (ret.prior_audit) riskScore += 0.15;
  if (ret.amended) riskScore += 0.1;
  if (ret.self_employment > 0) riskScore += 0.1;

  if (riskScore > 0.5) tier = 'high-risk';

  return {
    tier,
    risk_score: Math.min(riskScore, 1.0),
    signals: {
      factors: {
        income: ret.income,
        deduction_ratio: Math.round(deductionRatio * 1000) / 1000,
        charitable_ratio: Math.round(charitableRatio * 1000) / 1000,
        has_self_employment: ret.self_employment > 0,
        prior_audit: ret.prior_audit,
        amended_return: ret.amended,
        filing_status: ret.filing,
      },
      thresholds: {
        deduction_ratio: { value: Math.round(deductionRatio * 1000) / 1000, limit: POLICY.rules.deduction_ratio_limit, passed: deductionRatio <= POLICY.rules.deduction_ratio_limit },
        charitable_ratio: { value: Math.round(charitableRatio * 1000) / 1000, limit: POLICY.rules.charitable_ratio_limit, passed: charitableRatio <= POLICY.rules.charitable_ratio_limit },
        high_income: { value: ret.income, limit: POLICY.rules.high_income_threshold, passed: ret.income <= POLICY.rules.high_income_threshold },
      },
      triggered_rule: riskScore > 0.5 ? 'high_risk_classification' : (tier === 'complex' ? 'complex_return' : 'standard_processing'),
      explanation: `Classified as ${tier}: deduction ratio ${(deductionRatio * 100).toFixed(1)}%, risk score ${riskScore.toFixed(2)}`,
    },
  };
}

function verifyDeductions(ret) {
  const issues = [];
  const deductionRatio = ret.deductions / ret.income;
  const charitableRatio = ret.charitable / ret.income;
  const medicalFloor = ret.income * POLICY.rules.medical_deduction_floor;
  const medicalAllowable = Math.max(0, ret.medical - medicalFloor);

  if (deductionRatio > POLICY.rules.deduction_ratio_limit) {
    issues.push(`Deduction ratio ${(deductionRatio*100).toFixed(1)}% exceeds ${POLICY.rules.deduction_ratio_limit*100}% limit`);
  }
  if (charitableRatio > POLICY.rules.charitable_ratio_limit) {
    issues.push(`Charitable giving ${(charitableRatio*100).toFixed(1)}% exceeds ${POLICY.rules.charitable_ratio_limit*100}% limit`);
  }
  if (ret.home_office > 1500 && ret.self_employment === 0) {
    issues.push('Home office deduction claimed without self-employment income');
  }

  const verified = issues.length === 0;
  return {
    verified,
    issues,
    medical_allowable: medicalAllowable,
    signals: {
      factors: {
        total_deductions: ret.deductions,
        charitable: ret.charitable,
        medical_claimed: ret.medical,
        medical_allowable: medicalAllowable,
        home_office: ret.home_office,
        self_employment_income: ret.self_employment,
        issues_found: issues.length,
      },
      thresholds: {
        deduction_ratio: { value: Math.round(deductionRatio * 1000) / 1000, limit: POLICY.rules.deduction_ratio_limit, passed: deductionRatio <= POLICY.rules.deduction_ratio_limit },
        charitable_ratio: { value: Math.round(charitableRatio * 1000) / 1000, limit: POLICY.rules.charitable_ratio_limit, passed: charitableRatio <= POLICY.rules.charitable_ratio_limit },
        medical_floor: { value: ret.medical, limit: medicalFloor, passed: ret.medical > medicalFloor },
      },
      triggered_rule: verified ? 'deductions_verified' : 'deduction_flags_found',
      explanation: verified
        ? `All deductions verified within policy limits`
        : `${issues.length} deduction issue(s) found: ${issues.join('; ')}`,
    },
  };
}

function scoreAuditRisk(ret, classification, deductionResult) {
  let score = classification.risk_score;
  if (!deductionResult.verified) score += 0.15;
  if (ret.income > 300000) score += 0.1;
  if (ret.self_employment / ret.income > 0.3) score += 0.1;
  score = Math.min(score, 1.0);

  const recommend = score > POLICY.rules.audit_risk_threshold ? 'manual_review' : 'auto_process';
  return {
    score: Math.round(score * 100) / 100,
    recommendation: recommend,
    signals: {
      factors: {
        base_risk: classification.risk_score,
        deduction_issues: !deductionResult.verified,
        income: ret.income,
        self_employment_ratio: ret.self_employment > 0 ? Math.round((ret.self_employment / ret.income) * 1000) / 1000 : 0,
        prior_audit: ret.prior_audit,
        amended: ret.amended,
        final_risk_score: Math.round(score * 100) / 100,
      },
      thresholds: {
        audit_risk: { value: Math.round(score * 100) / 100, limit: POLICY.rules.audit_risk_threshold, passed: score <= POLICY.rules.audit_risk_threshold },
      },
      triggered_rule: recommend === 'manual_review' ? 'audit_risk_exceeded' : 'auto_process_cleared',
      explanation: `Audit risk score ${score.toFixed(2)} ${score > POLICY.rules.audit_risk_threshold ? '>' : '≤'} threshold ${POLICY.rules.audit_risk_threshold} → ${recommend}`,
    },
  };
}

function decideRefund(ret, classification, deductionResult, auditRisk) {
  // Simple tax calculation
  const standardDeduction = ret.filing === 'married' ? 29200 : ret.filing === 'head' ? 21900 : 14600;
  const taxableIncome = Math.max(0, ret.income - Math.max(ret.deductions, standardDeduction));
  
  // Simplified tax brackets (2026)
  let tax = 0;
  if (taxableIncome > 0) tax = taxableIncome * 0.22; // simplified flat for demo
  const withheld = ret.w2_income * 0.24; // assumed withholding
  const refund = Math.round(withheld - tax);

  const autoApprove = auditRisk.recommendation === 'auto_process'
    && ret.income < POLICY.rules.auto_approve_income_cap
    && deductionResult.verified;

  return {
    refund_amount: refund,
    decision: refund > 0 ? (autoApprove ? 'approve_refund' : 'review_refund') : (refund < 0 ? 'balance_due' : 'zero_balance'),
    auto_approved: autoApprove && refund > 0,
    signals: {
      factors: {
        taxable_income: taxableIncome,
        estimated_tax: Math.round(tax),
        withheld: Math.round(withheld),
        refund_amount: refund,
        audit_risk_score: auditRisk.score,
        deductions_verified: deductionResult.verified,
        return_tier: classification.tier,
      },
      thresholds: {
        auto_approve_income: { value: ret.income, limit: POLICY.rules.auto_approve_income_cap, passed: ret.income < POLICY.rules.auto_approve_income_cap },
        audit_risk: { value: auditRisk.score, limit: POLICY.rules.audit_risk_threshold, passed: auditRisk.score <= POLICY.rules.audit_risk_threshold },
      },
      triggered_rule: autoApprove && refund > 0 ? 'auto_approve_refund' : (refund <= 0 ? 'no_refund_due' : 'manual_review_required'),
      explanation: refund > 0
        ? (autoApprove ? `Auto-approved refund of $${refund} — low risk, verified deductions` : `Refund of $${refund} requires review — ${auditRisk.recommendation}`)
        : (refund < 0 ? `Balance due: $${Math.abs(refund)}` : 'Zero balance — no refund or payment due'),
    },
  };
}

// ============================================================================
// API Helpers
// ============================================================================

async function api(method, path, body) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: HEADERS,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

function traceId() {
  return `trace_tax_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
function stepId() {
  return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================================================
// Main Demo
// ============================================================================

async function runDemo() {
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('  LedgerMind × Tax Processing Demo');
  console.log('  Decision Intelligence for AI Tax Systems');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');

  // ── Step 0: Health check ─────────────────────────────────────────────────
  try {
    const health = await fetch('http://localhost:3000/health');
    const h = await health.json();
    console.log(`✅ API healthy: ${h.timestamp}`);
  } catch (e) {
    console.error('❌ API not running. Start it with:');
    console.error('   cd services/api && npm run dev');
    process.exit(1);
  }

  // ── Step 1: Register tax policy ──────────────────────────────────────────
  console.log('\n── 1. Registering Tax Policy ──────────────────────────────────');
  try {
    await api('POST', '/policies', {
      policy_version_id: POLICY.version,
      policy_name: 'IRS Tax Processing Policy',
      version: '2026.1',
      content: { rules: POLICY.rules },
      metadata: { effective_date: '2026-01-01', description: 'Federal tax processing rules for TY2025' },
    });
    console.log(`   ✅ Policy registered: ${POLICY.version}`);
    console.log(`   Rules: ${Object.keys(POLICY.rules).length} rules configured`);
  } catch (e) {
    console.log(`   ⚠️  Policy registration skipped (${e.message.substring(0, 60)})`);
  }

  // ── Step 2: Process all 20 tax returns ────────────────────────────────────
  console.log('\n── 2. Processing 20 Tax Returns ──────────────────────────────');
  console.log('   Running: TaxClassifier → DeductionVerifier → AuditRisk → RefundAgent\n');

  const results = [];
  let approved = 0, reviewed = 0, balanceDue = 0;

  for (const ret of TAX_RETURNS) {
    const tid = traceId();
    
    // Create trace for this return
    await api('POST', '/traces', {
      trace_id: tid,
      workflow_name: 'tax_return_processing',
      metadata: { return_id: ret.id, taxpayer: ret.name, filing_status: ret.filing },
    });

    // Agent 1: TaxClassifier
    const classification = classifyReturn(ret);
    const s1 = stepId();
    await api('POST', '/events', {
      trace_id: tid,
      step_id: s1,
      actor_type: 'agent',
      actor_name: 'TaxClassifierAgent',
      event_type: 'decision_made',
      input_summary: { return_id: ret.id, income: ret.income, deductions: ret.deductions, filing: ret.filing },
      output_summary: { tier: classification.tier, risk_score: classification.risk_score },
      reasoning: classification.signals.explanation,
      confidence: 1 - classification.risk_score * 0.3,
      outcome: classification.tier === 'high-risk' ? 'escalated' : 'approved',
      policy_version_id: POLICY.version,
      metadata: { agent: 'TaxClassifierAgent', signals: classification.signals },
    });

    // Agent 2: DeductionVerifier
    const deduction = verifyDeductions(ret);
    const s2 = stepId();
    await api('POST', '/events', {
      trace_id: tid,
      step_id: s2,
      parent_step_id: s1,
      actor_type: 'agent',
      actor_name: 'DeductionVerifierAgent',
      event_type: 'decision_made',
      input_summary: { return_id: ret.id, deductions: ret.deductions, charitable: ret.charitable, medical: ret.medical, home_office: ret.home_office },
      output_summary: { verified: deduction.verified, issues: deduction.issues, medical_allowable: deduction.medical_allowable },
      reasoning: deduction.signals.explanation,
      confidence: deduction.verified ? 0.95 : 0.65,
      outcome: deduction.verified ? 'approved' : 'pending',
      policy_version_id: POLICY.version,
      metadata: { agent: 'DeductionVerifierAgent', signals: deduction.signals },
    });

    // Agent 3: AuditRiskScorer
    const audit = scoreAuditRisk(ret, classification, deduction);
    const s3 = stepId();
    await api('POST', '/events', {
      trace_id: tid,
      step_id: s3,
      parent_step_id: s2,
      actor_type: 'agent',
      actor_name: 'AuditRiskAgent',
      event_type: 'decision_made',
      input_summary: { return_id: ret.id, base_risk: classification.risk_score, deduction_verified: deduction.verified },
      output_summary: { risk_score: audit.score, recommendation: audit.recommendation },
      reasoning: audit.signals.explanation,
      confidence: 0.88,
      outcome: audit.recommendation === 'manual_review' ? 'escalated' : 'approved',
      policy_version_id: POLICY.version,
      metadata: { agent: 'AuditRiskAgent', signals: audit.signals },
    });

    // Agent 4: RefundAgent
    const refund = decideRefund(ret, classification, deduction, audit);
    const s4 = stepId();
    const refundEvent = await api('POST', '/events', {
      trace_id: tid,
      step_id: s4,
      parent_step_id: s3,
      actor_type: 'agent',
      actor_name: 'RefundAgent',
      event_type: 'decision_made',
      input_summary: { return_id: ret.id, audit_risk: audit.score, deductions_verified: deduction.verified, tier: classification.tier },
      output_summary: { refund_amount: refund.refund_amount, decision: refund.decision, auto_approved: refund.auto_approved },
      reasoning: refund.signals.explanation,
      confidence: refund.auto_approved ? 0.95 : 0.72,
      outcome: refund.decision === 'approve_refund' ? 'approved' : (refund.decision === 'balance_due' ? 'rejected' : 'escalated'),
      policy_version_id: POLICY.version,
      metadata: { agent: 'RefundAgent', signals: refund.signals },
    });

    // Track stats
    if (refund.decision === 'approve_refund') approved++;
    else if (refund.decision === 'balance_due') balanceDue++;
    else reviewed++;

    const icon = refund.decision === 'approve_refund' ? '✅' : (refund.decision === 'balance_due' ? '💰' : '🔍');
    const pad = ret.name.padEnd(18);
    console.log(`   ${icon} ${ret.id} ${pad} $${ret.income.toLocaleString().padStart(7)} income │ tier: ${classification.tier.padEnd(9)} │ risk: ${audit.score.toFixed(2)} │ refund: $${refund.refund_amount.toLocaleString().padStart(7)} │ ${refund.decision}`);

    results.push({ ret, tid, classification, deduction, audit, refund, refundEventId: refundEvent.event_id });
  }

  // ── Step 3: Human Override ────────────────────────────────────────────────
  console.log('\n── 3. Human Override ─────────────────────────────────────────');
  
  // Find a return that was escalated for review
  const escalated = results.find(r => r.refund.decision === 'review_refund');
  if (escalated) {
    console.log(`\n   Tax Examiner reviews: ${escalated.ret.name} (${escalated.ret.id})`);
    console.log(`   AI recommended: review_refund ($${escalated.refund.refund_amount.toLocaleString()})`);
    console.log(`   Risk score: ${escalated.audit.score}`);

    // Log override
    await api('POST', '/overrides', {
      trace_id: escalated.tid,
      original_event_id: escalated.refundEventId,
      actor_name: 'Senior Tax Examiner',
      original_outcome: 'escalated',
      new_outcome: 'approved',
      reason: 'Manual review confirms deductions are legitimate. Supporting documentation verified.',
      metadata: {
        examiner_id: 'EX-4421',
        review_time_minutes: 35,
        documents_reviewed: ['W-2', '1099-NEC', 'receipts', 'mortgage statement'],
      },
    });

    // Log the override as an event too
    await api('POST', '/events', {
      trace_id: escalated.tid,
      step_id: stepId(),
      actor_type: 'human',
      actor_name: 'Senior Tax Examiner',
      event_type: 'override',
      input_summary: { original_decision: 'review_refund', refund_amount: escalated.refund.refund_amount },
      output_summary: { new_decision: 'approve_refund', refund_approved: true },
      reasoning: 'Manual review confirms deductions are legitimate. Supporting documentation verified.',
      confidence: 1.0,
      outcome: 'approved',
      metadata: { examiner_id: 'EX-4421', override: true },
    });

    console.log(`   ✅ Override: APPROVED by Senior Tax Examiner`);
    console.log(`   Reason: Deductions verified with supporting documentation`);
  }

  // ── Step 4: Query decisions ───────────────────────────────────────────────
  console.log('\n── 4. Querying Decision History ──────────────────────────────');

  // Get all events
  const events = await api('GET', '/events?limit=100', null);
  console.log(`\n   📊 Total decision events logged: ${events.length}`);

  // Count by agent
  const agentCounts = {};
  events.forEach(e => { agentCounts[e.actor_name] = (agentCounts[e.actor_name] || 0) + 1; });
  console.log('   Events by agent:');
  Object.entries(agentCounts).sort((a, b) => b[1] - a[1]).forEach(([name, count]) => {
    console.log(`     ${name.padEnd(25)} ${count} events`);
  });

  // Count by outcome
  const outcomeCounts = {};
  events.forEach(e => { if (e.outcome) outcomeCounts[e.outcome] = (outcomeCounts[e.outcome] || 0) + 1; });
  console.log('\n   Outcomes:');
  Object.entries(outcomeCounts).sort((a, b) => b[1] - a[1]).forEach(([outcome, count]) => {
    console.log(`     ${outcome.padEnd(15)} ${count}`);
  });

  // ── Step 5: Get a trace timeline ──────────────────────────────────────────
  console.log('\n── 5. Trace Timeline (sample) ────────────────────────────────');
  const sampleTrace = results[2]; // Carol Chen — complex return
  try {
    const trace = await api('GET', `/traces/${sampleTrace.tid}`, null);
    console.log(`\n   Trace: ${trace.trace_id}`);
    console.log(`   Taxpayer: ${sampleTrace.ret.name} (${sampleTrace.ret.id})`);
    console.log(`   Workflow: ${trace.workflow_name}`);
    console.log(`   Started: ${trace.started_at}`);
    if (trace.events_summary) {
      console.log(`   Events: ${trace.events_summary.length}`);
    }
  } catch (e) {
    console.log(`   ⚠️  Timeline query: ${e.message.substring(0, 60)}`);
  }

  // ── Step 6: Get all traces ────────────────────────────────────────────────
  console.log('\n── 6. All Traces ─────────────────────────────────────────────');
  const traces = await api('GET', '/traces?limit=25', null);
  console.log(`\n   📋 Total traces: ${traces.length}`);

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════════════');
  console.log('  DEMO SUMMARY');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`  Tax Returns Processed:    ${TAX_RETURNS.length}`);
  console.log(`  Decision Events Logged:   ${events.length}`);
  console.log(`  Traces Created:           ${results.length}`);
  console.log(`  Agents Used:              4 (Classifier, Deduction, AuditRisk, Refund)`);
  console.log(`  Auto-Approved Refunds:    ${approved}`);
  console.log(`  Sent to Review:           ${reviewed}`);
  console.log(`  Balance Due:              ${balanceDue}`);
  console.log(`  Human Overrides:          ${escalated ? 1 : 0}`);
  console.log(`  Policy Version:           ${POLICY.version}`);
  console.log('');
  console.log('  Each decision captured with structured signals:');
  console.log('    ✓ factors (risk_score, deduction_ratio, income, etc.)');
  console.log('    ✓ thresholds (value vs. limit, pass/fail)');
  console.log('    ✓ triggered_rule (which policy rule fired)');
  console.log('    ✓ explanation (clean, auditable reasoning)');
  console.log('');
  console.log('  Like an airplane black box — structured telemetry, not raw thinking.');
  console.log('═══════════════════════════════════════════════════════════════════\n');
}

runDemo().catch(err => {
  console.error('\n❌ Demo failed:', err.message);
  process.exit(1);
});
