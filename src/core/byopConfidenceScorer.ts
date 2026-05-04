/**
 * C02: BYOP Confidence Scorer
 *
 * Scores discovery results based on signal agreement,
 * source reliability, and framework matching.
 */

import { DiscoveryResult, ConfidenceLevel, SignalSet, DiscoverySignal } from './byopDiscovery';

export type CapabilityLevel = 'L0' | 'L1' | 'L2';

export interface ConfidenceBreakdown {
  overallConfidence: ConfidenceLevel;
  confidenceScore: number; // 0.0 - 1.0
  capabilityLevel: CapabilityLevel;
  reasoning: string;
  sourceWeights: Record<string, number>; // Weight per source
  agreementRate: number; // % of signals agreeing on runtime
}

// ============================================================================
// Confidence Scorer for BYOP
// ============================================================================

export class ConfidenceScorerForByop {
  /**
   * Score a discovery result and determine confidence level
   */
  scoreDiscoveryResult(
    result: DiscoveryResult,
    supportedStack: boolean = false
  ): ConfidenceBreakdown {
    // Count signal agreement
    const signalAgreement = this.calculateSignalAgreement(result);

    // Weight signals by source reliability
    const sourceWeights = this.getSourceWeights();
    const weightedScore = this.calculateWeightedScore(result.signalBreakdown, sourceWeights);

    // Determine capability level
    const capabilityLevel = this.downgradeCapabilityLevel(result.confidenceLevel, supportedStack);

    // Build reasoning
    const reasoning = this.buildReasoningExplanation(result, signalAgreement, supportedStack);

    return {
      overallConfidence: result.confidenceLevel,
      confidenceScore: weightedScore,
      capabilityLevel,
      reasoning,
      sourceWeights,
      agreementRate: signalAgreement.agreementRate,
    };
  }

  /**
   * Downgrade capability level based on confidence and supported stack
   *
   * L2 (Full) = High confidence + Supported stack
   * L1 (Standard) = High confidence + Unknown stack OR Medium confidence + Supported
   * L0 (Guidance-only) = Low confidence OR Unknown stack
   */
  downgradeCapabilityLevel(confidence: ConfidenceLevel, supportedStack: boolean): CapabilityLevel {
    if (supportedStack && confidence === 'high') {
      return 'L2'; // Full capability: native IR mapping available
    }

    if (confidence === 'high') {
      return 'L1'; // Standard capability: heuristic IR mapping available
    }

    if (supportedStack && confidence === 'medium') {
      return 'L1'; // Standard capability: known framework but medium confidence
    }

    return 'L0'; // Guidance-first mode: manual configuration required
  }

  /**
   * Calculate agreement rate among signals
   * Higher agreement = more confident in detection
   */
  private calculateSignalAgreement(result: DiscoveryResult): {
    agreementRate: number;
    signals: number;
  } {
    const signals: DiscoverySignal[] = [];
    result.signalBreakdown.forEach((signalSet) => {
      signals.push(...signalSet.signals);
    });

    if (signals.length === 0) {
      return { agreementRate: 0, signals: 0 };
    }

    // Count agreement by runtime
    const runtimeCounts: Record<string, number> = {};
    signals.forEach((signal) => {
      if (signal.runtime) {
        runtimeCounts[signal.runtime] = (runtimeCounts[signal.runtime] ?? 0) + 1;
      }
    });

    // Calculate agreement as % of most common runtime
    const maxCount = Math.max(...Object.values(runtimeCounts));
    const agreementRate = maxCount / signals.length;

    return { agreementRate, signals: signals.length };
  }

  /**
   * Get reliability weights for each discovery source
   */
  private getSourceWeights(): Record<string, number> {
    return {
      packageManager: 0.95, // Highest: explicit dependency declaration
      dockerfile: 0.85, // High: base image is explicit
      entryPoint: 0.9, // Very high: code patterns in actual files
      imports: 0.75, // Medium: framework imports are clear but could be optional
      buildConfig: 0.65, // Lower: make/docker-compose might be generic
    };
  }

