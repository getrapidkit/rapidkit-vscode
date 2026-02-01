/**
 * RapidKit CLI Tests
 */

import { describe, it, expect, beforeAll, vi, beforeEach } from 'vitest';
import { RapidKitCLI } from '../core/rapidkitCLI';

vi.mock('../utils/exec', () => ({
  run: vi.fn(),
}));

import { run } from '../utils/exec';

describe('RapidKitCLI', () => {
  let cli: RapidKitCLI;

  beforeAll(() => {
    cli = new RapidKitCLI();
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should check if CLI is available', async () => {
    vi.mocked(run).mockResolvedValue({ stdout: '0.14.2', stderr: '', exitCode: 0 } as any);
    const isAvailable = await cli.isAvailable();
    expect(typeof isAvailable).toBe('boolean');
    expect(isAvailable).toBe(true);
  });

  it('should get CLI version', async () => {
    vi.mocked(run).mockResolvedValue({ stdout: '0.14.2\n', stderr: '', exitCode: 0 } as any);
    const version = await cli.getVersion();
    expect(version).toBe('0.14.2');
  });
});
