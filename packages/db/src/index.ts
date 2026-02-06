import { Pool, PoolConfig } from 'pg';

export interface DatabaseConfig extends PoolConfig {
  // Extends pg.PoolConfig
}

export class Database {
  private pool: Pool;

  constructor(config: DatabaseConfig) {
    this.pool = new Pool(config);
  }

  /**
   * Get a client from the pool
   */
  async getClient() {
    return this.pool.connect();
  }

  /**
   * Execute a query
   */
  async query(text: string, params?: any[]) {
    return this.pool.query(text, params);
  }

  /**
   * Close the pool
   */
  async close() {
    await this.pool.end();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const result = await this.query('SELECT 1');
      return result.rowCount === 1;
    } catch (error) {
      return false;
    }
  }
}

export * from './repositories';
