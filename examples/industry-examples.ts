/**
 * LedgerMind Examples - Multi-Industry Showcase
 * 
 * Demonstrates that LedgerMind works for ANY workflow where AI agents make decisions.
 * Not just finance - healthcare, e-commerce, HR, security, logistics, and more.
 */

import { LedgerMindClient } from '@ledgermind/sdk';

const client = new LedgerMindClient({
  apiUrl: process.env.LEDGERMIND_API_URL || 'http://localhost:3000/api',
  apiKey: process.env.LEDGERMIND_API_KEY || 'demo-key',
  tenantId: 'demo-tenant',
});

// =============================================================================
// 🛒 E-COMMERCE: Refund Request Processing
// =============================================================================

async function processRefundRequest() {
  console.log('\n🛒 E-COMMERCE: Refund Request Processing\n');
  
  const traceId = client.generateTraceId();
  await client.createTrace({
    trace_id: traceId,
    workflow_name: 'refund_processing',
    metadata: { industry: 'ecommerce', workflow_type: 'refund' }
  });

  // Step 1: Classify the complaint
  const classifierStep = client.generateStepId();
  await client.logDecision(traceId, classifierStep, 'ClassifierAgent', {
    input: {
      order_id: 'ORD-78432',
      customer_email: 'jane@email.com',
      amount: 299.99,
      reason: 'Item not as described - color different from photos'
    },
    output: { classification: 'legitimate_complaint', category: 'product_mismatch' },
    confidence: 0.87,
    reasoning: 'Customer complaint matches known issue pattern. Photo vs actual color discrepancy reported 12 times this month for this product.',
    outcome: 'approved'
  });
  console.log('   ✅ ClassifierAgent: legitimate_complaint (87% confidence)');

  // Step 2: Check customer value
  const customerStep = client.generateStepId();
  await client.logDecision(traceId, customerStep, 'CustomerValueAgent', {
    input: { customer_email: 'jane@email.com' },
    output: { 
      tier: 'high_value',
      lifetime_value: 4500,
      order_count: 23,
      return_rate: 0.04
    },
    confidence: 0.95,
    reasoning: 'Customer has $4,500 LTV, 23 orders, only 4% return rate. Well below abuse threshold.',
    outcome: 'approved'
  });
  console.log('   ✅ CustomerValueAgent: high_value customer (95% confidence)');

  // Step 3: Policy check
  const policyStep = client.generateStepId();
  await client.logDecision(traceId, policyStep, 'PolicyAgent', {
    input: { 
      amount: 299.99,
      reason_category: 'product_mismatch',
      customer_tier: 'high_value'
    },
    output: { decision: 'auto_approve', requires_return: false },
    confidence: 0.91,
    reasoning: 'Policy REFUND_v3.2: Auto-approve for high-value customers on product mismatch claims under $500. No return required.',
    outcome: 'approved',
    policyVersionId: 'REFUND_POLICY_v3.2'
  });
  console.log('   ✅ PolicyAgent: auto_approve (91% confidence)');

  console.log(`\n   📋 Trace ID: ${traceId}`);
  console.log('   💰 Result: Full refund approved, no return required\n');
}

// =============================================================================
// 🏥 HEALTHCARE: Prior Authorization
// =============================================================================

