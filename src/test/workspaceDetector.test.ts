import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { WorkspaceDetector } from '../core/workspaceDetector';

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: undefined,
  },
  window: {
    createOutputChannel: () => ({
      appendLine: () => undefined,
      show: () => undefined,
      clear: () => undefined,
      dispose: () => undefined,
    }),
  },
}));

describe('WorkspaceDetector (Go support)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (WorkspaceDetector as any).instance = undefined;
  });

  it('detects a Go RapidKit project from go.mod', async () => {
    const detector = WorkspaceDetector.getInstance();
    const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'rk-go-detector-'));

    fs.mkdirSync(path.join(projectPath, '.rapidkit'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, '.rapidkit', 'project.json'), '{}');
    fs.writeFileSync(path.join(projectPath, 'go.mod'), 'module github.com/acme/sample\n');

    const isRapidKit = await (detector as any).isRapidKitProject(projectPath);
    const analyzed = await (detector as any).analyzeProject(projectPath);

    expect(isRapidKit).toBe(true);
    expect(analyzed).not.toBeNull();
    expect(analyzed.type).toBe('go');

    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  it('keeps Go precedence when package.json also exists', async () => {
    const detector = WorkspaceDetector.getInstance();
    const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'rk-go-priority-'));

    fs.mkdirSync(path.join(projectPath, '.rapidkit'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, '.rapidkit', 'project.json'), '{}');
    fs.writeFileSync(path.join(projectPath, 'go.mod'), 'module github.com/acme/sample\n');
    fs.writeFileSync(
      path.join(projectPath, 'package.json'),
      JSON.stringify({ dependencies: { '@nestjs/core': '^11.0.0' } })
    );

    const analyzed = await (detector as any).analyzeProject(projectPath);

    expect(analyzed).not.toBeNull();
    expect(analyzed.type).toBe('go');

    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  it('identifies gofiber.standard when go.mod contains Fiber dependency', async () => {
    const detector = WorkspaceDetector.getInstance();
    const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'rk-go-fiber-detector-'));

    fs.mkdirSync(path.join(projectPath, '.rapidkit'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, '.rapidkit', 'project.json'), '{}');
    fs.writeFileSync(
      path.join(projectPath, 'go.mod'),
      `module github.com/acme/fiber-svc

go 1.24

require github.com/gofiber/fiber/v2 v2.52.5
`
    );

    const analyzed = await (detector as any).analyzeProject(projectPath);

    expect(analyzed).not.toBeNull();
    expect(analyzed.type).toBe('go');
    expect(analyzed.kit).toBe('gofiber.standard');

    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  it('identifies gogin.standard when go.mod contains Gin dependency', async () => {
    const detector = WorkspaceDetector.getInstance();
    const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), 'rk-go-gin-detector-'));

    fs.mkdirSync(path.join(projectPath, '.rapidkit'), { recursive: true });
    fs.writeFileSync(path.join(projectPath, '.rapidkit', 'project.json'), '{}');
    fs.writeFileSync(
      path.join(projectPath, 'go.mod'),
      `module github.com/acme/gin-svc

go 1.24

require github.com/gin-gonic/gin v1.10.0
`
    );

    const analyzed = await (detector as any).analyzeProject(projectPath);

    expect(analyzed).not.toBeNull();
    expect(analyzed.type).toBe('go');
    expect(analyzed.kit).toBe('gogin.standard');

    fs.rmSync(projectPath, { recursive: true, force: true });
  });
});
