import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: undefined,
  },
  window: {
    showErrorMessage: () => undefined,
    createOutputChannel: () => ({
      appendLine: () => undefined,
      show: () => undefined,
      clear: () => undefined,
      dispose: () => undefined,
    }),
  },
}));

vi.mock('../utils/registryPath', () => ({
  getRegistryDir: () => path.join(os.tmpdir(), 'rapidkit-vscode-tests', 'registry'),
}));

import { WorkspaceManager } from '../core/workspaceManager';

describe('WorkspaceManager (Go support)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (WorkspaceManager as any).instance = undefined;
  });

  it('includes Go projects in workspace project discovery', async () => {
    const manager = WorkspaceManager.getInstance();
    const workspacePath = fs.mkdtempSync(path.join(os.tmpdir(), 'rk-workspace-'));

    const fastapiPath = path.join(workspacePath, 'api-fastapi');
    fs.mkdirSync(fastapiPath, { recursive: true });
    fs.writeFileSync(path.join(fastapiPath, 'pyproject.toml'), '[tool.poetry]\nname="api"\n');

    const nestPath = path.join(workspacePath, 'api-nest');
    fs.mkdirSync(nestPath, { recursive: true });
    fs.writeFileSync(
      path.join(nestPath, 'package.json'),
      JSON.stringify({ dependencies: { '@nestjs/core': '^11.0.0' } })
    );

    const goPath = path.join(workspacePath, 'api-go');
    fs.mkdirSync(goPath, { recursive: true });
    fs.writeFileSync(path.join(goPath, 'go.mod'), 'module github.com/acme/api-go\n');

    const projects = await (manager as any).getWorkspaceProjects(workspacePath);
    const names = projects.map((item: { name: string }) => item.name);

    expect(names).toContain('api-fastapi');
    expect(names).toContain('api-nest');
    expect(names).toContain('api-go');

    fs.rmSync(workspacePath, { recursive: true, force: true });
  });
});
