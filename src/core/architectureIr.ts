/**
 * Universal Architecture IR v1
 *
 * Single canonical schema for representing backend project architecture
 * across all supported languages and frameworks.
 *
 * Schema is versioned and locked to prevent breaking changes.
 * All projects, frameworks, and topology types use this same contract.
 */

// ───────────────────────────────────────────────────────────────────
// Core IR Types
// ───────────────────────────────────────────────────────────────────

export interface ArchitectureIR {
  schemaVersion: 'v1';
  projectId: string;
  projectName: string;
  description?: string;
  createdAt: string; // ISO 8601 timestamp
  updatedAt: string; // ISO 8601 timestamp

  // Project runtime and framework
  runtime: RuntimeType;
  framework?: string; // e.g., "fastapi", "nestjs", "gin", etc

  // Core architecture definition
  topology: ProjectTopology;
  quality: ArchitectureQuality;
  governance?: GovernancePolicy;

  // Component mapping metadata
  mapping: ComponentMapping;

  // Metadata and versioning
  metadata: IRMetadata;
}

export type RuntimeType =
  | 'python'
  | 'nodejs'
  | 'go'
  | 'java'
  | 'ruby'
  | 'rust'
  | 'csharp'
  | 'unknown';

export interface IRMetadata {
  schemaVersion: string; // Lock to "v1"
  compatibilityVersion: string; // For forward/backward compat
  mapperType: 'native' | 'heuristic' | 'manual';
  confidenceLevel: ConfidenceLevel;
  confidenceReason?: string;
  lastValidated?: string; // ISO timestamp of last schema validation
}

// ───────────────────────────────────────────────────────────────────
// Project Topology (What exists)
// ───────────────────────────────────────────────────────────────────

export interface ProjectTopology {
  services: ServiceComponent[];
  dataStores: DataStoreComponent[];
  queues?: QueueComponent[];
  gateways?: GatewayComponent[];
  externalDependencies?: ExternalDependency[];
}

export interface ServiceComponent {
  id: string;
  name: string;
  description?: string;

  // Runtime and implementation
  runtime: RuntimeType;
  framework?: string;
  language?: string;

  // Location and entry points
  path: string; // relative path from project root
  entryPoint: string; // main file or module

  // API surface
  handlers: ServiceHandler[];

  // Dependencies
  dependencies: DependencyRef[];
  inboundDependencies?: DependencyRef[]; // reverse mapping for queries

  // Data access
  dataStoreAccess: DataStoreRef[];

  // Confidence and metadata
  confidenceLevel: ConfidenceLevel;
  mappingSource?: string; // Where this was detected (AST, heuristic, etc)

  // Optional attributes
  isPublic?: boolean; // exposed externally
  isCritical?: boolean; // part of critical path
  environment?: 'all' | 'prod' | 'staging' | 'dev';
}

export interface ServiceHandler {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'ANY';
  path: string; // e.g., "/users", "/api/v1/orders"
  description?: string;

  // Implementation location
  sourceFile: string;
  lineRange?: [number, number];

  // What it does
  operation?: string; // "create", "read", "update", "delete", etc

  // Dependencies
  callsDependencies?: string[]; // Service IDs this calls
  accessesDataStores?: string[]; // DataStore IDs

  // Confidence
  confidence: number; // 0.0-1.0
}

export interface DataStoreComponent {
  id: string;
  name: string;
  description?: string;

  type: DataStoreType;
  version?: string; // e.g., "14" for Postgres

  // Location
  path?: string; // e.g., docker-compose.yml location
  uri?: string; // connection string pattern (redacted)

  // Access patterns
  accessedBy: ServiceRef[];
  isShared?: boolean;

  // Schema
  tables?: TableSchema[];
  migrations?: MigrationRef[];

  // Confidence
  confidenceLevel: ConfidenceLevel;
  mappingSource?: string;
}

export type DataStoreType =
  | 'postgres'
  | 'mysql'
  | 'mongodb'
  | 'redis'
  | 'dynamodb'
  | 's3'
  | 'firestore'
  | 'elasticsearch'
  | 'other';

export interface QueueComponent {
  id: string;
  name: string;
  type: 'kafka' | 'rabbitmq' | 'sqs' | 'pubsub' | 'other';

