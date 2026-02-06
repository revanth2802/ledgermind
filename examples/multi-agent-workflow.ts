/**
 * Example: Multi-Agent Workflow with LedgerMind
 * 
 * Demonstrates a complex workflow with multiple agents sharing decision memory
 */

import { LedgerMindClient, wrapAgent } from '@ledgermind/sdk';

const client = new LedgerMindClient({
  apiUrl: process.env.LEDGERMIND_API_URL || 'http://localhost:3000/api',
  apiKey: process.env.LEDGERMIND_API_KEY || 'demo-key',
  tenantId: 'acme-corp',
});

// =============================================================================
// Define Multi-Step Workflow
// =============================================================================

// Agent 1: Classify transaction
const classifierAgent = {
  name: 'TransactionClassifier',
  execute: async (input: { description: string; amount: number }) => {
    // Simple classification logic
    const category = input.description.toLowerCase().includes('travel')
      ? 'travel'
      : input.description.toLowerCase().includes('software')
      ? 'software'
      : 'general';

    return {
      category,
      confidence: 0.85,
      reasoning: `Classified as ${category} based on description keywords`,
    };
  }
};

// Agent 2: Risk assessment
const riskAgent = {
  name: 'RiskAssessor',
  execute: async (input: { amount: number; category: string; vendor: string }) => {
    let riskScore = 0.0;

    // Amount-based risk
    if (input.amount > 50000) riskScore += 0.4;
    else if (input.amount > 10000) riskScore += 0.2;

    // Category-based risk
    if (input.category === 'travel') riskScore += 0.1;

    return {
      risk_score: Math.min(riskScore, 1.0),
      risk_level: riskScore > 0.6 ? 'high' : riskScore > 0.3 ? 'medium' : 'low',
      confidence: 0.9,
      reasoning: `Risk score: ${riskScore.toFixed(2)} based on amount and category`,
    };
  }
};

// Agent 3: Final approval
const approvalAgent = {
  name: 'FinalApprover',
  execute: async (input: {
    amount: number;
    category: string;
    risk_score: number;
    risk_level: string;
  }) => {
    const approved = input.risk_level === 'low' && input.amount < 10000;

    return {
      approved,
      confidence: approved ? 0.85 : 0.6,
      reasoning: approved
        ? `Low risk (${input.risk_level}) and amount within threshold`
        : `Requires review: ${input.risk_level} risk or high amount`,
    };
  }
};

// Wrap agents with memory
const memoryClassifier = wrapAgent(classifierAgent, client);
const memoryRisk = wrapAgent(riskAgent, client);
const memoryApproval = wrapAgent(approvalAgent, client);

// =============================================================================
// Orchestrate Multi-Agent Workflow
// =============================================================================

async function processTransaction(transaction: {
  transaction_id: string;
  vendor: string;
  amount: number;
  description: string;
}) {
  console.log('\n💳 Processing transaction:', transaction.transaction_id);
  console.log('   Vendor:', transaction.vendor);
  console.log('   Amount: $', transaction.amount);
  console.log('   Description:', transaction.description);

  // Create trace
  const traceId = client.generateTraceId();
  await client.createTrace({
    trace_id: traceId,
    workflow_name: 'transaction_approval',
    metadata: { transaction_id: transaction.transaction_id },
  });

  // Step 1: Classify
  console.log('\n📋 Step 1: Classification');
  const classificationResult = await memoryClassifier.execute(
    {
      description: transaction.description,
      amount: transaction.amount,
    },
    traceId
  );
  console.log('   Category:', classificationResult.output.category);
  console.log('   Confidence:', classificationResult.confidence.toFixed(2));

  // Step 2: Risk Assessment
  console.log('\n⚠️  Step 2: Risk Assessment');
  const riskResult = await memoryRisk.execute(
    {
      amount: transaction.amount,
      category: classificationResult.output.category,
      vendor: transaction.vendor,
    },
    traceId
  );
  console.log('   Risk Level:', riskResult.output.risk_level);
  console.log('   Risk Score:', riskResult.output.risk_score.toFixed(2));
  console.log('   Confidence:', riskResult.confidence.toFixed(2));

  // Step 3: Final Approval
  console.log('\n✅ Step 3: Approval Decision');
  const approvalResult = await memoryApproval.execute(
    {
      amount: transaction.amount,
      category: classificationResult.output.category,
      risk_score: riskResult.output.risk_score,
      risk_level: riskResult.output.risk_level,
    },
    traceId
  );
  console.log('   Approved:', approvalResult.output.approved);
  console.log('   Confidence:', approvalResult.confidence.toFixed(2));
  // Display precedent insights
  if (approvalResult.precedent) {
    console.log('\n🧠 Precedent Memory:');
    console.log('   Similar decisions:', approvalResult.precedent.similar_cases?.cases?.length ?? 0);
    if (approvalResult.precedent.similar_cases?.precedent_alignment_score !== undefined) {
      console.log(
        '   Alignment score:',
        approvalResult.precedent.similar_cases.precedent_alignment_score.toFixed(2)
      );
    }
    if (approvalResult.precedent.similar_cases?.override_rate !== undefined) {
      console.log(
        '   Historical override rate:',
        (approvalResult.precedent.similar_cases.override_rate * 100).toFixed(1) + '%'
      );
    }
  }

  console.log('\n✨ Workflow complete. Trace ID:', traceId);
  return { traceId, approved: approvalResult.output.approved };
}

// =============================================================================
// Run Multi-Agent Examples
// =============================================================================

async function main() {
  console.log('🚀 Multi-Agent Workflow Example\n');
  console.log('=' .repeat(70));

  // Example 1: Low-risk transaction
  await processTransaction({
    transaction_id: 'TXN-001',
    vendor: 'Local Coffee Shop',
    amount: 50,
    description: 'Team breakfast meeting',
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Example 2: Medium-risk transaction
  await processTransaction({
    transaction_id: 'TXN-002',
    vendor: 'Adobe Systems',
    amount: 5000,
    description: 'Annual software subscription renewal',
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Example 3: High-risk transaction
  await processTransaction({
    transaction_id: 'TXN-003',
    vendor: 'Global Airlines',
    amount: 25000,
    description: 'International business travel - team offsite',
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n✨ Multi-agent workflow examples complete!');
  console.log('\nEach agent step is logged with precedent context.');
  console.log('Future similar transactions will benefit from this history.\n');
}

if (require.main === module) {
  main().catch(console.error);
}

export { processTransaction };
