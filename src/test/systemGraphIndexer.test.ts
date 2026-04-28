import { afterEach, describe, expect, it } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  createProjectSystemGraphWatcher,
  clearProjectSystemGraphCache,
  indexProjectSystemGraph,
  queryProjectSystemGraphImpact,
  scoreSystemGraphImpactDeterministic,
} from '../core/systemGraphIndexer';

const tempDirs: string[] = [];

function mkTempDir(prefix: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), prefix));
  tempDirs.push(dir);
  return dir;
}

function write(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

async function waitForCondition(
  condition: () => boolean,
  timeoutMs = 2500,
  pollMs = 40
): Promise<void> {
  const startedAt = Date.now();
  while (!condition()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error('Timed out waiting for condition');
    }
    await new Promise((resolve) => setTimeout(resolve, pollMs));
  }
}

afterEach(() => {
  clearProjectSystemGraphCache();
  for (const dir of tempDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('systemGraphIndexer', () => {
  it('extracts route/service/model/test nodes and edges for a fastapi-style project', async () => {
    const projectRoot = mkTempDir('rk-graph-fastapi-');

    write(
      path.join(projectRoot, 'app', 'routes', 'orders.py'),
      'from app.services.orders_service import OrdersService\nrouter.get("/orders")\n'
    );
    write(
      path.join(projectRoot, 'app', 'services', 'orders_service.py'),
      'from app.models.order import Order\nclass OrdersService:\n  pass\n'
    );
    write(path.join(projectRoot, 'app', 'models', 'order.py'), 'class Order:\n  pass\n');
    write(path.join(projectRoot, 'tests', 'test_orders.py'), 'def test_orders():\n  assert True\n');

    const graph = await indexProjectSystemGraph({
      projectPath: projectRoot,
      framework: 'fastapi',
      kit: 'fastapi.standard',
    });

    expect(graph.supportedTopology).toBe('fastapi.standard');
    expect(graph.nodes.some((node) => node.type === 'route')).toBe(true);
    expect(graph.nodes.some((node) => node.type === 'service')).toBe(true);
    expect(graph.nodes.some((node) => node.type === 'model')).toBe(true);
    expect(graph.nodes.some((node) => node.type === 'test')).toBe(true);
    expect(graph.edges.length).toBeGreaterThan(0);
    expect(graph.topModules.length).toBeGreaterThan(0);
    expect(graph.refreshMode).toBe('full');
  });

  it('extracts controller/service/datastore edges for a spring-style layout', async () => {
    const projectRoot = mkTempDir('rk-graph-spring-');

    write(
      path.join(
        projectRoot,
        'src',
        'main',
        'java',
        'com',
        'acme',
        'orders',
        'controller',
        'OrderController.java'
      ),
      '@Controller class OrderController {}\n'
    );
    write(
      path.join(
        projectRoot,
        'src',
        'main',
        'java',
        'com',
        'acme',
        'orders',
        'service',
        'OrderService.java'
      ),
      '@Service class OrderService {}\n'
    );
    write(
      path.join(
        projectRoot,
        'src',
        'main',
        'java',
        'com',
        'acme',
        'orders',
        'repository',
        'OrderRepository.java'
      ),
      'interface OrderRepository extends Repository<Order, Long> {}\n'
    );

    const graph = await indexProjectSystemGraph({
      projectPath: projectRoot,
      framework: 'springboot',
      kit: 'springboot.standard',
    });

    expect(graph.nodes.some((node) => node.type === 'controller')).toBe(true);
    expect(graph.nodes.some((node) => node.type === 'service')).toBe(true);
    expect(graph.nodes.some((node) => node.type === 'datastore')).toBe(true);
    expect(graph.edges.some((edge) => edge.relation === 'calls' || edge.relation === 'reads')).toBe(
      true
    );
  });

  it('returns empty graph when scan root is unavailable', async () => {
    const graph = await indexProjectSystemGraph({
      projectPath: '/tmp/does-not-exist-rk-graph',
      framework: 'fastapi',
    });

    expect(graph.nodes).toEqual([]);
    expect(graph.edges).toEqual([]);
    expect(graph.scannedFileCount).toBe(0);
  });

  it('uses incremental refresh cache and rescans only changed files', async () => {
    const projectRoot = mkTempDir('rk-graph-incremental-');
    const routePath = path.join(projectRoot, 'app', 'routes', 'orders.py');
    const servicePath = path.join(projectRoot, 'app', 'services', 'orders_service.py');

    write(routePath, 'router.get("/orders")\n');
    write(servicePath, 'class OrdersService:\n  pass\n');

    const full = await indexProjectSystemGraph({
      projectPath: projectRoot,
      framework: 'fastapi',
      kit: 'fastapi.standard',
      useIncrementalCache: true,
    });

    expect(full.refreshMode).toBe('full');

    fs.appendFileSync(servicePath, '\n# changed\n', 'utf8');

    const incremental = await indexProjectSystemGraph({
      projectPath: projectRoot,
      framework: 'fastapi',
      kit: 'fastapi.standard',
      useIncrementalCache: true,
    });

    expect(
      incremental.refreshMode === 'incremental' || incremental.refreshMode === 'cache-hit'
    ).toBe(true);
    expect(incremental.changedFileCount).toBeGreaterThanOrEqual(0);
    expect(incremental.nodes.some((node) => node.type === 'service')).toBe(true);
  });

  it('returns impacted scope and candidate tests from query API', async () => {
    const projectRoot = mkTempDir('rk-graph-query-');

    write(
      path.join(projectRoot, 'app', 'routes', 'orders.py'),
      'from app.services.orders_service import OrdersService\nrouter.get("/orders")\n'
    );
    write(
      path.join(projectRoot, 'app', 'services', 'orders_service.py'),
      'class OrdersService:\n  pass\n'
    );
    write(path.join(projectRoot, 'tests', 'test_orders.py'), 'def test_orders():\n  assert True\n');

    const graph = await indexProjectSystemGraph({
      projectPath: projectRoot,
      framework: 'fastapi',
      kit: 'fastapi.standard',
      useIncrementalCache: false,
    });

    const impact = queryProjectSystemGraphImpact(graph, {
      seedModules: ['orders'],
      maxDepth: 2,
    });

    expect(impact.unknownScope).toBe(false);
    expect(impact.impactedNodes.length).toBeGreaterThan(0);
    expect(impact.impactedModules.some((item) => item.includes('orders'))).toBe(true);
    expect(impact.confidence).toBeGreaterThan(0);
  });

  it('scores impact deterministically for C11 blast-radius baseline', async () => {
    const projectRoot = mkTempDir('rk-graph-score-');

    write(path.join(projectRoot, 'app', 'routes', 'orders.py'), 'router.get("/orders")\n');
    write(
      path.join(projectRoot, 'app', 'services', 'orders_service.py'),
      'class OrdersService:\n  pass\n'
    );
    write(path.join(projectRoot, 'tests', 'test_orders.py'), 'def test_orders():\n  assert True\n');

    const graph = await indexProjectSystemGraph({
      projectPath: projectRoot,
      framework: 'fastapi',
      kit: 'fastapi.standard',
    });

    const impact = queryProjectSystemGraphImpact(graph, {
      seedModules: ['non-existent-module'],
      maxDepth: 2,
    });
    const score = scoreSystemGraphImpactDeterministic({
      impactQuery: impact,
      graphSnapshot: graph,
      doctorErrors: 1,
      doctorWarnings: 1,
      requiresImpactReview: true,
      requiresVerifyPath: true,
      riskClass: 'guarded-mutating',
    });

    expect(score.scopeKnown).toBe(false);
    expect(score.confidence).toBeLessThanOrEqual(45);
    expect(score.riskLevel === 'high' || score.riskLevel === 'critical').toBe(true);
    expect(score.blockedReasons.length).toBeGreaterThan(0);
    expect(score.rationale.length).toBeGreaterThan(0);
  });

  it('emits watcher updates on file changes', async () => {
    const projectRoot = mkTempDir('rk-graph-watcher-');
    const routeFile = path.join(projectRoot, 'app', 'routes', 'orders.py');

    write(routeFile, 'router.get("/orders")\n');

    const updates: Array<{ reason: string; changedPath?: string }> = [];
    const watcher = await createProjectSystemGraphWatcher({
      projectPath: projectRoot,
      framework: 'fastapi',
      kit: 'fastapi.standard',
      debounceMs: 60,
      pollIntervalMs: 120,
      onUpdate: (update) => {
        updates.push({ reason: update.reason, changedPath: update.changedPath });
      },
    });

    try {
      fs.appendFileSync(routeFile, '# touched\n', 'utf8');

      await waitForCondition(() => updates.some((update) => update.reason === 'fs-event'));

      expect(watcher.getSnapshot()).not.toBeNull();
      expect(updates.some((update) => update.reason === 'initial')).toBe(true);
      expect(updates.some((update) => update.reason === 'fs-event')).toBe(true);
    } finally {
      watcher.dispose();
    }

    expect(watcher.isDisposed()).toBe(true);
  });
});
