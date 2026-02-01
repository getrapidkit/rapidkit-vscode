/**
 * RapidKit CLI Wrapper
 * Wraps the rapidkit NPM package for use in VS Code extension.
 *
 * Uses the current npm workflow (no deprecated --template):
 * - Workspace: npx rapidkit <workspace-name> [--yes] [--skip-git]
 * - Project:   npx rapidkit create project <kit> <name> --output <dir> [--yes] [--skip-git] [--skip-install]
 *   Kit slugs: fastapi.standard, nestjs.standard (from UI template choice).
 */

import { Logger } from '../utils/logger';
import { run } from '../utils/exec';

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
  skipGit?: boolean;
  skipInstall?: boolean;
}

function templateToKit(template: 'fastapi' | 'nestjs'): string {
  return template === 'nestjs' ? 'nestjs.standard' : 'fastapi.standard';
}

export class RapidKitCLI {
  private logger: Logger;

  constructor() {
    this.logger = Logger.getInstance();
  }

  /**
   * Create a new RapidKit workspace using npm package
   * Uses: npx rapidkit <workspace-name> [--yes] [--skip-git]
   * Creates workspace at the specified parent path
   */
  async createWorkspace(options: CreateWorkspaceOptions): Promise<ExecaReturnValue> {
    const args = ['rapidkit', options.name, '--yes', '--install-method', 'poetry'];

    if (options.skipGit) {
      args.push('--skip-git');
    }

    if (options.dryRun) {
      args.push('--dry-run');
    }

    this.logger.info('Creating workspace with npx:', args.join(' '), 'at', options.parentPath);

    return await run('npx', args, {
      cwd: options.parentPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '1',
      },
    });
  }

  /**
   * Create a standalone project (Direct mode)
   * Uses core: npx rapidkit create project <kit> <project-name> --output <dir> [--skip-git] [--skip-install]
   */
  async createProject(options: CreateProjectOptions): Promise<ExecaReturnValue> {
    const kit = templateToKit(options.template);
    const args = [
      'rapidkit',
      'create',
      'project',
      kit,
      options.name,
      '--output',
      options.parentPath,
      '--install-essentials',
    ];

    if (options.skipGit) {
      args.push('--skip-git');
    }
    if (options.skipInstall) {
      args.push('--skip-install');
    }

    this.logger.info('Creating project with npx (core):', ['npx', ...args].join(' '));

    const result = await run('npx', args, {
      cwd: options.parentPath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '1',
      },
    });

    if (!options.skipInstall) {
      const projectPath = (await import('path')).join(options.parentPath, options.name);
      await run('npx', ['rapidkit', 'init', projectPath], {
        cwd: options.parentPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          FORCE_COLOR: '1',
        },
      });
    }

    return result;
  }

  /**
   * Create a project inside an existing workspace.
   * Runs from workspace dir: npx rapidkit create project <kit> <project-name> --output .
   * So project is created at <workspacePath>/<project-name>.
   */
  async createProjectInWorkspace(
    options: CreateProjectInWorkspaceOptions
  ): Promise<ExecaReturnValue> {
    const kit = templateToKit(options.template);
    const args = [
      'rapidkit',
      'create',
      'project',
      kit,
      options.name,
      '--output',
      '.',
      '--install-essentials',
    ];

    if (options.skipGit) {
      args.push('--skip-git');
    }
    if (options.skipInstall) {
      args.push('--skip-install');
    }

    this.logger.info(
      'Creating project in workspace (core):',
      ['npx', ...args].join(' '),
      '(cwd:',
      options.workspacePath + ')'
    );

    const result = await run('npx', args, {
      cwd: options.workspacePath,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '1',
      },
    });

    if (!options.skipInstall) {
      const path = await import('path');
      const projectPath = path.join(options.workspacePath, options.name);

      this.logger.info('Running rapidkit init in project:', projectPath);

      // Run init from project directory (not workspace)
      await run('npx', ['rapidkit', 'init'], {
        cwd: projectPath,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          FORCE_COLOR: '1',
        },
      });
    }

    return result;
  }

  /**
   * Check if rapidkit CLI is available
   */
  async isAvailable(): Promise<boolean> {
    // Prefer direct `rapidkit` binary if available (user-installed global),
    // fallback to `npx rapidkit` otherwise. This avoids environment/path
    // differences between VS Code extension host and the user's interactive shell.
    try {
      // Try direct executable first
      const direct = await run('rapidkit', ['--version'], { stdio: 'pipe', timeout: 3000 });
      if (direct && typeof direct.stdout === 'string' && direct.stdout.trim()) {
        return true;
      }
    } catch (_e) {
      // ignore and try npx
    }

    try {
      await run('npx', ['rapidkit', '--version'], { stdio: 'pipe', timeout: 5000 });
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
      // Prefer direct binary
      const direct = await run('rapidkit', ['--version'], { stdio: 'pipe', timeout: 3000 });
      if (direct && direct.stdout) {
        return direct.stdout.trim();
      }
    } catch {
      // ignore
    }

    try {
      const result = await run('npx', ['rapidkit', '--version'], {
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
    if (useNpx) {
      // Try the direct binary first (global install). If it fails, fall back to npx.
      try {
        return await run('rapidkit', args, {
          cwd: cwd || process.cwd(),
          stdio: 'pipe',
        });
      } catch (e) {
        this.logger.debug('Direct rapidkit binary failed, falling back to npx', e);
        return await run('npx', ['rapidkit', ...args], {
          cwd: cwd || process.cwd(),
          stdio: 'pipe',
        });
      }
    } else {
      return await run('rapidkit', args, {
        cwd: cwd || process.cwd(),
        stdio: 'pipe',
      });
    }
  }

  /**
   * Add a module to a project (cd <project> && npx rapidkit add module <module-slug>)
   * Must be run with cwd = project directory (not workspace root).
   * The npm package will detect the project and workspace automatically.
   */
  async addModule(projectPath: string, moduleSlug: string): Promise<ExecaReturnValue> {
    this.logger.info('Adding module to project:', { projectPath, moduleSlug });

    // Run from project directory - npm package will auto-detect workspace
    // Command: cd <projectPath> && npx rapidkit add module <moduleSlug>
    return await this.run(['add', 'module', moduleSlug], projectPath, true);
  }
}