  producers: ServiceRef[];
  consumers: ServiceRef[];

  topics?: string[];
  deadLetterQueue?: boolean;
}

export interface GatewayComponent {
  id: string;
  name: string;
  type: 'api-gateway' | 'load-balancer' | 'reverse-proxy' | 'service-mesh';

  exposedServices: ServiceRef[];
  externalPort?: number;
  internalPort?: number;
}

export interface ExternalDependency {
  id: string;
  name: string;
  type: 'third-party-api' | 'saas' | 'package' | 'system';
  url?: string;
  documentation?: string;

  usedBy: ServiceRef[];
  critical?: boolean;
}

// ───────────────────────────────────────────────────────────────────
// References and Dependencies
// ───────────────────────────────────────────────────────────────────

export interface DependencyRef {
  componentId: string;
  componentType: 'service' | 'external' | 'queue';
  direction: 'inbound' | 'outbound';
  confidence?: number; // 0.0-1.0
  why?: string; // reason for dependency
}

export interface ServiceRef {
  serviceId: string;
  role?: string; // "reader", "writer", "async-consumer", etc
}

export interface DataStoreRef {
  dataStoreId: string;
  operation: 'read' | 'write' | 'both';
  cardinality?: 'one' | 'many';
}

export interface TableSchema {
  name: string;
  columns?: ColumnDef[];
  primaryKey?: string;
}

export interface ColumnDef {
  name: string;
  type: string;
  nullable?: boolean;
  indexed?: boolean;
}

export interface MigrationRef {
  version: string;
  description?: string;
  timestamp?: string;
  reversible?: boolean;
}

// ───────────────────────────────────────────────────────────────────
// Quality and Non-Functional Characteristics
// ───────────────────────────────────────────────────────────────────

export interface ArchitectureQuality {
  observability?: ObservabilityScore;
  resilience?: ResilienceScore;
  security?: SecurityScore;
  testing?: TestingScore;
  performance?: PerformanceScore;
}

export interface ObservabilityScore {
  hasLogging?: boolean;
  hasMetrics?: boolean;
  hasTracing?: boolean;
  hasHealthChecks?: boolean;
  score?: number; // 0-100
  gaps?: string[];
}

export interface ResilienceScore {
  hasRetries?: boolean;
  hasCircuitBreaker?: boolean;
  hasDeadLetterQueue?: boolean;
  hasHealthRecovery?: boolean;
  score?: number; // 0-100
  gaps?: string[];
}

export interface SecurityScore {
  hasAuthentication?: boolean;
  hasAuthorization?: boolean;
  hasRateLimiting?: boolean;
  hasCors?: boolean;
  hasSecretManagement?: boolean;
  score?: number; // 0-100
  gaps?: string[];
}

export interface TestingScore {
  hasUnitTests?: boolean;
  hasIntegrationTests?: boolean;
  hasE2eTests?: boolean;
  hasContractTests?: boolean;
  coverage?: number; // 0-100
  score?: number; // 0-100
  gaps?: string[];
}

export interface PerformanceScore {
  avgLatencyMs?: number;
  p95LatencyMs?: number;
  p99LatencyMs?: number;
  throughputRps?: number;
  score?: number; // 0-100
  gaps?: string[];
}

// ───────────────────────────────────────────────────────────────────
// Governance and Team Policies
// ───────────────────────────────────────────────────────────────────

export interface GovernancePolicy {
  owner?: string; // team/person responsible
  approvalRequired?: boolean;
  reviewers?: string[];

  // Naming and structure rules
  namingConventions?: NamingRule[];
  boundaryRules?: BoundaryRule[];

  // Deployment and migration policies
  migrationPolicy?: MigrationPolicy;
  deploymentStrategy?: DeploymentStrategy;

  // Approval gates
  approvalGates?: ApprovalRule[];
}

export interface NamingRule {
  appliesTo: 'service' | 'endpoint' | 'datastore' | 'queue' | 'file' | 'function';
  pattern: string; // Regex pattern
  description?: string;
  example?: string;
}

export interface BoundaryRule {
  rule: string; // e.g., "services cannot call each other across team boundaries"
  enforcedBy?: string; // tool name
}

