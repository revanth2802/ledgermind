#!/usr/bin/env node

/**
 * Simple test: Create a trace and log events without API dependency
 */

import { Pool } from 'pg';
import { EventRepository, TraceRepository } from '../packages/db/dist/index.js';

async function test() {
  console.log('🧪 Testing LedgerMind Core Components\n');
  
  // Connect to database
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ledgermind',
  });

  try {
    // Test database connection
    console.log('1️⃣ Testing database connection...');
    await pool.query('SELECT 1');
    console.log('   ✅ Database connected\n');

    // Initialize repositories
    const traceRepo = new TraceRepository(pool);
    const eventRepo = new EventRepository(pool);

    // Create a trace
    console.log('2️⃣ Creating workflow trace...');
    const { randomUUID } = await import('crypto');
    const traceId = randomUUID();
    const trace = await traceRepo.createTrace('demo-tenant', {
      trace_id: traceId,
      workflow_name: 'test_workflow',
      metadata: { test: true },
    });
    console.log('   ✅ Trace created:', trace.trace_id);
    console.log('   Workflow:', trace.workflow_name);
    console.log('   Started:', trace.started_at.toISOString(), '\n');

    // Log a decision event
    console.log('3️⃣ Logging decision event...');
    const stepId = randomUUID();
    const event = await eventRepo.createEvent('demo-tenant', {
      trace_id: traceId,
      step_id: stepId,
      actor_type: 'agent',
      actor_name: 'TestAgent',
      event_type: 'decision_made',
      input_summary: { amount: 5000, vendor: 'Acme Corp' },
      output_summary: { approved: true },
      reasoning: 'Amount within threshold',
      confidence: 0.95,
      outcome: 'approved',
    });
    console.log('   ✅ Event logged:', event.event_id);
    console.log('   Actor:', event.actor_name);
    console.log('   Outcome:', event.outcome);
    console.log('   Confidence:', event.confidence, '\n');

    // Retrieve the trace with events
    console.log('4️⃣ Retrieving trace timeline...');
    const retrievedTrace = await traceRepo.getTraceById(traceId);
    console.log('   ✅ Trace retrieved');
    console.log('   Events in timeline:', retrievedTrace?.events_summary?.length || 0);
    if (retrievedTrace?.events_summary && retrievedTrace.events_summary.length > 0) {
      console.log('   First event:', JSON.stringify(retrievedTrace.events_summary[0], null, 2));
    }
    console.log('');

    // Get all events for trace
    console.log('5️⃣ Retrieving all events for trace...');
    const events = await eventRepo.getEventsByTrace(traceId);
    console.log('   ✅ Events retrieved:', events.length);
    console.log('');

    console.log('=' .repeat(70));
    console.log('\n✨ All tests passed! LedgerMind core is working correctly.\n');
    console.log('Next steps:');
    console.log('  - Start API: npm run dev --workspace=@ledgermind/api');
    console.log('  - Run examples: cd examples && npm run invoice\n');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

test();
