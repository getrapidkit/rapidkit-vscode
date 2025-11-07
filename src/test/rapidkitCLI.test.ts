/**
 * RapidKit CLI Tests
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { RapidKitCLI } from '../core/rapidkitCLI';

describe('RapidKitCLI', () => {
  let cli: RapidKitCLI;

  beforeAll(() => {
    cli = new RapidKitCLI();
  });

  it('should check if CLI is available', async () => {
    const isAvailable = await cli.isAvailable();
    expect(typeof isAvailable).toBe('boolean');
  });

  it('should get CLI version', async () => {
    const version = await cli.getVersion();
    if (version) {
      expect(version).toMatch(/\d+\.\d+\.\d+/);
    }
  });
});
