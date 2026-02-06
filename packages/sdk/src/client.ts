import axios, { AxiosInstance } from 'axios';
import {
  LedgerMindConfig,
  DecisionEvent,
  Trace,
  SimilarityQuery,
  SimilarityResult,
  CreateEventRequest,
  CreateTraceRequest,
  CreateOverrideRequest,
  OverrideEvent,
  ActorType,
  EventType,
  OutcomeType,
} from '@ledgermind/types';

/**
 * Main SDK client for LedgerMind
 */
export class LedgerMindClient {
  private http: AxiosInstance;
  private tenantId: string;
  private enableTamperProof: boolean;

  constructor(config: LedgerMindConfig) {
    this.tenantId = config.tenantId;
    this.enableTamperProof = config.enableTamperProof ?? false;

    this.http = axios.create({
      baseURL: config.apiUrl,
      timeout: config.timeout ?? 10000,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': config.tenantId,
      },
    });
  }

  // ==========================================================================
  // Trace Management
  // ==========================================================================

  /**
   * Start a new workflow trace (convenience method)
   * @returns trace_id string
   */
  async startTrace(
    workflowName: string,
    metadata?: Record<string, any>
  ): Promise<string> {
    const traceId = this.generateTraceId();
    await this.createTrace({
      trace_id: traceId,
      workflow_name: workflowName,
      metadata,
    });
    return traceId;
  }

  /**
   * Complete a workflow trace
   */
  async completeTrace(
    traceId: string,
    completion: {
      finalDecision: string;
      decidedBy?: string;
      humanOverride?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<DecisionEvent> {
    return this.logEvent({
      trace_id: traceId,
      step_id: this.generateStepId(),
      actor_type: completion.humanOverride ? 'human' : 'system',
      actor_name: completion.decidedBy || 'system',
      event_type: 'step_completed',
      input_summary: {},
      output_summary: { final_decision: completion.finalDecision },
      outcome: completion.finalDecision as OutcomeType,
      metadata: {
        ...completion.metadata,
        is_final: true,
        human_override: completion.humanOverride,
      },
    });
  }

  /**
   * Create a new workflow trace
   */
  async createTrace(request: CreateTraceRequest): Promise<Trace> {
    const response = await this.http.post<Trace>('/traces', {
      ...request,
      tenant_id: this.tenantId,
    });
    return response.data;
  }

  /**
   * Get trace by ID with full timeline
   */
  async getTrace(traceId: string): Promise<Trace> {
    const response = await this.http.get<Trace>(`/traces/${traceId}`);
    return response.data;
  }

  // ==========================================================================
  // Event Logging
  // ==========================================================================

  /**
   * Log a step start event
   */
  async logStepStart(
    traceId: string,
    stepId: string,
    actorName: string,
    input: Record<string, any>,
    options?: {
      parentStepId?: string;
      actorType?: ActorType;
      metadata?: Record<string, any>;
    }
  ): Promise<DecisionEvent> {
    return this.logEvent({
      trace_id: traceId,
      step_id: stepId,
      parent_step_id: options?.parentStepId,
      actor_type: options?.actorType ?? 'agent',
      actor_name: actorName,
      event_type: 'step_started',
      input_summary: input,
      output_summary: {},
      metadata: options?.metadata,
    });
  }

  /**
   * Log a step completion event
   */
  async logStepResult(
    traceId: string,
    stepId: string,
    actorName: string,
    output: Record<string, any>,
    options?: {
      reasoning?: string;
      confidence?: number;
      outcome?: OutcomeType;
      policyVersionId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<DecisionEvent> {
    return this.logEvent({
      trace_id: traceId,
      step_id: stepId,
      actor_type: 'agent',
      actor_name: actorName,
      event_type: 'step_completed',
      input_summary: {},
      output_summary: output,
      reasoning: options?.reasoning,
      confidence: options?.confidence,
      outcome: options?.outcome,
      policy_version_id: options?.policyVersionId,
      metadata: options?.metadata,
    });
  }

  /**
   * Log a decision event
   */
  async logDecision(
    traceId: string,
    stepId: string,
    actorName: string,
    decision: {
      input: Record<string, any>;
      output: Record<string, any>;
      reasoning?: string;
      confidence?: number;
      outcome: OutcomeType;
      policyVersionId?: string;
    },
    options?: {
      parentStepId?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<DecisionEvent> {
    return this.logEvent({
      trace_id: traceId,
      step_id: stepId,
      parent_step_id: options?.parentStepId,
      actor_type: 'agent',
      actor_name: actorName,
      event_type: 'decision_made',
      input_summary: decision.input,
      output_summary: decision.output,
      reasoning: decision.reasoning,
      confidence: decision.confidence,
      outcome: decision.outcome,
      policy_version_id: decision.policyVersionId,
      metadata: options?.metadata,
    });
  }

  /**
   * Generic event logging
   */
  async logEvent(request: CreateEventRequest): Promise<DecisionEvent> {
    const response = await this.http.post<DecisionEvent>('/events', {
      ...request,
      tenant_id: this.tenantId,
    });
    return response.data;
  }

  // ==========================================================================
  // Similarity / Precedent Search
  // ==========================================================================

  /**
   * Query for similar past decisions
   * 
   * This is the core "memory" function that agents call before making decisions.
   */
  async getSimilarCases(query: SimilarityQuery): Promise<SimilarityResult> {
    const response = await this.http.post<SimilarityResult>('/similarity/query', {
      ...query,
      tenant_id: this.tenantId,
    });
    return response.data;
  }

  /**
   * Find similar past decisions (convenience method matching README examples)
   */
  async findSimilar(options: {
    context: Record<string, any>;
    workflowName?: string;
    limit?: number;
    minSimilarity?: number;
  }): Promise<{
    similar_cases: number;
    cases: any[];
    approval_rate: number;
    override_rate: number;
    precedent_alignment_score: number;
    recommendation?: { action: string; confidence_boost: number };
  }> {
    const result = await this.getSimilarCases({
      tenant_id: this.tenantId,
      input_context: options.context,
      workflow_name: options.workflowName,
      limit: options.limit ?? 10,
      min_similarity: options.minSimilarity,
    });

    // Calculate approval rate from outcome distribution
    const approvalRate = result.outcome_distribution?.approved 
      ? result.outcome_distribution.approved / result.cases.length 
      : 0;

    // Generate recommendation based on historical data
    const recommendation = result.cases.length > 0 ? {
      action: approvalRate > 0.5 ? 'approve' : 'review',
      confidence_boost: result.precedent_alignment_score > 0.7 ? 0.05 : 0,
    } : undefined;

    return {
      similar_cases: result.cases.length,
      cases: result.cases,
      approval_rate: approvalRate,
      override_rate: result.override_rate / 100, // Convert to decimal
      precedent_alignment_score: result.precedent_alignment_score,
      recommendation,
    };
  }

  /**
   * Convenience method: Get precedent-adjusted confidence
   */
  async adjustConfidenceByPrecedent(
    baseConfidence: number,
    context: Record<string, any>,
    decisionType?: string
  ): Promise<{
    adjusted_confidence: number;
    precedent_alignment_score: number;
    similar_cases_count: number;
  }> {
    const result = await this.getSimilarCases({
      tenant_id: this.tenantId,
      input_context: context,
      decision_type: decisionType,
      limit: 5,
    });

    // Adjust confidence based on precedent alignment
    const adjustedConfidence = baseConfidence * result.precedent_alignment_score;

    return {
      adjusted_confidence: adjustedConfidence,
      precedent_alignment_score: result.precedent_alignment_score,
      similar_cases_count: result.cases.length,
    };
  }

  // ==========================================================================
  // Override Management
  // ==========================================================================

  /**
   * Log a human override of an agent decision
   */
  async logOverride(request: CreateOverrideRequest): Promise<OverrideEvent> {
    const response = await this.http.post<OverrideEvent>('/overrides', {
      ...request,
      tenant_id: this.tenantId,
    });
    return response.data;
  }

  /**
   * Record a human override (convenience method matching README examples)
   */
  async recordOverride(
    traceId: string,
    override: {
      originalDecision: string;
      overrideDecision: string;
      overrideBy: string;
      reason: string;
      category?: string;
      metadata?: Record<string, any>;
    }
  ): Promise<OverrideEvent> {
    return this.logOverride({
      trace_id: traceId,
      original_event_id: '', // Will be filled by API if not provided
      actor_name: override.overrideBy,
      original_outcome: override.originalDecision as OutcomeType,
      new_outcome: override.overrideDecision as OutcomeType,
      reason: override.reason,
      metadata: {
        ...override.metadata,
        category: override.category,
      },
    });
  }

  // ==========================================================================
  // Outcome Tracking
  // ==========================================================================

  /**
   * Record the real-world outcome of a decision
   * Links decisions to actual results for continuous learning
   */
  async recordOutcome(
    traceId: string,
    outcome: {
      outcome: string;
      outcomeDate: string;
      details?: Record<string, any>;
    }
  ): Promise<DecisionEvent> {
    return this.logEvent({
      trace_id: traceId,
      step_id: this.generateStepId(),
      actor_type: 'system',
      actor_name: 'outcome_tracker',
      event_type: 'step_completed',
      input_summary: {},
      output_summary: {
        outcome: outcome.outcome,
        outcome_date: outcome.outcomeDate,
        ...outcome.details,
      },
      outcome: outcome.outcome as OutcomeType,
      metadata: {
        is_outcome_record: true,
        outcome_date: outcome.outcomeDate,
        details: outcome.details,
      },
    });
  }

  // ==========================================================================
  // Policy Management
  // ==========================================================================

  /**
   * Register a policy version for tracking
   */
  async registerPolicy(policy: {
    policyId: string;
    version: string;
    effectiveDate: string;
    changes?: string[];
    rules?: Record<string, any>;
    metadata?: Record<string, any>;
  }): Promise<any> {
    const response = await this.http.post('/policies', {
      policy_version_id: `${policy.policyId}_${policy.version}`,
      tenant_id: this.tenantId,
      policy_name: policy.policyId,
      version: policy.version,
      content: {
        rules: policy.rules,
        changes: policy.changes,
        effective_date: policy.effectiveDate,
      },
      metadata: policy.metadata,
    });
    return response.data;
  }

  // ==========================================================================
  // Timeline / Audit
  // ==========================================================================

  /**
   * Get the complete decision timeline for a trace
   */
  async getTimeline(traceId: string): Promise<{
    trace_id: string;
    workflow_name: string;
    started_at: string;
    ended_at?: string;
    final_outcome?: string;
    events: any[];
  }> {
    const trace = await this.getTrace(traceId);
    return {
      trace_id: trace.trace_id,
      workflow_name: trace.workflow_name,
      started_at: trace.started_at as unknown as string,
      ended_at: trace.ended_at as unknown as string,
      final_outcome: trace.final_outcome,
      events: trace.events_summary || [],
    };
  }

  // ==========================================================================
  // AI-Powered Features
  // ==========================================================================

  /**
   * AI: Get smart recommendation before making a decision
   * Analyzes similar past cases and provides guidance
   */
  async getSmartRecommendation(decision: {
    agentName: string;
    input: Record<string, any>;
    proposedOutput: Record<string, any>;
    confidence: number;
  }): Promise<{
    recommendation: 'proceed' | 'review' | 'reject';
    adjustedConfidence: number;
    reasoning: string;
    warnings: string[];
    suggestedModifications?: Record<string, any>;
  }> {
    const response = await this.http.post('/ai/recommend', {
      agent_name: decision.agentName,
      input: decision.input,
      proposed_output: decision.proposedOutput,
      confidence: decision.confidence,
    });
    return response.data;
  }

  /**
   * AI: Explain a decision trace in human-readable format
   */
  async explainTrace(traceId: string): Promise<{
    explanation: string;
    summary: string;
    keyDecisions: string[];
    riskFactors: string[];
  }> {
    const response = await this.http.post('/ai/explain', {
      trace_id: traceId,
    });
    return response.data;
  }

  /**
   * AI: Detect patterns and anomalies in recent decisions
   */
  async detectPatterns(options?: { limit?: number }): Promise<{
    patterns: Array<{
      type: 'anomaly' | 'trend' | 'correlation';
      description: string;
      severity: 'low' | 'medium' | 'high';
      affectedAgent?: string;
    }>;
    insights: string[];
    alerts: string[];
  }> {
    const response = await this.http.post('/ai/patterns', {
      limit: options?.limit || 100,
    });
    return response.data;
  }

  /**
   * AI: Generate compliance audit report
   */
  async generateAuditReport(period: { start: string; end: string }): Promise<{
    executiveSummary: string;
    findings: string[];
    concerns: string[];
    recommendations: string[];
    complianceStatus: 'compliant' | 'needs_review' | 'non_compliant';
  }> {
    const response = await this.http.post('/ai/audit-report', {
      period_start: period.start,
      period_end: period.end,
    });
    return response.data;
  }

  /**
   * AI: Parse natural language query into structured filters
   */
  async parseQuery(naturalQuery: string): Promise<{
    filters: Record<string, any>;
    interpretation: string;
  }> {
    const response = await this.http.post('/ai/parse-query', {
      query: naturalQuery,
    });
    return response.data;
  }

  /**
   * AI: Auto-generate reasoning for a decision (when agent doesn't provide one)
   */
  async generateReasoning(decision: {
    agentName: string;
    input: Record<string, any>;
    output: Record<string, any>;
  }): Promise<string> {
    const response = await this.http.post('/ai/generate-reasoning', decision);
    return response.data.reasoning;
  }

  // ==========================================================================
  // Utilities
  // ==========================================================================

  /**
   * Generate a new trace ID
   */
  generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Generate a new step ID
   */
  generateStepId(): string {
    return `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
