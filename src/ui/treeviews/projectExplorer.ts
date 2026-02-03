/**
 * Project Explorer TreeView Provider
 * Shows projects in the selected workspace with full file tree
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { RapidKitProject, RapidKitWorkspace } from '../../types';
import { runningServers } from '../../extension';

// Store extension path for icons
let extensionPath: string = '';

export function setExtensionPath(extPath: string) {
  extensionPath = extPath;
}

// Files/folders to ALWAYS hide (system/cache files)
const ALWAYS_HIDDEN = new Set([
  '.git',
  '__pycache__',
  '.pytest_cache',
  '.mypy_cache',
  '.ruff_cache',
  '.DS_Store',
  'Thumbs.db',
  '.coverage',
  '.tox',
  '.nox',
]);

// Framework-specific hidden items
const FASTAPI_HIDDEN = new Set([
  'node_modules', // Not needed for Python projects
]);

const NESTJS_HIDDEN = new Set([
  '.venv', // Not needed for Node projects
  '*.pyc',
  '*.egg-info',
]);

function shouldHide(name: string, projectType?: string): boolean {
  // Always hide system/cache items
  if (ALWAYS_HIDDEN.has(name)) {
    return true;
  }

  // Framework-specific hiding
  if (projectType === 'fastapi') {
    if (FASTAPI_HIDDEN.has(name)) {
      return true;
    }
    // Hide compiled Python files
    if (name.endsWith('.pyc') || name.endsWith('.pyo')) {
      return true;
    }
    if (name.endsWith('.egg-info')) {
      return true;
    }
  } else if (projectType === 'nestjs') {
    if (NESTJS_HIDDEN.has(name)) {
      return true;
    }
  }

  return false;
}

export class ProjectExplorerProvider implements vscode.TreeDataProvider<ProjectTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectTreeItem | undefined | null | void> =
    new vscode.EventEmitter<ProjectTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ProjectTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private selectedWorkspace: RapidKitWorkspace | null = null;
  private projects: RapidKitProject[] = [];
  private selectedProject: RapidKitProject | null = null;

  constructor() {
    // Listen for workspace selection changes
    vscode.commands.registerCommand(
      'rapidkit.workspaceSelected',
      (workspace: RapidKitWorkspace) => {
        this.setWorkspace(workspace);
      }
    );

    // Register command to get selected workspace
    vscode.commands.registerCommand('rapidkit.getSelectedWorkspace', () => {
      return this.selectedWorkspace;
    });

    // Register command to get selected project
    vscode.commands.registerCommand('rapidkit.getSelectedProject', () => {
      return this.selectedProject;
    });

    // Initialize context
    vscode.commands.executeCommand('setContext', 'rapidkit:noProjects', false);
    vscode.commands.executeCommand('setContext', 'rapidkit:hasProjects', false);
  }

  refresh(): void {
    // Don't load projects here - getChildren will do it
    // Just fire the change event to trigger getChildren
    this._onDidChangeTreeData.fire();
  }

  setWorkspace(workspace: RapidKitWorkspace | null): void {
    this.selectedWorkspace = workspace;

    // Clear selected project when workspace changes
    if (this.selectedProject) {
      console.log('[ProjectExplorer] Workspace changed - clearing selected project');
      this.setSelectedProject(null);

      // Also clear in WelcomePanel
      const { WelcomePanel } = require('../panels/welcomePanel');
      WelcomePanel.clearSelectedProject();
    }

    // Clear moduleExplorer for this workspace
    const { ModuleExplorerProvider } = require('./moduleExplorer');
    if (ModuleExplorerProvider.instance) {
      ModuleExplorerProvider.instance.setProjectPath(null);
    }

    this.refresh();
  }

  getSelectedWorkspace(): RapidKitWorkspace | null {
    return this.selectedWorkspace;
  }

  setSelectedProject(project: RapidKitProject | null): void {
    this.selectedProject = project;
    // Update context for UI elements that depend on selection
    vscode.commands.executeCommand('setContext', 'rapidkit:projectSelected', project !== null);
    this._onDidChangeTreeData.fire();
  }

  getSelectedProject(): RapidKitProject | null {
    return this.selectedProject;
  }

  private async updateProjectsContext(): Promise<void> {
    const hasProjects = this.projects.length > 0;
    await vscode.commands.executeCommand(
      'setContext',
      'rapidkit:noProjects',
      !hasProjects && this.selectedWorkspace !== null
    );
    await vscode.commands.executeCommand('setContext', 'rapidkit:hasProjects', hasProjects);
  }

  getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ProjectTreeItem): Promise<ProjectTreeItem[]> {
    // Root level - show projects
    if (!element) {
      if (!this.selectedWorkspace) {
        return [];
      }

      await this.loadProjects();
      await this.updateProjectsContext();

      return this.projects.map((project) => {
        // Check if server is running for this project
        const isRunning = runningServers.has(project.path);
        const isSelected = this.selectedProject?.path === project.path;

        return new ProjectTreeItem(project, isRunning ? 'project-running' : 'project', isSelected);
      });
    }

    // Project level - show file tree
    if (
      (element.contextValue === 'project' || element.contextValue === 'project-running') &&
      element.project
    ) {
      return this.getFileChildren(element.project.path, element.project);
    }

    // Folder level - show contents
    if (element.contextValue === 'folder' && element.filePath) {
      return this.getFileChildren(element.filePath, element.project);
    }

    return [];
  }

  private async getFileChildren(
    dirPath: string,
    project: RapidKitProject | null
  ): Promise<ProjectTreeItem[]> {
    const items: ProjectTreeItem[] = [];
    const projectType = project?.type;

    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });

      // Sort: folders first, then files, both alphabetically
      const sorted = entries.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) {
          return -1;
        }
        if (!a.isDirectory() && b.isDirectory()) {
          return 1;
        }
        return a.name.localeCompare(b.name);
      });

      for (const entry of sorted) {
        if (shouldHide(entry.name, projectType)) {
          continue;
        }

        const fullPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
          items.push(new ProjectTreeItem(project, 'folder', false, entry.name, fullPath));
        } else {
          items.push(new ProjectTreeItem(project, 'file', false, entry.name, fullPath));
        }
      }
    } catch (error) {
      console.error('Error reading directory:', error);
    }

    return items;
  }

  private async loadProjects(): Promise<void> {
    this.projects = [];

    if (!this.selectedWorkspace) {
      return;
    }

    const wsPath = this.selectedWorkspace.path;

    try {
      const entries = await fs.readdir(wsPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          const projectPath = path.join(wsPath, entry.name);
          const pyprojectPath = path.join(projectPath, 'pyproject.toml');
          const packageJsonPath = path.join(projectPath, 'package.json');

          // Check for FastAPI project (pyproject.toml)
          if (await fs.pathExists(pyprojectPath)) {
            const project: RapidKitProject = {
              name: entry.name,
              path: projectPath,
              type: 'fastapi',
              kit: 'standard',
              modules: [],
              isValid: true,
              workspacePath: wsPath,
            };

            this.projects.push(project);
          }
          // Check for NestJS project (package.json with @nestjs/core)
          else if (await fs.pathExists(packageJsonPath)) {
            try {
              const packageJson = await fs.readJSON(packageJsonPath);
              if (packageJson.dependencies?.['@nestjs/core']) {
                const project: RapidKitProject = {
                  name: entry.name,
                  path: projectPath,
                  type: 'nestjs',
                  kit: 'standard',
                  modules: [],
                  isValid: true,
                  workspacePath: wsPath,
                };

                this.projects.push(project);
              }
            } catch {
              // Invalid package.json, skip
            }
          }
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }
}

export class ProjectTreeItem extends vscode.TreeItem {
  public readonly filePath?: string;

  constructor(
    public readonly project: RapidKitProject | null,
    public readonly contextValue: string,
    public readonly isSelected: boolean = false,
    customLabel?: string,
    filePath?: string
  ) {
    // Determine collapsible state
    const collapsibleState =
      contextValue === 'project' || contextValue === 'project-running' || contextValue === 'folder'
        ? vscode.TreeItemCollapsibleState.Collapsed
        : vscode.TreeItemCollapsibleState.None;

    super(customLabel || project?.name || '', collapsibleState);

    this.filePath = filePath;

    // === Project Item (not running) ===
    if (contextValue === 'project' && project) {
      this.tooltip = `${project.path}\n\n▶️ Click Play to start dev server${isSelected ? '\n\n✓ Currently selected for module operations' : ''}`;
      this.description = `${project.type === 'fastapi' ? 'FastAPI' : 'NestJS'}${isSelected ? ' ✓' : ''}`;

      // Use custom framework icons
      if (extensionPath) {
        const iconName = project.type === 'fastapi' ? 'fastapi.svg' : 'nestjs.svg';
        this.iconPath = vscode.Uri.file(path.join(extensionPath, 'media', 'icons', iconName));
      } else {
        this.iconPath = new vscode.ThemeIcon(
          project.type === 'fastapi' ? 'symbol-method' : 'symbol-class',
          new vscode.ThemeColor(
            isSelected ? 'charts.blue' : project.type === 'fastapi' ? 'charts.green' : 'charts.red'
          )
        );
      }

      // Add click command to select project
      this.command = {
        command: 'rapidkit.selectProject',
        title: 'Select Project',
        arguments: [this],
      };
    }
    // === Project Item (running) ===
    else if (contextValue === 'project-running' && project) {
      this.tooltip = `${project.path}\n\n🚀 Server running! Click Stop to terminate${isSelected ? '\n\n✓ Currently selected for module operations' : ''}`;
      this.description = `${project.type === 'fastapi' ? 'FastAPI' : 'NestJS'} 🟢${isSelected ? ' ✓' : ''}`;

      // Use custom framework icons with running indicator
      if (extensionPath) {
        const iconName = project.type === 'fastapi' ? 'fastapi.svg' : 'nestjs.svg';
        this.iconPath = vscode.Uri.file(path.join(extensionPath, 'media', 'icons', iconName));
      } else {
        this.iconPath = new vscode.ThemeIcon(
          'vm-running',
          new vscode.ThemeColor(isSelected ? 'charts.blue' : 'testing.runAction')
        );
      }

      // Add click command to select project
      this.command = {
        command: 'rapidkit.selectProject',
        title: 'Select Project',
        arguments: [this],
      };
    }
    // === Folder Item ===
    else if (contextValue === 'folder' && filePath) {
      this.tooltip = filePath;
      this.iconPath = vscode.ThemeIcon.Folder;
      this.resourceUri = vscode.Uri.file(filePath);
    }
    // === File Item ===
    else if (contextValue === 'file' && filePath) {
      this.tooltip = filePath;
      this.iconPath = vscode.ThemeIcon.File;
      this.resourceUri = vscode.Uri.file(filePath);
      this.command = {
        command: 'vscode.open',
        title: 'Open File',
        arguments: [vscode.Uri.file(filePath)],
      };
    }

    this.contextValue = contextValue;
  }
}
