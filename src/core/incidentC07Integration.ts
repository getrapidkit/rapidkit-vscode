import * as fs from 'fs';
import * as path from 'path';

import { NativeArchitectureMapper, assessMappingScopeForMutation } from './architectureMapper';
import { ArchitectureGatePolicies, ProposedChange } from './architectureSafetyGates';
import { ByopDiscoveryEngine } from './byopDiscovery';
import { ExecutionPolicy } from './configValidators';

export interface IncidentActionPolicyLike {
  riskClass:
    | 'informational'
    | 'non-mutating-executable'
    | 'guarded-mutating'
    | 'high-risk-mutating';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  requiresImpactReview: boolean;
  requiresVerifyPath: boolean;
}

export interface IncidentC07Evaluation {
  evaluated: boolean;
  projectPath?: string;
  scopeBlocked: boolean;
  scopeCoverage?: 'known' | 'partial' | 'unknown';
  scopeConfidenceScore?: number;
  gatePassed?: boolean;
  blockedReasons: string[];
}

export async function evaluateIncidentC07Gates(input: {
  workspacePath: string;
  projectPath?: string;
  actionType: string;
  actionPolicy: IncidentActionPolicyLike;
  verifyReady: boolean;
  verifySuccess: boolean;
  verifyChecklist: string[];
  doctorErrors?: number;
  rollbackApproved?: boolean;
}): Promise<IncidentC07Evaluation> {
  const resolvedProjectPath = resolveProjectRoot(input.workspacePath, input.projectPath);
  if (!resolvedProjectPath) {
    return {
      evaluated: false,
      scopeBlocked: false,
      blockedReasons: [],
    };
  }

  try {
    const discovery = await new ByopDiscoveryEngine(resolvedProjectPath).discover();
    const ir = await new NativeArchitectureMapper().mapToIR(resolvedProjectPath, discovery);
    const scopeAssessment = assessMappingScopeForMutation(ir, {
      framework: discovery.framework,
      confidenceLevel: discovery.confidenceLevel,
    });

    const gatePolicies = new ArchitectureGatePolicies();
    const proposedChange = toProposedChange(
      input.actionType,
      input.actionPolicy,
      input.doctorErrors,
      input.rollbackApproved
    );
    const executionPolicy = toExecutionPolicy(
      proposedChange.type,
      input.actionPolicy,
      input.verifyChecklist
    );
    const gateResult = gatePolicies.evaluateAllGates(proposedChange, ir, executionPolicy);

    const blockedReasons = [...scopeAssessment.blockedReasons, ...gateResult.blockedReasons];
    if (input.actionPolicy.requiresVerifyPath && !input.verifyReady) {
      blockedReasons.push('C07 verification gate: verify path is required but not ready.');
    }
    if (input.actionPolicy.requiresVerifyPath && !input.verifySuccess) {
      blockedReasons.push('C07 verification gate: verify-first action has not succeeded yet.');
    }
    const dedupedBlockedReasons = Array.from(new Set(blockedReasons));

    const scopeBlocked =
      scopeAssessment.blockMutationWhenScopeUnknown ||
      dedupedBlockedReasons.some((reason) => /scope is unknown|scope is uncertain/i.test(reason));

    return {
      evaluated: true,
      projectPath: resolvedProjectPath,
      scopeBlocked,
      scopeCoverage: scopeAssessment.scopeCoverage,
      scopeConfidenceScore: scopeAssessment.scopeConfidenceScore,
      gatePassed: gateResult.allPassed,
      blockedReasons: dedupedBlockedReasons,
    };
  } catch {
    const shouldBlockMutation =
      input.actionPolicy.riskClass === 'guarded-mutating' ||
      input.actionPolicy.riskClass === 'high-risk-mutating' ||
      input.actionPolicy.requiresImpactReview;
    return {
      evaluated: false,
      projectPath: resolvedProjectPath,
      scopeBlocked: shouldBlockMutation,
      blockedReasons: shouldBlockMutation
        ? ['C07 gate evaluation unavailable; block mutation until architecture scope is confirmed.']
        : [],
    };
  }
}

function resolveProjectRoot(workspacePath: string, projectPath?: string): string | undefined {
  if (!workspacePath) {
    return undefined;
  }

  const candidate = projectPath
    ? path.isAbsolute(projectPath)
      ? projectPath
      : path.join(workspacePath, projectPath)
    : workspacePath;

  if (!fs.existsSync(candidate)) {
    return undefined;
  }

  const stat = fs.statSync(candidate);
  return stat.isFile() ? path.dirname(candidate) : candidate;
}

function toProposedChange(
  actionType: string,
  actionPolicy: IncidentActionPolicyLike,
  doctorErrors: number = 0,
  rollbackApproved: boolean = false
): ProposedChange {
  const normalizedAction = actionType.toLowerCase();

  let type: ProposedChange['type'] = 'api_change';
  if (/db|database|schema|migration/.test(normalizedAction)) {
    type = 'database_change';
  } else if (/dependency|deps|upgrade|install/.test(normalizedAction)) {
    type = 'dependency_upgrade';
  } else if (/new[-_ ]service|module-gen|scaffold|create/.test(normalizedAction)) {
    type = 'new_service';
  } else if (/config|policy/.test(normalizedAction)) {
    type = 'configuration_change';
  }

  return {
    type,
    targetId: type === 'new_service' ? `generated-${normalizedAction || 'service'}` : undefined,
    requiresVerification: actionPolicy.requiresVerifyPath,
    hasRollbackPlan:
      rollbackApproved ||
      actionPolicy.riskClass === 'informational' ||
      actionPolicy.riskClass === 'non-mutating-executable',
    riskLevel: actionPolicy.riskLevel === 'critical' ? 'high' : actionPolicy.riskLevel,
    introducesCycle: false,
    addsDependencies: doctorErrors > 0 ? ['unknown-doctor-dependency'] : [],
  };
}

function toExecutionPolicy(
  changeType: ProposedChange['type'],
  actionPolicy: IncidentActionPolicyLike,
  verifyChecklist: string[]
): ExecutionPolicy {
  const mutatingRisk =
    actionPolicy.riskClass === 'guarded-mutating' ||
    actionPolicy.riskClass === 'high-risk-mutating';

  const mandatoryChecks =
    verifyChecklist.length > 0
      ? verifyChecklist.slice(0, 3).map((check, index) => ({
          type: /integration|contract|e2e/i.test(check)
            ? 'integration_test'
            : `verify_check_${index + 1}`,
          commandPattern: check,
          successPattern: 'pass',
        }))
      : [
          {
            type: 'integration_test',
            commandPattern: 'run deterministic verify command',
            successPattern: 'pass',
          },
        ];

  return {
    version: 'v1',
    safety: {
      highRiskActions: [
        {
          type: changeType,
          requiresApprovalGate: mutatingRisk,
          requiresSandboxVerification: mutatingRisk,
          requiresRollbackPlan: mutatingRisk,
        },
      ],
    },
    verification: {
      mandatoryChecks,
    },
    rollback: {
      strategies: [
        {
          type: changeType,
          method: mutatingRisk ? 'auto-rollback' : 'none',
        },
      ],
    },
  };
}