async function processPriorAuth() {
  console.log('\n🏥 HEALTHCARE: Prior Authorization\n');
  
  const traceId = client.generateTraceId();
  await client.createTrace({
    trace_id: traceId,
    workflow_name: 'prior_authorization',
    metadata: { industry: 'healthcare', workflow_type: 'prior_auth' }
  });

  // Step 1: Clinical necessity check
  const clinicalStep = client.generateStepId();
  await client.logDecision(traceId, clinicalStep, 'ClinicalAgent', {
    input: {
      patient_id: 'P-12345',
      procedure: 'MRI - Lumbar Spine',
      diagnosis_code: 'M54.5',
      diagnosis: 'L5-S1 Disc Herniation',
      requesting_physician: 'Dr. Smith'
    },
    output: { medically_necessary: true, urgency: 'routine' },
    confidence: 0.92,
    reasoning: 'Diagnosis M54.5 with documented conservative treatment failure (6 weeks PT) meets medical necessity criteria per clinical guidelines.',
    outcome: 'approved'
  });
  console.log('   ✅ ClinicalAgent: medically_necessary (92% confidence)');

  // Step 2: Guideline compliance
  const guidelineStep = client.generateStepId();
  await client.logDecision(traceId, guidelineStep, 'GuidelineAgent', {
    input: { 
      procedure: 'MRI - Lumbar Spine',
      diagnosis_code: 'M54.5',
      prior_treatments: ['physical_therapy', 'nsaids']
    },
    output: { meets_criteria: true, guideline_reference: 'ACR-2024-LUMBAR-003' },
    confidence: 0.88,
    reasoning: 'Per ACR Appropriateness Criteria, MRI is indicated after 6 weeks of conservative treatment failure.',
    outcome: 'approved'
  });
  console.log('   ✅ GuidelineAgent: meets_criteria (88% confidence)');

  // Step 3: Cost/coverage check
  const costStep = client.generateStepId();
  await client.logDecision(traceId, costStep, 'CostAgent', {
    input: { 
      procedure_code: '72148',
      patient_plan: 'PPO-Gold',
      in_network: true
    },
    output: { covered: true, patient_responsibility: 150, plan_pays: 850 },
    confidence: 0.95,
    reasoning: 'Procedure 72148 covered under PPO-Gold. In-network facility. Patient responsibility: $150 copay.',
    outcome: 'approved'
  });
  console.log('   ✅ CostAgent: covered (95% confidence)');

  console.log(`\n   📋 Trace ID: ${traceId}`);
  console.log('   ✅ Result: Prior authorization APPROVED\n');
  console.log('   🔒 HIPAA Audit Trail: Complete\n');
}

// =============================================================================
// 👥 HR: Resume Screening
// =============================================================================

async function processResumeScreening() {
  console.log('\n👥 HR: Resume Screening\n');
  
  const traceId = client.generateTraceId();
  await client.createTrace({
    trace_id: traceId,
    workflow_name: 'resume_screening',
    metadata: { industry: 'hr', workflow_type: 'recruiting' }
  });

  // Step 1: Skill matching
  const skillStep = client.generateStepId();
  await client.logDecision(traceId, skillStep, 'SkillMatchAgent', {
    input: {
      candidate: 'John Doe',
      role: 'Senior Software Engineer',
      required_skills: ['Python', 'AWS', 'Kubernetes', 'PostgreSQL'],
      candidate_skills: ['Python', 'AWS', 'Kubernetes', 'Docker', 'React']
    },
    output: { 
      match_score: 0.85,
      matched: ['Python', 'AWS', 'Kubernetes'],
      missing: ['PostgreSQL'],
      bonus: ['Docker', 'React']
    },
    confidence: 0.89,
    reasoning: '3/4 required skills present. PostgreSQL missing but transferable from general DB experience. Bonus skills add value.',
    outcome: 'approved'
  });
  console.log('   ✅ SkillMatchAgent: strong_match 85% (89% confidence)');

  // Step 2: Experience validation
  const expStep = client.generateStepId();
  await client.logDecision(traceId, expStep, 'ExperienceAgent', {
    input: {
      required_years: 5,
      candidate_years: 7,
      relevant_roles: ['Software Engineer', 'Tech Lead']
    },
    output: { meets_requirements: true, experience_score: 0.92 },
    confidence: 0.92,
    reasoning: '7 years experience exceeds 5 year requirement. Previous Tech Lead role demonstrates growth trajectory.',
    outcome: 'approved'
  });
  console.log('   ✅ ExperienceAgent: meets_requirements (92% confidence)');

  // Step 3: Bias check (critical for compliance)
  const biasStep = client.generateStepId();
  await client.logDecision(traceId, biasStep, 'BiasCheckAgent', {
    input: { 
      decision_factors: ['skills', 'experience', 'role_history'],
      excluded_factors: ['name', 'gender', 'age', 'location']
    },
    output: { bias_detected: false, compliance_score: 1.0 },
    confidence: 0.97,
    reasoning: 'Decision based solely on job-relevant factors. No protected class information used in scoring.',
    outcome: 'approved'
  });
  console.log('   ✅ BiasCheckAgent: no_bias_detected (97% confidence)');

  console.log(`\n   📋 Trace ID: ${traceId}`);
  console.log('   ✅ Result: Advance to interview');
  console.log('   ⚖️  EEOC Compliance: Verified\n');
}

// =============================================================================
// 🔒 SECURITY: Access Request
// =============================================================================

