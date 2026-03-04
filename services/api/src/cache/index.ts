/**
 * In-Memory LRU Cache with TTL
 *
 * Provides hot-query optimization for similarity search results.
 * Cache keys are derived by hashing the query parameters so identical
 * searches hit the cache instead of re-embedding + re-querying.
 *
 * Design Decisions:
 * ─────────────────
 * 1. LRU eviction: Keeps frequently-accessed queries warm while
 *    bounding memory to a configurable max-size.
 *
 * 2. TTL-based invalidation: Prevents stale results from being served
 *    after new ingestion. Default 5 minutes balances freshness vs latency.
 *
 * 3. Query-hash keying: Deterministic hash of (tenant, query text, filters)
 *    ensures cache hits even across different request objects.
 *
 * Tradeoffs:
 * ──────────
 * - Stale Results Risk: Cached results may not include decisions ingested
 *   after the cache entry was created. Mitigated by short TTL and manual
 *   invalidation on write paths.
 *
 * - Memory vs Latency: Each cached entry stores the full result set.
 *   With default maxSize=500 and typical result payloads of ~10KB,
 *   worst-case memory is ~5MB — acceptable for a single-process server.
 *
 * - Cache Hit Ratio: Effectiveness depends on query repetition patterns.
 *   Dashboard queries (repeated polling) benefit significantly.
 *   Unique ad-hoc queries will always miss.
 *
 * Future:
 * ───────
 * - Redis backend for shared cache across multiple API instances
 * - Cache warming on startup for known hot queries
 * - Namespace-scoped invalidation on ingestion
 */

import { createHash } from 'crypto';
import { MetricsRegistry } from '../observability';

// ─── LRU Node ────────────────────────────────────────────────────────────────

interface CacheEntry<T> {
  key: string;
  value: T;
  expiresAt: number;
  prev: CacheEntry<T> | null;
  next: CacheEntry<T> | null;
}

// ─── LRU Cache ───────────────────────────────────────────────────────────────

export interface CacheConfig {
  /** Maximum number of entries. Default 500 */
  maxSize: number;
  /** Time-to-live in milliseconds. Default 300_000 (5 min) */
  ttlMs: number;
  /** Optional metrics registry for hit/miss tracking */
  metrics?: MetricsRegistry;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxSize: 500,
  ttlMs: 5 * 60 * 1000,
};

export class LRUCache<T = any> {
  private map: Map<string, CacheEntry<T>> = new Map();
  private head: CacheEntry<T> | null = null;
  private tail: CacheEntry<T> | null = null;
  private config: CacheConfig;
  private metrics?: MetricsRegistry;

  constructor(config?: Partial<CacheConfig>) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.metrics = this.config.metrics;
  }

  /**
   * Get a value by key. Returns undefined on miss or expiry.
   * Promotes the entry to the head (most recently used) on hit.
   */
  get(key: string): T | undefined {
    const entry = this.map.get(key);

    if (!entry) {
      this.metrics?.cacheMisses.inc();
      return undefined;
    }

    // Check TTL expiry
    if (Date.now() > entry.expiresAt) {
      this.remove(key);
      this.metrics?.cacheMisses.inc();
      return undefined;
    }

    // Promote to head (most recent)
    this.moveToHead(entry);
    this.metrics?.cacheHits.inc();
    return entry.value;
  }

  /**
   * Set a value. Evicts LRU entry if at capacity.
   */
  set(key: string, value: T, ttlMs?: number): void {
    const existing = this.map.get(key);

    if (existing) {
      existing.value = value;
      existing.expiresAt = Date.now() + (ttlMs ?? this.config.ttlMs);
      this.moveToHead(existing);
      return;
    }

    // Evict if at capacity
    if (this.map.size >= this.config.maxSize) {
      this.evictLRU();
    }

    const entry: CacheEntry<T> = {
      key,
      value,
      expiresAt: Date.now() + (ttlMs ?? this.config.ttlMs),
      prev: null,
      next: this.head,
    };

    if (this.head) {
      this.head.prev = entry;
    }
    this.head = entry;
    if (!this.tail) {
      this.tail = entry;
    }

    this.map.set(key, entry);
  }

  /**
   * Remove a specific key.
   */
  remove(key: string): boolean {
    const entry = this.map.get(key);
    if (!entry) return false;
    this.unlink(entry);
    this.map.delete(key);
    return true;
  }

  /**
   * Invalidate all entries matching a prefix (e.g., tenant-scoped invalidation).
   */
  invalidateByPrefix(prefix: string): number {
    let count = 0;
    for (const [key] of this.map) {
      if (key.startsWith(prefix)) {
        this.remove(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.map.clear();
    this.head = null;
    this.tail = null;
  }

  /** Current number of entries */
  get size(): number {
    return this.map.size;
  }

  // ─── Internal ──────────────────────────────────────────────────────────────

  private evictLRU(): void {
    if (!this.tail) return;
    const evicted = this.tail;
    this.unlink(evicted);
    this.map.delete(evicted.key);
    this.metrics?.cacheEvictions.inc();
  }

  private moveToHead(entry: CacheEntry<T>): void {
    if (entry === this.head) return;
    this.unlink(entry);
    entry.prev = null;
    entry.next = this.head;
    if (this.head) this.head.prev = entry;
    this.head = entry;
    if (!this.tail) this.tail = entry;
  }

  private unlink(entry: CacheEntry<T>): void {
    if (entry.prev) entry.prev.next = entry.next;
    if (entry.next) entry.next.prev = entry.prev;
    if (entry === this.head) this.head = entry.next;
    if (entry === this.tail) this.tail = entry.prev;
    entry.prev = null;
    entry.next = null;
  }
}

// ─── Query Cache (specialized for similarity search) ─────────────────────────

export interface QueryCacheOptions {
  maxSize?: number;
  ttlMs?: number;
  metrics?: MetricsRegistry;
}

export class QueryCache {
  private cache: LRUCache;

  constructor(options?: QueryCacheOptions) {
    this.cache = new LRUCache({
      maxSize: options?.maxSize ?? 500,
      ttlMs: options?.ttlMs ?? 5 * 60 * 1000,
      metrics: options?.metrics,
    });
  }

  /**
   * Generate a deterministic cache key from query parameters.
   */
  static hashQuery(params: {
    tenantId: string;
    queryText?: string;
    embedding?: number[];
    filters?: Record<string, any>;
  }): string {
    const payload = JSON.stringify({
      t: params.tenantId,
      q: params.queryText,
      // Use first/last 4 floats as fingerprint to avoid hashing huge vectors
      ef: params.embedding
        ? [...params.embedding.slice(0, 4), ...params.embedding.slice(-4)]
        : null,
      f: params.filters,
    });

    return createHash('sha256').update(payload).digest('hex').slice(0, 16);
  }

  get<T>(key: string): T | undefined {
    return this.cache.get(key) as T | undefined;
  }

  set<T>(key: string, value: T, ttlMs?: number): void {
    this.cache.set(key, value, ttlMs);
  }

  /**
   * Invalidate all cache entries for a tenant (call after ingestion).
   */
  invalidateTenant(tenantId: string): void {
    // Since our hash keys don't contain the tenant prefix directly,
    // we clear the whole cache on writes. In a Redis-backed implementation
    // we would use tenant-scoped key prefixes.
    this.cache.clear();
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