export interface MigrationPolicy {
  strategy: 'blue-green' | 'canary' | 'rolling' | 'feature-flag';
  maxDowntimeMinutes?: number;
  rollbackMethod?: 'automatic' | 'manual';
  requiresApproval?: boolean;
}

export interface DeploymentStrategy {
  method: 'manual' | 'ci-cd' | 'gitops';
  frequency?: 'weekly' | 'daily' | 'continuous';
  approvalRequired?: boolean;
}

export interface ApprovalRule {
  triggeredBy:
    | 'new_service'
    | 'breaking_change'
    | 'database_change'
    | 'dependency_upgrade'
    | 'config_change';
  requiresReview?: boolean;
  requiresArchitectureSign?: boolean;
  requiresSecurityReview?: boolean;
  requiresPerformanceTest?: boolean;
}

// ───────────────────────────────────────────────────────────────────
// Component Mapping (Traceability)
// ───────────────────────────────────────────────────────────────────

export interface ComponentMapping {
  [componentId: string]: MappingMetadata;
}

export interface MappingMetadata {
  sourceFile: string;
  lineRange?: [number, number];
  confidence: number; // 0.0-1.0
  mappedAt: string; // ISO timestamp
  mapperType: 'native' | 'heuristic' | 'manual';
  evidence?: string[]; // What led to this mapping
  automationHint?: string; // Tip for future automation
}

// ───────────────────────────────────────────────────────────────────
// Unmapped Components and Gaps
// ───────────────────────────────────────────────────────────────────

export interface UnmappedComponent {
  description: string;
  file?: string;
  reason: 'not_yet_modeled' | 'low_confidence' | 'duplicate' | 'external' | 'unknown';
  confidence: number; // 0.0-1.0
  recommendation?: string;
  suggestion?: {
    type: 'add_to_architecture' | 'ignore' | 'clarify';
    details?: string;
  };
}

// ───────────────────────────────────────────────────────────────────
// Supporting Types
// ───────────────────────────────────────────────────────────────────

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface ValidationError {
  code: string;
  message: string;
  path?: string;
  severity: 'error' | 'warning';
}

export interface IRValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  schema: {
    version: string;
    compatible: boolean;
  };
}

// ───────────────────────────────────────────────────────────────────
// Type Guards
// ───────────────────────────────────────────────────────────────────

export function isArchitectureIR(obj: any): obj is ArchitectureIR {
  return !!(
    obj &&
    typeof obj === 'object' &&
    obj.schemaVersion === 'v1' &&
    typeof obj.projectId === 'string' &&
    typeof obj.projectName === 'string' &&
    obj.topology &&
    obj.mapping
  );
}

export function isServiceComponent(obj: any): obj is ServiceComponent {
  return !!(
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.path === 'string'
  );
}

export function isDataStoreComponent(obj: any): obj is DataStoreComponent {
  return !!(
    obj &&
    typeof obj === 'object' &&
    typeof obj.id === 'string' &&
    typeof obj.name === 'string' &&
    typeof obj.type === 'string'
  );
}

// ───────────────────────────────────────────────────────────────────
// Factory Functions
// ───────────────────────────────────────────────────────────────────

export function createArchitectureIR(
  projectId: string,
  projectName: string,
  runtime: RuntimeType
): ArchitectureIR {
  const now = new Date().toISOString();
  return {
    schemaVersion: 'v1',
    projectId,
    projectName,
    runtime,
    createdAt: now,
    updatedAt: now,
    topology: {
      services: [],
      dataStores: [],
    },
    quality: {},
    mapping: {},
    metadata: {
      schemaVersion: 'v1',
      compatibilityVersion: '1.0',
      mapperType: 'manual',
      confidenceLevel: 'low',
    },
  };
}

export function createServiceComponent(
  id: string,
  name: string,
  runtime: RuntimeType,
  path: string,
  entryPoint: string
): ServiceComponent {
  return {
    id,
    name,
    runtime,
    path,
    entryPoint,
    handlers: [],
    dependencies: [],
    dataStoreAccess: [],
    confidenceLevel: 'medium',
  };
}

export function createDataStoreComponent(
  id: string,
  name: string,
  type: DataStoreType
): DataStoreComponent {
  return {
    id,
    name,
    type,
    accessedBy: [],
    confidenceLevel: 'medium',
  };
}
