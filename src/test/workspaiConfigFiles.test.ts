import { describe, expect, it } from 'vitest';

import {
  buildMissingFrameworkDocumentText,
  isWorkspaiConfigurationFile,
} from '../providers/workspaiConfigFiles';

describe('workspaiConfigFiles', () => {
  it('recognizes both supported Workspai config filenames', () => {
    expect(isWorkspaiConfigurationFile('/tmp/demo/.rapidkitrc.json')).toBe(true);
    expect(isWorkspaiConfigurationFile('/tmp/demo/rapidkit.json')).toBe(true);
    expect(isWorkspaiConfigurationFile('/tmp/demo/module.yaml')).toBe(false);
  });

  it('builds a valid framework field for an empty JSON object', () => {
    expect(buildMissingFrameworkDocumentText('{}')).toBe('{\n  "framework": ""\n}\n');
  });

  it('inserts a framework field ahead of existing properties without comments', () => {
    expect(buildMissingFrameworkDocumentText('{\n  "mode": "demo"\n}\n')).toBe(
      '{\n  "framework": "",\n  "mode": "demo"\n}\n'
    );
  });
});
