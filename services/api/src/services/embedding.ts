/**
 * Composable Embedding Service
 * Supports multiple embedding providers: OpenAI, Cohere, Custom, or None
 */

// =============================================================================
// EMBEDDING PROVIDER INTERFACE (Composable Contract)
// =============================================================================

export interface EmbeddingProvider {
  name: string;
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
}

// =============================================================================
// OPENAI PROVIDER
// =============================================================================

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
  name = 'openai';
  private client: any;
  private model: string;

  constructor(apiKey?: string, model: string = 'text-embedding-ada-002') {
    this.model = model;
    // Lazy import to avoid requiring openai if not used
    const OpenAI = require('openai').default;
    this.client = new OpenAI({
      apiKey: apiKey || process.env.OPENAI_API_KEY,
    });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });
    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
    });
    return response.data.map((d: any) => d.embedding);
  }
}

// =============================================================================
// COHERE PROVIDER
// =============================================================================

export class CohereEmbeddingProvider implements EmbeddingProvider {
  name = 'cohere';
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = 'embed-english-v3.0') {
    this.apiKey = apiKey || process.env.COHERE_API_KEY || '';
    this.model = model;
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts: [text],
        model: this.model,
        input_type: 'search_query',
      }),
    });
    const data = await response.json() as { embeddings: number[][] };
    return data.embeddings[0];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.cohere.ai/v1/embed', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        texts,
        model: this.model,
        input_type: 'search_document',
      }),
    });
    const data = await response.json() as { embeddings: number[][] };
    return data.embeddings;
  }
}

// =============================================================================
// CUSTOM HTTP PROVIDER (Bring Your Own Model)
// =============================================================================

export class CustomEmbeddingProvider implements EmbeddingProvider {
  name = 'custom';
  private endpoint: string;
  private headers: Record<string, string>;

  constructor(endpoint: string, headers: Record<string, string> = {}) {
    this.endpoint = endpoint;
    this.headers = {
      'Content-Type': 'application/json',
      ...headers,
    };
  }

  async embed(text: string): Promise<number[]> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ text }),
    });
    const data = await response.json() as { embedding?: number[]; embeddings?: number[][]; vector?: number[] };
    // Support common response formats
    return data.embedding || data.embeddings?.[0] || data.vector || [];
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ texts }),
    });
    const data = await response.json() as { embeddings?: number[][]; vectors?: number[][] };
    return data.embeddings || data.vectors || [];
  }
}

// =============================================================================
// NULL PROVIDER (No embeddings - use for testing or when not needed)
// =============================================================================

export class NullEmbeddingProvider implements EmbeddingProvider {
  name = 'none';
  private dimensions: number;

  constructor(dimensions: number = 1536) {
    this.dimensions = dimensions;
  }

  async embed(_text: string): Promise<number[]> {
    // Return zero vector
    return new Array(this.dimensions).fill(0);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return texts.map(() => new Array(this.dimensions).fill(0));
  }
}

// =============================================================================
// EMBEDDING SERVICE (Main Service)
// =============================================================================

export type EmbeddingProviderType = 'openai' | 'cohere' | 'custom' | 'none';

export interface EmbeddingConfig {
  provider: EmbeddingProviderType;
  apiKey?: string;
  model?: string;
  endpoint?: string;  // For custom provider
  headers?: Record<string, string>;  // For custom provider
  dimensions?: number;  // For null provider
}

export class EmbeddingService {
  private provider: EmbeddingProvider;

  constructor(config?: EmbeddingConfig) {
    this.provider = this.createProvider(config);
    console.log(`📊 Embedding provider: ${this.provider.name}`);
  }

  private createProvider(config?: EmbeddingConfig): EmbeddingProvider {
    const providerType = config?.provider || process.env.EMBEDDING_PROVIDER as EmbeddingProviderType || 'openai';

    switch (providerType) {
      case 'openai':
        return new OpenAIEmbeddingProvider(config?.apiKey, config?.model);
      
      case 'cohere':
        return new CohereEmbeddingProvider(config?.apiKey, config?.model);
      
      case 'custom':
        const endpoint = config?.endpoint || process.env.EMBEDDING_ENDPOINT;
        if (!endpoint) {
          throw new Error('Custom embedding provider requires endpoint');
        }
        return new CustomEmbeddingProvider(endpoint, config?.headers);
      
      case 'none':
        return new NullEmbeddingProvider(config?.dimensions);
      
      default:
        // Default to OpenAI
        return new OpenAIEmbeddingProvider();
    }
  }

  /**
   * Get the current provider name
   */
  getProviderName(): string {
    return this.provider.name;
  }

  /**
   * Generate embedding from decision context
   */
  async generateEmbedding(context: {
    input?: Record<string, any>;
    output?: Record<string, any>;
    reasoning?: string;
  }): Promise<number[]> {
    const parts: string[] = [];

    if (context.input) {
      parts.push(`Input: ${JSON.stringify(context.input)}`);
    }
    if (context.output) {
      parts.push(`Output: ${JSON.stringify(context.output)}`);
    }
    if (context.reasoning) {
      parts.push(`Reasoning: ${context.reasoning}`);
    }

    const text = parts.join(' | ');
    return this.provider.embed(text);
  }

  /**
   * Generate embedding from plain text (for search queries)
   */
  async generateTextEmbedding(text: string): Promise<number[]> {
    return this.provider.embed(text);
  }

  /**
   * Batch generate embeddings
   */
  async generateBatch(
    contexts: Array<{
      input?: Record<string, any>;
      output?: Record<string, any>;
      reasoning?: string;
    }>
  ): Promise<number[][]> {
    const texts = contexts.map(ctx => {
      const parts: string[] = [];
      if (ctx.input) parts.push(`Input: ${JSON.stringify(ctx.input)}`);
      if (ctx.output) parts.push(`Output: ${JSON.stringify(ctx.output)}`);
      if (ctx.reasoning) parts.push(`Reasoning: ${ctx.reasoning}`);
      return parts.join(' | ');
    });

    return this.provider.embedBatch(texts);
  }
}
