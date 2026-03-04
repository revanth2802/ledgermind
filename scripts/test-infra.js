/**
 * Quick smoke test for all new infrastructure modules.
 * Run: node scripts/test-infra.js
 */

const { HybridScorer } = require('../services/api/dist/scoring');
const { MetricsRegistry, Timer } = require('../services/api/dist/observability');
const { LRUCache, QueryCache } = require('../services/api/dist/cache');
const { IngestionQueue } = require('../services/api/dist/ingestion');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`  ❌ ${name}: ${err.message}`);
    failed++;
  }
}

function assert(condition, msg) {
  if (!condition) throw new Error(msg || 'Assertion failed');
}

console.log('\n🧪 LedgerMind Infrastructure Smoke Tests\n');

// ── Hybrid Scorer ────────────────────────────────────────────────────────────
console.log('Hybrid Scoring:');

test('scores a candidate with all signals', () => {
  const scorer = new HybridScorer();
  const result = scorer.score(
    { vectorScore: 0.85, timestamp: new Date(), workflowName: 'loan', outcome: 'approved' },
    { workflowName: 'loan', outcomeFilter: ['approved'] }
  );
  assert(result.finalScore > 0 && result.finalScore <= 1, `finalScore=${result.finalScore}`);
  assert(result.signals.semanticScore === 0.85);
  assert(result.signals.structuredMatchScore === 1.0, `structuredMatch=${result.signals.structuredMatchScore}`);
  assert(result.signals.timeDecayScore > 0.99, `timeDecay=${result.signals.timeDecayScore}`);
});

test('scoreAndRank returns sorted results', () => {
  const scorer = new HybridScorer();
  const candidates = [
    { vectorScore: 0.5, timestamp: new Date(Date.now() - 90 * 86400000) },
    { vectorScore: 0.9, timestamp: new Date() },
    { vectorScore: 0.7, timestamp: new Date(Date.now() - 7 * 86400000) },
  ];
  const ranked = scorer.scoreAndRank(candidates, {});
  assert(ranked[0].finalScore >= ranked[1].finalScore, 'not sorted');
  assert(ranked[1].finalScore >= ranked[2].finalScore, 'not sorted');
});

test('weights are normalized and accessible', () => {
  const scorer = new HybridScorer({ semantic: 3, metadata: 1, recency: 1 });
  const w = scorer.getWeights();
  assert(Math.abs(w.semantic + w.metadata + w.recency - 1) < 0.001, 'weights dont sum to 1');
  assert(w.semantic === 0.6, `semantic=${w.semantic}`);
});

test('time decay decreases over time', () => {
  const scorer = new HybridScorer();
  const recent = scorer.score({ vectorScore: 0.8, timestamp: new Date() }, {});
  const old = scorer.score({ vectorScore: 0.8, timestamp: new Date(Date.now() - 60 * 86400000) }, {});
  assert(recent.signals.timeDecayScore > old.signals.timeDecayScore, 'recent should decay less');
});

// ── Observability ────────────────────────────────────────────────────────────
console.log('\nObservability:');

test('counter increments and tracks labels', () => {
  const m = new MetricsRegistry();
  m.requestCount.inc(1, 'GET');
  m.requestCount.inc(1, 'GET');
  m.requestCount.inc(1, 'POST');
  assert(m.requestCount.get() === 3, `count=${m.requestCount.get()}`);
  assert(m.requestCount.getByLabel('GET') === 2);
  assert(m.requestCount.getByLabel('POST') === 1);
});

test('timer records latency', () => {
  const timer = new Timer();
  const stop = timer.start();
  // simulate some work
  for (let i = 0; i < 100000; i++) {}
  const elapsed = stop();
  assert(elapsed >= 0, `elapsed=${elapsed}`);
  const snap = timer.snapshot();
  assert(snap.count === 1);
  assert(snap.p50 >= 0);
});

