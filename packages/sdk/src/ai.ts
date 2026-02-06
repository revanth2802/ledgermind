import OpenAI from 'openai';

export interface AIConfig {
  openaiApiKey: string;
  model?: string;
  embeddingModel?: string;
}

/**
 * AI-powered features for LedgerMind
 * Provides reasoning generation, summarization, pattern detection, and more
 */
export class LedgerMindAI {
  private openai: OpenAI;
  private model: string;
  private embeddingModel: string;

  constructor(config: AIConfig) {
    this.openai = new OpenAI({ apiKey: config.openaiApiKey });
    this.model = config.model || 'gpt-4o-mini';
    this.embeddingModel = config.embeddingModel || 'text-embedding-3-small';
  }

  /**
   * Generate embedding for decision context
   */
  async generateEmbedding(text: string): Promise<number[]> {
    const response = await this.openai.embeddings.create({
      model: this.embeddingModel,
      input: text,
    });
    return response.data[0].embedding;
  }

  /**
   * AI Feature 1: Auto-generate reasoning when agent doesn't provide one
   */
  async generateReasoning(decision: {
    agentName: string;
    input: Record<string, any>;
    output: Record<string, any>;
  }): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are an AI decision explainer. Given an agent's input and output, generate a clear, 
concise reasoning explanation (1-2 sentences) for why the agent made this decision. 
Be specific and reference the actual data.`,
        },
        {
          role: 'user',
          content: `Agent: ${decision.agentName}
Input: ${JSON.stringify(decision.input, null, 2)}
Output: ${JSON.stringify(decision.output, null, 2)}

Generate a reasoning explanation:`,
        },
      ],
      max_tokens: 150,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || 'No reasoning generated';
  }

  /**
   * AI Feature 2: Summarize a decision trace for audit reports
   */
  async summarizeTrace(trace: {
    workflowName: string;
    events: Array<{
      actorName: string;
      eventType: string;
      inputSummary?: Record<string, any>;
      outputSummary?: Record<string, any>;
      reasoning?: string;
      outcome?: string;
    }>;
    finalOutcome?: string;
  }): Promise<{
    summary: string;
    keyDecisions: string[];
    riskFactors: string[];
    recommendation: string;
  }> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are an AI audit assistant. Analyze decision traces and provide:
1. A clear summary of what happened
2. Key decisions made
3. Any risk factors identified
4. A recommendation

Respond in JSON format with keys: summary, keyDecisions (array), riskFactors (array), recommendation`,
        },
        {
          role: 'user',
          content: `Workflow: ${trace.workflowName}
Final Outcome: ${trace.finalOutcome || 'pending'}

Decision Chain:
${trace.events.map((e, i) => `
Step ${i + 1}: ${e.actorName} (${e.eventType})
  Input: ${JSON.stringify(e.inputSummary)}
  Output: ${JSON.stringify(e.outputSummary)}
  Reasoning: ${e.reasoning || 'none provided'}
  Outcome: ${e.outcome || 'n/a'}
`).join('\n')}

Analyze this decision trace:`,
        },
      ],
      max_tokens: 500,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  }

  /**
   * AI Feature 3: Detect patterns and anomalies in decisions
   */
  async detectPatterns(decisions: Array<{
    agentName: string;
    outcome: string;
    confidence: number;
    wasOverridden: boolean;
    timestamp: string;
  }>): Promise<{
    patterns: Array<{
      type: 'anomaly' | 'trend' | 'correlation';
      description: string;
      severity: 'low' | 'medium' | 'high';
      affectedAgent?: string;
    }>;
    insights: string[];
    alerts: string[];
  }> {
    // First, compute basic statistics
    const agentStats: Record<string, {
      total: number;
      overridden: number;
      avgConfidence: number;
      outcomes: Record<string, number>;
    }> = {};

    for (const d of decisions) {
      if (!agentStats[d.agentName]) {
        agentStats[d.agentName] = { total: 0, overridden: 0, avgConfidence: 0, outcomes: {} };
      }
      const stats = agentStats[d.agentName];
      stats.total++;
      if (d.wasOverridden) stats.overridden++;
      stats.avgConfidence = (stats.avgConfidence * (stats.total - 1) + d.confidence) / stats.total;
      stats.outcomes[d.outcome] = (stats.outcomes[d.outcome] || 0) + 1;
    }

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are an AI pattern detection system for agent decision analysis.
Analyze the statistics and identify:
1. Anomalies (unusual patterns)
2. Trends (changes over time)
3. Correlations (relationships between factors)

Respond in JSON with keys: patterns (array of {type, description, severity, affectedAgent}), insights (array), alerts (array)`,
        },
        {
          role: 'user',
          content: `Agent Statistics:
${JSON.stringify(agentStats, null, 2)}

Raw decisions (last ${decisions.length}):
${JSON.stringify(decisions.slice(-20), null, 2)}

Detect patterns and anomalies:`,
        },
      ],
      max_tokens: 600,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  }

  /**
   * AI Feature 4: Smart recommendations based on precedent
   */
  async getSmartRecommendation(context: {
    currentDecision: {
      agentName: string;
      input: Record<string, any>;
      proposedOutput: Record<string, any>;
      confidence: number;
    };
    similarCases: Array<{
      input: Record<string, any>;
      output: Record<string, any>;
      outcome: string;
      wasOverridden: boolean;
      overrideReason?: string;
    }>;
  }): Promise<{
    recommendation: 'proceed' | 'review' | 'reject';
    adjustedConfidence: number;
    reasoning: string;
    warnings: string[];
    suggestedModifications?: Record<string, any>;
  }> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are an AI decision advisor. Based on the current decision and similar past cases,
provide a recommendation. Consider:
- Historical outcomes of similar decisions
- Override patterns (if humans frequently override similar decisions)
- Risk factors

Respond in JSON with keys: recommendation ('proceed'|'review'|'reject'), adjustedConfidence (0-1), 
reasoning (string), warnings (array), suggestedModifications (optional object)`,
        },
        {
          role: 'user',
          content: `Current Decision:
Agent: ${context.currentDecision.agentName}
Input: ${JSON.stringify(context.currentDecision.input)}
Proposed Output: ${JSON.stringify(context.currentDecision.proposedOutput)}
Agent Confidence: ${context.currentDecision.confidence}

Similar Past Cases (${context.similarCases.length} found):
${context.similarCases.map((c, i) => `
Case ${i + 1}:
  Input: ${JSON.stringify(c.input)}
  Output: ${JSON.stringify(c.output)}
  Outcome: ${c.outcome}
  Was Overridden: ${c.wasOverridden}
  ${c.overrideReason ? `Override Reason: ${c.overrideReason}` : ''}
`).join('\n')}

Provide recommendation:`,
        },
      ],
      max_tokens: 400,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  }

  /**
   * AI Feature 5: Natural language query to structured filter
   */
  async parseNaturalQuery(query: string): Promise<{
    filters: {
      workflowName?: string;
      agentName?: string;
      outcome?: string;
      dateRange?: { start: string; end: string };
      amountRange?: { min: number; max: number };
      confidence?: { min: number; max: number };
    };
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    limit?: number;
    interpretation: string;
  }> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are a natural language query parser for a decision tracking system.
