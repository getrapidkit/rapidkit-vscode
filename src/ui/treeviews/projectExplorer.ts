/**
 * Project Explorer TreeView Provider
 * Shows projects in the selected workspace with full file tree
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { WorkspaiProject, WorkspaiWorkspace } from '../../types';
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

function frameworkLabel(type: string): string {
  if (type === 'fastapi') {
    return 'FastAPI';
  }
  if (type === 'nestjs') {
    return 'NestJS';
  }
  if (type === 'go') {
    return 'Go';
  }
  return type;
}

export class ProjectExplorerProvider implements vscode.TreeDataProvider<ProjectTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<ProjectTreeItem | undefined | null | void> =
    new vscode.EventEmitter<ProjectTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<ProjectTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private selectedWorkspace: WorkspaiWorkspace | null = null;
  private projects: WorkspaiProject[] = [];
  private selectedProject: WorkspaiProject | null = null;
  private _projectsLoaded = false;
  private _projectsLoadInProgress = false;

  constructor() {
    // NOTE: 'rapidkit.workspaceSelected' is registered once in extension.ts
    // and calls setWorkspace() on this instance via projectExplorer reference.
    // Do NOT register it here to avoid "command already exists" on re-activation.

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
    // Clear cached project list so next render triggers a fresh background load
    this._projectsLoaded = false;
    this._onDidChangeTreeData.fire();
  }

  setWorkspace(workspace: WorkspaiWorkspace | null): void {
    this.selectedWorkspace = workspace;

    // Reset project cache so next render triggers a fresh load for the new workspace
    this._projectsLoaded = false;
    this.projects = [];

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

  getSelectedWorkspace(): WorkspaiWorkspace | null {
    return this.selectedWorkspace;
  }

  setSelectedProject(project: WorkspaiProject | null): void {
    this.selectedProject = project;
    // Update context for UI elements that depend on selection
    vscode.commands.executeCommand('setContext', 'rapidkit:projectSelected', project !== null);
    this._onDidChangeTreeData.fire();
  }

  getSelectedProject(): WorkspaiProject | null {
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

      // Phase 1: Return cached items immediately — no blocking I/O.
      const cachedItems = this._buildProjectItems();

      // Phase 2: If projects not yet loaded for this workspace, kick off background load.
      if (!this._projectsLoaded) {
        this._scheduleProjectLoad();
      }

      return cachedItems;
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

  private _buildProjectItems(): ProjectTreeItem[] {
    return this.projects.map((project) => {
      const isRunning = runningServers.has(project.path);
      const isSelected = this.selectedProject?.path === project.path;

      let runningPort: number | undefined;
      if (isRunning) {
        const terminal = runningServers.get(project.path);
        if (terminal) {
          const match = terminal.name.match(/:([0-9]+)/);
          if (match) {
            runningPort = parseInt(match[1], 10);
          }
        }
      }

      return new ProjectTreeItem(
        project,
        isRunning ? 'project-running' : 'project',
        isSelected,
        undefined,
        undefined,
        runningPort
      );
    });
  }

  /**
   * Background project load: scans workspace directory in parallel and fires tree refresh.
   * Never blocks the initial getChildren call.
   */
  private _scheduleProjectLoad(): void {
    if (this._projectsLoadInProgress) {
      return;
    }

    this._projectsLoadInProgress = true;

    this.loadProjects()
      .then(async () => {
        this._projectsLoaded = true;
        this._projectsLoadInProgress = false;
        await this.updateProjectsContext();
        this._onDidChangeTreeData.fire();
      })
      .catch(() => {
        this._projectsLoadInProgress = false;
      });
  }

  private async getFileChildren(
    dirPath: string,
    project: WorkspaiProject | null
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
      const projectDirs = entries.filter((e) => e.isDirectory() && !e.name.startsWith('.'));

      // Detect all projects in parallel — no sequential pathExists chains
      const detected = await Promise.all(
        projectDirs.map(async (entry) => {
          const projectPath = path.join(wsPath, entry.name);

          const [hasPyproject, hasPackageJson, hasGoMod] = await Promise.all([
            fs.pathExists(path.join(projectPath, 'pyproject.toml')),
            fs.pathExists(path.join(projectPath, 'package.json')),
            fs.pathExists(path.join(projectPath, 'go.mod')),
          ]);

          const base: Omit<WorkspaiProject, 'type'> = {
            name: entry.name,
            path: projectPath,
            kit: 'standard',
            modules: [],
            isValid: true,
            workspacePath: wsPath,
          };

          if (hasPyproject) {
            return { ...base, type: 'fastapi' } as WorkspaiProject;
          }

          if (hasPackageJson) {
            try {
              const packageJson = await fs.readJSON(path.join(projectPath, 'package.json'));
              if (packageJson.dependencies?.['@nestjs/core']) {
                return { ...base, type: 'nestjs' } as WorkspaiProject;
              }
            } catch {
              // Invalid package.json — skip
            }
          }

          if (hasGoMod) {
            return { ...base, type: 'go' } as WorkspaiProject;
          }

          return null;
        })
      );

      this.projects = detected.filter((p): p is WorkspaiProject => p !== null);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }
}

export class ProjectTreeItem extends vscode.TreeItem {
  public readonly filePath?: string;

  constructor(
    public readonly project: WorkspaiProject | null,
    public readonly contextValue: string,
    public readonly isSelected: boolean = false,
    customLabel?: string,
    filePath?: string,
    public readonly runningPort?: number
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
      this.description = `${frameworkLabel(project.type)} 🟡${isSelected ? ' ✓' : ''}`;

      // Use custom framework icons
      if (extensionPath) {
        const iconName =
          project.type === 'fastapi'
            ? 'fastapi.svg'
            : project.type === 'nestjs'
              ? 'nestjs.svg'
              : 'go.svg';
        this.iconPath = vscode.Uri.file(path.join(extensionPath, 'media', 'icons', iconName));
      } else {
        const iconId =
          project.type === 'fastapi'
            ? 'symbol-method'
            : project.type === 'nestjs'
              ? 'symbol-class'
              : 'symbol-namespace';
        const colorId = isSelected
          ? 'charts.blue'
          : project.type === 'fastapi'
            ? 'charts.green'
            : project.type === 'nestjs'
              ? 'charts.red'
              : 'charts.blue';
        this.iconPath = new vscode.ThemeIcon(iconId, new vscode.ThemeColor(colorId));
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
      const portInfo = runningPort ? ` on port ${runningPort}` : '';
      this.tooltip = `${project.path}\n\n🚀 Server running${portInfo}! Click Stop to terminate${isSelected ? '\n\n✓ Currently selected for module operations' : ''}`;
      this.description = `${frameworkLabel(project.type)} 🟢${isSelected ? ' ✓' : ''}${runningPort ? ` :${runningPort}` : ''}`;

      // Use custom framework icons with running indicator
      if (extensionPath) {
        const iconName =
          project.type === 'fastapi'
            ? 'fastapi.svg'
            : project.type === 'nestjs'
              ? 'nestjs.svg'
              : 'go.svg';
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
