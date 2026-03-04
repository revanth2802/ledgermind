/**
 * Async / Decoupled Ingestion Path
 *
 * Transforms the ingestion pipeline from:
 *   Request → Embed → Store → Return
 * To:
 *   Request → Queue → Return (202 Accepted)
 *   Worker  → Embed → Store (background)
 *
 * Design:
 * ──────
 * - In-memory queue with configurable concurrency (default 5 workers)
 * - Retry logic with exponential backoff (base 1s, max 30s, 3 attempts)
 * - Idempotency guard via event_id dedup set (prevents duplicate processing)
 * - Bounded queue size with backpressure signaling
 *
 * Throughput Scaling:
 * ──────────────────
 * Decoupling ingestion from embedding allows the API to accept events at
 * network speed while embedding (the bottleneck) processes at API-call speed.
 * A 10ms accept vs 200ms embed gives ~20x throughput improvement.
 *
 * Failure Isolation:
 * ─────────────────
 * Embedding API outages no longer block event acceptance. Failed items
 * retry with backoff, and after max retries move to a dead-letter queue
 * for manual inspection.
 *
 * Backpressure:
 * ─────────────
 * When the queue reaches maxSize, new submissions are rejected with a
 * 503 (Service Unavailable) signal. This prevents unbounded memory growth
 * and gives the caller a clear signal to slow down.
 *
 * Future:
 * ───────
 * - Replace in-memory queue with Redis/BullMQ for persistence
 * - Add priority lanes (high-priority decisions skip the queue)
 * - Partition workers by tenant for isolation
 */

import { MetricsRegistry } from '../observability';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface IngestionJob {
  /** Unique job ID for idempotency tracking */
  id: string;
  /** The event ID that was created synchronously */
  eventId: string;
  /** Tenant context */
  tenantId: string;
  /** Data to embed */
  embeddingInput: {
    input?: Record<string, any>;
    output?: Record<string, any>;
    reasoning?: string;
  };
  /** Metadata for vector storage */
  vectorMetadata: {
    decision_type?: string;
    workflow_name?: string;
    outcome?: string;
    policy_version_id?: string;
    timestamp: Date;
  };
  /** Retry state */
  attempts: number;
  maxAttempts: number;
  nextRetryAt: number;
  /** Timestamps */
  createdAt: number;
  lastError?: string;
}

export interface IngestionQueueConfig {
  /** Maximum queue depth. Default 10_000 */
  maxSize: number;
  /** Maximum concurrent workers. Default 5 */
  concurrency: number;
  /** Maximum retry attempts per job. Default 3 */
  maxRetries: number;
  /** Base delay for exponential backoff in ms. Default 1000 */
  baseRetryDelayMs: number;
  /** Maximum backoff delay in ms. Default 30_000 */
  maxRetryDelayMs: number;
  /** How often the worker loop checks for jobs (ms). Default 100 */
  pollIntervalMs: number;
  /** Metrics registry */
  metrics?: MetricsRegistry;
}

export type EmbedFn = (input: {
  input?: Record<string, any>;
  output?: Record<string, any>;
  reasoning?: string;
}) => Promise<number[]>;

export type StoreFn = (
  eventId: string,
  tenantId: string,
  embedding: number[],
  metadata: IngestionJob['vectorMetadata']
) => Promise<void>;

// ─── Queue Implementation ────────────────────────────────────────────────────

const DEFAULT_CONFIG: IngestionQueueConfig = {
  maxSize: 10_000,
  concurrency: 5,
  maxRetries: 3,
  baseRetryDelayMs: 1000,
  maxRetryDelayMs: 30_000,
  pollIntervalMs: 100,
};

export class IngestionQueue {
  private queue: IngestionJob[] = [];
  private deadLetter: IngestionJob[] = [];
  private processing: Set<string> = new Set();
  private processedIds: Set<string> = new Set();
  private config: IngestionQueueConfig;
  private embedFn: EmbedFn;
  private storeFn: StoreFn;
  private metrics?: MetricsRegistry;
  private running = false;
  private timer: ReturnType<typeof setInterval> | null = null;

  // Idempotency dedup window: keep IDs for 1 hour then prune
  private readonly DEDUP_PRUNE_INTERVAL = 60 * 60 * 1000;
  private lastPrune = Date.now();

  constructor(
    embedFn: EmbedFn,
    storeFn: StoreFn,
    config?: Partial<IngestionQueueConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.embedFn = embedFn;
    this.storeFn = storeFn;
    this.metrics = this.config.metrics;
  }

