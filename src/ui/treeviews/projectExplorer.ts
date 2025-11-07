/**
 * Project Explorer TreeView Provider
 * Shows projects in the selected workspace
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { RapidKitProject, RapidKitWorkspace } from '../../types';

export class ProjectExplorerProvider
  implements vscode.TreeDataProvider<ProjectTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    ProjectTreeItem | undefined | null | void
  > = new vscode.EventEmitter<ProjectTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    ProjectTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private selectedWorkspace: RapidKitWorkspace | null = null;
  private projects: RapidKitProject[] = [];

  constructor() {
    // Listen for workspace selection changes
    vscode.commands.registerCommand(
      'rapidkit.workspaceSelected',
      (workspace: RapidKitWorkspace) => {
        this.setWorkspace(workspace);
      }
    );
    
    // Initialize context
    vscode.commands.executeCommand('setContext', 'rapidkit:noProjects', false);
    vscode.commands.executeCommand('setContext', 'rapidkit:hasProjects', false);
  }

  refresh(): void {
    this.loadProjectsAndUpdateContext().catch(err => {
      console.error('Error refreshing projects:', err);
    });
    this._onDidChangeTreeData.fire();
  }

  private async loadProjectsAndUpdateContext(): Promise<void> {
    await this.loadProjects();
    this.updateProjectsContext();
  }

  setWorkspace(workspace: RapidKitWorkspace | null): void {
    this.selectedWorkspace = workspace;
    this.refresh();
  }
  
  private async updateProjectsContext(): Promise<void> {
    // Set context based on whether we have projects
    const hasProjects = this.projects.length > 0;
    await vscode.commands.executeCommand('setContext', 'rapidkit:noProjects', !hasProjects && this.selectedWorkspace !== null);
    await vscode.commands.executeCommand('setContext', 'rapidkit:hasProjects', hasProjects);
  }

  getTreeItem(element: ProjectTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: ProjectTreeItem): Promise<ProjectTreeItem[]> {
    if (!element) {
      // Root level
      const items: ProjectTreeItem[] = [];
      
      if (!this.selectedWorkspace) {
        // No workspace selected - return empty array
        // Welcome view "No workspace selected" will be shown automatically by VS Code
        return [];
      }

      // Workspace is selected - load and show projects
      await this.loadProjects();
      
      // Update context after loading
      await this.updateProjectsContext();
      
      // Add projects (if any)
      this.projects.forEach((project) => {
        items.push(new ProjectTreeItem(project, 'project'));
      });

      // Return projects array (empty or with items)
      // If empty, toolbar buttons will still be visible because workspace is selected
      return items;
    } else if (element.contextValue === 'project') {
      // Show project details
      return this.getProjectChildren(element.project!);
    }

    return [];
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
          
          if (await fs.pathExists(pyprojectPath)) {
            // Detect project type and kit
            const project: RapidKitProject = {
              name: entry.name,
              path: projectPath,
              type: 'fastapi', // Default, should detect from config
              kit: 'standard', // Default, should detect from config
              modules: [],
              isValid: true,
              workspacePath: wsPath,
            };

            // Try to detect actual type
            const srcPath = path.join(projectPath, 'src');
            if (await fs.pathExists(srcPath)) {
              const srcEntries = await fs.readdir(srcPath);
              if (srcEntries.some(e => e.endsWith('.ts'))) {
                project.type = 'nestjs';
              }
            }

            this.projects.push(project);
          }
        }
      }
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  }

  private getProjectChildren(project: RapidKitProject): ProjectTreeItem[] {
    const children: ProjectTreeItem[] = [];

    // Framework info
    children.push(
      new ProjectTreeItem(
        {
          ...project,
          name: `Framework: ${project.type}`,
        },
        'info',
        `$(code) ${project.type.toUpperCase()}`
      )
    );

    // Kit info
    children.push(
      new ProjectTreeItem(
        {
          ...project,
          name: `Kit: ${project.kit}`,
        },
        'info',
        `$(package) ${project.kit}`
      )
    );

    // Modules section
    if (project.modules.length > 0) {
      const modulesItem = new ProjectTreeItem(
        {
          ...project,
          name: `Modules (${project.modules.length})`,
        },
        'modules',
        `$(extensions) Modules (${project.modules.length})`
      );
      children.push(modulesItem);
    } else {
      children.push(
        new ProjectTreeItem(
          {
            ...project,
            name: 'No modules installed',
          },
          'info',
          '$(info) No modules'
        )
      );
    }

    return children;
  }
}

export class ProjectTreeItem extends vscode.TreeItem {
  constructor(
    public readonly project: RapidKitProject | null,
    public readonly contextValue: string,
    customLabel?: string
  ) {
    super(
      customLabel || project?.name || '',
      contextValue === 'project'
        ? vscode.TreeItemCollapsibleState.Collapsed
        : contextValue === 'modules'
          ? vscode.TreeItemCollapsibleState.Collapsed
          : vscode.TreeItemCollapsibleState.None
    );

    if (contextValue === 'project' && project) {
      this.tooltip = project.path;
      this.description = project.kit;
      this.iconPath = new vscode.ThemeIcon(
        'folder-library',
        new vscode.ThemeColor('charts.blue')
      );
      
      // Make project items openable
      this.command = {
        command: 'vscode.openFolder',
        title: 'Open Project',
        arguments: [vscode.Uri.file(project.path), { forceNewWindow: false }],
      };
    } else if (contextValue === 'modules') {
      this.iconPath = new vscode.ThemeIcon('extensions');
    } else if (contextValue === 'info') {
      this.iconPath = new vscode.ThemeIcon('info');
    }

    this.contextValue = contextValue;
  }
}