async function processAccessRequest() {
  console.log('\n🔒 SECURITY: Access Request\n');
  
  const traceId = client.generateTraceId();
  await client.createTrace({
    trace_id: traceId,
    workflow_name: 'access_request',
    metadata: { industry: 'security', workflow_type: 'iam' }
  });

  // Step 1: Role check
  const roleStep = client.generateStepId();
  await client.logDecision(traceId, roleStep, 'RoleAgent', {
    input: {
      user: 'engineer_jane',
      current_role: 'software_engineer',
      requested_resource: 'production_database',
      access_level: 'read_write'
    },
    output: { role_allows: true, requires_justification: true },
    confidence: 0.95,
    reasoning: 'Software Engineer role permits production DB access with justification. User has completed security training.',
    outcome: 'approved'
  });
  console.log('   ✅ RoleAgent: role_allows_request (95% confidence)');

  // Step 2: Risk assessment
  const riskStep = client.generateStepId();
  await client.logDecision(traceId, riskStep, 'RiskAgent', {
    input: {
      resource_sensitivity: 'high',
      access_level: 'read_write',
      user_risk_score: 0.15
    },
    output: { risk_level: 'elevated', recommendation: 'time_limited_access' },
    confidence: 0.78,
    reasoning: 'Production database is high-sensitivity. Write access elevates risk. Recommend 24-hour expiry.',
    outcome: 'escalated'
  });
  console.log('   ⚠️  RiskAgent: elevated_risk (78% confidence)');

  // Step 3: Justification validation
  const justStep = client.generateStepId();
  await client.logDecision(traceId, justStep, 'JustificationAgent', {
    input: {
      justification: 'Debugging production issue INCIDENT-4521',
      incident_id: 'INCIDENT-4521'
    },
    output: { valid: true, incident_verified: true, priority: 'P1' },
    confidence: 0.85,
    reasoning: 'Justification links to valid P1 incident. Production debugging is legitimate business need.',
    outcome: 'approved'
  });
  console.log('   ✅ JustificationAgent: valid_business_need (85% confidence)');

  console.log(`\n   📋 Trace ID: ${traceId}`);
  console.log('   ✅ Result: APPROVED with 24h expiry');
  console.log('   🔐 Access logged for SOC2 audit\n');
}

// =============================================================================
// 🚚 LOGISTICS: Route Optimization
// =============================================================================

async function processRouteOptimization() {
  console.log('\n🚚 LOGISTICS: Route Optimization\n');
  
  const traceId = client.generateTraceId();
  await client.createTrace({
    trace_id: traceId,
    workflow_name: 'route_optimization',
    metadata: { industry: 'logistics', workflow_type: 'delivery' }
  });

  // Step 1: Traffic analysis
  const trafficStep = client.generateStepId();
  await client.logDecision(traceId, trafficStep, 'TrafficAgent', {
    input: {
      origin: 'Warehouse-NYC',
      destination: 'Customer-Boston',
      departure_time: '2026-01-16T08:00:00Z'
    },
    output: { 
      route_a_time: 285, // minutes
      route_b_time: 255,
      route_a_congestion: 'heavy',
      route_b_congestion: 'moderate'
    },
    confidence: 0.87,
    reasoning: 'I-95 shows heavy congestion due to construction. I-84 route adds 20 miles but saves 30 minutes.',
    outcome: 'approved'
  });
  console.log('   ✅ TrafficAgent: i95_congested, recommend route B (87% confidence)');

  // Step 2: Weather check
  const weatherStep = client.generateStepId();
  await client.logDecision(traceId, weatherStep, 'WeatherAgent', {
    input: { routes: ['I-95', 'I-84'], date: '2026-01-16' },
    output: { conditions: 'clear', precipitation: 0, visibility: 'good' },
    confidence: 0.95,
    reasoning: 'No adverse weather conditions on either route. Clear skies forecasted.',
    outcome: 'approved'
  });
  console.log('   ✅ WeatherAgent: clear_conditions (95% confidence)');

  // Step 3: Cost optimization
  const costStep = client.generateStepId();
  await client.logDecision(traceId, costStep, 'CostAgent', {
    input: {
      route_a_miles: 215,
      route_b_miles: 235,
      fuel_price: 3.45,
      driver_hourly: 28
    },
    output: { 
      route_a_cost: 187,
      route_b_cost: 142,
      savings: 45
    },
    confidence: 0.82,
    reasoning: 'Despite longer distance, route B is $45 cheaper due to less idle time in traffic.',
    outcome: 'approved'
  });
  console.log('   ✅ CostAgent: route_b_cheaper by $45 (82% confidence)');

  console.log(`\n   📋 Trace ID: ${traceId}`);
  console.log('   🛣️  Result: Route B via I-84');
  console.log('   ⏱️  ETA: 4h 15m | 💰 Savings: $45\n');
}

