/**
 * Universal Architecture IR v1 Validator
 *
 * Enforces schema contracts, detects structural issues,
 * validates confidence levels, and checks for consistency.
 */

import {
  ArchitectureIR,
  IRValidationResult,
  ValidationError,
  createArchitectureIR,
  createDataStoreComponent,
  createServiceComponent,
  RuntimeType,
} from './architectureIr';

export class ArchitectureIRValidator {
  private errors: ValidationError[] = [];
  private warnings: ValidationError[] = [];

  /**
   * Validate a complete ArchitectureIR object
   */
  validate(ir: ArchitectureIR): IRValidationResult {
    this.errors = [];
    this.warnings = [];

    // 1. Schema version and basic structure
    this.validateSchemaVersion(ir);
    this.validateBasicStructure(ir);

    if (this.errors.length > 0) {
      return {
        isValid: false,
        errors: this.errors,
        warnings: this.warnings,
        schema: { version: 'v1', compatible: false },
      };
    }

    // 2. Component integrity
    this.validateServices(ir);
    this.validateDataStores(ir);
    this.validateDependencies(ir);

    // 3. Structural integrity
    this.detectCycles(ir);
    this.validateMappingCompleteness(ir);
    this.validateConfidenceScores(ir);

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      schema: { version: 'v1', compatible: true },
    };
  }

  /**
   * Validate schema version compatibility
   */
  private validateSchemaVersion(ir: ArchitectureIR): void {
    if (ir.schemaVersion !== 'v1') {
      this.addError(
        'SCHEMA_VERSION_MISMATCH',
        `Expected schemaVersion='v1', got '${ir.schemaVersion}'`,
        '$',
        'error'
      );
    }

    if (!ir.metadata || !ir.metadata.schemaVersion || ir.metadata.schemaVersion !== 'v1') {
      this.addWarning(
        'METADATA_VERSION_MISMATCH',
        "metadata.schemaVersion should be 'v1'",
        '$.metadata.schemaVersion',
        'warning'
      );
    }
  }

  /**
   * Validate basic structure and required fields
   */
  private validateBasicStructure(ir: ArchitectureIR): void {
    if (!ir.projectId || ir.projectId.trim() === '') {
      this.addError(
        'MISSING_PROJECT_ID',
        'projectId is required and cannot be empty',
        '$.projectId',
        'error'
      );
    }

    if (!ir.projectName || ir.projectName.trim() === '') {
      this.addError(
        'MISSING_PROJECT_NAME',
        'projectName is required and cannot be empty',
        '$.projectName',
        'error'
      );
    }

    if (!ir.runtime) {
      this.addError('MISSING_RUNTIME', 'runtime is required', '$.runtime', 'error');
    }

    if (!ir.topology) {
      this.addError('MISSING_TOPOLOGY', 'topology is required', '$.topology', 'error');
    }

    if (!ir.mapping || typeof ir.mapping !== 'object') {
      this.addError('MISSING_MAPPING', 'mapping must be an object', '$.mapping', 'error');
    }

    if (
      ir.metadata &&
      ir.metadata.scopeCoverage !== undefined &&
      !['known', 'partial', 'unknown'].includes(ir.metadata.scopeCoverage)
    ) {
      this.addWarning(
        'INVALID_SCOPE_COVERAGE',
        "metadata.scopeCoverage should be one of: 'known', 'partial', 'unknown'",
        '$.metadata.scopeCoverage',
        'warning'
      );
    }

    if (
      ir.metadata &&
      ir.metadata.scopeConfidenceScore !== undefined &&
      (!Number.isFinite(ir.metadata.scopeConfidenceScore) ||
        ir.metadata.scopeConfidenceScore < 0 ||
        ir.metadata.scopeConfidenceScore > 1)
    ) {
      this.addWarning(
        'INVALID_SCOPE_CONFIDENCE_SCORE',
        'metadata.scopeConfidenceScore should be a number between 0 and 1',
        '$.metadata.scopeConfidenceScore',
        'warning'
      );
    }

    if (
      ir.metadata &&
      ir.metadata.blockMutationWhenScopeUnknown !== undefined &&
      typeof ir.metadata.blockMutationWhenScopeUnknown !== 'boolean'
    ) {
      this.addWarning(
        'INVALID_BLOCK_MUTATION_FLAG',
        'metadata.blockMutationWhenScopeUnknown should be a boolean',
        '$.metadata.blockMutationWhenScopeUnknown',
        'warning'
      );
    }

    if (
      ir.metadata &&
      ir.metadata.blockedReasons !== undefined &&
      (!Array.isArray(ir.metadata.blockedReasons) ||
        ir.metadata.blockedReasons.some((reason) => typeof reason !== 'string'))
    ) {
      this.addWarning(
        'INVALID_BLOCKED_REASONS',
        'metadata.blockedReasons should be a string array',
        '$.metadata.blockedReasons',
        'warning'
      );
    }

    // Check timestamps
    if (!ir.createdAt || !this.isValidISOTimestamp(ir.createdAt)) {
      this.addWarning(
        'INVALID_CREATED_AT',
        'createdAt should be a valid ISO 8601 timestamp',
        '$.createdAt',
        'warning'
      );
    }

    if (!ir.updatedAt || !this.isValidISOTimestamp(ir.updatedAt)) {
      this.addWarning(
        'INVALID_UPDATED_AT',
        'updatedAt should be a valid ISO 8601 timestamp',
        '$.updatedAt',
        'warning'
      );
    }
  }

  /**
   * Validate all services in topology
   */
  private validateServices(ir: ArchitectureIR): void {
    const services = ir.topology.services || [];
    const serviceIds = new Set<string>();

    for (let i = 0; i < services.length; i++) {
      const svc = services[i];

      // Check required fields
      if (!svc.id || svc.id.trim() === '') {
        this.addError(
          'INVALID_SERVICE_ID',
          `Service[${i}] has invalid id`,
          `$.topology.services[${i}].id`,
          'error'
        );
      } else if (serviceIds.has(svc.id)) {
        this.addError(
          'DUPLICATE_SERVICE_ID',
          `Service id '${svc.id}' is duplicated`,
          `$.topology.services[${i}].id`,
          'error'
        );
      } else {
        serviceIds.add(svc.id);
      }

      if (!svc.name || svc.name.trim() === '') {
        this.addError(
          'INVALID_SERVICE_NAME',
          `Service[${i}] has invalid name`,
          `$.topology.services[${i}].name`,
          'error'
        );
      }

      if (!svc.path || svc.path.trim() === '') {
        this.addWarning(
          'MISSING_SERVICE_PATH',
          `Service '${svc.id}' is missing path`,
          `$.topology.services[${i}].path`,
          'warning'
        );
      }

      if (!svc.entryPoint || svc.entryPoint.trim() === '') {
        this.addWarning(
          'MISSING_ENTRY_POINT',
          `Service '${svc.id}' is missing entryPoint`,
          `$.topology.services[${i}].entryPoint`,
          'warning'
        );
      }

      // Validate handlers
      const handlers = svc.handlers || [];
      for (let j = 0; j < handlers.length; j++) {
        const handler = handlers[j];
        if (!handler.method || !handler.path) {
          this.addWarning(
            'INVALID_HANDLER',
            `Service '${svc.id}' Handler[${j}] is missing method or path`,
            `$.topology.services[${i}].handlers[${j}]`,
            'warning'
          );
        }
        if (!handler.sourceFile) {
          this.addWarning(
            'MISSING_HANDLER_SOURCE',
            `Service '${svc.id}' Handler '${handler.path}' is missing sourceFile`,
            `$.topology.services[${i}].handlers[${j}].sourceFile`,
            'warning'
          );
        }
      }

      // Validate confidence level
      if (!this.isValidConfidenceLevel(svc.confidenceLevel)) {
        this.addWarning(
          'INVALID_CONFIDENCE_LEVEL',
          `Service '${svc.id}' has invalid confidenceLevel`,
          `$.topology.services[${i}].confidenceLevel`,
          'warning'
        );
      }
    }
  }

  /**
   * Validate all data stores in topology
   */
  private validateDataStores(ir: ArchitectureIR): void {
    const dataStores = ir.topology.dataStores || [];
    const datastoreIds = new Set<string>();

    for (let i = 0; i < dataStores.length; i++) {
      const ds = dataStores[i];

      if (!ds.id || ds.id.trim() === '') {
        this.addError(
          'INVALID_DATASTORE_ID',
          `DataStore[${i}] has invalid id`,
          `$.topology.dataStores[${i}].id`,
          'error'
        );
      } else if (datastoreIds.has(ds.id)) {
        this.addError(
          'DUPLICATE_DATASTORE_ID',
          `DataStore id '${ds.id}' is duplicated`,
          `$.topology.dataStores[${i}].id`,
          'error'
        );
      } else {
        datastoreIds.add(ds.id);
      }

      if (!ds.name || ds.name.trim() === '') {
        this.addError(
          'INVALID_DATASTORE_NAME',
          `DataStore[${i}] has invalid name`,
          `$.topology.dataStores[${i}].name`,
          'error'
        );
      }

      if (!ds.type) {
        this.addError(
          'MISSING_DATASTORE_TYPE',
          `DataStore '${ds.id}' is missing type`,
          `$.topology.dataStores[${i}].type`,
          'error'
        );
      }

      if (!this.isValidConfidenceLevel(ds.confidenceLevel)) {
        this.addWarning(
          'INVALID_CONFIDENCE_LEVEL',
          `DataStore '${ds.id}' has invalid confidenceLevel`,
          `$.topology.dataStores[${i}].confidenceLevel`,
          'warning'
        );
      }
    }
  }

  /**
   * Validate dependencies point to existing components
   */
  private validateDependencies(ir: ArchitectureIR): void {
    const services = ir.topology.services || [];
    const dataStores = ir.topology.dataStores || [];
    const dataStoreIds = new Set(dataStores.map((ds) => ds.id));
    const serviceIds = new Set(services.map((s) => s.id));

    for (const svc of services) {
      // Check service dependencies
      const deps = svc.dependencies || [];
      for (const dep of deps) {
        if (!serviceIds.has(dep.componentId) && dep.componentType !== 'external') {
          this.addWarning(
            'INVALID_DEPENDENCY',
            `Service '${svc.id}' depends on unknown service '${dep.componentId}'`,
            `$.topology.services[?(@.id='${svc.id}')].dependencies`,
            'warning'
          );
        }
      }

      // Check datastore access
      const dsAccess = svc.dataStoreAccess || [];
      for (const access of dsAccess) {
        if (!dataStoreIds.has(access.dataStoreId)) {
          this.addWarning(
            'INVALID_DATASTORE_REF',
            `Service '${svc.id}' references unknown datastore '${access.dataStoreId}'`,
            `$.topology.services[?(@.id='${svc.id}')].dataStoreAccess`,
            'warning'
          );
        }
      }
    }
  }

  /**
   * Detect circular dependencies in service graph
   */
  private detectCycles(ir: ArchitectureIR): void {
    const services = ir.topology.services || [];
    const graph = new Map<string, Set<string>>();

    // Build adjacency list
    for (const svc of services) {
      graph.set(svc.id, new Set());
      const deps = svc.dependencies || [];
      for (const dep of deps) {
        if (dep.componentType === 'service') {
          graph.get(svc.id)!.add(dep.componentId);
        }
      }
    }

    // Detect cycles using DFS
    const visited = new Set<string>();
    const recStack = new Set<string>();

    for (const serviceId of graph.keys()) {
      if (!visited.has(serviceId)) {
        if (this.hasCycle(serviceId, graph, visited, recStack)) {
          this.addError(
            'CIRCULAR_DEPENDENCY',
            `Circular dependency detected involving service '${serviceId}'`,
            '$.topology.services',
            'error'
          );
        }
      }
    }
  }

  /**
   * Recursive cycle detection
   */
  private hasCycle(
    node: string,
    graph: Map<string, Set<string>>,
    visited: Set<string>,
    recStack: Set<string>
  ): boolean {
    visited.add(node);
    recStack.add(node);

    const neighbors = graph.get(node) || new Set();
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        if (this.hasCycle(neighbor, graph, visited, recStack)) {
          return true;
        }
      } else if (recStack.has(neighbor)) {
        return true;
      }
    }

    recStack.delete(node);
    return false;
  }

  /**
   * Validate mapping completeness
   */
  private validateMappingCompleteness(ir: ArchitectureIR): void {
    const services = ir.topology.services || [];
    const dataStores = ir.topology.dataStores || [];
    const mapping = ir.mapping || {};

    // Check all services have mapping metadata
    for (const svc of services) {
      if (!mapping[svc.id]) {
        this.addWarning(
          'MISSING_MAPPING_METADATA',
          `Service '${svc.id}' has no mapping metadata`,
          `$.mapping['${svc.id}']`,
          'warning'
        );
      } else {
        const meta = mapping[svc.id];
        if (meta.confidence < 0 || meta.confidence > 1) {
          this.addWarning(
            'INVALID_CONFIDENCE_SCORE',
            `Service '${svc.id}' has invalid confidence score: ${meta.confidence}`,
            `$.mapping['${svc.id}'].confidence`,
            'warning'
          );
        }
      }
    }

    // Check all data stores have mapping metadata
    for (const ds of dataStores) {
      if (!mapping[ds.id]) {
        this.addWarning(
          'MISSING_MAPPING_METADATA',
          `DataStore '${ds.id}' has no mapping metadata`,
          `$.mapping['${ds.id}']`,
          'warning'
        );
      }
    }
  }

  /**
   * Validate confidence scores are calibrated
   */
  private validateConfidenceScores(ir: ArchitectureIR): void {
    const mapping = ir.mapping || {};
    const scores = Object.values(mapping).map((m) => m.confidence);

    if (scores.length === 0) {
      return;
    }

    const avgConfidence = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (avgConfidence < 0.5) {
      this.addWarning(
        'LOW_AVERAGE_CONFIDENCE',
        `Average mapping confidence is low: ${(avgConfidence * 100).toFixed(1)}%`,
        '$.mapping',
        'warning'
      );
    }

    // Check for inconsistently low individual scores
    for (const [componentId, meta] of Object.entries(mapping)) {
      if (meta.confidence < 0.3) {
        this.addWarning(
          'LOW_COMPONENT_CONFIDENCE',
          `Component '${componentId}' has very low confidence: ${(meta.confidence * 100).toFixed(1)}%`,
          `$.mapping['${componentId}'].confidence`,
          'warning'
        );
      }
    }
  }

  /**
   * Validate individual component reference
   */
  validateComponentRef(componentId: string, ir: ArchitectureIR): boolean {
    const services = ir.topology.services || [];
    const dataStores = ir.topology.dataStores || [];

    const exists =
      services.some((s) => s.id === componentId) || dataStores.some((ds) => ds.id === componentId);

    if (!exists) {
      this.addWarning(
        'INVALID_COMPONENT_REF',
        `Referenced component '${componentId}' does not exist`,
        '',
        'warning'
      );
      return false;
    }

    const mapping = ir.mapping || {};
    const meta = mapping[componentId];

    if (!meta) {
      this.addWarning(
        'MISSING_MAPPING_FOR_REF',
        `Component '${componentId}' has no mapping metadata`,
        '',
        'warning'
      );
      return false;
    }

    if (meta.confidence < 0.5) {
      this.addWarning(
        'LOW_CONFIDENCE_FOR_REF',
        `Component '${componentId}' has low confidence: ${(meta.confidence * 100).toFixed(1)}%`,
        '',
        'warning'
      );
      return false;
    }

    return true;
  }

  /**
   * Migrate historical/non-conformant payloads to ArchitectureIR v1.
   */
  migrateIR(oldIr: any, fromVersion: string = 'v0'): ArchitectureIR {
    if (oldIr?.schemaVersion === 'v1') {
      return oldIr as ArchitectureIR;
    }

    const runtime = this.normalizeRuntime(oldIr?.runtime ?? oldIr?.language ?? 'unknown');
    const projectId = oldIr?.projectId ?? oldIr?.id ?? oldIr?.project?.id ?? 'migrated-project';
    const projectName =
      oldIr?.projectName ?? oldIr?.name ?? oldIr?.project?.name ?? 'Migrated Project';

    const next = createArchitectureIR(projectId, projectName, runtime);
    next.framework = oldIr?.framework;
    next.metadata.mapperType = 'manual';
    next.metadata.confidenceLevel = 'medium';
    next.metadata.confidenceReason = `Migrated from ${fromVersion} to v1`;

    const services = oldIr?.topology?.services ?? oldIr?.services ?? [];
    for (const serviceLike of services) {
      const id = serviceLike?.id ?? serviceLike?.serviceId;
      if (!id || typeof id !== 'string') {
        continue;
      }
      const service = createServiceComponent(
        id,
        serviceLike?.name ?? id,
        this.normalizeRuntime(serviceLike?.runtime ?? runtime),
        serviceLike?.path ?? '.',
        serviceLike?.entryPoint ?? serviceLike?.sourceFile ?? 'unknown'
      );
      service.framework = serviceLike?.framework ?? oldIr?.framework;
      service.confidenceLevel = this.normalizeConfidence(serviceLike?.confidenceLevel, 'medium');

      const handlers = serviceLike?.handlers ?? serviceLike?.routes ?? serviceLike?.endpoints ?? [];
      service.handlers = handlers
        .map((handlerLike: any, index: number) => {
          const method = String(handlerLike?.method ?? 'ANY').toUpperCase();
          const allowed = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'ANY'];
          return {
            id: handlerLike?.id ?? `${id}-handler-${index + 1}`,
            method: (allowed.includes(method) ? method : 'ANY') as
              | 'GET'
              | 'POST'
              | 'PUT'
              | 'DELETE'
              | 'PATCH'
              | 'ANY',
            path: handlerLike?.path ?? handlerLike?.route ?? '/',
            sourceFile: handlerLike?.sourceFile ?? service.entryPoint,
            confidence: Number.isFinite(handlerLike?.confidence) ? handlerLike.confidence : 0.7,
          };
        })
        .filter((h: any) => typeof h.path === 'string');

      const dependencies = serviceLike?.dependencies ?? [];
      service.dependencies = dependencies
        .map((depLike: any) => {
          if (typeof depLike === 'string') {
            return {
              componentId: depLike,
              componentType: 'service' as const,
              direction: 'outbound' as const,
            };
          }
          if (depLike?.componentId) {
            return {
              componentId: depLike.componentId,
              componentType: depLike.componentType ?? 'service',
              direction: depLike.direction ?? 'outbound',
            };
          }
          return null;
        })
        .filter(Boolean);

      next.topology.services.push(service);
      next.mapping[id] = {
        sourceFile: service.entryPoint,
        lineRange: [1, 1],
        confidence: 0.7,
        mappedAt: new Date().toISOString(),
        mapperType: 'manual',
        evidence: [`Migrated service '${id}' from ${fromVersion}`],
      };
    }

    const dataStores = oldIr?.topology?.dataStores ?? oldIr?.dataStores ?? oldIr?.datastores ?? [];
    for (const dataStoreLike of dataStores) {
      const id = dataStoreLike?.id ?? dataStoreLike?.storeId;
      if (!id || typeof id !== 'string') {
        continue;
      }
      const type = this.normalizeDataStoreType(dataStoreLike?.type ?? dataStoreLike?.kind);
      const dataStore = createDataStoreComponent(id, dataStoreLike?.name ?? id, type);
      dataStore.confidenceLevel = this.normalizeConfidence(
        dataStoreLike?.confidenceLevel,
        'medium'
      );
      next.topology.dataStores.push(dataStore);
      next.mapping[id] = {
        sourceFile: dataStoreLike?.sourceFile ?? 'unknown',
        lineRange: [1, 1],
        confidence: 0.65,
        mappedAt: new Date().toISOString(),
        mapperType: 'manual',
        evidence: [`Migrated datastore '${id}' from ${fromVersion}`],
      };
    }

    return next;
  }

  /**
   * Helper: Check if timestamp is valid ISO 8601
   */
  private isValidISOTimestamp(timestamp: string): boolean {
    try {
      const date = new Date(timestamp);
      return !isNaN(date.getTime()) && timestamp === date.toISOString();
    } catch {
      return false;
    }
  }

  /**
   * Helper: Check if confidence level is valid
   */
  private isValidConfidenceLevel(level: any): boolean {
    return level === 'high' || level === 'medium' || level === 'low';
  }

  private normalizeRuntime(value: string): RuntimeType {
    const lower = String(value ?? 'unknown').toLowerCase();
    if (lower.includes('python')) {
      return 'python';
    }
    if (lower.includes('node') || lower.includes('typescript') || lower.includes('javascript')) {
      return 'nodejs';
    }
    if (lower.includes('go')) {
      return 'go';
    }
    if (lower.includes('java') || lower.includes('spring')) {
      return 'java';
    }
    if (lower.includes('ruby') || lower.includes('rails')) {
      return 'ruby';
    }
    if (lower.includes('c#') || lower.includes('csharp') || lower.includes('dotnet')) {
      return 'csharp';
    }
    if (lower.includes('rust')) {
      return 'rust';
    }
    return 'unknown';
  }

  private normalizeConfidence(
    value: string | undefined,
    fallback: 'high' | 'medium' | 'low'
  ): 'high' | 'medium' | 'low' {
    if (value === 'high' || value === 'medium' || value === 'low') {
      return value;
    }
    return fallback;
  }

  private normalizeDataStoreType(
    value: string
  ):
    | 'postgres'
    | 'mysql'
    | 'mongodb'
    | 'redis'
    | 'dynamodb'
    | 's3'
    | 'firestore'
    | 'elasticsearch'
    | 'other' {
    const lower = String(value ?? 'other').toLowerCase();
    if (lower.includes('postgres')) {
      return 'postgres';
    }
    if (lower.includes('mysql')) {
      return 'mysql';
    }
    if (lower.includes('mongo')) {
      return 'mongodb';
    }
    if (lower.includes('redis')) {
      return 'redis';
    }
    if (lower.includes('dynamo')) {
      return 'dynamodb';
    }
    if (lower === 's3' || lower.includes('boto')) {
      return 's3';
    }
    if (lower.includes('firestore')) {
      return 'firestore';
    }
    if (lower.includes('elastic') || lower.includes('opensearch')) {
      return 'elasticsearch';
    }
    return 'other';
  }

  /**
   * Add error
   */
  private addError(
    code: string,
    message: string,
    path: string,
    severity: 'error' | 'warning'
  ): void {
    this.errors.push({ code, message, path, severity });
  }

  /**
   * Add warning
   */
  private addWarning(
    code: string,
    message: string,
    path: string,
    severity: 'error' | 'warning'
  ): void {
    this.warnings.push({ code, message, path, severity });
  }
}

/**
 * Convenience function for quick validation
 */
export function validateArchitectureIR(ir: ArchitectureIR): IRValidationResult {
  const validator = new ArchitectureIRValidator();
  return validator.validate(ir);
}

export function migrateArchitectureIR(oldIr: any, fromVersion: string = 'v0'): ArchitectureIR {
  const validator = new ArchitectureIRValidator();
  return validator.migrateIR(oldIr, fromVersion);
}
