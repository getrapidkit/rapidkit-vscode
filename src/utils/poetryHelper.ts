/**
 * Poetry Helper Utilities
 * Handles Poetry virtualenv detection and management
 */

import * as path from 'path';
import * as fs from 'fs-extra';
import { Logger } from './logger';
import { requirementCache } from './requirementCache';

export interface VirtualenvInfo {
  type: 'venv' | 'poetry' | 'none';
  path: string | null;
  exists: boolean;
}

/**
 * Detect Poetry virtualenv location
 * Checks both project .venv and Poetry cache (~/.cache/pypoetry/virtualenvs/)
 */
export async function detectPoetryVirtualenv(projectPath: string): Promise<string | null> {
  const logger = Logger.getInstance();

  try {
    // Check if Poetry is available
    const { execa } = await import('execa');

    const result = await execa('poetry', ['env', 'info', '--path'], {
      cwd: projectPath,
      timeout: 5000,
      reject: false,
    });

    if (result.exitCode === 0 && result.stdout.trim()) {
      const venvPath = result.stdout.trim();

      // Verify the virtualenv actually exists
      if (await fs.pathExists(venvPath)) {
        logger.debug(`Poetry virtualenv detected: ${venvPath}`);
        return venvPath;
      }
    }
  } catch (error) {
    logger.debug('Poetry virtualenv detection failed', error);
  }

  return null;
}

/**
 * Detect any Python virtualenv (Poetry or standard .venv)
 */
export async function detectPythonVirtualenv(projectPath: string): Promise<VirtualenvInfo> {
  const logger = Logger.getInstance();

  // First, check for standard .venv in project
  const venvPath = path.join(projectPath, '.venv');
  if (await fs.pathExists(venvPath)) {
    logger.debug(`Standard .venv detected: ${venvPath}`);
    return {
      type: 'venv',
      path: venvPath,
      exists: true,
    };
  }

  // Check for Poetry virtualenv in cache
  const poetryVenv = await detectPoetryVirtualenv(projectPath);
  if (poetryVenv) {
    return {
      type: 'poetry',
      path: poetryVenv,
      exists: true,
    };
  }

  // No virtualenv found
  return {
    type: 'none',
    path: null,
    exists: false,
  };
}

/**
 * Check if project has Poetry configuration
 */
export async function hasPoetryConfig(projectPath: string): Promise<boolean> {
  const pyprojectPath = path.join(projectPath, 'pyproject.toml');

  if (!(await fs.pathExists(pyprojectPath))) {
    return false;
  }

  try {
    const content = await fs.readFile(pyprojectPath, 'utf-8');
    return content.includes('[tool.poetry]');
  } catch {
    return false;
  }
}

/**
 * Check if Poetry is installed on system
 */
export async function isPoetryInstalled(): Promise<boolean> {
  try {
    const { execa } = await import('execa');
    const result = await execa('poetry', ['--version'], {
      timeout: 3000,
      reject: false,
    });
    return result.exitCode === 0;
  } catch {
    return false;
  }
}

/**
 * Get Poetry version
 */
export async function getPoetryVersion(): Promise<string | null> {
  try {
    const { execa } = await import('execa');
    const result = await execa('poetry', ['--version'], {
      timeout: 3000,
    });

    // Output format: "Poetry (version 1.7.1)"
    const match = result.stdout.match(/Poetry \(version ([\d.]+)\)/);
    return match ? match[1] : result.stdout.trim();
  } catch {
    return null;
  }
}

/**
 * Cached version of isPoetryInstalled
 * Uses cache to speed up repeated checks (TTL: 5 minutes)
 */
export async function isPoetryInstalledCached(): Promise<boolean> {
  const logger = Logger.getInstance();

  // Try to get from cache first
  const cached = requirementCache.getCachedPoetryCheck();
  if (cached !== null) {
    logger.debug('Using cached Poetry check result');
    return cached;
  }

  // Cache miss - perform actual check
  logger.debug('Poetry cache miss - performing fresh check');
  const result = await isPoetryInstalled();

  // Cache the result
  requirementCache.cachePoetryCheck(result);

  return result;
}
