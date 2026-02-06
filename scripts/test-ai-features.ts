/**
 * LedgerMind AI Features Test Script
 * Tests all 5 AI components
 */

import OpenAI from 'openai';
import * as dotenv from 'dotenv';
import { Pool } from 'pg';

// Load env from services/api
dotenv.config({ path: '../services/api/.env' });

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/ledgermind',
});

console.log('═'.repeat(75));
console.log('  🧠 LEDGERMIND AI FEATURES TEST');
console.log('═'.repeat(75));

// =============================================================================
// TEST 1: EMBEDDING GENERATION
// =============================================================================

async function testEmbeddingGeneration() {
  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  1. EMBEDDING GENERATION (AI)                                       │');
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  
  try {
    const decisionContext = {
      agent: 'RefundAgent',
      input: { order_id: 'ORD-123', amount: 299.99, reason: 'product_mismatch' },
      output: { decision: 'approve', refund_type: 'full' },
      reasoning: 'High-value customer with legitimate complaint about color mismatch'
    };

    const textToEmbed = JSON.stringify(decisionContext);
    
    console.log('\n   📝 Input: Decision context for RefundAgent');
    console.log('   🔄 Calling OpenAI text-embedding-3-small...');
    
    const startTime = Date.now();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: textToEmbed,
    });
    const duration = Date.now() - startTime;
    
    const embedding = response.data[0].embedding;
    
    console.log(`\n   ✅ SUCCESS!`);
    console.log(`   📊 Embedding dimensions: ${embedding.length}`);
    console.log(`   ⏱️  Response time: ${duration}ms`);
    console.log(`   🔢 First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]`);
    console.log(`   💰 Tokens used: ${response.usage.total_tokens}`);
    
    return embedding;
  } catch (error: any) {
    console.log(`\n   ❌ FAILED: ${error.message}`);
    if (error.code === 'invalid_api_key') {
      console.log('   💡 Check your OPENAI_API_KEY in services/api/.env');
    }
    return null;
  }
}

// =============================================================================
// TEST 2: SIMILARITY SEARCH
// =============================================================================

async function testSimilaritySearch(queryEmbedding: number[] | null) {
  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  2. SIMILARITY SEARCH (AI-Powered)                                  │');
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  
  if (!queryEmbedding) {
    console.log('\n   ⚠️  Skipped: No embedding available from Test 1');
    return;
  }

  try {
    // First, let's store a few test embeddings
    console.log('\n   📥 Storing test decision embeddings...');
    
    const testDecisions = [
      { context: 'Refund approved for damaged product, customer VIP', outcome: 'approved' },
      { context: 'Refund denied for return outside window', outcome: 'denied' },
      { context: 'Refund approved for color mismatch, high value customer', outcome: 'approved' },
    ];
    
    for (const decision of testDecisions) {
      const embResponse = await openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: decision.context,
      });
      
      // Store in database (using JSONB for now since pgvector not available)
      await pool.query(`
        INSERT INTO decision_vectors (tenant_id, event_id, embedding, decision_type, outcome, timestamp)
        VALUES ($1, uuid_generate_v4(), $2, $3, $4, NOW())
        ON CONFLICT DO NOTHING
      `, ['test-tenant', JSON.stringify(embResponse.data[0].embedding), 'refund', decision.outcome]);
    }
    console.log('   ✅ Stored 3 test embeddings');
    
    // Now search for similar
    console.log('\n   🔍 Searching for similar decisions...');
    
    // Cosine similarity calculation (without pgvector)
    const result = await pool.query(`
      SELECT 
        id, decision_type, outcome,
        embedding
      FROM decision_vectors 
      WHERE tenant_id = $1
      ORDER BY timestamp DESC
      LIMIT 10
    `, ['test-tenant']);
    
    // Calculate cosine similarity in JavaScript
    function cosineSimilarity(a: number[], b: number[]): number {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
      }
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    }
    
    const similarities = result.rows.map(row => {
      const storedEmbedding = typeof row.embedding === 'string' 
        ? JSON.parse(row.embedding) 
        : row.embedding;
      return {
        id: row.id,
        outcome: row.outcome,
        similarity: cosineSimilarity(queryEmbedding, storedEmbedding)
      };
    }).sort((a, b) => b.similarity - a.similarity);
    
    console.log(`\n   ✅ SUCCESS! Found ${similarities.length} similar decisions:`);
    similarities.slice(0, 3).forEach((s, i) => {
      console.log(`      ${i + 1}. Outcome: ${s.outcome}, Similarity: ${(s.similarity * 100).toFixed(1)}%`);
    });
    
    return similarities;
  } catch (error: any) {
    console.log(`\n   ❌ FAILED: ${error.message}`);
    return null;
  }
}

