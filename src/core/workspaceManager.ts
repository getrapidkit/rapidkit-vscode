/**
 * Workspace Manager
 * Manages RapidKit workspaces storage and detection
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { RapidKitWorkspace } from '../types';
import { MARKERS } from '../utils/constants';
import { getRegistryDir } from '../utils/registryPath';

export class WorkspaceManager {
  private static instance: WorkspaceManager;
  private workspaces: RapidKitWorkspace[] = [];
  private storageFile: string;

  private constructor() {
    // Store in user's home directory - cross-platform compatible
    const configDir = getRegistryDir();
    this.storageFile = path.join(configDir, 'workspaces.json');
    this.ensureConfigDir();
  }

  public static getInstance(): WorkspaceManager {
    if (!WorkspaceManager.instance) {
      WorkspaceManager.instance = new WorkspaceManager();
    }
    return WorkspaceManager.instance;
  }

  private async ensureConfigDir(): Promise<void> {
    const configDir = path.dirname(this.storageFile);
    await fs.ensureDir(configDir);
  }

  /**
   * Load workspaces from storage
   */
  public async loadWorkspaces(): Promise<RapidKitWorkspace[]> {
    try {
      if (await fs.pathExists(this.storageFile)) {
        const data = await fs.readJSON(this.storageFile);
        this.workspaces = data.workspaces || [];

        // Normalize projects format for backward compatibility
        this.workspaces = this.workspaces.map((ws) => {
          // If projects is array of strings, convert to new format
          if (ws.projects && ws.projects.length > 0 && typeof ws.projects[0] === 'string') {
            ws.projects = (ws.projects as unknown as string[]).map((name) => ({
              name,
              path: path.join(ws.path, name),
            }));
          }
          return ws;
        });

        // Validate that paths still exist
        this.workspaces = this.workspaces.filter((ws) => fs.pathExistsSync(ws.path));

        // Save cleaned list
        await this.saveWorkspaces();
      } else {
        this.workspaces = [];
      }
    } catch (_error) {
      console.error('Error loading workspaces:', _error);
      this.workspaces = [];
    }

    return this.workspaces;
  }

  /**
   * Save workspaces to storage
   */
  private async saveWorkspaces(): Promise<void> {
    try {
      await fs.writeJSON(this.storageFile, { workspaces: this.workspaces }, { spaces: 2 });
    } catch (_error) {
      console.error('Error saving workspaces:', _error);
    }
  }

  /**
   * Add a new workspace
   */
  public async addWorkspace(workspacePath: string): Promise<RapidKitWorkspace | null> {
    // Ensure we have the latest workspaces loaded from storage
    // This prevents overwriting existing workspaces when adding a new one
    if (this.workspaces.length === 0) {
      await this.loadWorkspaces();
    }

    // Check if path exists
    if (!(await fs.pathExists(workspacePath))) {
      vscode.window.showErrorMessage(`Path does not exist: ${workspacePath}`);
      return null;
    }

    // Check if already added (silently skip if exists)
    if (this.workspaces.some((ws) => ws.path === workspacePath)) {
      return this.workspaces.find((ws) => ws.path === workspacePath) || null;
    }

    // Detect if it's a RapidKit workspace
    const isRapidKit = await this.isRapidKitWorkspace(workspacePath);
    if (!isRapidKit) {
      // Silently skip non-RapidKit workspaces
      console.log('Skipping non-RapidKit workspace:', workspacePath);
      return null;
    }

    // Create workspace object
    const workspace: RapidKitWorkspace = {
      name: path.basename(workspacePath),
      path: workspacePath,
      mode: (await this.isDemoWorkspace(workspacePath)) ? 'demo' : 'full',
      projects: await this.getWorkspaceProjects(workspacePath),
    };

    this.workspaces.push(workspace);
    await this.saveWorkspaces();

    return workspace;
  }

  /**
   * Remove a workspace from the list
   */
  public async removeWorkspace(workspacePath: string): Promise<void> {
    this.workspaces = this.workspaces.filter((ws) => ws.path !== workspacePath);
    await this.saveWorkspaces();
  }

  /**
   * Get all workspaces
   */
  public getWorkspaces(): RapidKitWorkspace[] {
    return this.workspaces;
  }

  /**
   * Auto-discover workspaces in common locations
   */
  public async autoDiscover(): Promise<RapidKitWorkspace[]> {
    const discovered: RapidKitWorkspace[] = [];

    // Check current workspace folders
    if (vscode.workspace.workspaceFolders) {
      for (const folder of vscode.workspace.workspaceFolders) {
        const wsPath = folder.uri.fsPath;
        if (await this.isRapidKitWorkspace(wsPath)) {
          const ws = await this.addWorkspace(wsPath);
          if (ws) {
            discovered.push(ws);
          }
        }
      }
    }

    // Check common dev directories
    const commonDirs = [
      path.join(os.homedir(), 'RapidKit'), // npm package default location
      path.join(os.homedir(), 'RapidKit', 'rapidkits'), // npm package nested location
      path.join(os.homedir(), 'Projects'),
      path.join(os.homedir(), 'Development'),
      path.join(os.homedir(), 'Code'),
      path.join(os.homedir(), 'Workspace'),
      path.join(os.homedir(), 'workspace'),
      path.join(os.homedir(), 'projects'),
    ];

    for (const dir of commonDirs) {
      if (await fs.pathExists(dir)) {
        try {
          const entries = await fs.readdir(dir, { withFileTypes: true });
          for (const entry of entries) {
            if (entry.isDirectory()) {
              const wsPath = path.join(dir, entry.name);
              if (await this.isRapidKitWorkspace(wsPath)) {
                const ws = await this.addWorkspace(wsPath);
                if (ws) {
                  discovered.push(ws);
                }
              }
            }
          }
        } catch {
          // Ignore permission errors
        }
      }
    }

    return discovered;
  }

  /**
   * Check if a path is a RapidKit workspace
   * Validates by checking for workspace markers and structure
   */
  private async isRapidKitWorkspace(wsPath: string): Promise<boolean> {
    // Check if path exists first
    if (!(await fs.pathExists(wsPath))) {
      return false;
    }

    // Check for .rapidkit-workspace marker file (created by npm package or extension)
    const markerPath = path.join(wsPath, '.rapidkit-workspace');
    if (await fs.pathExists(markerPath)) {
      // Verify marker file content has valid signature
      try {
        const marker = await fs.readJSON(markerPath);
        // Accept both Extension and npm package signatures
        return (
          marker.signature === MARKERS.WORKSPACE_SIGNATURE || // Current unified format
          marker.signature === MARKERS.WORKSPACE_SIGNATURE_LEGACY || // Legacy Extension format
          marker.signature === 'rapidkit-vscode' || // Very old legacy
          (marker.createdBy &&
            (marker.createdBy === MARKERS.CREATED_BY_NPM ||
              marker.createdBy === MARKERS.CREATED_BY_VSCODE))
        );
      } catch (error) {
        // Log error but don't crash - marker file might be corrupted
        console.warn('Warning: Failed to read marker file at:', markerPath, error);
        return false;
      }
    }

    // Check for workspace structure created by npm package:
    // pyproject.toml + .venv + rapidkit script = workspace
    const hasPyproject = await fs.pathExists(path.join(wsPath, 'pyproject.toml'));
    const hasVenv = await fs.pathExists(path.join(wsPath, '.venv'));
    const hasRapidkitScript = await fs.pathExists(path.join(wsPath, 'rapidkit'));

    if (hasPyproject && hasVenv && hasRapidkitScript) {
      // This looks like a workspace created by npm package
      return true;
    }

    // Check for RapidKit project metadata (created by RapidKit core / kits)
    // This is for projects, not workspaces, but kept for backward compatibility
    const rapidkitDir = path.join(wsPath, '.rapidkit');
    const projectJson = path.join(rapidkitDir, 'project.json');
    const contextJson = path.join(rapidkitDir, 'context.json');
    if ((await fs.pathExists(projectJson)) || (await fs.pathExists(contextJson))) {
      return true;
    }

    return false;
  }

  private async isDemoWorkspace(wsPath: string): Promise<boolean> {
    return await fs.pathExists(path.join(wsPath, 'generate-demo.js'));
  }

  private async getWorkspaceProjects(
    wsPath: string
  ): Promise<Array<{ name: string; path: string }>> {
    const projects: Array<{ name: string; path: string }> = [];

    try {
      const entries = await fs.readdir(wsPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const projectPath = path.join(wsPath, entry.name);

          // Check for RapidKit project markers
          const hasRapidKitMarker =
            (await fs.pathExists(path.join(projectPath, '.rapidkit', 'project.json'))) ||
            (await fs.pathExists(path.join(projectPath, '.rapidkit', 'context.json')));

          if (hasRapidKitMarker) {
            projects.push({
              name: entry.name,
              path: projectPath,
            });
          }
          // Fallback: Check for FastAPI project
          else if (await fs.pathExists(path.join(projectPath, 'pyproject.toml'))) {
            projects.push({
              name: entry.name,
              path: projectPath,
            });
          }
          // Fallback: Check for Go project
          else if (
            (await fs.pathExists(path.join(projectPath, 'go.mod'))) ||
            (await fs.pathExists(path.join(projectPath, 'go.sum'))) ||
            (await fs.pathExists(path.join(projectPath, 'main.go'))) ||
            (await fs.pathExists(path.join(projectPath, 'cmd', 'main.go')))
          ) {
            projects.push({
              name: entry.name,
              path: projectPath,
            });
          }
          // Fallback: Check for NestJS project
          else if (await fs.pathExists(path.join(projectPath, 'package.json'))) {
            try {
              const pkg = await fs.readJSON(path.join(projectPath, 'package.json'));
              if (pkg.dependencies?.['@nestjs/core']) {
                projects.push({
                  name: entry.name,
                  path: projectPath,
                });
              }
            } catch {
              // Ignore
            }
          }
        }
      }
    } catch {
      // Ignore errors
    }

    return projects;
  }

  /**
   * Update workspace information (re-scan projects)
   */
  public async updateWorkspace(workspacePath: string): Promise<void> {
    const workspace = this.workspaces.find((ws) => ws.path === workspacePath);
    if (workspace) {
      workspace.projects = await this.getWorkspaceProjects(workspacePath);
      workspace.mode = (await this.isDemoWorkspace(workspacePath)) ? 'demo' : 'full';
      (workspace as any).lastAccessed = Date.now();
      await this.saveWorkspaces();
    }
  }

  /**
   * Update last accessed time for a workspace
   */
  public async touchWorkspace(workspacePath: string): Promise<void> {
    const workspace = this.workspaces.find((ws) => ws.path === workspacePath);
    if (workspace) {
      (workspace as any).lastAccessed = Date.now();
      await this.saveWorkspaces();
    }
  }
}
