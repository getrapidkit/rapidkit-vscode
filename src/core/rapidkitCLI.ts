/**
 * RapidKit CLI Wrapper
 * Wraps the rapidkit NPM package for use in VS Code extension
 */

import * as path from 'path';
import { Logger } from '../utils/logger';

type ExecaReturnValue = any;

export interface CreateWorkspaceOptions {
  name: string;
  path: string;
  demoMode: boolean;
  skipGit?: boolean;
  dryRun?: boolean;
}

export interface CreateProjectOptions {
  name: string;
  workspacePath: string;
  kit: string;
  mode?: 'demo' | 'full';
}

export interface GenerateDemoOptions {
  name: string;
  destinationPath: string;
  projectName?: string;
  author?: string;
  description?: string;
}

export class RapidKitCLI {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Create a new RapidKit workspace
   */
  async createWorkspace(options: CreateWorkspaceOptions): Promise<ExecaReturnValue> {
    const args = ['rapidkit', options.name];

    if (options.demoMode) {
      args.push('--demo');
    }

    if (options.skipGit) {
      args.push('--skip-git');
    }

    if (options.dryRun) {
      args.push('--dry-run');
    }

    this.logger.debug('Creating workspace with args:', args);

    const { execa } = await import('execa');
    return await execa('npx', args, {
      cwd: path.dirname(options.path),
      stdio: 'inherit',
    });
  }

  /**
   * Generate a demo FastAPI project
   */
  async generateDemo(options: GenerateDemoOptions): Promise<ExecaReturnValue> {
    const args = ['rapidkit', options.name, '--demo-only'];
    this.logger.debug('Generating demo with args:', args);

    // Use execa with stdio: 'inherit' to show output to user
    const { execa } = await import('execa');
    const result = await execa('npx', args, {
      cwd: options.destinationPath,
      stdio: 'inherit',
    });

    return result;
  }

  /**
   * Check if rapidkit CLI is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const { execa } = await import('execa');
      await execa('npx', ['rapidkit', '--version'], { stdio: 'pipe' });
      return true;
    } catch (error) {
      this.logger.debug('RapidKit CLI not available', error);
      return false;
    }
  }

  /**
   * Get RapidKit version
   */
  async getVersion(): Promise<string | null> {
    try {
      const { execa } = await import('execa');
      const result = await execa('npx', ['rapidkit', '--version'], { stdio: 'pipe' });
      return result.stdout.trim();
    } catch (error) {
      this.logger.error('Failed to get RapidKit version', error);
      return null;
    }
  }

  /**
   * Run arbitrary rapidkit command
   */
  async run(args: string[], cwd?: string): Promise<ExecaReturnValue> {
    this.logger.debug('Running rapidkit with args:', args);

    const { execa } = await import('execa');
    return await execa('npx', ['rapidkit', ...args], {
      cwd: cwd || process.cwd(),
      stdio: 'pipe',
    });
  }
}
