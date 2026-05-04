/**
 * C01: Universal Architecture IR v1 - Test Suite
 *
 * 24 comprehensive tests covering schema validation,
 * cycle detection, mapping validation, and confidence scoring.
 */

import { describe, it, expect } from 'vitest';
import {
  ArchitectureIR,
  createArchitectureIR,
  createServiceComponent,
  createDataStoreComponent,
  isArchitectureIR,
  isServiceComponent,
  isDataStoreComponent,
} from '../core/architectureIr';
import { ArchitectureIRValidator, validateArchitectureIR } from '../core/architectureIrValidator';

describe('C01: Universal Architecture IR v1', () => {
  // ─────────────────────────────────────────────────────────────
  // Factory Tests
  // ─────────────────────────────────────────────────────────────

  describe('Factory Functions', () => {
    it('should create a valid ArchitectureIR baseline', () => {
      const ir = createArchitectureIR('myapp', 'My Application', 'python');

      expect(ir.schemaVersion).toBe('v1');
      expect(ir.projectId).toBe('myapp');
      expect(ir.projectName).toBe('My Application');
      expect(ir.runtime).toBe('python');
      expect(ir.topology.services).toEqual([]);
      expect(ir.topology.dataStores).toEqual([]);
      expect(isArchitectureIR(ir)).toBe(true);
    });

    it('should create a ServiceComponent with defaults', () => {
      const svc = createServiceComponent(
        'auth-svc',
        'Auth Service',
        'python',
        'src/services/auth',
        'src/services/auth/main.py'
      );

      expect(svc.id).toBe('auth-svc');
      expect(svc.name).toBe('Auth Service');
      expect(svc.handlers).toEqual([]);
      expect(svc.dependencies).toEqual([]);
      expect(isServiceComponent(svc)).toBe(true);
    });

    it('should create a DataStoreComponent', () => {
      const ds = createDataStoreComponent('db-main', 'Main DB', 'postgres');

      expect(ds.id).toBe('db-main');
      expect(ds.name).toBe('Main DB');
      expect(ds.type).toBe('postgres');
      expect(isDataStoreComponent(ds)).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Schema Validation Tests
  // ─────────────────────────────────────────────────────────────

  describe('Schema Validation', () => {
    it('should reject IR with missing schemaVersion', () => {
      const bad = {
        projectId: 'app',
        projectName: 'App',
        runtime: 'python',
        topology: { services: [], dataStores: [] },
        mapping: {},
      } as any;

      const result = validateArchitectureIR(bad);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'SCHEMA_VERSION_MISMATCH')).toBe(true);
    });

    it('should reject IR with wrong schemaVersion', () => {
      const ir = createArchitectureIR('app', 'App', 'python');
      ir.schemaVersion = 'v2' as any;

      const result = validateArchitectureIR(ir);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'SCHEMA_VERSION_MISMATCH')).toBe(true);
    });

    it('should reject IR with missing projectId', () => {
      const ir = createArchitectureIR('', 'App', 'python');

      const result = validateArchitectureIR(ir);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_PROJECT_ID')).toBe(true);
    });

    it('should reject IR with missing projectName', () => {
      const ir = createArchitectureIR('app', '', 'python');

      const result = validateArchitectureIR(ir);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_PROJECT_NAME')).toBe(true);
    });

    it('should reject IR with missing topology', () => {
      const bad = {
        schemaVersion: 'v1',
        projectId: 'app',
        projectName: 'App',
        runtime: 'python',
        mapping: {},
      } as any;

      const result = validateArchitectureIR(bad);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'MISSING_TOPOLOGY')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Duplicate Detection Tests
  // ─────────────────────────────────────────────────────────────

  describe('Duplicate Detection', () => {
    it('should reject duplicate service IDs', () => {
      const ir = createArchitectureIR('app', 'App', 'python');
      const svc1 = createServiceComponent('svc-1', 'Service 1', 'python', 'src/svc1', 'main.py');
      const svc2 = createServiceComponent(
        'svc-1',
        'Service 1 Duplicate',
        'python',
        'src/svc1',
        'main.py'
      );

      ir.topology.services = [svc1, svc2];

      const result = validateArchitectureIR(ir);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'DUPLICATE_SERVICE_ID')).toBe(true);
    });

    it('should reject duplicate datastore IDs', () => {
      const ir = createArchitectureIR('app', 'App', 'python');
      const ds1 = createDataStoreComponent('db-1', 'DB 1', 'postgres');
      const ds2 = createDataStoreComponent('db-1', 'DB 1 Duplicate', 'mysql');

      ir.topology.dataStores = [ds1, ds2];

      const result = validateArchitectureIR(ir);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'DUPLICATE_DATASTORE_ID')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Circular Dependency Tests
  // ─────────────────────────────────────────────────────────────

  describe('Cycle Detection', () => {
    it('should detect simple two-service cycle', () => {
      const ir = createArchitectureIR('app', 'App', 'python');

      const svc1 = createServiceComponent('svc-1', 'Service 1', 'python', 'src/s1', 'main.py');
      const svc2 = createServiceComponent('svc-2', 'Service 2', 'python', 'src/s2', 'main.py');

      // svc1 -> svc2
      svc1.dependencies = [
        { componentId: 'svc-2', componentType: 'service', direction: 'outbound' },
      ];

      // svc2 -> svc1 (cycle!)
      svc2.dependencies = [
        { componentId: 'svc-1', componentType: 'service', direction: 'outbound' },
      ];

      ir.topology.services = [svc1, svc2];
      ir.mapping = {
        'svc-1': {
          sourceFile: 's1.py',
          confidence: 1.0,
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
        'svc-2': {
          sourceFile: 's2.py',
          confidence: 1.0,
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
      };

      const result = validateArchitectureIR(ir);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });

    it('should detect three-service cycle', () => {
      const ir = createArchitectureIR('app', 'App', 'python');

      const svc1 = createServiceComponent('svc-1', 'Service 1', 'python', 'src/s1', 'main.py');
      const svc2 = createServiceComponent('svc-2', 'Service 2', 'python', 'src/s2', 'main.py');
      const svc3 = createServiceComponent('svc-3', 'Service 3', 'python', 'src/s3', 'main.py');

      // svc1 -> svc2 -> svc3 -> svc1 (cycle!)
      svc1.dependencies = [
        { componentId: 'svc-2', componentType: 'service', direction: 'outbound' },
      ];
      svc2.dependencies = [
        { componentId: 'svc-3', componentType: 'service', direction: 'outbound' },
      ];
      svc3.dependencies = [
        { componentId: 'svc-1', componentType: 'service', direction: 'outbound' },
      ];

      ir.topology.services = [svc1, svc2, svc3];
      ir.mapping = {
        'svc-1': {
          sourceFile: 's1.py',
          confidence: 1.0,
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
        'svc-2': {
          sourceFile: 's2.py',
          confidence: 1.0,
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
        'svc-3': {
          sourceFile: 's3.py',
          confidence: 1.0,
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
      };

      const result = validateArchitectureIR(ir);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.code === 'CIRCULAR_DEPENDENCY')).toBe(true);
    });

    it('should allow valid DAG without cycles', () => {
      const ir = createArchitectureIR('app', 'App', 'python');

      const svc1 = createServiceComponent('svc-1', 'Service 1', 'python', 'src/s1', 'main.py');
      const svc2 = createServiceComponent('svc-2', 'Service 2', 'python', 'src/s2', 'main.py');
      const svc3 = createServiceComponent('svc-3', 'Service 3', 'python', 'src/s3', 'main.py');

      // svc1 -> svc2, svc1 -> svc3 (no cycle)
      svc1.dependencies = [
        { componentId: 'svc-2', componentType: 'service', direction: 'outbound' },
        { componentId: 'svc-3', componentType: 'service', direction: 'outbound' },
      ];

      ir.topology.services = [svc1, svc2, svc3];
      ir.mapping = {
        'svc-1': {
          sourceFile: 's1.py',
          confidence: 1.0,
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
        'svc-2': {
          sourceFile: 's2.py',
          confidence: 1.0,
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
        'svc-3': {
          sourceFile: 's3.py',
          confidence: 1.0,
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
      };

      const result = validateArchitectureIR(ir);
      expect(result.isValid).toBe(true);
      expect(result.errors.filter((e) => e.code === 'CIRCULAR_DEPENDENCY')).toHaveLength(0);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Dependency Validation Tests
  // ─────────────────────────────────────────────────────────────

  describe('Dependency Validation', () => {
    it('should warn on reference to unknown service', () => {
      const ir = createArchitectureIR('app', 'App', 'python');

      const svc1 = createServiceComponent('svc-1', 'Service 1', 'python', 'src/s1', 'main.py');
      svc1.dependencies = [
        { componentId: 'svc-unknown', componentType: 'service', direction: 'outbound' },
      ];

      ir.topology.services = [svc1];
      ir.mapping = {
        'svc-1': {
          sourceFile: 's1.py',
          confidence: 1.0,
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
      };

      const result = validateArchitectureIR(ir);
      expect(result.warnings.some((w) => w.code === 'INVALID_DEPENDENCY')).toBe(true);
    });

    it('should warn on reference to unknown datastore', () => {
      const ir = createArchitectureIR('app', 'App', 'python');

      const svc1 = createServiceComponent('svc-1', 'Service 1', 'python', 'src/s1', 'main.py');
      svc1.dataStoreAccess = [{ dataStoreId: 'db-unknown', operation: 'read' }];

      ir.topology.services = [svc1];
      ir.mapping = {
        'svc-1': {
          sourceFile: 's1.py',
          confidence: 1.0,
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
      };

      const result = validateArchitectureIR(ir);
      expect(result.warnings.some((w) => w.code === 'INVALID_DATASTORE_REF')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Mapping Validation Tests
  // ─────────────────────────────────────────────────────────────

  describe('Mapping Validation', () => {
    it('should warn on missing mapping metadata for service', () => {
      const ir = createArchitectureIR('app', 'App', 'python');

      const svc1 = createServiceComponent('svc-1', 'Service 1', 'python', 'src/s1', 'main.py');
      ir.topology.services = [svc1];
      ir.mapping = {}; // No mapping for svc1

      const result = validateArchitectureIR(ir);
      expect(result.warnings.some((w) => w.code === 'MISSING_MAPPING_METADATA')).toBe(true);
    });

    it('should reject invalid confidence scores (out of range)', () => {
      const ir = createArchitectureIR('app', 'App', 'python');

      const svc1 = createServiceComponent('svc-1', 'Service 1', 'python', 'src/s1', 'main.py');
      ir.topology.services = [svc1];

      ir.mapping = {
        'svc-1': {
          sourceFile: 's1.py',
          confidence: 1.5, // Invalid: > 1.0
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
      };

      const result = validateArchitectureIR(ir);
      expect(result.warnings.some((w) => w.code === 'INVALID_CONFIDENCE_SCORE')).toBe(true);
    });

    it('should warn on very low component confidence', () => {
      const ir = createArchitectureIR('app', 'App', 'python');

      const svc1 = createServiceComponent('svc-1', 'Service 1', 'python', 'src/s1', 'main.py');
      ir.topology.services = [svc1];
      ir.mapping = {
        'svc-1': {
          sourceFile: 's1.py',
          confidence: 0.2, // Very low
          mappedAt: new Date().toISOString(),
          mapperType: 'heuristic',
        },
      };

      const result = validateArchitectureIR(ir);
      expect(result.warnings.some((w) => w.code === 'LOW_COMPONENT_CONFIDENCE')).toBe(true);
    });

    it('should warn on low average confidence across components', () => {
      const ir = createArchitectureIR('app', 'App', 'python');

      const svc1 = createServiceComponent('svc-1', 'Service 1', 'python', 'src/s1', 'main.py');
      const svc2 = createServiceComponent('svc-2', 'Service 2', 'python', 'src/s2', 'main.py');
      ir.topology.services = [svc1, svc2];
      ir.mapping = {
        'svc-1': {
          sourceFile: 's1.py',
          confidence: 0.3,
          mappedAt: new Date().toISOString(),
          mapperType: 'heuristic',
        },
        'svc-2': {
          sourceFile: 's2.py',
          confidence: 0.35,
          mappedAt: new Date().toISOString(),
          mapperType: 'heuristic',
        },
      };

      const result = validateArchitectureIR(ir);
      expect(result.warnings.some((w) => w.code === 'LOW_AVERAGE_CONFIDENCE')).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Timestamp Validation Tests
  // ─────────────────────────────────────────────────────────────

  describe('Timestamp Validation', () => {
    it('should warn on invalid ISO timestamp in createdAt', () => {
      const ir = createArchitectureIR('app', 'App', 'python');
      ir.createdAt = 'not-a-timestamp';

      const result = validateArchitectureIR(ir);
      expect(result.warnings.some((w) => w.code === 'INVALID_CREATED_AT')).toBe(true);
    });

    it('should warn on invalid ISO timestamp in updatedAt', () => {
      const ir = createArchitectureIR('app', 'App', 'python');
      ir.updatedAt = 'invalid-date';

      const result = validateArchitectureIR(ir);
      expect(result.warnings.some((w) => w.code === 'INVALID_UPDATED_AT')).toBe(true);
    });

    it('should accept valid ISO timestamps', () => {
      const ir = createArchitectureIR('app', 'App', 'python');
      const now = new Date().toISOString();
      ir.createdAt = now;
      ir.updatedAt = now;

      const result = validateArchitectureIR(ir);
      expect(result.errors.some((e) => e.code.includes('TIMESTAMP'))).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Complex Real-World Scenarios
  // ─────────────────────────────────────────────────────────────

  describe('Real-World Scenarios', () => {
    it('should validate a complete FastAPI microservice IR', () => {
      const ir = createArchitectureIR('payment-api', 'Payment Processing API', 'python');
      ir.framework = 'fastapi';

      // Services
      const authSvc = createServiceComponent(
        'auth',
        'Auth Service',
        'python',
        'src/services/auth',
        'src/services/auth/main.py'
      );
      authSvc.handlers = [
        {
          id: 'login',
          method: 'POST',
          path: '/auth/login',
          sourceFile: 'src/services/auth/routes.py',
          confidence: 0.95,
        },
      ];

      const paymentSvc = createServiceComponent(
        'payment',
        'Payment Service',
        'python',
        'src/services/payment',
        'src/services/payment/main.py'
      );
      paymentSvc.dependencies = [
        { componentId: 'auth', componentType: 'service', direction: 'outbound' },
      ];
      paymentSvc.dataStoreAccess = [
        { dataStoreId: 'postgres-main', operation: 'read' },
        { dataStoreId: 'redis-cache', operation: 'write' },
      ];

      const db = createDataStoreComponent('postgres-main', 'Main DB', 'postgres');
      db.version = '14';

      const cache = createDataStoreComponent('redis-cache', 'Cache', 'redis');

      ir.topology.services = [authSvc, paymentSvc];
      ir.topology.dataStores = [db, cache];

      ir.mapping = {
        auth: {
          sourceFile: 'src/services/auth/main.py',
          confidence: 0.95,
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
        payment: {
          sourceFile: 'src/services/payment/main.py',
          confidence: 0.92,
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
        'postgres-main': {
          sourceFile: 'docker-compose.yml',
          confidence: 0.98,
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
        'redis-cache': {
          sourceFile: 'docker-compose.yml',
          confidence: 0.95,
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
      };

      const result = validateArchitectureIR(ir);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a complete NestJS microservice IR', () => {
      const ir = createArchitectureIR('order-service', 'Order Microservice', 'nodejs');
      ir.framework = 'nestjs';

      const orderSvc = createServiceComponent(
        'orders',
        'Order Service',
        'nodejs',
        'src/modules/orders',
        'src/main.ts'
      );
      orderSvc.handlers = [
        {
          id: 'create-order',
          method: 'POST',
          path: '/orders',
          sourceFile: 'src/modules/orders/orders.controller.ts',
          operation: 'create',
          confidence: 0.98,
        },
      ];

      const db = createDataStoreComponent('postgres-orders', 'Orders DB', 'postgres');

      ir.topology.services = [orderSvc];
      ir.topology.dataStores = [db];

      ir.mapping = {
        orders: {
          sourceFile: 'src/main.ts',
          confidence: 0.98,
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
        'postgres-orders': {
          sourceFile: 'docker-compose.yml',
          confidence: 0.95,
          mappedAt: new Date().toISOString(),
          mapperType: 'native',
        },
      };

      const result = validateArchitectureIR(ir);
      expect(result.isValid).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // Type Guard Tests
  // ─────────────────────────────────────────────────────────────

  describe('Type Guards', () => {
    it('should correctly identify valid ArchitectureIR', () => {
      const ir = createArchitectureIR('app', 'App', 'python');
      expect(isArchitectureIR(ir)).toBe(true);
    });

    it('should reject invalid ArchitectureIR', () => {
      const fake = { projectId: 'app' };
      expect(isArchitectureIR(fake)).toBe(false);
    });

    it('should correctly identify valid ServiceComponent', () => {
      const svc = createServiceComponent('s1', 'Service', 'python', 'src', 'main.py');
      expect(isServiceComponent(svc)).toBe(true);
    });

    it('should correctly identify valid DataStoreComponent', () => {
      const ds = createDataStoreComponent('db', 'DB', 'postgres');
      expect(isDataStoreComponent(ds)).toBe(true);
    });
  });
});
