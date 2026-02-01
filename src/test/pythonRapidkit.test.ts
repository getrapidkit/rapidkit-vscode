import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../utils/exec', () => ({
  run: vi.fn(),
}));

import { run } from '../utils/exec';
import { getRapidkitCoreVersion, detectRapidkitProject } from '../core/bridge/pythonRapidkit';

describe('pythonRapidkit bridge', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parses core version JSON', async () => {
    vi.mocked(run).mockResolvedValueOnce({
      stdout: JSON.stringify({ schema_version: 1, version: '0.2.0' }),
      stderr: '',
      exitCode: 0,
    } as any);

    const res = await getRapidkitCoreVersion({ cwd: '/x', timeoutMs: 1000 });
    expect(res.ok).toBe(true);
    expect(res.data?.version).toBe('0.2.0');

    expect(vi.mocked(run)).toHaveBeenCalledWith(
      'python3',
      ['-m', 'rapidkit', '--version', '--json'],
      expect.objectContaining({ cwd: '/x', timeout: 1000 })
    );
  });

  it('falls back from python3 to python', async () => {
    vi.mocked(run)
      .mockResolvedValueOnce({ stdout: '', stderr: 'not found', exitCode: 127 } as any)
      .mockResolvedValueOnce({
        stdout: JSON.stringify({ schema_version: 1, version: '0.2.0' }),
        stderr: '',
        exitCode: 0,
      } as any);

    const res = await getRapidkitCoreVersion();
    expect(res.ok).toBe(true);

    expect(vi.mocked(run)).toHaveBeenNthCalledWith(
      1,
      'python3',
      ['-m', 'rapidkit', '--version', '--json'],
      expect.any(Object)
    );
    expect(vi.mocked(run)).toHaveBeenNthCalledWith(
      2,
      'python',
      ['-m', 'rapidkit', '--version', '--json'],
      expect.any(Object)
    );
  });

  it('parses project detect JSON', async () => {
    vi.mocked(run).mockResolvedValueOnce({
      stdout: JSON.stringify({
        schema_version: 1,
        input: '/work',
        confidence: 'strong',
        isRapidkitProject: true,
        projectRoot: '/work',
        engine: 'python',
        markers: {},
      }),
      stderr: '',
      exitCode: 0,
    } as any);

    const res = await detectRapidkitProject('/work', { cwd: '/work' });
    expect(res.ok).toBe(true);
    expect(res.data?.isRapidkitProject).toBe(true);
  });
});
