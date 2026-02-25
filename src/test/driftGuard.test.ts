import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const repoRoot = path.resolve(__dirname, '../..');

function read(relPath: string): string {
  return fs.readFileSync(path.join(repoRoot, relPath), 'utf-8');
}

const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  '.vscode-test',
  '.turbo',
]);

const BINARY_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.ico',
  '.svg',
  '.ttf',
  '.woff',
  '.woff2',
  '.eot',
  '.zip',
  '.gz',
  '.tar',
  '.vsix',
  '.lockb',
  '.pdf',
  '.mp4',
  '.webm',
  '.mp3',
]);

function collectProjectFiles(root: string): string[] {
  const files: string[] = [];

  const walk = (dir: string): void => {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(root, fullPath);

      if (entry.isDirectory()) {
        if (EXCLUDED_DIRS.has(entry.name)) continue;
        walk(fullPath);
        continue;
      }

      const ext = path.extname(entry.name).toLowerCase();
      if (BINARY_EXTENSIONS.has(ext)) continue;

      files.push(relPath);
    }
  };

  walk(root);
  return files;
}

describe('contract drift guard', () => {
  it('keeps repository text content free of unenglish characters', () => {
    const filePaths = collectProjectFiles(repoRoot);
    const arabicScriptRegex = /[\u0600-\u06FF]/u;

    const violations: Array<{ file: string; line: number; snippet: string }> = [];

    for (const relPath of filePaths) {
      const absPath = path.join(repoRoot, relPath);
      let content: string;

      try {
        content = fs.readFileSync(absPath, 'utf-8');
      } catch {
        continue;
      }

      const lines = content.split('\n');
      for (let idx = 0; idx < lines.length; idx += 1) {
        const line = lines[idx];
        if (arabicScriptRegex.test(line)) {
          violations.push({
            file: relPath,
            line: idx + 1,
            snippet: line.trim(),
          });
          if (violations.length >= 20) break;
        }
      }

      if (violations.length >= 20) break;
    }

    if (violations.length > 0) {
      const details = violations.map((v) => `${v.file}:${v.line} -> ${v.snippet}`).join('\n');
      throw new Error(`Unenglish text guard failed:\n${details}`);
    }

    expect(violations).toHaveLength(0);
  });

  it('keeps workspace doctor command contract aligned with npm CLI', () => {
    const extensionSource = read('src/extension.ts');

    expect(extensionSource).toContain('npx rapidkit doctor workspace');
    expect(extensionSource).toContain('npx rapidkit doctor workspace --fix');
    expect(extensionSource).not.toContain('npx rapidkit doctor --workspace');
  });

  it('keeps profile enum values aligned across type, completion, hover, and wizard', () => {
    const expectedProfiles = [
      'minimal',
      'python-only',
      'node-only',
      'go-only',
      'polyglot',
      'enterprise',
    ];

    const extensionSource = read('src/extension.ts');
    const typesSource = read('src/types/index.ts');
    const completionSource = read('src/providers/completionProvider.ts');
    const hoverSource = read('src/providers/hoverProvider.ts');
    const wizardSource = read('src/ui/wizards/workspaceWizard.ts');
    const welcomePanelSource = read('src/ui/panels/welcomePanel.ts');
    const webviewTypesSource = read('webview-ui/src/types.ts');
    const projectSchemaSource = read('schemas/rapidkit.schema.json');
    const workspaceSchemaSource = read('schemas/rapidkitrc.schema.json');

    for (const profile of expectedProfiles) {
      expect(extensionSource).toContain(`'${profile}'`);
      expect(typesSource).toContain(`'${profile}'`);
      expect(completionSource).toContain(profile);
      expect(hoverSource).toContain(`\`${profile}\``);
      expect(wizardSource).toContain(`'${profile}'`);
      expect(welcomePanelSource).toContain(`'${profile}'`);
      expect(webviewTypesSource).toContain(`'${profile}'`);
      expect(projectSchemaSource).toContain(`"${profile}"`);
      expect(workspaceSchemaSource).toContain(`"${profile}"`);
    }

    expect(completionSource).not.toContain('standard');
    expect(hoverSource).not.toContain('`standard`');
    expect(projectSchemaSource).not.toContain('"standard"');
    expect(workspaceSchemaSource).not.toContain('"standard"');
  });

  it('keeps updater/setup/legacy commands pinned to stable npm install syntax and workspace doctor contract', () => {
    const updateCheckerSource = read('src/utils/updateChecker.ts');
    const setupPanelSource = read('src/ui/panels/setupPanel.ts');
    const welcomeLegacySource = read('src/ui/panels/welcomePanelLegacy.ts');

    expect(updateCheckerSource).not.toContain('rapidkit@latest');
    expect(setupPanelSource).not.toContain('rapidkit@latest');
    expect(welcomeLegacySource).not.toContain('rapidkit@latest');

    expect(welcomeLegacySource).toContain('npx rapidkit doctor workspace');
    expect(welcomeLegacySource).not.toContain("copyCommand(this, 'npx rapidkit doctor')");
  });
});
