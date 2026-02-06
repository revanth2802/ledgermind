/**
 * Example: Invoice Approval Agent with LedgerMind
 * 
 * Demonstrates how to integrate LedgerMind with a custom agent system
 */

import { LedgerMindClient, wrapAgent } from '@ledgermind/sdk';

// =============================================================================
// 1. Initialize LedgerMind Client
// =============================================================================

const client = new LedgerMindClient({
  apiUrl: process.env.LEDGERMIND_API_URL || 'http://localhost:3000/api',
  apiKey: process.env.LEDGERMIND_API_KEY || 'demo-key',
  tenantId: 'acme-corp',
});

// =============================================================================
// 2. Define Your Agent Logic
// =============================================================================

interface InvoiceInput {
  invoice_id: string;
  vendor: string;
  amount: number;
  category: string;
  description: string;
}

interface InvoiceDecision {
  approved: boolean;
  confidence: number;
  reasoning: string;
  risk_score: number;
}

// Your existing agent (orchestrator-agnostic)
const invoiceApprovalAgent = {
  name: 'InvoiceApprover',
  execute: async (input: InvoiceInput): Promise<InvoiceDecision> => {
    // Your decision logic here
    const { amount, vendor, category } = input;

    // Simple rule-based logic (in reality, this might use an LLM)
    let approved = false;
    let confidence = 0.5;
    let reasoning = '';
    let riskScore = 0;

    if (amount < 1000) {
      approved = true;
      confidence = 0.95;
      reasoning = 'Amount is below auto-approval threshold';
      riskScore = 0.1;
    } else if (amount < 10000) {
      approved = true;
      confidence = 0.75;
      reasoning = 'Amount is within standard approval range';
      riskScore = 0.3;
    } else {
      approved = false;
      confidence = 0.6;
      reasoning = 'Amount requires manual review';
      riskScore = 0.7;
    }

    return { approved, confidence, reasoning, risk_score: riskScore };
  }
};

// =============================================================================
// 3. Wrap Agent with LedgerMind Memory
// =============================================================================

const memoryAgent = wrapAgent(invoiceApprovalAgent, client, {
  enablePrecedentLookup: true,
  confidenceThreshold: 0.7,
  autoLogStart: true,
  autoLogResult: true,
});

// =============================================================================
// 4. Execute with Precedent Context
// =============================================================================

async function processInvoice(invoice: InvoiceInput) {
  console.log('\n🧾 Processing invoice:', invoice.invoice_id);
  console.log('   Vendor:', invoice.vendor);
  console.log('   Amount: $', invoice.amount);

  // Create a trace for this workflow
  const traceId = client.generateTraceId();

  await client.createTrace({
    trace_id: traceId,
    workflow_name: 'invoice_approval',
    metadata: { invoice_id: invoice.invoice_id },
  });

  // Execute agent with precedent context
  const result = await memoryAgent.execute(invoice);

  console.log('\n📊 Decision:');
  console.log('   Approved:', result.output.approved);
  console.log('   Base Confidence:', result.output.confidence);
  console.log('   Adjusted Confidence:', result.confidence);
  console.log('   Reasoning:', result.reasoning);

  if (result.precedent) {
    console.log('\n🔍 Precedent Analysis:');
    console.log('   Similar cases found:', result.precedent.similar_cases.total_found);
    console.log('   Adjusted confidence:', result.precedent.adjusted_confidence.toFixed(2));
    console.log('   Override rate:', result.precedent.similar_cases.override_rate.toFixed(1) + '%');
    console.log('   Should escalate:', result.precedent.should_escalate);

    if (result.precedent.similar_cases.cases.length > 0) {
      console.log('\n   Top similar case:');
      const topCase = result.precedent.similar_cases.cases[0];
      console.log('     - Similarity:', topCase.similarity_score.toFixed(2));
      console.log('     - Outcome:', topCase.outcome);
      console.log('     - Was overridden:', topCase.was_overridden);
    }
  }

  // Simulate human override for demonstration
  if (result.output.approved && invoice.amount > 5000) {
    console.log('\n⚠️  Human override: Rejecting due to vendor watchlist');
    
    const events = await client.getTrace(traceId);
    const decisionEvent = events.events_summary?.find(e => e.event_type === 'decision_made');

    if (decisionEvent) {
      await client.logOverride({
        original_event_id: decisionEvent.step_id,
        trace_id: traceId,
        actor_name: 'Jane Doe (CFO)',
        original_outcome: 'approved',
        new_outcome: 'rejected',
        reason: 'Vendor on watchlist - requires additional verification',
      });
    }
  }

  console.log('\n✅ Process complete. Trace ID:', traceId);
  console.log('   View timeline: http://localhost:3000/api/traces/' + traceId);
}

// =============================================================================
// 5. Run Examples
// =============================================================================

async function main() {
  console.log('🚀 LedgerMind Example: Invoice Approval with Precedent Memory\n');
  console.log('=' .repeat(70));

  // Example 1: Small invoice (auto-approve)
  await processInvoice({
    invoice_id: 'INV-001',
    vendor: 'Office Supplies Co',
    amount: 500,
    category: 'office_supplies',
    description: 'Printer paper and toner',
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Example 2: Medium invoice (precedent-informed)
  await processInvoice({
    invoice_id: 'INV-002',
    vendor: 'Tech Solutions Inc',
    amount: 7500,
    category: 'software',
    description: 'Annual software licenses',
  });

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Example 3: Large invoice (will be overridden)
  await processInvoice({
    invoice_id: 'INV-003',
    vendor: 'Consulting Partners LLC',
    amount: 15000,
    category: 'consulting',
    description: 'Q1 strategic consulting',
  });

  console.log('\n' + '='.repeat(70));
  console.log('\n✨ All examples complete!');
  console.log('\nNext: Run more invoices to see precedent learning in action.');
  console.log('      Override patterns will adjust future confidence scores.\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { processInvoice, memoryAgent };
