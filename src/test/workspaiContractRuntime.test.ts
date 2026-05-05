import * as fs from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { afterEach, describe, expect, it } from 'vitest';

import { evaluateWorkspaiContractRuntime } from '../core/workspaiContractRuntime';

const tempDirs: string[] = [];

async function createTempDir(prefix: string): Promise<string> {
  const dirPath = await fs.mkdtemp(path.join(os.tmpdir(), `${prefix}-`));
  tempDirs.push(dirPath);
  return dirPath;
}

afterEach(async () => {
  await Promise.all(tempDirs.splice(0).map((dirPath) => fs.remove(dirPath)));
});

describe('workspaiContractRuntime', () => {
  it('returns a non-evaluated result when no C06 contract files are present', async () => {
    const workspacePath = await createTempDir('contracts-empty');

    const result = await evaluateWorkspaiContractRuntime({ workspacePath });

    expect(result.evaluated).toBe(false);
    expect(result.source).toBe('none');
    expect(result.availableKinds).toEqual([]);
    expect(result.missingKinds).toEqual([
      'architecture.config',
      'project.mapping',
      'execution.policy',
    ]);
  });

  it('loads and validates a complete contract set from project scope', async () => {
    const workspacePath = await createTempDir('contracts-valid-workspace');
    const projectPath = path.join(workspacePath, 'orders-api');
    await fs.ensureDir(path.join(projectPath, '.workspai'));

    await fs.writeFile(
      path.join(projectPath, '.workspai', 'architecture.config.yaml'),
      [
        'version: v1',
        'project:',
        '  id: orders-api',
        '  name: Orders API',
        '  runtime: node',
        'services:',
        '  - id: orders-service',
        '    name: Orders Service',
        '    path: src/orders',
      ].join('\n')
    );
    await fs.writeJson(
      path.join(projectPath, '.workspai', 'project.mapping.json'),
      {
        version: 'v1',
        mappedAt: '2026-05-05T10:00:00.000Z',
        components: {
          'orders-service': {
            sourceFile: 'src/orders/service.ts',
            lineRange: [1, 40],
            confidence: 0.92,
            mapperType: 'native',
          },
        },
      },
      { spaces: 2 }
    );
    await fs.writeJson(
      path.join(projectPath, '.workspai', 'execution.policy.json'),
      {
        version: 'v1',
        safety: {
          highRiskActions: [
            {
              type: 'apply-debug-patch',
              requiresApprovalGate: true,
              requiresSandboxVerification: true,
              requiresRollbackPlan: true,
            },
          ],
        },
        verification: {
          mandatoryChecks: [
            {
              type: 'tests',
              commandPattern: 'npm test',
              successPattern: 'passed',
            },
          ],
        },
        rollback: {
          strategies: [
            {
              type: 'apply-debug-patch',
              method: 'git checkout -- <files>',
            },
          ],
        },
      },
      { spaces: 2 }
    );

    const result = await evaluateWorkspaiContractRuntime({ workspacePath, projectPath });

    expect(result.evaluated).toBe(true);
    expect(result.source).toBe('project');
    expect(result.availableKinds).toEqual([
      'architecture.config',
      'project.mapping',
      'execution.policy',
    ]);
    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('surfaces parse errors and incomplete-set warnings for partial contracts', async () => {
    const workspacePath = await createTempDir('contracts-invalid-workspace');
    await fs.ensureDir(path.join(workspacePath, '.rapidkit'));

    await fs.writeFile(
      path.join(workspacePath, '.rapidkit', 'architecture.config.yaml'),
      [
        'version: v1',
        'project:',
        '  id: broken-api',
        '  name: Broken API',
        '  runtime: python',
      ].join('\n')
    );
    await fs.writeFile(
      path.join(workspacePath, '.rapidkit', 'project.mapping.json'),
      '{"version":"v1","mappedAt":'
    );

    const result = await evaluateWorkspaiContractRuntime({ workspacePath });

    expect(result.evaluated).toBe(true);
    expect(result.source).toBe('workspace');
    expect(result.errors.some((message) => message.includes('failed to parse'))).toBe(true);
    expect(result.missingKinds).toEqual(['execution.policy']);
  });
});