// =============================================================================
// TEST 3: REASONING SUMMARIZATION
// =============================================================================

async function testReasoningSummarization() {
  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  3. REASONING SUMMARIZATION (AI)                                    │');
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  
  try {
    const decisionChain = [
      { agent: 'ClassifierAgent', output: { classification: 'legitimate_complaint' }, confidence: 0.87 },
      { agent: 'CustomerValueAgent', output: { tier: 'high_value', ltv: 4500 }, confidence: 0.95 },
      { agent: 'PolicyAgent', output: { decision: 'auto_approve' }, confidence: 0.91 },
    ];
    
    console.log('\n   📝 Input: 3-step decision chain for refund');
    console.log('   🔄 Calling GPT-4o-mini for summarization...');
    
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: 'You are an AI that summarizes decision chains for audit reports. Be concise (1-2 sentences).'
        },
        {
          role: 'user',
          content: `Summarize this decision chain for a human auditor:\n${JSON.stringify(decisionChain, null, 2)}`
        }
      ],
      max_tokens: 150,
    });
    const duration = Date.now() - startTime;
    
    const summary = response.choices[0].message.content;
    
    console.log(`\n   ✅ SUCCESS!`);
    console.log(`   📋 Summary: "${summary}"`);
    console.log(`   ⏱️  Response time: ${duration}ms`);
    console.log(`   💰 Tokens used: ${response.usage?.total_tokens}`);
    
    return summary;
  } catch (error: any) {
    console.log(`\n   ❌ FAILED: ${error.message}`);
    return null;
  }
}

// =============================================================================
// TEST 4: PATTERN DETECTION
// =============================================================================