Convert natural language queries into structured filters.

Available filters:
- workflowName: string (e.g., 'loan_approval', 'refund_processing')
- agentName: string (e.g., 'RiskAgent', 'CreditAgent')
- outcome: string ('approved', 'rejected', 'pending', 'escalated')
- dateRange: { start: ISO date, end: ISO date }
- amountRange: { min: number, max: number }
- confidence: { min: 0-1, max: 0-1 }

Respond in JSON with keys: filters (object), sortBy (optional), sortOrder (optional), limit (optional), interpretation (string explaining what you understood)`,
        },
        {
          role: 'user',
          content: `Query: "${query}"

Parse this into structured filters:`,
        },
      ],
      max_tokens: 300,
      temperature: 0.1,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  }

  /**
   * AI Feature 6: Generate audit report
   */
  async generateAuditReport(data: {
    period: { start: string; end: string };
    totalDecisions: number;
    decisionsByAgent: Record<string, number>;
    outcomeDistribution: Record<string, number>;
    overrideRate: number;
    averageConfidence: number;
    topOverrideReasons: Array<{ reason: string; count: number }>;
  }): Promise<{
    executiveSummary: string;
    findings: string[];
    concerns: string[];
    recommendations: string[];
    complianceStatus: 'compliant' | 'needs_review' | 'non_compliant';
  }> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are an AI compliance auditor. Generate a professional audit report based on decision analytics.
Be specific, cite numbers, and provide actionable recommendations.

Respond in JSON with keys: executiveSummary, findings (array), concerns (array), recommendations (array), 
complianceStatus ('compliant'|'needs_review'|'non_compliant')`,
        },
        {
          role: 'user',
          content: `Audit Period: ${data.period.start} to ${data.period.end}

Metrics:
- Total Decisions: ${data.totalDecisions}
- Decisions by Agent: ${JSON.stringify(data.decisionsByAgent)}
- Outcome Distribution: ${JSON.stringify(data.outcomeDistribution)}
- Human Override Rate: ${(data.overrideRate * 100).toFixed(1)}%
- Average Confidence: ${(data.averageConfidence * 100).toFixed(1)}%
- Top Override Reasons: ${JSON.stringify(data.topOverrideReasons)}

Generate audit report:`,
        },
      ],
      max_tokens: 800,
      temperature: 0.3,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content || '{}';
    return JSON.parse(content);
  }

  /**
   * AI Feature 7: Explain a specific decision trace
   */
  async explainTrace(trace: {
    traceId: string;
    workflowName: string;
    events: Array<{
      actorName: string;
      eventType: string;
      input?: Record<string, any>;
      output?: Record<string, any>;
      reasoning?: string;
      confidence?: number;
      outcome?: string;
    }>;
    finalOutcome?: string;
  }): Promise<string> {
    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        {
          role: 'system',
          content: `You are an AI explainer for decision audit trails. Given a decision trace, provide a clear,
human-readable explanation of what happened, why decisions were made, and the final outcome.
Be concise but thorough. Use bullet points for clarity.`,
        },
        {
          role: 'user',
          content: `Explain this decision trace:

Trace ID: ${trace.traceId}
Workflow: ${trace.workflowName}
Final Outcome: ${trace.finalOutcome || 'pending'}

Events:
${trace.events.map((e, i) => `
${i + 1}. ${e.actorName} (${e.eventType})
   Input: ${JSON.stringify(e.input)}
   Output: ${JSON.stringify(e.output)}
   Reasoning: ${e.reasoning || 'not provided'}
   Confidence: ${e.confidence ? `${(e.confidence * 100).toFixed(0)}%` : 'n/a'}
   Outcome: ${e.outcome || 'n/a'}
`).join('\n')}`,
        },
      ],
      max_tokens: 600,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || 'Unable to generate explanation';
  }
}
