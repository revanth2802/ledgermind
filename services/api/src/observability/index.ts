/**
 * Observability & Metrics Layer
 *
 * Provides in-memory metrics collection with P50/P95 percentile tracking,
 * request counting, latency histograms, and error rate monitoring.
 *
 * Design:
 * ───────
 * - Zero external dependencies (no Prometheus client, no StatsD)
 * - Ring-buffer based histograms for bounded memory (configurable window)
 * - Thread-safe enough for single-process Node.js (no mutex needed)
 * - Exposes a /metrics endpoint returning JSON
 *
 * Future:
 * ───────
 * - OpenTelemetry integration via OTLP exporter
 * - Prometheus exposition format
 * - Push-based metrics to Datadog / Grafana Cloud
 */

// ─── Counter ─────────────────────────────────────────────────────────────────

export class Counter {
  private value = 0;
  private labels: Map<string, number> = new Map();

  inc(amount = 1, label?: string): void {
    this.value += amount;
    if (label) {
      this.labels.set(label, (this.labels.get(label) || 0) + amount);
    }
  }

  get(): number {
    return this.value;
  }

  getByLabel(label: string): number {
    return this.labels.get(label) || 0;
  }

  getLabels(): Record<string, number> {
    return Object.fromEntries(this.labels);
  }

  reset(): void {
    this.value = 0;
    this.labels.clear();
  }
}

// ─── Histogram (Ring Buffer) ─────────────────────────────────────────────────

export class Histogram {
  private buffer: number[];
  private cursor = 0;
  private count = 0;
  private total = 0;
  private readonly capacity: number;

  constructor(capacity = 10_000) {
    this.capacity = capacity;
    this.buffer = new Array(capacity).fill(0);
  }

  observe(value: number): void {
    this.buffer[this.cursor % this.capacity] = value;
    this.cursor++;
    this.count++;
    this.total += value;
  }

  /** Get percentile (0–100) from the current window */
  percentile(p: number): number {
    const n = Math.min(this.count, this.capacity);
    if (n === 0) return 0;

    const sorted = this.buffer.slice(0, n).sort((a, b) => a - b);
    const idx = Math.ceil((p / 100) * n) - 1;
    return sorted[Math.max(0, idx)];
  }

  p50(): number {
    return this.percentile(50);
  }

  p95(): number {
    return this.percentile(95);
  }

  p99(): number {
    return this.percentile(99);
  }

  mean(): number {
    return this.count === 0 ? 0 : this.total / this.count;
  }

  getCount(): number {
    return this.count;
  }

  snapshot(): HistogramSnapshot {
    return {
      count: this.count,
      mean: Number(this.mean().toFixed(2)),
      p50: Number(this.p50().toFixed(2)),
      p95: Number(this.p95().toFixed(2)),
      p99: Number(this.p99().toFixed(2)),
    };
  }
}

export interface HistogramSnapshot {
  count: number;
  mean: number;
  p50: number;
  p95: number;
  p99: number;
}

// ─── Timer (wraps Histogram for latency tracking) ────────────────────────────

export class Timer {
  private histogram = new Histogram();

  /** Start a timer, returns a function that stops it and records duration in ms */
  start(): () => number {
    const startTime = performance.now();
    return () => {
      const duration = performance.now() - startTime;
      this.histogram.observe(duration);
      return duration;
    };
  }

  /** Wrap an async function and automatically record its latency */
  async time<T>(fn: () => Promise<T>): Promise<T> {
    const stop = this.start();
    try {
      return await fn();
    } finally {
      stop();
    }
  }

  snapshot(): HistogramSnapshot {
    return this.histogram.snapshot();
  }
}

// ─── Metrics Registry ────────────────────────────────────────────────────────

