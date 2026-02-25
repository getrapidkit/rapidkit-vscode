/**
 * Workspace Explorer TreeView Provider
 * Shows list of RapidKit workspaces with actions
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import * as os from 'os';
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
  private profileCache: Map<string, string | undefined> = new Map();

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
    this.versionService.clearCache();
    this.versionInfoCache.clear();
    this.profileCache.clear();
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
        const profile = await this.getBootstrapProfile(ws.path);

        const item = new WorkspaceTreeItem(ws, 'workspace', isActive, versionInfo);

        const descParts: string[] = [];
        if (profile) {
          descParts.push(`[${profile}]`);
        }

        // Show active status with icon or time since last opened
        if (isActive) {
          descParts.push('🟢 Active');
        } else {
          // Calculate time since last opened
          const lastOpened = this.getLastOpenedTime(ws);
          if (lastOpened) {
            descParts.push(lastOpened);
          }
        }

        if (descParts.length > 0) {
          item.description = descParts.join(' • ');
        }

        items.push(item);
      }

      return items;
    }

    return [];
  }

  private async getBootstrapProfile(workspacePath: string): Promise<string | undefined> {
    if (this.profileCache.has(workspacePath)) {
      return this.profileCache.get(workspacePath);
    }

    let profile: string | undefined;
    try {
      const manifestPath = path.join(workspacePath, '.rapidkit', 'workspace.json');
      if (await fs.pathExists(manifestPath)) {
        const manifest = await fs.readJSON(manifestPath).catch(() => null);
        if (manifest?.profile && typeof manifest.profile === 'string') {
          profile = manifest.profile;
        }
      }
    } catch {
      profile = undefined;
    }

    this.profileCache.set(workspacePath, profile);
    return profile;
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

  public async importWorkspace(): Promise<void> {
    // Step 1: Ask user for import type
    const importType = await vscode.window.showQuickPick(
      [
        {
          label: '$(folder) Import Existing Workspace Folder',
          description: 'Register an existing RapidKit workspace',
          detail: 'Browse and select a folder containing a RapidKit workspace',
          value: 'folder',
        },
        {
          label: '$(archive) Import from Archive',
          description: 'Extract and import from .rapidkit-archive.zip',
          detail: 'Full workspace restore with all files',
          value: 'archive',
        },
      ],
      {
        placeHolder: 'Choose import method',
        title: 'Import Workspace',
      }
    );

    if (!importType) {
      return; // User cancelled
    }

    if (importType.value === 'folder') {
      await this.importFromFolder();
    } else {
      await this.importFromArchive();
    }
  }

  private async importFromFolder(): Promise<void> {
    const result = await vscode.window.showOpenDialog({
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: 'Import Workspace',
      title: 'Select RapidKit Workspace Folder',
    });

    if (!result || !result[0]) {
      return;
    }

    const workspacePath = result[0].fsPath;

    // Show progress while validating
    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Validating RapidKit workspace...',
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 30 });

        // Try to add workspace (includes validation)
        const workspace = await this.workspaceManager.addWorkspace(workspacePath);

        progress.report({ increment: 70 });

        if (workspace) {
          // Successfully imported
          await this.refresh();
          vscode.window.showInformationMessage(
            `✅ Workspace "${workspace.name}" imported successfully!`,
            'OK'
          );
        } else {
          // Not a valid RapidKit workspace
          vscode.window.showErrorMessage(
            `❌ Invalid RapidKit workspace\n\nThe selected folder is not a valid RapidKit workspace.\n\nA valid workspace must have:\n• .rapidkit-workspace marker file, OR\n• pyproject.toml + .venv + rapidkit script, OR\n• .rapidkit/project.json or .rapidkit/context.json`,
            'OK'
          );
        }
      }
    );
  }

  private async importFromArchive(): Promise<void> {
    const result = await vscode.window.showOpenDialog({
      canSelectFiles: true,
      canSelectFolders: false,
      canSelectMany: false,
      openLabel: 'Import Archive',
      title: 'Select RapidKit Archive',
      filters: {
        'RapidKit Archive': ['zip'],
        'All Files': ['*'],
      },
    });

    if (!result || !result[0]) {
      return;
    }

    const archivePath = result[0].fsPath;

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: 'Importing workspace from archive...',
        cancellable: false,
      },
      async (progress) => {
        try {
          const AdmZip = require('adm-zip');

          progress.report({ increment: 10, message: 'Reading archive...' });

          // Read ZIP archive
          const zip = new AdmZip(archivePath);

          // Get workspace name from archive (assume root folder name or use filename)
          const archiveName = path.basename(archivePath, '.rapidkit-archive.zip');

          progress.report({ increment: 10, message: 'Selecting destination...' });

          // Ask user where to extract
          const destinationResult = await vscode.window.showOpenDialog({
            canSelectFiles: false,
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select Destination',
            title: `Extract workspace "${archiveName}"`,
          });

          if (!destinationResult || !destinationResult[0]) {
            return;
          }

          const extractPath = path.join(destinationResult[0].fsPath, archiveName);

          // Check if already exists
          if (await fs.pathExists(extractPath)) {
            const overwrite = await vscode.window.showWarningMessage(
              `Folder "${archiveName}" already exists. Overwrite?`,
              'Overwrite',
              'Cancel'
            );
            if (overwrite !== 'Overwrite') {
              return;
            }
            await fs.remove(extractPath);
          }

          progress.report({ increment: 30, message: 'Extracting files...' });

          // Extract archive
          await fs.ensureDir(extractPath);
          zip.extractAllTo(extractPath, true);

          progress.report({ increment: 30, message: 'Validating workspace...' });

          // Validate it's a valid RapidKit workspace
          const markerPath = path.join(extractPath, '.rapidkit-workspace');
          if (!(await fs.pathExists(markerPath))) {
            throw new Error('Extracted archive is not a valid RapidKit workspace');
          }

          progress.report({ increment: 10, message: 'Registering workspace...' });

          // Register workspace
          const workspace = await this.workspaceManager.addWorkspace(extractPath);

          progress.report({ increment: 10, message: 'Done!' });

          if (workspace) {
            await this.refresh();
            const action = await vscode.window.showInformationMessage(
              `✅ Workspace "${workspace.name}" imported successfully from archive!`,
              'Open Workspace',
              'OK'
            );

            if (action === 'Open Workspace') {
              await vscode.commands.executeCommand(
                'vscode.openFolder',
                vscode.Uri.file(extractPath)
              );
            }
          }
        } catch (error) {
          vscode.window.showErrorMessage(`Failed to import archive: ${error}`);
        }
      }
    );
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

  public async exportWorkspace(workspace: RapidKitWorkspace): Promise<void> {
    try {
      await this.exportFullWorkspace(workspace);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to export workspace: ${error}`);
    }
  }

  private async exportFullWorkspace(workspace: RapidKitWorkspace): Promise<void> {
    const archiver = require('archiver');

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: `Creating archive for "${workspace.name}"...`,
        cancellable: false,
      },
      async (progress) => {
        progress.report({ increment: 10, message: 'Preparing workspace archive...' });

        // Prompt for save location first
        const saveUri = await vscode.window.showSaveDialog({
          defaultUri: vscode.Uri.file(
            path.join(os.homedir(), 'Downloads', `${workspace.name}.rapidkit-archive.zip`)
          ),
          filters: {
            'RapidKit Archive': ['zip'],
            'All Files': ['*'],
          },
          title: 'Export Full Workspace',
        });

        if (!saveUri) {
          return;
        }

        progress.report({ increment: 10, message: 'Creating ZIP archive...' });

        // Create archive
        const archive = archiver('zip', {
          zlib: { level: 9 }, // Maximum compression
        });

        const output = fs.createWriteStream(saveUri.fsPath);

        // Pipe archive to file
        archive.pipe(output);

        // Exclusion patterns (glob patterns)
        const exclusions = [
          '**/__pycache__/**',
          '**/*.pyc',
          '**/.venv/**',
          '**/venv/**',
          '**/node_modules/**',
          '**/.git/**',
          '**/dist/**',
          '**/build/**',
          '**/.pytest_cache/**',
          '**/.mypy_cache/**',
          '**/.ruff_cache/**',
          '**/htmlcov/**',
          '**/.coverage',
          '**/*.log',
          '**/.DS_Store',
          '**/Thumbs.db',
        ];

        progress.report({ increment: 20, message: 'Adding workspace files...' });

        // Add workspace directory with exclusions
        archive.directory(workspace.path, false, (entry: any) => {
          // Check if file matches any exclusion pattern
          for (const pattern of exclusions) {
            const globPattern = pattern.replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*');
            const regex = new RegExp(globPattern);
            if (regex.test(entry.name)) {
              return false; // Exclude this file
            }
          }
          return entry; // Include this file
        });

        progress.report({ increment: 30, message: 'Compressing files...' });

        // Finalize archive
        await archive.finalize();

        // Wait for stream to finish
        await new Promise<void>((resolve, reject) => {
          output.on('close', () => resolve());
          output.on('error', reject);
        });

        progress.report({ increment: 30, message: 'Done!' });

        // Get archive stats
        const stats = await fs.stat(saveUri.fsPath);
        const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

        // Success message with actions
        const action = await vscode.window.showInformationMessage(
          `✅ Workspace "${workspace.name}" exported successfully! (${sizeMB} MB)`,
          'Open Folder',
          'OK'
        );

        if (action === 'Open Folder') {
          const folderPath = path.dirname(saveUri.fsPath);
          await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(folderPath));
        }
      }
    );
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
