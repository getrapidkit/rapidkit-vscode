/**
 * Workspace Manager
 * Manages RapidKit workspaces storage and detection
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
import { RapidKitWorkspace } from '../types';

export class WorkspaceManager {
  private static instance: WorkspaceManager;
  private workspaces: RapidKitWorkspace[] = [];
  private storageFile: string;

  private constructor() {
    // Store in user's home directory
    const configDir = path.join(os.homedir(), '.rapidkit');
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
    // Check if path exists
    if (!(await fs.pathExists(workspacePath))) {
      vscode.window.showErrorMessage(`Path does not exist: ${workspacePath}`);
      return null;
    }

    // Check if already added
    if (this.workspaces.some((ws) => ws.path === workspacePath)) {
      vscode.window.showWarningMessage('Workspace already exists in the list');
      return null;
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
   * Validates by checking for .rapidkit directory or marker file
   */
  private async isRapidKitWorkspace(wsPath: string): Promise<boolean> {
    // Check for .rapidkit directory (created by npm CLI)
    const rapidkitDir = path.join(wsPath, '.rapidkit');
    if (await fs.pathExists(rapidkitDir)) {
      return true;
    }

    // Check for marker file (created by extension)
    const markerPath = path.join(wsPath, '.rapidkit-workspace');
    if (await fs.pathExists(markerPath)) {
      // Verify marker file content has valid signature
      try {
        const marker = await fs.readJSON(markerPath);
        // Accept both old and new signatures
        return (
          marker.signature === 'RAPIDKIT_VSCODE_WORKSPACE' || marker.signature === 'rapidkit-vscode'
        );
      } catch {
        return false;
      }
    }

    return false;
  }

  private async isDemoWorkspace(wsPath: string): Promise<boolean> {
    return await fs.pathExists(path.join(wsPath, 'generate-demo.js'));
  }

  private async getWorkspaceProjects(wsPath: string): Promise<string[]> {
    const projects: string[] = [];

    try {
      const entries = await fs.readdir(wsPath, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const projectPath = path.join(wsPath, entry.name);

          // Check for FastAPI project
          if (await fs.pathExists(path.join(projectPath, 'pyproject.toml'))) {
            projects.push(entry.name);
          }
          // Check for NestJS project
          else if (await fs.pathExists(path.join(projectPath, 'package.json'))) {
            try {
              const pkg = await fs.readJSON(path.join(projectPath, 'package.json'));
              if (pkg.dependencies?.['@nestjs/core']) {
                projects.push(entry.name);
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
      await this.saveWorkspaces();
    }
  }
}