  /**
   * Calculate weighted confidence score
   */
  private calculateWeightedScore(
    signalSets: SignalSet[],
    sourceWeights: Record<string, number>
  ): number {
    if (signalSets.length === 0) {
      return 0;
    }

    let totalScore = 0;
    let totalWeight = 0;

    signalSets.forEach((signalSet) => {
      const sourceWeight = sourceWeights[signalSet.source] ?? 0.5;

      signalSet.signals.forEach((signal) => {
        const confidence = signal.confidence ?? 0.5;
        totalScore += confidence * sourceWeight;
        totalWeight += sourceWeight;
      });
    });

    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Build human-readable reasoning explanation
   */
  private buildReasoningExplanation(
    result: DiscoveryResult,
    signalAgreement: { agreementRate: number; signals: number },
    supportedStack: boolean
  ): string {
    const parts: string[] = [];

    // Runtime detection reason
    if (result.runtime !== 'unknown') {
      parts.push(`✓ Detected runtime: ${result.runtime}`);
    } else {
      parts.push('✗ Could not detect runtime (defaulting to unknown)');
    }

    // Framework detection
    if (result.framework) {
      parts.push(`✓ Detected framework: ${result.framework}`);
      if (supportedStack) {
        parts.push('✓ Framework is natively supported → L2 full capability');
      } else {
        parts.push('⚠ Framework is not natively supported → L1 heuristic mapping');
      }
    } else {
      parts.push('⚠ Could not identify specific framework → L1 topology heuristics');
    }

    // Signal agreement
    if (signalAgreement.signals > 0) {
      const agreementPercent = (signalAgreement.agreementRate * 100).toFixed(0);
      parts.push(`Signal agreement: ${agreementPercent}% (${signalAgreement.signals} signals)`);
    }

    // Confidence level
    const confidenceExplanation: Record<ConfidenceLevel, string> = {
      high: 'High confidence: multiple detection sources agreed',
      medium: 'Medium confidence: some detection sources agreed',
      low: 'Low confidence: detection signals were weak or conflicting',
    };
    parts.push(confidenceExplanation[result.confidenceLevel]);

    // Recommendation
    if (result.confidenceLevel === 'low' || !supportedStack) {
      parts.push(
        'Recommendation: Review architecture configuration or provide .workspai/architecture.config.yaml'
      );
    }

    return parts.join(' | ');
  }

  /**
   * Calculate confidence metrics across a portfolio of projects
   */
  calculatePortfolioMetrics(results: DiscoveryResult[]): {
    averageConfidence: number;
    highConfidenceRate: number;
    supportedStackRate: number;
    l2CapabilityRate: number;
  } {
    if (results.length === 0) {
      return {
        averageConfidence: 0,
        highConfidenceRate: 0,
        supportedStackRate: 0,
        l2CapabilityRate: 0,
      };
    }

    const confidenceScores: Record<ConfidenceLevel, number> = {
      high: 1.0,
      medium: 0.5,
      low: 0.0,
    };

    const averageConfidence =
      results.reduce((sum, r) => {
        return sum + confidenceScores[r.confidenceLevel];
      }, 0) / results.length;

    const highConfidenceRate =
      results.filter((r) => r.confidenceLevel === 'high').length / results.length;

    const supportedStackRate =
      results.filter((r) => this.isSupportedStack(r.framework)).length / results.length;

    const l2CapabilityRate =
      results.filter((r) => {
        return r.confidenceLevel === 'high' && this.isSupportedStack(r.framework);
      }).length / results.length;

    return {
      averageConfidence,
      highConfidenceRate,
      supportedStackRate,
      l2CapabilityRate,
    };
  }

  /**
   * Check if a stack is natively supported (can map to L2)
   */
  private isSupportedStack(framework: string | undefined): boolean {
    // Define supported combinations
    const supportedCombinations = [
      'fastapi',
      'django',
      'flask', // Python
      'nestjs',
      'express',
      'koa', // Node.js
      'gin',
      'echo', // Go
      'spring', // Java
      'rails', // Ruby
      'dotnet', // C#
    ];

    return framework ? supportedCombinations.includes(framework) : false;
  }
}

/**
 * Helper: Determine if a discovered stack is fully supported
 */
export function isSupportedFramework(framework: string | undefined): boolean {
  const supported = [
    'fastapi',
    'django',
    'flask', // Python
    'nestjs',
    'express',
    'koa', // Node.js
    'gin',
    'echo', // Go
    'spring', // Java
    'rails', // Ruby
    'dotnet', // C#
  ];

  return framework ? supported.includes(framework) : false;
}

/**
 * Helper: Translate capability level to UI label
 */
export function getCapabilityLevelLabel(level: CapabilityLevel): string {
  const labels: Record<CapabilityLevel, string> = {
    L0: 'Guidance-Only (Configuration Required)',
    L1: 'Standard (Heuristic Mapping)',
    L2: 'Full (Native Mapping)',
  };
  return labels[level];
}

/**
 * Helper: Translate capability level to UI description
 */
export function getCapabilityLevelDescription(level: CapabilityLevel): string {
  const descriptions: Record<CapabilityLevel, string> = {
    L0: 'Workspai cannot automatically discover your architecture. Please create a .workspai/architecture.config.yaml file to declare your topology.',
    L1: 'Workspai can detect your framework and generate heuristic IR mappings with medium-high confidence. Review and refine the mapping with architecture.config.yaml.',
    L2: 'Workspai has full native support for your framework. IR mappings are auto-generated with high confidence (95%+ accuracy).',
  };
  return descriptions[level];
}
