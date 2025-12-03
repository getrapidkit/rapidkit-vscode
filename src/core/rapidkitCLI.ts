/**
 * RapidKit CLI Wrapper
 * Wraps the rapidkit NPM package for use in VS Code extension
 *
 * Supports two modes:
 * 1. Direct Project Creation: npx rapidkit <project> --template <fastapi|nestjs>
 * 2. Workspace Mode: npx rapidkit <workspace> (then use `rapidkit create` inside)
 */

import * as path from 'path';
import { Logger } from '../utils/logger';

type ExecaReturnValue = any;

export interface CreateWorkspaceOptions {
  name: string;
  parentPath: string;
  skipGit?: boolean;
  dryRun?: boolean;
}

export interface CreateProjectOptions {
  name: string;
  template: 'fastapi' | 'nestjs';
  parentPath: string;
  skipGit?: boolean;
  skipInstall?: boolean;
  dryRun?: boolean;
}

export interface CreateProjectInWorkspaceOptions {
  name: string;
  template: 'fastapi' | 'nestjs';
  workspacePath: string;
  skipInstall?: boolean;
}

export class RapidKitCLI {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Create a new RapidKit workspace using npm package
   * Uses: npx rapidkit <workspace-name>
   */
  async createWorkspace(options: CreateWorkspaceOptions): Promise<ExecaReturnValue> {
    const args = ['rapidkit', options.name];

    if (options.skipGit) {
      args.push('--skip-git');
    }

    if (options.dryRun) {
      args.push('--dry-run');
    }

    this.logger.info('Creating workspace with npx:', args.join(' '));

    const { execa } = await import('execa');
    // Provide default inputs for non-interactive mode
    const authorName = process.env.USER || process.env.USERNAME || 'RapidKit User';
    const input = `${authorName}\n`;

    return await execa('npx', args, {
      cwd: options.parentPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      input: input,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        CI: 'true', // Tell CLI we're in non-interactive mode
      },
    });
  }

  /**
   * Create a standalone project (Direct mode)
   * Uses: npx rapidkit <project-name> --template <fastapi|nestjs>
   */
  async createProject(options: CreateProjectOptions): Promise<ExecaReturnValue> {
    const args = ['rapidkit', options.name, '--template', options.template];

    if (options.skipGit) {
      args.push('--skip-git');
    }

    if (options.skipInstall) {
      args.push('--skip-install');
    }

    if (options.dryRun) {
      args.push('--dry-run');
    }

    this.logger.info('Creating project with npx:', args.join(' '));

    const { execa } = await import('execa');
    // Provide default inputs for non-interactive mode
    const authorName = process.env.USER || process.env.USERNAME || 'RapidKit User';
    const projectDesc = `${options.name} - Created with RapidKit`;
    const input = `${authorName}\n${projectDesc}\n`;

    return await execa('npx', args, {
      cwd: options.parentPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      input: input,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        CI: 'true',
      },
    });
  }

  /**
   * Create a project inside an existing workspace
   * Uses: rapidkit create <project-name> --template <fastapi|nestjs>
   * Note: Requires activating workspace first (source .rapidkit/activate)
   */
  async createProjectInWorkspace(
    options: CreateProjectInWorkspaceOptions
  ): Promise<ExecaReturnValue> {
    const args = ['create', options.name, '--template', options.template];

    if (options.skipInstall) {
      args.push('--skip-install');
    }

    this.logger.info('Creating project in workspace:', args.join(' '));

    // Check if workspace has .rapidkit/bin/rapidkit
    const rapidkitBin = path.join(options.workspacePath, '.rapidkit', 'bin', 'rapidkit');

    const { execa } = await import('execa');
    const fs = await import('fs-extra');

    let command: string;
    let execArgs: string[];

    if (await fs.pathExists(rapidkitBin)) {
      // Use workspace's rapidkit CLI
      command = rapidkitBin;
      execArgs = args;
      this.logger.debug('Using workspace rapidkit CLI:', rapidkitBin);
    } else {
      // Fallback to npx (workspace might not have been activated)
      command = 'npx';
      execArgs = ['rapidkit', ...args];
      this.logger.debug('Using npx as fallback');
    }

    // Provide default inputs for non-interactive mode
    const authorName = process.env.USER || process.env.USERNAME || 'RapidKit User';
    const projectDesc = `${options.name} - Created with RapidKit`;
    const input = `${authorName}\n${projectDesc}\n`;

    return await execa(command, execArgs, {
      cwd: options.workspacePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      input: input,
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        CI: 'true',
      },
    });
  }

  /**
   * Check if rapidkit CLI is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      const { execa } = await import('execa');
      await execa('npx', ['rapidkit', '--version'], { stdio: 'pipe', timeout: 5000 });
      return true;
    } catch (error) {
      this.logger.debug('RapidKit CLI not available', error);
      return false;
    }
  }

  /**
   * Get RapidKit npm package version
   */
  async getVersion(): Promise<string | null> {
    try {
      const { execa } = await import('execa');
      const result = await execa('npx', ['rapidkit', '--version'], {
        stdio: 'pipe',
        timeout: 5000,
      });
      return result.stdout.trim();
    } catch (error) {
      this.logger.error('Failed to get RapidKit version', error);
      return null;
    }
  }

  /**
   * Run arbitrary rapidkit command
   */
  async run(args: string[], cwd?: string, useNpx = true): Promise<ExecaReturnValue> {
    this.logger.debug('Running rapidkit with args:', args);

    const { execa } = await import('execa');

    if (useNpx) {
      return await execa('npx', ['rapidkit', ...args], {
        cwd: cwd || process.cwd(),
        stdio: 'pipe',
      });
    } else {
      return await execa('rapidkit', args, {
        cwd: cwd || process.cwd(),
        stdio: 'pipe',
      });
    }
  }
}
