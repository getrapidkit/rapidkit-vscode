/**
 * Workspace Explorer TreeView Provider
 * Shows list of RapidKit workspaces with actions
 */

import * as vscode from 'vscode';
import { RapidKitWorkspace } from '../../types';
import { WorkspaceManager } from '../../core/workspaceManager';
import { CoreVersionService, CoreVersionInfo } from '../../core/coreVersionService';

export class WorkspaceExplorerProvider implements vscode.TreeDataProvider<WorkspaceTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<WorkspaceTreeItem | undefined | null | void> =
    new vscode.EventEmitter<WorkspaceTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<WorkspaceTreeItem | undefined | null | void> =
    this._onDidChangeTreeData.event;

  private workspaceManager = WorkspaceManager.getInstance();
  private versionService = CoreVersionService.getInstance();
  private workspaces: RapidKitWorkspace[] = [];
  private selectedWorkspace: RapidKitWorkspace | null = null;
  private fileWatcher?: vscode.FileSystemWatcher;
  private versionInfoCache: Map<string, CoreVersionInfo> = new Map();

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

      // Add workspaces with version info
      for (const ws of this.workspaces) {
        const isActive = this.selectedWorkspace?.path === ws.path;

        // Fetch version info (async but cached)
        const versionInfo = await this.versionService.getVersionInfo(ws.path);
        this.versionInfoCache.set(ws.path, versionInfo);

        const item = new WorkspaceTreeItem(ws, 'workspace', isActive, versionInfo);

        // Show active status with icon or time since last opened
        if (isActive) {
          item.description = '🟢 Active';
        } else {
          // Calculate time since last opened
          const lastOpened = this.getLastOpenedTime(ws);
          if (lastOpened) {
            item.description = lastOpened;
          }
        }

        items.push(item);
      }

      return items;
    }

    return [];
  }

  private getLastOpenedTime(workspace: RapidKitWorkspace): string | undefined {
    const lastAccessed = (workspace as any).lastAccessed;
    if (!lastAccessed) {
      return undefined;
    }

    const now = Date.now();
    const diff = now - lastAccessed;

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) {
      return 'Just now';
    } else if (minutes < 60) {
      return `${minutes}m ago`;
    } else if (hours < 24) {
      return `${hours}h ago`;
    } else if (days < 7) {
      return `${days}d ago`;
    } else {
      return undefined;
    }
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
        vscode.window.showInformationMessage(
          `Workspace "${workspace.name}" added successfully!`,
          'OK'
        );
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
      vscode.window.showInformationMessage(`Workspace "${workspace.name}" removed`, 'OK');
    }
  }

  public async autoDiscover(): Promise<void> {
    const message = vscode.window.setStatusBarMessage(
      '$(search) Discovering RapidKit workspaces...'
    );

    try {
      const discovered = await this.workspaceManager.autoDiscover();
      message.dispose();

      if (discovered.length > 0) {
        vscode.window.showInformationMessage(
          `Found ${discovered.length} RapidKit workspace(s)`,
          'OK'
        );
        await this.refresh();
      } else {
        vscode.window.showInformationMessage('No new RapidKit workspaces found', 'OK');
      }
    } catch (error) {
      message.dispose();
      vscode.window.showErrorMessage(`Error discovering workspaces: ${error}`);
    }
  }

  public async selectWorkspace(workspace: RapidKitWorkspace): Promise<void> {
    this.selectedWorkspace = workspace;

    // Update last accessed time
    await this.workspaceManager.touchWorkspace(workspace.path);

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
    return this.workspaces.find((ws) => ws.path === path);
  }
}

export class WorkspaceTreeItem extends vscode.TreeItem {
  constructor(
    public readonly workspace: RapidKitWorkspace | null,
    public readonly contextValue: string,
    isActive: boolean = false,
    versionInfo?: CoreVersionInfo,
    customLabel?: string
  ) {
    const projectCount = workspace?.projects?.length || 0;
    const label = customLabel || workspace?.name || '';
    const labelWithCount = projectCount > 0 ? `${label} (${projectCount})` : label;

    super(labelWithCount, vscode.TreeItemCollapsibleState.None);

    if (contextValue === 'workspace' && workspace) {
      const projectText = projectCount === 1 ? '1 project' : `${projectCount} projects`;

      // Enhanced tooltip with version info
      let tooltipText = `${workspace.name}\n${workspace.path}\nMode: ${workspace.mode}\n${projectText}`;

      if (versionInfo) {
        const versionService = CoreVersionService.getInstance();
        const statusMsg = versionService.getStatusMessage(versionInfo);
        const locationText = versionInfo.location ? ` (${versionInfo.location})` : '';
        tooltipText += `\n\n🩺 ${statusMsg}${locationText}`;
        if (versionInfo.status === 'update-available') {
          tooltipText += `\n\n💡 Click doctor icon to upgrade`;
        }
      }

      this.tooltip = new vscode.MarkdownString(tooltipText.replace(/\n/g, '  \n'));

      // Icon based on active status
      this.iconPath = new vscode.ThemeIcon(
        workspace.mode === 'demo' ? 'rocket' : isActive ? 'folder-opened' : 'folder-library',
        new vscode.ThemeColor(isActive ? 'charts.green' : 'charts.purple')
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