  /**
   * Submit a job to the queue.
   * Returns true if accepted, false if rejected (backpressure).
   */
  submit(job: Omit<IngestionJob, 'attempts' | 'maxAttempts' | 'nextRetryAt' | 'createdAt'>): boolean {
    // Idempotency check
    if (this.processedIds.has(job.id)) {
      return true; // Already processed, silently accept
    }

    // Backpressure check
    if (this.queue.length >= this.config.maxSize) {
      return false;
    }

    const fullJob: IngestionJob = {
      ...job,
      attempts: 0,
      maxAttempts: this.config.maxRetries,
      nextRetryAt: 0,
      createdAt: Date.now(),
    };

    this.queue.push(fullJob);
    this.metrics?.ingestionQueued.inc();
    return true;
  }

  /**
   * Start the background worker loop.
   */
  start(): void {
    if (this.running) return;
    this.running = true;

    this.timer = setInterval(() => {
      this.tick();
    }, this.config.pollIntervalMs);

    console.log(`📥 Ingestion queue started (concurrency=${this.config.concurrency})`);
  }

  /**
   * Stop the worker loop gracefully.
   */
  async stop(): Promise<void> {
    this.running = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    // Wait for in-flight jobs to complete
    while (this.processing.size > 0) {
      await new Promise((r) => setTimeout(r, 100));
    }

    console.log(`📥 Ingestion queue stopped. ${this.queue.length} jobs remaining.`);
  }

  /**
   * Internal: Process available jobs up to concurrency limit.
   */
  private tick(): void {
    // Prune idempotency set periodically
    if (Date.now() - this.lastPrune > this.DEDUP_PRUNE_INTERVAL) {
      this.processedIds.clear();
      this.lastPrune = Date.now();
    }

    const now = Date.now();
    const available = this.config.concurrency - this.processing.size;
    if (available <= 0) return;

    let dispatched = 0;
    for (let i = 0; i < this.queue.length && dispatched < available; i++) {
      const job = this.queue[i];

      // Skip jobs waiting for retry
      if (job.nextRetryAt > now) continue;

      // Skip already-processing jobs (shouldn't happen but guard)
      if (this.processing.has(job.id)) continue;

      // Remove from queue and process
      this.queue.splice(i, 1);
      i--; // Adjust index after splice
      this.processing.add(job.id);
      dispatched++;

      this.processJob(job);
    }
  }

  /**
   * Process a single job with retry logic.
   */
  private async processJob(job: IngestionJob): Promise<void> {
    const stop = this.metrics?.ingestionLatency.start();

    try {
      job.attempts++;

      // Step 1: Generate embedding
      const embedding = await this.embedFn(job.embeddingInput);

      // Step 2: Store vector
      await this.storeFn(
        job.eventId,
        job.tenantId,
        embedding,
        job.vectorMetadata
      );

      // Success
      this.processedIds.add(job.id);
      this.metrics?.ingestionProcessed.inc();
    } catch (error) {
      job.lastError = (error as Error).message;

      if (job.attempts >= job.maxAttempts) {
        // Move to dead-letter queue
        this.deadLetter.push(job);
        this.metrics?.ingestionFailed.inc();
        console.error(
          `❌ Ingestion job ${job.id} failed permanently after ${job.attempts} attempts: ${job.lastError}`
        );
      } else {
        // Schedule retry with exponential backoff + jitter
        const delay = Math.min(
          this.config.baseRetryDelayMs * Math.pow(2, job.attempts - 1) +
            Math.random() * 500,
          this.config.maxRetryDelayMs
        );
        job.nextRetryAt = Date.now() + delay;
        this.queue.push(job);
        this.metrics?.ingestionRetries.inc();
        console.warn(
          `⚠️  Ingestion job ${job.id} attempt ${job.attempts}/${job.maxAttempts} failed, retrying in ${Math.round(delay)}ms`
        );
      }
    } finally {
      this.processing.delete(job.id);
      stop?.();
    }
  }

  // ─── Diagnostics ──────────────────────────────────────────────────────────

  /** Current queue depth */
  get depth(): number {
    return this.queue.length;
  }

  /** Number of jobs currently being processed */
  get activeWorkers(): number {
    return this.processing.size;
  }

  /** Dead letter queue entries */
  getDeadLetterQueue(): readonly IngestionJob[] {
    return this.deadLetter;
  }

  /** Retry all dead-letter items */
  retryDeadLetter(): number {
    const count = this.deadLetter.length;
    for (const job of this.deadLetter) {
      job.attempts = 0;
      job.nextRetryAt = 0;
      this.queue.push(job);
    }
    this.deadLetter = [];
    return count;
  }

  /** Status snapshot for diagnostics */
  status(): {
    depth: number;
    active: number;
    deadLetter: number;
    totalProcessed: number;
    running: boolean;
  } {
    return {
      depth: this.queue.length,
      active: this.processing.size,
      deadLetter: this.deadLetter.length,
      totalProcessed: this.metrics?.ingestionProcessed.get() ?? 0,
      running: this.running,
    };
  }
}
