/**
 * Workspace Explorer TreeView Provider
 * Shows list of RapidKit workspaces with actions
 */

import * as vscode from 'vscode';
import { RapidKitWorkspace } from '../../types';
import { WorkspaceManager } from '../../core/workspaceManager';

export class WorkspaceExplorerProvider
  implements vscode.TreeDataProvider<WorkspaceTreeItem>
{
  private _onDidChangeTreeData: vscode.EventEmitter<
    WorkspaceTreeItem | undefined | null | void
  > = new vscode.EventEmitter<WorkspaceTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<
    WorkspaceTreeItem | undefined | null | void
  > = this._onDidChangeTreeData.event;

  private workspaceManager = WorkspaceManager.getInstance();
  private workspaces: RapidKitWorkspace[] = [];
  private selectedWorkspace: RapidKitWorkspace | null = null;
  private fileWatcher?: vscode.FileSystemWatcher;

  constructor() {
    this.loadWorkspaces();
    this.setupFileWatcher();
  }

  private setupFileWatcher(): void {
    // Watch for .rapidkit-workspace file changes
    this.fileWatcher = vscode.workspace.createFileSystemWatcher(
      '**/.rapidkit-workspace',
      false,
      false,
      false
    );

    this.fileWatcher.onDidCreate(() => this.refresh());
    this.fileWatcher.onDidChange(() => this.refresh());
    this.fileWatcher.onDidDelete(() => this.refresh());
  }

  dispose(): void {
    this.fileWatcher?.dispose();
  }

  async refresh(): Promise<void> {
    await this.loadWorkspaces();
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: WorkspaceTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(element?: WorkspaceTreeItem): Promise<WorkspaceTreeItem[]> {
    if (!element) {
      // Root level - only show workspaces (no action buttons)
      const items: WorkspaceTreeItem[] = [];
      
      // Add workspaces
      this.workspaces.forEach((ws) => {
        const item = new WorkspaceTreeItem(ws, 'workspace');
        if (this.selectedWorkspace?.path === ws.path) {
          item.description = '● Active';
        }
        items.push(item);
      });
      
      return items;
    }

    return [];
  }

  private async loadWorkspaces(): Promise<void> {
    this.workspaces = await this.workspaceManager.loadWorkspaces();
    
    // Auto-select first workspace if none selected
    if (!this.selectedWorkspace && this.workspaces.length > 0) {
      this.selectedWorkspace = this.workspaces[0];
      vscode.commands.executeCommand('rapidkit.workspaceSelected', this.selectedWorkspace);
      // Set context key for toolbar buttons
      vscode.commands.executeCommand('setContext', 'rapidkit:workspaceSelected', true);
    } else if (this.workspaces.length === 0) {
      // No workspaces - clear context
      vscode.commands.executeCommand('setContext', 'rapidkit:workspaceSelected', false);
    }
  }

  public async addWorkspace(): Promise<void> {
    const result = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Select Workspace Folder',
      title: 'Add RapidKit Workspace',
    });

    if (result && result[0]) {
      const workspace = await this.workspaceManager.addWorkspace(result[0].fsPath);
      if (workspace) {
        await this.refresh();
        vscode.window.showInformationMessage(`Workspace "${workspace.name}" added successfully!`);
      }
    }
  }

  public async removeWorkspace(workspace: RapidKitWorkspace): Promise<void> {
    const answer = await vscode.window.showWarningMessage(
      `Remove workspace "${workspace.name}" from the list?\n(Files will not be deleted)`,
      'Remove',
      'Cancel'
    );

    if (answer === 'Remove') {
      await this.workspaceManager.removeWorkspace(workspace.path);
      await this.refresh();
      vscode.window.showInformationMessage(`Workspace "${workspace.name}" removed`);
    }
  }

  public async autoDiscover(): Promise<void> {
    const message = vscode.window.setStatusBarMessage('$(search) Discovering RapidKit workspaces...');
    
    try {
      const discovered = await this.workspaceManager.autoDiscover();
      message.dispose();
      
      if (discovered.length > 0) {
        vscode.window.showInformationMessage(
          `Found ${discovered.length} RapidKit workspace(s)`
        );
        await this.refresh();
      } else {
        vscode.window.showInformationMessage('No new RapidKit workspaces found');
      }
    } catch (error) {
      message.dispose();
      vscode.window.showErrorMessage(`Error discovering workspaces: ${error}`);
    }
  }

  public async selectWorkspace(workspace: RapidKitWorkspace): Promise<void> {
    this.selectedWorkspace = workspace;
    this._onDidChangeTreeData.fire();
    
    // Set context for toolbar buttons
    await vscode.commands.executeCommand('setContext', 'rapidkit:workspaceSelected', true);
    
    // Fire event for other views to update
    await vscode.commands.executeCommand('rapidkit.workspaceSelected', workspace);
  }

  public getSelectedWorkspace(): RapidKitWorkspace | null {
    return this.selectedWorkspace;
  }

  public getWorkspaceByPath(path: string): RapidKitWorkspace | undefined {
    return this.workspaces.find(ws => ws.path === path);
  }
}

export class WorkspaceTreeItem extends vscode.TreeItem {
  constructor(
    public readonly workspace: RapidKitWorkspace | null,
    public readonly contextValue: string,
    customLabel?: string
  ) {
    super(
      customLabel || workspace?.name || '',
      vscode.TreeItemCollapsibleState.None
    );

    if (contextValue === 'workspace' && workspace) {
      this.tooltip = `${workspace.path}\nMode: ${workspace.mode}\nProjects: ${workspace.projects.length}`;
      this.iconPath = new vscode.ThemeIcon(
        workspace.mode === 'demo' ? 'rocket' : 'folder-library',
        new vscode.ThemeColor('charts.purple')
      );

      // Make workspace selectable
      this.command = {
        command: 'rapidkit.selectWorkspace',
        title: 'Select Workspace',
        arguments: [workspace.path], // Pass only the path, not the entire object
      };
    }

    this.contextValue = contextValue;
  }
}
