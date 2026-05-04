import { ArchitectureIR } from './architectureIr';

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ArchitectureConfig {
  version: string;
  project: {
    id: string;
    name: string;
    runtime: string;
  };
  services?: Array<{
    id: string;
    name: string;
    path: string;
    handlers?: string[];
  }>;
  dataStores?: Array<{
    id: string;
    name: string;
    type: string;
    accessedBy?: string[];
  }>;
}

export interface ProjectMapping {
  version: string;
  mappedAt: string;
  components: Record<
    string,
    {
      sourceFile: string;
      lineRange: [number, number];
      confidence: number;
      mapperType: 'native' | 'heuristic' | 'manual';
    }
  >;
  unmapped?: Array<{
    description: string;
    reason: string;
    file: string;
    confidence: number;
    recommendation?: string;
  }>;
}

export interface ExecutionPolicy {
  version: string;
  safety: {
    highRiskActions: Array<{
      type: string;
      requiresApprovalGate?: boolean;
      requiresSandboxVerification?: boolean;
      requiresRollbackPlan?: boolean;
    }>;
  };
  verification: {
    mandatoryChecks: Array<{
      type: string;
      commandPattern: string;
      successPattern: string;
    }>;
  };
  rollback: {
    strategies: Array<{
      type: string;
      method: string;
    }>;
  };
}

export class ArchitectureConfigValidator {
  validate(config: ArchitectureConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config || typeof config !== 'object') {
      errors.push('architecture.config must be an object');
      return { isValid: false, errors, warnings };
    }

    if (!config.version || typeof config.version !== 'string') {
      errors.push('architecture.config version is required');
    }

    if (!config.project?.id || !config.project?.name || !config.project?.runtime) {
      errors.push('architecture.config project.id/project.name/project.runtime are required');
    }

    const serviceIds = new Set<string>();
    for (const service of config.services ?? []) {
      if (!service.id || !service.name || !service.path) {
        errors.push('each service requires id, name, path');
        continue;
      }

      if (serviceIds.has(service.id)) {
        errors.push(`duplicate service id: ${service.id}`);
      }
      serviceIds.add(service.id);
    }

    for (const dataStore of config.dataStores ?? []) {
      if (!dataStore.id || !dataStore.name || !dataStore.type) {
        errors.push('each dataStore requires id, name, type');
        continue;
      }

      for (const serviceId of dataStore.accessedBy ?? []) {
        if (!serviceIds.has(serviceId)) {
          errors.push(`dataStore '${dataStore.id}' references unknown service '${serviceId}'`);
        }
      }
    }

    if ((config.services ?? []).length === 0) {
      warnings.push('architecture.config has no services; scope coverage may remain unknown');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export class ProjectMappingValidator {
  validate(mapping: ProjectMapping, architectureConfig?: ArchitectureConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!mapping.version || !mapping.mappedAt) {
      errors.push('project.mapping version and mappedAt are required');
    }

    if (!mapping.components || typeof mapping.components !== 'object') {
      errors.push('project.mapping components must be an object');
      return { isValid: false, errors, warnings };
    }

    const allowedMapperTypes = new Set(['native', 'heuristic', 'manual']);

    for (const [componentId, metadata] of Object.entries(mapping.components)) {
      if (!metadata.sourceFile) {
        errors.push(`component '${componentId}' is missing sourceFile`);
      }

      const [start, end] = metadata.lineRange ?? [0, 0];
      if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end < start) {
        errors.push(`component '${componentId}' has invalid lineRange`);
      }

      if (
        !Number.isFinite(metadata.confidence) ||
        metadata.confidence < 0 ||
        metadata.confidence > 1
      ) {
        errors.push(`component '${componentId}' confidence must be between 0 and 1`);
      }

      if (!allowedMapperTypes.has(metadata.mapperType)) {
        errors.push(`component '${componentId}' mapperType '${metadata.mapperType}' is invalid`);
      }
    }

    for (const item of mapping.unmapped ?? []) {
      if (!item.description || !item.reason || !item.file) {
        errors.push('unmapped item requires description, reason, file');
      }
      if (item.recommendation === undefined || item.recommendation.trim() === '') {
        warnings.push(`unmapped '${item.file}' should include a recommendation`);
      }
    }

    if (architectureConfig) {
      const knownComponents = new Set<string>([
        ...(architectureConfig.services ?? []).map((svc) => svc.id),
        ...(architectureConfig.dataStores ?? []).map((store) => store.id),
      ]);

      for (const componentId of Object.keys(mapping.components)) {
        if (!knownComponents.has(componentId)) {
          warnings.push(`mapped component '${componentId}' is not declared in architecture.config`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export class ExecutionPolicyValidator {
  validate(policy: ExecutionPolicy): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!policy.version || typeof policy.version !== 'string') {
      errors.push('execution.policy version is required');
    }

    if (
      !Array.isArray(policy.safety?.highRiskActions) ||
      policy.safety.highRiskActions.length === 0
    ) {
      errors.push('execution.policy safety.highRiskActions must contain at least one action');
    }

    if (
      !Array.isArray(policy.verification?.mandatoryChecks) ||
      policy.verification.mandatoryChecks.length === 0
    ) {
      errors.push('execution.policy verification.mandatoryChecks must contain at least one check');
    }

    if (!Array.isArray(policy.rollback?.strategies) || policy.rollback.strategies.length === 0) {
      errors.push('execution.policy rollback.strategies must contain at least one strategy');
    }

    for (const check of policy.verification?.mandatoryChecks ?? []) {
      if (!check.type || !check.commandPattern || !check.successPattern) {
        errors.push('each verification check requires type, commandPattern, successPattern');
      }
    }

    const rollbackTypes = new Set(
      (policy.rollback?.strategies ?? []).map((strategy) => strategy.type)
    );
    for (const action of policy.safety?.highRiskActions ?? []) {
      if (!action.type) {
        errors.push('each highRiskAction requires type');
        continue;
      }

      if (action.requiresRollbackPlan && !rollbackTypes.has(action.type)) {
        warnings.push(
          `highRiskAction '${action.type}' requires rollback plan but no matching rollback strategy type exists`
        );
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}

export function validateWorkspaiContracts(input: {
  architectureConfig: ArchitectureConfig;
  projectMapping: ProjectMapping;
  executionPolicy: ExecutionPolicy;
  ir?: ArchitectureIR;
}): ValidationResult {
  const architectureValidation = new ArchitectureConfigValidator().validate(
    input.architectureConfig
  );
  const mappingValidation = new ProjectMappingValidator().validate(
    input.projectMapping,
    input.architectureConfig
  );
  const executionPolicyValidation = new ExecutionPolicyValidator().validate(input.executionPolicy);

  const errors = [
    ...architectureValidation.errors,
    ...mappingValidation.errors,
    ...executionPolicyValidation.errors,
  ];
  const warnings = [
    ...architectureValidation.warnings,
    ...mappingValidation.warnings,
    ...executionPolicyValidation.warnings,
  ];

  if (input.ir?.metadata.blockMutationWhenScopeUnknown) {
    warnings.push(
      'Current IR reports unknown scope for mutating recommendations; verify scope before apply.'
    );
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
