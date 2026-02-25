/**
 * Logger Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('vscode', () => ({
  window: {
    createOutputChannel: () => ({
      appendLine: () => undefined,
      show: () => undefined,
      clear: () => undefined,
      dispose: () => undefined,
    }),
  },
}));

import { Logger } from '../utils/logger';

describe('Logger', () => {
  let logger: Logger;

  beforeEach(() => {
    logger = Logger.getInstance();
  });

  it('should be a singleton', () => {
    const logger1 = Logger.getInstance();
    const logger2 = Logger.getInstance();
    expect(logger1).toBe(logger2);
  });

  it('should log messages without throwing', () => {
    expect(() => {
      logger.info('Test info message');
      logger.warn('Test warning message');
      logger.error('Test error message');
      logger.debug('Test debug message');
    }).not.toThrow();
  });

  it('should enable/disable debug mode', () => {
    logger.setDebugMode(true);
    expect(() => logger.debug('Debug message')).not.toThrow();

    logger.setDebugMode(false);
    expect(() => logger.debug('Debug message')).not.toThrow();
  });
});