// =============================================================================
// 🎫 SUPPORT: Ticket Escalation
// =============================================================================

async function processTicketEscalation() {
  console.log('\n🎫 SUPPORT: Ticket Escalation\n');
  
  const traceId = client.generateTraceId();
  await client.createTrace({
    trace_id: traceId,
    workflow_name: 'ticket_escalation',
    metadata: { industry: 'support', workflow_type: 'escalation' }
  });

  // Step 1: Classification
  const classStep = client.generateStepId();
  await client.logDecision(traceId, classStep, 'ClassifierAgent', {
    input: {
      ticket_id: 'TICKET-99281',
      subject: 'URGENT: Production system down, losing revenue',
      body: 'Our entire e-commerce platform is down. We are losing $10k/hour. Need immediate help!'
    },
    output: { 
      category: 'critical_outage',
      urgency: 'P1',
      keywords_detected: ['production', 'down', 'revenue', 'urgent']
    },
    confidence: 0.96,
    reasoning: 'Keywords indicate production outage with revenue impact. Auto-classified as P1 critical.',
    outcome: 'escalated'
  });
  console.log('   🚨 ClassifierAgent: critical_outage P1 (96% confidence)');

  // Step 2: Sentiment analysis
  const sentimentStep = client.generateStepId();
  await client.logDecision(traceId, sentimentStep, 'SentimentAgent', {
    input: { ticket_text: 'URGENT: Production system down, losing revenue...' },
    output: { sentiment: 'frustrated', urgency_signal: 'high', escalation_risk: 0.89 },
    confidence: 0.91,
    reasoning: 'All-caps URGENT, revenue loss mention, exclamation marks indicate high frustration.',
    outcome: 'escalated'
  });
  console.log('   😤 SentimentAgent: high_frustration (91% confidence)');

  // Step 3: Account check
  const accountStep = client.generateStepId();
  await client.logDecision(traceId, accountStep, 'AccountAgent', {
    input: { customer_id: 'enterprise_client_42' },
    output: { 
      tier: 'enterprise',
      arr: 250000,
      sla: '15_minute_response',
      dedicated_support: true
    },
    confidence: 1.0,
    reasoning: 'Enterprise tier customer with $250k ARR. SLA requires 15-minute response for P1.',
    outcome: 'escalated'
  });
  console.log('   👔 AccountAgent: enterprise_sla (100% confidence)');

  console.log(`\n   📋 Trace ID: ${traceId}`);
  console.log('   🚀 Result: IMMEDIATE escalation to Senior Engineer');
  console.log('   ⏱️  SLA: 15 minute response required\n');
}

// =============================================================================
// Run All Examples
// =============================================================================

async function main() {
  console.log('═'.repeat(70));
  console.log('  🧠 LEDGERMIND - Multi-Industry Decision Memory Examples');
  console.log('  "Agents act. LedgerMind remembers why."');
  console.log('═'.repeat(70));

  try {
    await processRefundRequest();
    await processPriorAuth();
    await processResumeScreening();
    await processAccessRequest();
    await processRouteOptimization();
    await processTicketEscalation();

    console.log('═'.repeat(70));
    console.log('\n✨ All industry examples complete!\n');
    console.log('LedgerMind works for ANY workflow where AI agents make decisions:');
    console.log('  🛒 E-commerce (refunds, pricing, recommendations)');
    console.log('  🏥 Healthcare (prior auth, triage, claims)');
    console.log('  👥 HR (screening, compensation, performance)');
    console.log('  🔒 Security (access, threats, compliance)');
    console.log('  🚚 Logistics (routing, inventory, forecasting)');
    console.log('  🎫 Support (escalation, routing, resolution)');
    console.log('  🏦 Finance (loans, fraud, AML)');
    console.log('  🏭 Manufacturing (QC, maintenance, scheduling)');
    console.log('\n' + '═'.repeat(70) + '\n');
  } catch (error) {
    console.error('Error:', error);
  }
}

if (require.main === module) {
  main();
}

export {
  processRefundRequest,
  processPriorAuth,
  processResumeScreening,
  processAccessRequest,
  processRouteOptimization,
  processTicketEscalation
};
