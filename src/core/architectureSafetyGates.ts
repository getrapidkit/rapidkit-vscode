import { ArchitectureIR } from './architectureIr';
import { ExecutionPolicy } from './configValidators';

export type ChangeType =
  | 'new_service'
  | 'database_change'
  | 'api_change'
  | 'dependency_upgrade'
  | 'configuration_change';

export interface ProposedChange {
  type: ChangeType;
  targetId?: string;
  addsDependencies?: string[];
  introducesCycle?: boolean;
  requiresVerification?: boolean;
  hasRollbackPlan?: boolean;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface GateResult {
  gate: 'structural' | 'runtime' | 'verification';
  passed: boolean;
  blockedReasons: string[];
}

export interface GatesResult {
  allPassed: boolean;
  results: GateResult[];
  blockedReasons: string[];
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter((value) => value.trim() !== '')));
}

export class ArchitectureSafetyGates {
  evaluateStructuralGate(proposedChange: ProposedChange, ir: ArchitectureIR): GateResult {
    const blockedReasons: string[] = [];

    if (proposedChange.introducesCycle) {
      blockedReasons.push(
        'Structural gate blocked: proposed change introduces circular dependency.'
      );
    }

    if (proposedChange.type === 'new_service') {
      if (!proposedChange.targetId || proposedChange.targetId.trim() === '') {
        blockedReasons.push('Structural gate blocked: new_service requires targetId.');
      }

      if (
        proposedChange.targetId &&
        ir.topology.services.some((service) => service.id === proposedChange.targetId)
      ) {
        blockedReasons.push(
          `Structural gate blocked: service '${proposedChange.targetId}' already exists.`
        );
      }
    }

    return {
      gate: 'structural',
      passed: blockedReasons.length === 0,
      blockedReasons: uniqueStrings(blockedReasons),
    };
  }

  evaluateRuntimeGate(proposedChange: ProposedChange, ir: ArchitectureIR): GateResult {
    const blockedReasons: string[] = [];

    const knownDependencies = new Set<string>([
      ...ir.topology.services.map((service) => service.id),
      ...ir.topology.dataStores.map((store) => store.id),
      ...(ir.topology.externalDependencies ?? []).map((dep) => dep.id),
    ]);

    for (const dependency of proposedChange.addsDependencies ?? []) {
      if (!knownDependencies.has(dependency)) {
        blockedReasons.push(
          `Runtime gate blocked: dependency '${dependency}' is not present in current architecture map.`
        );
      }
    }

    if (
      proposedChange.type === 'database_change' &&
      proposedChange.targetId &&
      !ir.topology.dataStores.some((store) => store.id === proposedChange.targetId)
    ) {
      blockedReasons.push(
        `Runtime gate blocked: target datastore '${proposedChange.targetId}' does not exist in IR.`
      );
    }

    return {
      gate: 'runtime',
      passed: blockedReasons.length === 0,
      blockedReasons: uniqueStrings(blockedReasons),
    };
  }

  evaluateVerificationGate(
    proposedChange: ProposedChange,
    ir: ArchitectureIR,
    executionPolicy: ExecutionPolicy
  ): GateResult {
    const blockedReasons: string[] = [];

    const isMutating = proposedChange.type !== 'configuration_change';
    if (isMutating && ir.metadata.blockMutationWhenScopeUnknown) {
      blockedReasons.push(
        'Verification gate blocked: affected scope is unknown for a mutating recommendation.'
      );
      blockedReasons.push(...(ir.metadata.blockedReasons ?? []));
    }

    if (
      proposedChange.requiresVerification &&
      executionPolicy.verification.mandatoryChecks.length === 0
    ) {
      blockedReasons.push(
        'Verification gate blocked: no mandatory verification checks are configured.'
      );
    }

    const actionPolicy = executionPolicy.safety.highRiskActions.find(
      (action) => action.type === proposedChange.type
    );

    if (actionPolicy?.requiresRollbackPlan && !proposedChange.hasRollbackPlan) {
      blockedReasons.push(
        'Verification gate blocked: rollback plan is required for this action type.'
      );
    }

    if (
      (proposedChange.riskLevel === 'high' || actionPolicy?.requiresSandboxVerification) &&
      !executionPolicy.verification.mandatoryChecks.some((check) =>
        /integration|contract|e2e/i.test(check.type)
      )
    ) {
      blockedReasons.push(
        'Verification gate blocked: high-risk action requires at least one integration/contract/e2e check.'
      );
    }

    return {
      gate: 'verification',
      passed: blockedReasons.length === 0,
      blockedReasons: uniqueStrings(blockedReasons),
    };
  }
}

export class ArchitectureGatePolicies {
  private readonly gates = new ArchitectureSafetyGates();

  getRequiredGatesFor(changeType: ChangeType): Array<'structural' | 'runtime' | 'verification'> {
    switch (changeType) {
      case 'new_service':
      case 'database_change':
        return ['structural', 'runtime', 'verification'];
      case 'api_change':
        return ['structural', 'verification'];
      case 'dependency_upgrade':
        return ['runtime', 'verification'];
      case 'configuration_change':
      default:
        return ['verification'];
    }
  }

  evaluateAllGates(
    proposedChange: ProposedChange,
    ir: ArchitectureIR,
    executionPolicy: ExecutionPolicy
  ): GatesResult {
    const requiredGates = this.getRequiredGatesFor(proposedChange.type);
    const results: GateResult[] = [];

    for (const gate of requiredGates) {
      if (gate === 'structural') {
        results.push(this.gates.evaluateStructuralGate(proposedChange, ir));
      } else if (gate === 'runtime') {
        results.push(this.gates.evaluateRuntimeGate(proposedChange, ir));
      } else {
        results.push(this.gates.evaluateVerificationGate(proposedChange, ir, executionPolicy));
      }
    }

    const blockedReasons = uniqueStrings(results.flatMap((result) => result.blockedReasons));
    return {
      allPassed: results.every((result) => result.passed),
      results,
      blockedReasons,
    };
  }
}