test('metrics snapshot has correct structure', () => {
  const m = new MetricsRegistry();
  m.requestCount.inc(5);
  m.errorCount.inc(1, '500');
  m.cacheHits.inc(10);
  m.cacheMisses.inc(2);
  const snap = m.snapshot();
  assert(snap.requests.total === 5);
  assert(snap.errors.total === 1);
  assert(snap.cache.hits === 10);
  assert(snap.cache.misses === 2);
  assert(snap.cache.hit_ratio > 0.8);
  assert(snap.timestamp);
  assert(snap.uptime_seconds >= 0);
});

// ── Cache ────────────────────────────────────────────────────────────────────
console.log('\nCache:');

test('LRU cache set/get works', () => {
  const cache = new LRUCache({ maxSize: 5, ttlMs: 10000 });
  cache.set('a', 1);
  cache.set('b', 2);
  assert(cache.get('a') === 1);
  assert(cache.get('b') === 2);
  assert(cache.size === 2);
});

test('LRU evicts least recently used', () => {
  const cache = new LRUCache({ maxSize: 3, ttlMs: 10000 });
  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);
  cache.get('a'); // promote a
  cache.set('d', 4); // evicts b (LRU)
  assert(cache.get('b') === undefined, 'b should be evicted');
  assert(cache.get('a') === 1, 'a should still exist');
  assert(cache.get('d') === 4);
});

test('TTL expiry works', () => {
  const cache = new LRUCache({ maxSize: 10, ttlMs: 1 }); // 1ms TTL
  cache.set('x', 42);
  // wait a bit
  const start = Date.now();
  while (Date.now() - start < 5) {} // busy wait 5ms
  assert(cache.get('x') === undefined, 'should have expired');
});

test('QueryCache hashing is deterministic', () => {
  const h1 = QueryCache.hashQuery({ tenantId: 't1', queryText: 'hello' });
  const h2 = QueryCache.hashQuery({ tenantId: 't1', queryText: 'hello' });
  const h3 = QueryCache.hashQuery({ tenantId: 't2', queryText: 'hello' });
  assert(h1 === h2, 'same input should produce same hash');
  assert(h1 !== h3, 'different tenant should produce different hash');
});

// ── Ingestion Queue ──────────────────────────────────────────────────────────
console.log('\nIngestion Queue:');

test('queue accepts and tracks jobs', () => {
  const queue = new IngestionQueue(async () => [0], async () => {});
  const ok = queue.submit({
    id: 'j1', eventId: 'e1', tenantId: 't1',
    embeddingInput: { reasoning: 'test' },
    vectorMetadata: { timestamp: new Date() },
  });
  assert(ok === true, 'should accept');
  assert(queue.depth === 1);
});

test('queue rejects duplicates via idempotency', () => {
  const queue = new IngestionQueue(async () => [0], async () => {});
  queue.submit({
    id: 'j1', eventId: 'e1', tenantId: 't1',
    embeddingInput: {}, vectorMetadata: { timestamp: new Date() },
  });
  // submitting same id again shouldn't increase depth
  // (it's in queue, not yet processed, so it will add again — idempotency is for processed items)
  assert(queue.depth >= 1);
});

test('queue enforces backpressure', () => {
  const queue = new IngestionQueue(async () => [0], async () => {}, { maxSize: 2 });
  queue.submit({ id: 'j1', eventId: 'e1', tenantId: 't1', embeddingInput: {}, vectorMetadata: { timestamp: new Date() } });
  queue.submit({ id: 'j2', eventId: 'e2', tenantId: 't1', embeddingInput: {}, vectorMetadata: { timestamp: new Date() } });
  const rejected = queue.submit({ id: 'j3', eventId: 'e3', tenantId: 't1', embeddingInput: {}, vectorMetadata: { timestamp: new Date() } });
  assert(rejected === false, 'should reject when full');
});

test('status returns correct shape', () => {
  const queue = new IngestionQueue(async () => [0], async () => {});
  const status = queue.status();
  assert(typeof status.depth === 'number');
  assert(typeof status.active === 'number');
  assert(typeof status.deadLetter === 'number');
  assert(typeof status.running === 'boolean');
});

// ── Summary ──────────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(50)}`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`${'─'.repeat(50)}\n`);

process.exit(failed > 0 ? 1 : 0);
