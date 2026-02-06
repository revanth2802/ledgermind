import { LedgerMindClient } from './client';
import { OutcomeType, SimilarityResult } from '@ledgermind/types';

/**
 * Generic agent interface (orchestrator-agnostic)
 */
export interface Agent<TInput = any, TOutput = any> {
  name: string;
  execute(input: TInput, traceId?: string): Promise<TOutput>;
}

/**
 * Enhanced agent result with precedent context
 */
export interface AgentResultWithPrecedent<TOutput = any> {
  output: TOutput;
  confidence: number;
  reasoning?: string;
  
  // Precedent context
  precedent?: {
    similar_cases: SimilarityResult;
    adjusted_confidence: number;
    should_escalate: boolean;
  };
}

/**
 * Wrapper options
 */
export interface WrapAgentOptions {
  enablePrecedentLookup?: boolean;
  confidenceThreshold?: number; // Below this, escalate
  autoLogStart?: boolean;
  autoLogResult?: boolean;
}

/**
 * Wrap any agent to add LedgerMind memory capabilities
 * 
 * Example:
 * ```typescript
 * const memoryAgent = wrapAgent(myAgent, client, {
 *   enablePrecedentLookup: true,
 *   confidenceThreshold: 0.7
 * });
 * 
 * const result = await memoryAgent.execute(input, traceId);
 * ```
 */
export function wrapAgent<TInput = any, TOutput = any>(
  agent: Agent<TInput, TOutput>,
  client: LedgerMindClient,
  options: WrapAgentOptions = {}
): Agent<TInput, AgentResultWithPrecedent<TOutput>> {
  const {
    enablePrecedentLookup = true,
    confidenceThreshold = 0.7,
    autoLogStart = true,
    autoLogResult = true,
  } = options;

  return {
    name: agent.name,
    
    async execute(
      input: TInput,
      traceId?: string
    ): Promise<AgentResultWithPrecedent<TOutput>> {
      const trace = traceId ?? client.generateTraceId();
      const stepId = client.generateStepId();

      // Log step start
      if (autoLogStart) {
        await client.logStepStart(trace, stepId, agent.name, input as any);
      }

      // Query precedents before execution
      let precedentContext: SimilarityResult | undefined;

      if (enablePrecedentLookup) {
        precedentContext = await client.getSimilarCases({
          tenant_id: (client as any).tenantId,
          input_context: input as any,
          decision_type: agent.name,
          limit: 5,
        });
      }

      // Execute agent
      const output = await agent.execute(input);

      // Extract confidence if present
      const baseConfidence = (output as any).confidence ?? 1.0;

      // Adjust confidence by precedent alignment
      let adjustedConfidence: number;
      if (precedentContext) {
        adjustedConfidence = baseConfidence * precedentContext.precedent_alignment_score;
      } else {
        adjustedConfidence = baseConfidence;
      }

      // Determine if escalation is needed
      const shouldEscalate = adjustedConfidence < confidenceThreshold;

      // Log result
      if (autoLogResult) {
        await client.logStepResult(trace, stepId, agent.name, output as any, {
          confidence: adjustedConfidence,
          reasoning: (output as any).reasoning,
          outcome: shouldEscalate ? 'escalated' : 'approved',
        });
      }

      return {
        output,
        confidence: adjustedConfidence,
        reasoning: (output as any).reasoning,
        precedent: precedentContext
          ? {
              similar_cases: precedentContext,
              adjusted_confidence: adjustedConfidence,
              should_escalate: shouldEscalate,
            }
          : undefined,
      };
    },
  };
}

/**
 * Utility: Create a simple agent wrapper function
 */
export function createMemoryAgent<TInput, TOutput>(
  name: string,
  executeFn: (input: TInput) => Promise<TOutput>
): Agent<TInput, TOutput> {
  return {
    name,
    execute: executeFn,
  };
}
