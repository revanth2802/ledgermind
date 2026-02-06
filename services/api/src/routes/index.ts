import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { EventRepository, TraceRepository, VectorRepository, OverrideRepository } from '@ledgermind/db';
import { z } from 'zod';
import { EmbeddingService } from '../services/embedding';

export function createRouter(pool: Pool): Router {
  const router = Router();
  
  const eventRepo = new EventRepository(pool);
  const traceRepo = new TraceRepository(pool);
  const vectorRepo = new VectorRepository(pool);
  const overrideRepo = new OverrideRepository(pool);
  const embeddingService = new EmbeddingService();

  // ==========================================================================
  // TRACES
  // ==========================================================================

  router.post('/traces', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const trace = await traceRepo.createTrace(tenantId, req.body);
      res.json(trace);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/traces/:traceId', async (req: Request, res: Response) => {
    try {
      const trace = await traceRepo.getTraceById(req.params.traceId as string);
      if (!trace) {
        return res.status(404).json({ error: 'Trace not found' });
      }
      res.json(trace);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.patch('/traces/:traceId', async (req: Request, res: Response) => {
    try {
      const { traceId } = req.params;
      const { final_outcome } = req.body;
      
      const query = `
        UPDATE trace_views 
        SET final_outcome = $1, ended_at = NOW()
        WHERE trace_id = $2
        RETURNING *
      `;
      const result = await pool.query(query, [final_outcome, traceId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Trace not found' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/traces', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const limit = parseInt(req.query.limit as string) || 50;
      const traces = await traceRepo.getTracesByTenant(tenantId, limit);
      res.json(traces);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==========================================================================
  // EVENTS
  // ==========================================================================

  // List events with optional filtering
  router.get('/events', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const { trace_id, agent_name, limit = 50 } = req.query;
      
      let query = `SELECT * FROM decision_events WHERE tenant_id = $1`;
      const params: any[] = [tenantId];
      
      if (trace_id) {
        params.push(trace_id);
        query += ` AND trace_id = $${params.length}`;
      }
      if (agent_name) {
        params.push(agent_name);
        query += ` AND actor_name = $${params.length}`;
      }
      
      query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
      params.push(Number(limit));
      
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.post('/events', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      
      // Create event
      const event = await eventRepo.createEvent(tenantId, req.body);

      // If it's a decision event, generate and store embedding
      if (req.body.event_type === 'decision_made') {
        const embedding = await embeddingService.generateEmbedding({
          input: req.body.input_summary,
          output: req.body.output_summary,
          reasoning: req.body.reasoning,
        });

        await vectorRepo.storeVector(
          event.event_id,
          tenantId,
          embedding,
          {
            decision_type: req.body.metadata?.decision_type,
            workflow_name: req.body.metadata?.workflow_name,
            outcome: req.body.outcome,
            policy_version_id: req.body.policy_version_id,
            timestamp: event.timestamp,
          }
        );
      }

      res.json(event);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/events/:eventId', async (req: Request, res: Response) => {
    try {
      const event = await eventRepo.getEventById(req.params.eventId as string);
      if (!event) {
        return res.status(404).json({ error: 'Event not found' });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==========================================================================
  // SIMILARITY SEARCH
  // ==========================================================================

  router.post('/similarity/query', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const query = req.body;

      // Generate embedding for query context
      const queryEmbedding = await embeddingService.generateEmbedding({
        input: query.input_context,
      });

      // Find similar cases
      const similarCases = await vectorRepo.findSimilar(
        tenantId,
        queryEmbedding,
        {
          limit: query.limit,
          minSimilarity: query.min_similarity,
          workflowName: query.workflow_name,
          outcomeFilter: query.outcome_filter,
          policyVersionId: query.policy_version_id,
        }
      );

      // Calculate aggregate statistics
      const totalFound = similarCases.length;
      const avgConfidence = similarCases.reduce((sum, c) => sum + (c.confidence || 0), 0) / (totalFound || 1);
      const overrideCount = similarCases.filter(c => c.was_overridden).length;
      const overrideRate = (overrideCount / (totalFound || 1)) * 100;

      // Calculate outcome distribution
      const outcomeDistribution = similarCases.reduce((dist, c) => {
        if (c.outcome) {
          dist[c.outcome] = (dist[c.outcome] || 0) + 1;
        }
        return dist;
      }, {} as Record<string, number>);

      // Calculate precedent alignment score
      // High score = low override rate + high confidence + recency
      const precedentAlignmentScore = Math.max(0, Math.min(1,
        (1 - (overrideRate / 100)) * 0.5 + // Override rate weight
        avgConfidence * 0.3 + // Confidence weight
        0.2 // Base score for having precedents
      ));

      res.json({
        cases: similarCases,
        total_found: totalFound,
        avg_confidence: avgConfidence,
        override_rate: overrideRate,
        outcome_distribution: outcomeDistribution,
        precedent_alignment_score: precedentAlignmentScore,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==========================================================================
  // OVERRIDES
  // ==========================================================================

  router.post('/overrides', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const override = await overrideRepo.createOverride(tenantId, req.body);
      res.json(override);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/overrides', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const { trace_id, limit = 50 } = req.query;
      
      let query = `SELECT * FROM override_events WHERE tenant_id = $1`;
      const params: any[] = [tenantId];
      
      if (trace_id) {
        params.push(trace_id);
        query += ` AND trace_id = $${params.length}`;
      }
      
      query += ` ORDER BY timestamp DESC LIMIT $${params.length + 1}`;
      params.push(Number(limit));
      
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/overrides/rate', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const workflowName = req.query.workflow_name as string | undefined;
      const rate = await overrideRepo.getOverrideRate(tenantId, workflowName);
      res.json({ override_rate: rate });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==========================================================================
  // POLICIES
  // ==========================================================================

  router.post('/policies', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const policy = req.body;
      
      // Auto-generate UUID if not provided
      const policyVersionId = policy.policy_version_id || `pv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const query = `
        INSERT INTO policy_versions (
          policy_version_id, tenant_id, policy_name, version, content, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (tenant_id, policy_name, version) DO UPDATE
        SET content = $5, metadata = $6
        RETURNING *
      `;
      
      const result = await pool.query(query, [
        policyVersionId,
        tenantId,
        policy.policy_name,
        policy.version || 1,
        JSON.stringify(policy.content || {}),
        JSON.stringify(policy.metadata || {}),
      ]);
      
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/policies', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const policyName = req.query.policy_name as string | undefined;
      
      let query = 'SELECT * FROM policy_versions WHERE tenant_id = $1';
      const params: any[] = [tenantId];
      
      if (policyName) {
        query += ' AND policy_name = $2';
        params.push(policyName);
      }
      
      query += ' ORDER BY created_at DESC';
      
      const result = await pool.query(query, params);
      res.json(result.rows);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/policies/:policyVersionId', async (req: Request, res: Response) => {
    try {
      const query = 'SELECT * FROM policy_versions WHERE policy_version_id = $1';
      const result = await pool.query(query, [req.params.policyVersionId]);
      
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Policy not found' });
      }
      
      res.json(result.rows[0]);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==========================================================================
  // ANALYTICS
  // ==========================================================================

  router.get('/analytics/overview', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      
      // Get counts
      const tracesResult = await pool.query(
        'SELECT COUNT(*) as count FROM trace_views WHERE tenant_id = $1',
        [tenantId]
      );
      
      const eventsResult = await pool.query(
        'SELECT COUNT(*) as count FROM decision_events WHERE tenant_id = $1',
        [tenantId]
      );
      
      const overridesResult = await pool.query(
        'SELECT COUNT(*) as count FROM override_events WHERE tenant_id = $1',
        [tenantId]
      );
      
      // Get outcome distribution
      const outcomesResult = await pool.query(
        `SELECT outcome, COUNT(*) as count 
         FROM decision_events 
         WHERE tenant_id = $1 AND outcome IS NOT NULL
         GROUP BY outcome`,
        [tenantId]
      );
      
      // Get avg confidence
      const confidenceResult = await pool.query(
        `SELECT AVG(confidence) as avg_confidence 
         FROM decision_events 
         WHERE tenant_id = $1 AND confidence IS NOT NULL`,
        [tenantId]
      );
      
      res.json({
        total_traces: parseInt(tracesResult.rows[0].count),
        total_events: parseInt(eventsResult.rows[0].count),
        total_overrides: parseInt(overridesResult.rows[0].count),
        outcome_distribution: outcomesResult.rows.reduce((acc, row) => {
          acc[row.outcome] = parseInt(row.count);
          return acc;
        }, {} as Record<string, number>),
        avg_confidence: parseFloat(confidenceResult.rows[0].avg_confidence) || 0,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/analytics/agents', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      
      const result = await pool.query(
        `SELECT 
          de.actor_name,
          COUNT(*) as decision_count,
          AVG(de.confidence) as avg_confidence,
          COUNT(CASE WHEN de.outcome = 'approved' THEN 1 END) as approved_count,
          COUNT(CASE WHEN de.outcome = 'rejected' THEN 1 END) as rejected_count,
          COUNT(CASE WHEN de.outcome = 'escalated' THEN 1 END) as escalated_count,
          COUNT(oe.override_id) as override_count
         FROM decision_events de
         LEFT JOIN override_events oe ON de.event_id = oe.original_event_id
         WHERE de.tenant_id = $1 AND de.actor_type = 'agent'
         GROUP BY de.actor_name
         ORDER BY decision_count DESC`,
        [tenantId]
      );
      
      res.json(result.rows.map(row => ({
        agent_name: row.actor_name,
        total_decisions: parseInt(row.decision_count),
        avg_confidence: parseFloat(row.avg_confidence) || 0,
        outcomes: {
          approved: parseInt(row.approved_count) || 0,
          rejected: parseInt(row.rejected_count) || 0,
          escalated: parseInt(row.escalated_count) || 0,
        },
        override_count: parseInt(row.override_count) || 0,
      })));
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==========================================================================
  // AI-POWERED ENDPOINTS
  // ==========================================================================

  /**
   * AI: Smart recommendation before making a decision
   */
  router.post('/ai/recommend', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const { agent_name, input, proposed_output, confidence } = req.body;

      let similarCases: any[] = [];
      let overrideRate = 0;
      const outcomes: Record<string, number> = {};

      try {
        // Get similar past cases
        const queryEmbedding = await embeddingService.generateEmbedding({ input });
        similarCases = await vectorRepo.findSimilar(tenantId, queryEmbedding, { limit: 10 });

        // Calculate override rate for similar decisions
        overrideRate = similarCases.filter(c => c.was_overridden).length / (similarCases.length || 1);
        
        // Calculate outcome distribution
        similarCases.forEach(c => {
          if (c.outcome) outcomes[c.outcome] = (outcomes[c.outcome] || 0) + 1;
        });
      } catch (embeddingError) {
        // If embedding fails, continue without similar cases
        console.error('Embedding/similarity search failed:', embeddingError);
      }

      // Determine recommendation based on data
      let recommendation: 'proceed' | 'review' | 'reject' = 'proceed';
      let adjustedConfidence = confidence;
      const warnings: string[] = [];

      if (overrideRate > 0.3) {
        recommendation = 'review';
        adjustedConfidence *= 0.8;
        warnings.push(`High override rate (${(overrideRate * 100).toFixed(0)}%) for similar decisions`);
      }

      if (confidence < 0.7) {
        recommendation = 'review';
        warnings.push('Low confidence score suggests human review');
      }

      // Check for negative outcomes in similar cases
      const negativeOutcomes = (outcomes['rejected'] || 0) + (outcomes['failed'] || 0) + (outcomes['defaulted'] || 0);
      if (negativeOutcomes > similarCases.length * 0.4) {
        recommendation = 'review';
        adjustedConfidence *= 0.7;
        warnings.push(`${negativeOutcomes} of ${similarCases.length} similar cases had negative outcomes`);
      }

      res.json({
        recommendation,
        adjustedConfidence: Math.max(0, Math.min(1, adjustedConfidence)),
        reasoning: `Based on ${similarCases.length} similar past cases with ${(overrideRate * 100).toFixed(0)}% override rate`,
        warnings,
        similarCasesCount: similarCases.length,
        outcomeDistribution: outcomes,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * AI: Explain a decision trace
   */
  router.post('/ai/explain', async (req: Request, res: Response) => {
    try {
      const { trace_id } = req.body;
      
      // Get trace with events
      const trace = await traceRepo.getTraceById(trace_id);
      if (!trace) {
        return res.status(404).json({ error: 'Trace not found' });
      }

      const events = trace.events_summary || [];

      // Generate explanation using OpenAI
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI decision explainer. Generate a clear, human-readable explanation 
of what happened in this decision trace. Be concise but thorough. Include:
1. What the workflow was about
2. Key decisions made by each agent
3. The final outcome and why

Also provide a JSON response with keys: explanation, summary, keyDecisions (array), riskFactors (array)`,
          },
          {
            role: 'user',
            content: `Trace ID: ${trace.trace_id}
Workflow: ${trace.workflow_name}
Final Outcome: ${trace.final_outcome || 'pending'}

Events:
${events.map((e: any, i: number) => `
${i + 1}. ${e.actor_name} (${e.event_type})
   Outcome: ${e.outcome || 'n/a'}
   Confidence: ${e.confidence ? `${(e.confidence * 100).toFixed(0)}%` : 'n/a'}
`).join('\n')}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 600,
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * AI: Detect patterns in decisions
   */
  router.post('/ai/patterns', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const { limit = 100 } = req.body;

      // Get recent events
      const result = await pool.query(
        `SELECT actor_name, outcome, confidence, timestamp 
         FROM decision_events 
         WHERE tenant_id = $1 
         ORDER BY timestamp DESC 
         LIMIT $2`,
        [tenantId, limit]
      );

      const decisions = result.rows.map(row => ({
        agentName: row.actor_name,
        outcome: row.outcome || 'unknown',
        confidence: parseFloat(row.confidence) || 0.5,
        wasOverridden: false, // TODO: join with overrides
        timestamp: row.timestamp,
      }));

      // Compute statistics
      const agentStats: Record<string, { total: number; outcomes: Record<string, number>; avgConf: number }> = {};
      decisions.forEach(d => {
        if (!agentStats[d.agentName]) {
          agentStats[d.agentName] = { total: 0, outcomes: {}, avgConf: 0 };
        }
        const s = agentStats[d.agentName];
        s.total++;
        s.outcomes[d.outcome] = (s.outcomes[d.outcome] || 0) + 1;
        s.avgConf = (s.avgConf * (s.total - 1) + d.confidence) / s.total;
      });

      // Use OpenAI to analyze patterns
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Analyze decision patterns for anomalies and trends. Respond in JSON with this EXACT structure:
{
  "patterns": [{"type": "anomaly|trend|bias", "description": "plain string", "severity": "high|medium|low", "affectedAgent": "agent name or null"}],
  "insights": ["insight 1 as plain string", "insight 2 as plain string"],
  "alerts": ["alert 1 as plain string if any critical issues", "alert 2 as plain string"]
}
All strings must be plain strings, not objects. alerts should only contain critical issues needing immediate attention.`,
          },
          {
            role: 'user',
            content: `Agent Statistics:\n${JSON.stringify(agentStats, null, 2)}\n\nRecent decisions (${decisions.length}): ${JSON.stringify(decisions.slice(0, 20), null, 2)}`,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 500,
      });

      const result2 = JSON.parse(response.choices[0]?.message?.content || '{}');
      res.json(result2);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * AI: Generate audit report
   */
  router.post('/ai/audit-report', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const { period_start, period_end } = req.body;

      // Get overview stats
      const statsResult = await pool.query(
        `SELECT 
          COUNT(*) as total,
          AVG(confidence) as avg_confidence
         FROM decision_events 
         WHERE tenant_id = $1`,
        [tenantId]
      );

      const outcomeResult = await pool.query(
        `SELECT outcome, COUNT(*) as count 
         FROM decision_events 
         WHERE tenant_id = $1 AND outcome IS NOT NULL
         GROUP BY outcome`,
        [tenantId]
      );

      const agentResult = await pool.query(
        `SELECT actor_name, COUNT(*) as count 
         FROM decision_events 
         WHERE tenant_id = $1 
         GROUP BY actor_name`,
        [tenantId]
      );

      const data = {
        period: { start: period_start, end: period_end },
        totalDecisions: parseInt(statsResult.rows[0]?.total) || 0,
        averageConfidence: parseFloat(statsResult.rows[0]?.avg_confidence) || 0,
        outcomeDistribution: outcomeResult.rows.reduce((acc: any, r) => {
          acc[r.outcome] = parseInt(r.count);
          return acc;
        }, {}),
        decisionsByAgent: agentResult.rows.reduce((acc: any, r) => {
          acc[r.actor_name] = parseInt(r.count);
          return acc;
        }, {}),
        overrideRate: 0, // TODO: calculate from overrides table
      };

      // Generate report using OpenAI
      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Generate a compliance audit report for AI decision systems. Respond in JSON with this EXACT structure:
{
  "executiveSummary": "2-3 sentence summary string",
  "findings": ["finding 1 as plain string", "finding 2 as plain string"],
  "concerns": ["concern 1 as plain string", "concern 2 as plain string"],
  "recommendations": ["recommendation 1 as plain string", "recommendation 2 as plain string"],
  "complianceStatus": "compliant" or "needs_review" or "non_compliant"
}
All array items must be plain strings, not objects. Focus on compliance, fairness, and operational efficiency.`,
          },
          {
            role: 'user',
            content: JSON.stringify(data, null, 2),
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 800,
      });

      const report = JSON.parse(response.choices[0]?.message?.content || '{}');
      res.json(report);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * AI: Parse natural language query
   */
  router.post('/ai/parse-query', async (req: Request, res: Response) => {
    try {
      const { query } = req.body;

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `Parse query into filters. Respond in JSON: { filters: {workflowName?, agentName?, outcome?, dateRange?: {start, end}}, interpretation: string }`,
          },
          {
            role: 'user',
            content: query,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 200,
      });

      const result = JSON.parse(response.choices[0]?.message?.content || '{}');
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * AI: Generate reasoning for a decision
   */
  router.post('/ai/generate-reasoning', async (req: Request, res: Response) => {
    try {
      const { agentName, input, output } = req.body;

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Generate a clear 1-2 sentence reasoning for why this AI agent made this decision. Be specific and reference the actual data.',
          },
          {
            role: 'user',
            content: `Agent: ${agentName}\nInput: ${JSON.stringify(input)}\nOutput: ${JSON.stringify(output)}`,
          },
        ],
        max_tokens: 150,
      });

      res.json({
        reasoning: response.choices[0]?.message?.content || 'Unable to generate reasoning',
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * AI: Find similar decisions using vector search
   */
  router.post('/ai/similar', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const { query, limit = 10 } = req.body;

      if (!query) {
        return res.status(400).json({ error: 'Query is required' });
      }

      // Generate embedding for the query
      const embedding = await embeddingService.generateTextEmbedding(query);

      // Search for similar cases using vector similarity
      const similarCases = await vectorRepo.findSimilar(tenantId, embedding, { limit });

      // Map to include event details
      const casesWithEvents = similarCases.map(sc => ({
        event: {
          event_id: sc.event_id,
          trace_id: sc.trace_id,
          timestamp: sc.timestamp,
          actor_name: sc.actor_name,
          reasoning: sc.reasoning,
          outcome: sc.outcome,
          confidence: sc.confidence,
          input_context: sc.input_summary,
        },
        similarity: sc.similarity_score,
      }));

      res.json({ similar_cases: casesWithEvents });
    } catch (error) {
      console.error('Similar search error:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  });

  /**
   * AI: Ask natural language questions about decision history
   */
  router.post('/ai/ask', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const { question } = req.body;

      if (!question) {
        return res.status(400).json({ error: 'Question is required' });
      }

      // Get recent decisions for context
      const decisionsResult = await pool.query(
        `SELECT * FROM decision_events WHERE tenant_id = $1 ORDER BY timestamp DESC LIMIT 100`,
        [tenantId]
      );
      const decisions = decisionsResult.rows;
      
      // Get agent statistics
      const agentStatsResult = await pool.query(
        `SELECT 
          actor_name,
          COUNT(*) as total_decisions,
          AVG(confidence) as avg_confidence,
          COUNT(*) FILTER (WHERE outcome = 'approved') as approved_count,
          COUNT(*) FILTER (WHERE outcome = 'rejected') as rejected_count
         FROM decision_events 
         WHERE tenant_id = $1 
         GROUP BY actor_name`,
        [tenantId]
      );

      const agentStats = agentStatsResult.rows;

      // Get override statistics
      const overrideStatsResult = await pool.query(
        `SELECT 
          COUNT(*) as total_overrides,
          COUNT(DISTINCT original_event_id) as unique_overridden_decisions
         FROM override_events 
         WHERE tenant_id = $1`,
        [tenantId]
      );

      const overrideStats = overrideStatsResult.rows[0] || {};

      const OpenAI = (await import('openai')).default;
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an AI assistant analyzing decision-making patterns and audit trails. Answer questions about the decision history with specific data points and insights. Be concise but informative.`,
          },
          {
            role: 'user',
            content: `Question: ${question}

Agent Statistics:
${JSON.stringify(agentStats, null, 2)}

Override Statistics:
${JSON.stringify(overrideStats, null, 2)}

Recent Decisions (last ${decisions.length}):
${JSON.stringify(decisions.slice(0, 20), null, 2)}`,
          },
        ],
        max_tokens: 500,
      });

      res.json({
        answer: response.choices[0]?.message?.content || 'Unable to generate answer',
        context: {
          total_decisions: decisions.length,
          agents_analyzed: agentStats.length,
          total_overrides: overrideStats.total_overrides || 0,
        },
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==========================================================================
  // BATCH IMPORT (Composability - Import historical decisions)
  // ==========================================================================

  /**
   * Batch import decisions with embeddings
   * Allows importing historical decisions from external systems
   */
  router.post('/decisions/batch', async (req: Request, res: Response) => {
    try {
      const tenantId = (req as any).tenantId;
      const { decisions, generate_embeddings = true } = req.body;

      if (!Array.isArray(decisions) || decisions.length === 0) {
        return res.status(400).json({ error: 'decisions must be a non-empty array' });
      }

      if (decisions.length > 1000) {
        return res.status(400).json({ error: 'Maximum batch size is 1000 decisions' });
      }

      const results = {
        imported: 0,
        failed: 0,
        errors: [] as string[],
      };

      // Process in batches of 50 for efficiency
      const BATCH_SIZE = 50;
      for (let i = 0; i < decisions.length; i += BATCH_SIZE) {
        const batch = decisions.slice(i, i + BATCH_SIZE);
        
        // Generate embeddings for batch if requested
        let embeddings: number[][] | null = null;
        if (generate_embeddings) {
          try {
            embeddings = await embeddingService.generateBatch(
              batch.map(d => ({
                input: d.input,
                output: d.output,
                reasoning: d.reasoning,
              }))
            );
          } catch (embeddingError) {
            console.error('Batch embedding generation failed:', embeddingError);
            // Continue without embeddings
          }
        }

        // Insert decisions and vectors
        for (let j = 0; j < batch.length; j++) {
          const decision = batch[j];
          try {
            // Create event
            const event = await eventRepo.createEvent(tenantId, {
              trace_id: decision.trace_id || `batch_${Date.now()}_${i + j}`,
              step_id: decision.step_id || `step_${i + j}`,
              event_type: 'decision_made',
              actor_type: 'agent',
              actor_name: decision.agent_name || 'unknown',
              input_summary: decision.input,
              output_summary: decision.output,
              reasoning: decision.reasoning,
              outcome: decision.outcome,
              confidence: decision.confidence,
              metadata: decision.metadata || {},
            });

            // Store embedding if available
            if (embeddings && embeddings[j]) {
              await vectorRepo.storeVector(
                event.event_id,
                tenantId,
                embeddings[j],
                {
                  decision_type: decision.decision_type,
                  workflow_name: decision.workflow_name,
                  outcome: decision.outcome,
                  timestamp: event.timestamp,
                }
              );
            } else if (decision.embedding) {
              // Use pre-computed embedding if provided
              await vectorRepo.storeVector(
                event.event_id,
                tenantId,
                decision.embedding,
                {
                  decision_type: decision.decision_type,
                  workflow_name: decision.workflow_name,
                  outcome: decision.outcome,
                  timestamp: event.timestamp,
                }
              );
            }

            results.imported++;
          } catch (error) {
            results.failed++;
            results.errors.push(`Decision ${i + j}: ${(error as Error).message}`);
          }
        }
      }

      res.json({
        success: true,
        imported: results.imported,
        failed: results.failed,
        errors: results.errors.slice(0, 10), // Limit error messages returned
        message: `Imported ${results.imported} decisions, ${results.failed} failed`,
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  // ==========================================================================
  // SYSTEM STATUS (Composability - Check configuration)
  // ==========================================================================

  /**
   * Get system status including embedding provider info
   */
  router.get('/status', async (_req: Request, res: Response) => {
    try {
      // Check database connection
      let dbStatus = 'unknown';
      try {
        await pool.query('SELECT 1');
        dbStatus = 'connected';
      } catch {
        dbStatus = 'disconnected';
      }

      res.json({
        status: 'ok',
        version: '1.0.0',
        embedding_provider: embeddingService.getProviderName(),
        database: dbStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      res.status(500).json({ error: (error as Error).message });
    }
  });

  return router;
}
