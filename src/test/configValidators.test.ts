import { describe, expect, it } from 'vitest';

import {
  ArchitectureConfig,
  ArchitectureConfigValidator,
  ExecutionPolicy,
  ExecutionPolicyValidator,
  ProjectMapping,
  ProjectMappingValidator,
  validateWorkspaiContracts,
} from '../core/configValidators';
import { createArchitectureIR } from '../core/architectureIr';

describe('C06: Config Validators', () => {
  const validArchitectureConfig: ArchitectureConfig = {
    version: 'v1',
    project: {
      id: 'demo-api',
      name: 'Demo API',
      runtime: 'python-fastapi',
    },
    services: [
      {
        id: 'users-service',
        name: 'Users Service',
        path: 'src/services/users',
        handlers: ['/users'],
      },
    ],
    dataStores: [
      {
        id: 'postgres-main',
        name: 'Primary DB',
        type: 'postgres',
        accessedBy: ['users-service'],
      },
    ],
  };

  const validProjectMapping: ProjectMapping = {
    version: 'v1',
    mappedAt: new Date().toISOString(),
    components: {
      'users-service': {
        sourceFile: 'src/services/users/main.py',
        lineRange: [1, 30],
        confidence: 0.93,
        mapperType: 'native',
      },
      'postgres-main': {
        sourceFile: 'src/config/database.py',
        lineRange: [1, 20],
        confidence: 0.88,
        mapperType: 'heuristic',
      },
    },
    unmapped: [
      {
        description: 'legacy admin endpoint',
        reason: 'not_modeled',
        file: 'src/admin/routes.py',
        confidence: 0.2,
        recommendation: 'model as separate admin service',
      },
    ],
  };

  const validExecutionPolicy: ExecutionPolicy = {
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

  it('validates a complete architecture.config', () => {
    const result = new ArchitectureConfigValidator().validate(validArchitectureConfig);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('rejects architecture.config with duplicate services and broken datastore references', () => {
    const invalid: ArchitectureConfig = {
      ...validArchitectureConfig,
      services: [
        validArchitectureConfig.services![0],
        {
          id: 'users-service',
          name: 'Users Duplicate',
          path: 'src/services/users-v2',
        },
      ],
      dataStores: [
        {
          id: 'redis-cache',
          name: 'Cache',
          type: 'redis',
          accessedBy: ['unknown-service'],
        },
      ],
    };

    const result = new ArchitectureConfigValidator().validate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes('duplicate service id'))).toBe(true);
    expect(result.errors.some((error) => error.includes('unknown service'))).toBe(true);
  });

  it('validates project.mapping confidence and mapper types', () => {
    const result = new ProjectMappingValidator().validate(
      validProjectMapping,
      validArchitectureConfig
    );
    expect(result.isValid).toBe(true);
  });

  it('rejects project.mapping with invalid confidence and malformed line range', () => {
    const invalid: ProjectMapping = {
      ...validProjectMapping,
      components: {
        'users-service': {
          sourceFile: 'src/services/users/main.py',
          lineRange: [20, 1],
          confidence: 1.4,
          mapperType: 'native',
        },
      },
    };

    const result = new ProjectMappingValidator().validate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes('lineRange'))).toBe(true);
    expect(result.errors.some((error) => error.includes('confidence'))).toBe(true);
  });

  it('validates execution.policy contracts', () => {
    const result = new ExecutionPolicyValidator().validate(validExecutionPolicy);
    expect(result.isValid).toBe(true);
  });

  it('rejects execution.policy with missing verification and rollback sections', () => {
    const invalid: ExecutionPolicy = {
      ...validExecutionPolicy,
      verification: { mandatoryChecks: [] },
      rollback: { strategies: [] },
    };

    const result = new ExecutionPolicyValidator().validate(invalid);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((error) => error.includes('mandatoryChecks'))).toBe(true);
    expect(result.errors.some((error) => error.includes('rollback.strategies'))).toBe(true);
  });

  it('validates cross-file contracts and propagates unknown-scope warnings from IR', () => {
    const ir = createArchitectureIR('demo-api', 'Demo API', 'python');
    ir.metadata.blockMutationWhenScopeUnknown = true;

    const result = validateWorkspaiContracts({
      architectureConfig: validArchitectureConfig,
      projectMapping: validProjectMapping,
      executionPolicy: validExecutionPolicy,
      ir,
    });

    expect(result.isValid).toBe(true);
    expect(result.warnings.some((warning) => warning.includes('unknown scope'))).toBe(true);
  });
});
