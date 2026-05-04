import { describe, expect, it } from 'vitest';

import {
  ArchitectureGatePolicies,
  ArchitectureSafetyGates,
  ProposedChange,
} from '../core/architectureSafetyGates';
import {
  createArchitectureIR,
  createServiceComponent,
  createDataStoreComponent,
} from '../core/architectureIr';
import { ExecutionPolicy } from '../core/configValidators';

function buildIr() {
  const ir = createArchitectureIR('demo', 'Demo', 'python');
  const usersService = createServiceComponent(
    'users-service',
    'Users Service',
    'python',
    'src/services/users',
    'src/services/users/main.py'
  );
  const billingService = createServiceComponent(
    'billing-service',
    'Billing Service',
    'python',
    'src/services/billing',
    'src/services/billing/main.py'
  );
  const dataStore = createDataStoreComponent('postgres-main', 'Postgres', 'postgres');

  ir.topology.services.push(usersService, billingService);
  ir.topology.dataStores.push(dataStore);
  return ir;
}

function buildPolicy(): ExecutionPolicy {
  return {
    version: 'v1',
    safety: {
      highRiskActions: [
        {
          type: 'database_change',
          requiresApprovalGate: true,
          requiresSandboxVerification: true,
          requiresRollbackPlan: true,
        },
      ],
    },
    verification: {
      mandatoryChecks: [
        {
          type: 'integration_test',
          commandPattern: 'npm run test:integration',
          successPattern: 'passed',
        },
      ],
    },
    rollback: {
      strategies: [
        {
          type: 'database_change',
          method: 'migration_reverse',
        },
      ],
    },
  };
}

describe('C07: Architecture Safety Gates', () => {
  it('blocks structural gate when new service id already exists', () => {
    const gates = new ArchitectureSafetyGates();
    const ir = buildIr();

    const result = gates.evaluateStructuralGate(
      {
        type: 'new_service',
        targetId: 'users-service',
      },
      ir
    );

    expect(result.passed).toBe(false);
    expect(result.blockedReasons.some((reason) => reason.includes('already exists'))).toBe(true);
  });

  it('blocks runtime gate when dependency does not exist in IR', () => {
    const gates = new ArchitectureSafetyGates();
    const ir = buildIr();

    const result = gates.evaluateRuntimeGate(
      {
        type: 'dependency_upgrade',
        addsDependencies: ['non-existent-service'],
      },
      ir
    );

    expect(result.passed).toBe(false);
    expect(
      result.blockedReasons.some((reason) =>
        reason.includes('not present in current architecture map')
      )
    ).toBe(true);
  });

  it('blocks verification gate when mutating change has unknown scope', () => {
    const gates = new ArchitectureSafetyGates();
    const ir = buildIr();
    ir.metadata.blockMutationWhenScopeUnknown = true;
    ir.metadata.blockedReasons = ['scope uncertain from heuristic mapping'];

    const result = gates.evaluateVerificationGate(
      {
        type: 'api_change',
        requiresVerification: true,
      },
      ir,
      buildPolicy()
    );

    expect(result.passed).toBe(false);
    expect(result.blockedReasons.some((reason) => /scope is unknown/i.test(reason))).toBe(true);
  });

  it('blocks high-risk database change without rollback plan', () => {
    const gates = new ArchitectureSafetyGates();
    const ir = buildIr();

    const result = gates.evaluateVerificationGate(
      {
        type: 'database_change',
        requiresVerification: true,
        hasRollbackPlan: false,
        riskLevel: 'high',
      },
      ir,
      buildPolicy()
    );

    expect(result.passed).toBe(false);
    expect(result.blockedReasons.some((reason) => /rollback plan/i.test(reason))).toBe(true);
  });

  it('passes all gates for safe dependency upgrade flow', () => {
    const policies = new ArchitectureGatePolicies();
    const ir = buildIr();

    const result = policies.evaluateAllGates(
      {
        type: 'dependency_upgrade',
        addsDependencies: ['users-service'],
        requiresVerification: true,
        hasRollbackPlan: true,
        riskLevel: 'medium',
      },
      ir,
      buildPolicy()
    );

    expect(result.allPassed).toBe(true);
    expect(result.blockedReasons).toHaveLength(0);
  });

  it('returns structural/runtime/verification gates for database_change', () => {
    const policies = new ArchitectureGatePolicies();
    expect(policies.getRequiredGatesFor('database_change')).toEqual([
      'structural',
      'runtime',
      'verification',
    ]);
  });

  it('aggregates blocked reasons across multiple failed gates', () => {
    const policies = new ArchitectureGatePolicies();
    const ir = buildIr();
    ir.metadata.blockMutationWhenScopeUnknown = true;

    const proposedChange: ProposedChange = {
      type: 'database_change',
      targetId: 'missing-datastore',
      introducesCycle: true,
      hasRollbackPlan: false,
      riskLevel: 'high',
      requiresVerification: true,
    };

    const result = policies.evaluateAllGates(proposedChange, ir, buildPolicy());
    expect(result.allPassed).toBe(false);
    expect(result.results.length).toBe(3);
    expect(result.blockedReasons.length).toBeGreaterThan(2);
  });
});