async function testPatternDetection() {
  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  4. PATTERN DETECTION (AI)                                          │');
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  
  try {
    // Simulate historical decision data
    const decisionHistory = [
      { agent: 'RiskAgent', outcome: 'approved', confidence: 0.85, was_overridden: false },
      { agent: 'RiskAgent', outcome: 'denied', confidence: 0.65, was_overridden: true },
      { agent: 'RiskAgent', outcome: 'approved', confidence: 0.72, was_overridden: true },
      { agent: 'RiskAgent', outcome: 'denied', confidence: 0.55, was_overridden: true },
      { agent: 'RiskAgent', outcome: 'approved', confidence: 0.91, was_overridden: false },
      { agent: 'RiskAgent', outcome: 'approved', confidence: 0.68, was_overridden: true },
      { agent: 'ApprovalAgent', outcome: 'approved', confidence: 0.88, was_overridden: false },
      { agent: 'ApprovalAgent', outcome: 'approved', confidence: 0.92, was_overridden: false },
    ];
    
    console.log('\n   📊 Input: 8 historical decisions');
    console.log('   🔄 Calling GPT-4o-mini for pattern analysis...');
    
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI analyst detecting patterns in agent decision data. 
Output format:
- Alert: [description]
- Metric: [specific number]
- Recommendation: [action]`
        },
        {
          role: 'user',
          content: `Analyze these decisions for concerning patterns:\n${JSON.stringify(decisionHistory, null, 2)}`
        }
      ],
      max_tokens: 300,
    });
    const duration = Date.now() - startTime;
    
    const analysis = response.choices[0].message.content;
    
    console.log(`\n   ✅ SUCCESS!`);
    console.log(`   🔍 Pattern Analysis:\n${analysis?.split('\n').map(l => '      ' + l).join('\n')}`);
    console.log(`\n   ⏱️  Response time: ${duration}ms`);
    
    return analysis;
  } catch (error: any) {
    console.log(`\n   ❌ FAILED: ${error.message}`);
    return null;
  }
}

// =============================================================================
// TEST 5: RECOMMENDATION ENGINE
// =============================================================================

async function testRecommendationEngine(similarities: any[] | null) {
  console.log('\n┌─────────────────────────────────────────────────────────────────────┐');
  console.log('│  5. RECOMMENDATION ENGINE (AI)                                      │');
  console.log('└─────────────────────────────────────────────────────────────────────┘');
  
  try {
    const currentDecision = {
      agent: 'RefundAgent',
      input: { amount: 350, reason: 'defective_product', customer_tier: 'standard' },
      base_confidence: 0.75
    };
    
    const similarCases = similarities || [
      { outcome: 'approved', similarity: 0.92 },
      { outcome: 'approved', similarity: 0.88 },
      { outcome: 'denied', similarity: 0.85 },
    ];
    
    console.log('\n   📝 Input: Current decision + 3 similar past cases');
    console.log('   🔄 Calling GPT-4o-mini for recommendation...');
    
    const startTime = Date.now();
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI recommendation engine for agent decisions.
Based on similar past cases, provide:
1. Approval rate from similar cases
2. Confidence adjustment (increase/decrease from base)
3. Recommended action
4. Risk flags (if any)
Be concise and specific.`
        },
        {
          role: 'user',
          content: `Current decision:\n${JSON.stringify(currentDecision, null, 2)}\n\nSimilar past cases:\n${JSON.stringify(similarCases, null, 2)}`
        }
      ],
      max_tokens: 200,
    });
    const duration = Date.now() - startTime;
    
    const recommendation = response.choices[0].message.content;
    
    console.log(`\n   ✅ SUCCESS!`);
    console.log(`   💡 Recommendation:\n${recommendation?.split('\n').map(l => '      ' + l).join('\n')}`);
    console.log(`\n   ⏱️  Response time: ${duration}ms`);
    
    return recommendation;
  } catch (error: any) {
    console.log(`\n   ❌ FAILED: ${error.message}`);
    return null;
  }
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function main() {
  const results = {
    embedding: false,
    similarity: false,
    summarization: false,
    pattern: false,
    recommendation: false,
  };
  
  try {
    // Test 1: Embedding Generation
    const embedding = await testEmbeddingGeneration();
    results.embedding = !!embedding;
    
    // Test 2: Similarity Search
    const similarities = await testSimilaritySearch(embedding);
    results.similarity = !!similarities;
    
    // Test 3: Reasoning Summarization
    const summary = await testReasoningSummarization();
    results.summarization = !!summary;
    
    // Test 4: Pattern Detection
    const patterns = await testPatternDetection();
    results.pattern = !!patterns;
    
    // Test 5: Recommendation Engine
    const recommendation = await testRecommendationEngine(similarities ?? null);
    results.recommendation = !!recommendation;
    
  } catch (error) {
    console.error('Test runner error:', error);
  }
  
  // Summary
  console.log('\n' + '═'.repeat(75));
  console.log('  📊 TEST RESULTS SUMMARY');
  console.log('═'.repeat(75));
  console.log(`
   1. Embedding Generation:     ${results.embedding ? '✅ PASS' : '❌ FAIL'}
   2. Similarity Search:        ${results.similarity ? '✅ PASS' : '❌ FAIL'}
   3. Reasoning Summarization:  ${results.summarization ? '✅ PASS' : '❌ FAIL'}
   4. Pattern Detection:        ${results.pattern ? '✅ PASS' : '❌ FAIL'}
   5. Recommendation Engine:    ${results.recommendation ? '✅ PASS' : '❌ FAIL'}
  `);
  
  const passCount = Object.values(results).filter(Boolean).length;
  console.log(`   Total: ${passCount}/5 AI features working`);
  
  if (passCount === 5) {
    console.log('\n   🎉 All AI features operational! Your OpenAI API is working correctly.');
  } else if (passCount > 0) {
    console.log('\n   ⚠️  Some features working. Check failed tests above.');
  } else {
    console.log('\n   ❌ No features working. Check your OPENAI_API_KEY.');
  }
  
  console.log('\n' + '═'.repeat(75) + '\n');
  
  await pool.end();
  process.exit(passCount === 5 ? 0 : 1);
}

main().catch(console.error);