export interface MetricsSnapshot {
  uptime_seconds: number;
  timestamp: string;
  requests: {
    total: number;
    by_method: Record<string, number>;
    by_status: Record<string, number>;
    by_route: Record<string, number>;
  };
  errors: {
    total: number;
    by_type: Record<string, number>;
  };
  latency: {
    request: HistogramSnapshot;
    ingestion: HistogramSnapshot;
    retrieval: HistogramSnapshot;
    embedding: HistogramSnapshot;
    db_query: HistogramSnapshot;
  };
  cache: {
    hits: number;
    misses: number;
    hit_ratio: number;
    evictions: number;
  };
  ingestion: {
    queued: number;
    processed: number;
    failed: number;
    retries: number;
  };
}

export class MetricsRegistry {
  private startTime = Date.now();

  // Counters
  readonly requestCount = new Counter();
  readonly errorCount = new Counter();
  readonly cacheHits = new Counter();
  readonly cacheMisses = new Counter();
  readonly cacheEvictions = new Counter();
  readonly ingestionQueued = new Counter();
  readonly ingestionProcessed = new Counter();
  readonly ingestionFailed = new Counter();
  readonly ingestionRetries = new Counter();

  // Timers / Histograms
  readonly requestLatency = new Timer();
  readonly ingestionLatency = new Timer();
  readonly retrievalLatency = new Timer();
  readonly embeddingLatency = new Timer();
  readonly dbQueryLatency = new Timer();

  snapshot(): MetricsSnapshot {
    const cacheHitVal = this.cacheHits.get();
    const cacheMissVal = this.cacheMisses.get();
    const cacheTotal = cacheHitVal + cacheMissVal;

    return {
      uptime_seconds: Number(((Date.now() - this.startTime) / 1000).toFixed(1)),
      timestamp: new Date().toISOString(),
      requests: {
        total: this.requestCount.get(),
        by_method: this.requestCount.getLabels(),
        by_status: {},  // populated via middleware labels
        by_route: {},
      },
      errors: {
        total: this.errorCount.get(),
        by_type: this.errorCount.getLabels(),
      },
      latency: {
        request: this.requestLatency.snapshot(),
        ingestion: this.ingestionLatency.snapshot(),
        retrieval: this.retrievalLatency.snapshot(),
        embedding: this.embeddingLatency.snapshot(),
        db_query: this.dbQueryLatency.snapshot(),
      },
      cache: {
        hits: cacheHitVal,
        misses: cacheMissVal,
        hit_ratio: cacheTotal === 0 ? 0 : Number((cacheHitVal / cacheTotal).toFixed(4)),
        evictions: this.cacheEvictions.get(),
      },
      ingestion: {
        queued: this.ingestionQueued.get(),
        processed: this.ingestionProcessed.get(),
        failed: this.ingestionFailed.get(),
        retries: this.ingestionRetries.get(),
      },
    };
  }
}

// ─── Express Middleware ──────────────────────────────────────────────────────

import { Request, Response, NextFunction } from 'express';

/**
 * Middleware that records request count and latency per route.
 */
export function metricsMiddleware(metrics: MetricsRegistry) {
  return (req: Request, res: Response, next: NextFunction) => {
    const stop = metrics.requestLatency.start();

    metrics.requestCount.inc(1, req.method);

    res.on('finish', () => {
      stop();
      metrics.requestCount.inc(1, `${res.statusCode}`);

      if (res.statusCode >= 400) {
        metrics.errorCount.inc(1, `${res.statusCode}`);
      }
    });

    next();
  };
}

/**
 * Creates a /metrics endpoint handler.
 */
export function metricsHandler(metrics: MetricsRegistry) {
  return (_req: Request, res: Response) => {
    res.json(metrics.snapshot());
  };
}

// ─── Singleton for global access ─────────────────────────────────────────────

let globalMetrics: MetricsRegistry | null = null;

export function getMetrics(): MetricsRegistry {
  if (!globalMetrics) {
    globalMetrics = new MetricsRegistry();
  }
  return globalMetrics;
}

export function resetMetrics(): void {
  globalMetrics = new MetricsRegistry();
}
