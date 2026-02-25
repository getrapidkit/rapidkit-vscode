/**
 * Welcome Panel - React Version
 * Uses React for webview UI with postMessage communication
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { WorkspaceManager } from '../../core/workspaceManager';
import { ModulesCatalogService } from '../../core/modulesCatalogService';
import { CoreVersionService } from '../../core/coreVersionService';
import { ExamplesService } from '../../core/examplesService';
import { KitsService } from '../../core/kitsService';
import { MODULES, ModuleData } from '../../data/modules';
import { runningServers } from '../../extension';
import type { WorkspaceExplorerProvider } from '../treeviews/workspaceExplorer';

export class WelcomePanel {
  private static readonly UI_PREFS_KEY = 'rapidkit.welcome.uiPreferences';
  public static currentPanel: WelcomePanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private static _selectedProject: { name: string; path: string } | null = null;
  private _modulesCatalog: ModuleData[] = MODULES;
  private static _workspaceExplorer: WorkspaceExplorerProvider | undefined;
  /** Framework name queued to open as a modal after the webview becomes ready */
  private static _pendingModal: string | null = null;

  /**
   * Open the welcome panel and immediately trigger the Create Project modal
   * for the given framework. Safe to call whether the panel is open or not.
   */
  public static openProjectModal(
    context: vscode.ExtensionContext,
    framework: 'fastapi' | 'nestjs' | 'go'
  ): void {
    WelcomePanel._pendingModal = framework;
    WelcomePanel.createOrShow(context);
    // If the panel was already visible the 'ready' event won't fire again,
    // so also try posting directly after a short delay.
    setTimeout(() => {
      if (WelcomePanel._pendingModal && WelcomePanel.currentPanel) {
        WelcomePanel._pendingModal = null;
        WelcomePanel.currentPanel._panel.webview.postMessage({
          command: 'openProjectModal',
          data: { framework },
        });
      }
    }, 350);
  }

  /**
   * Open the welcome panel and immediately trigger the Create Workspace modal.
   * Safe to call whether the panel is open or not.
   */
  public static openWorkspaceModal(context: vscode.ExtensionContext): void {
    WelcomePanel._pendingModal = '__workspace__';
    WelcomePanel.createOrShow(context);
    setTimeout(() => {
      if (WelcomePanel._pendingModal === '__workspace__' && WelcomePanel.currentPanel) {
        WelcomePanel._pendingModal = null;
        WelcomePanel.currentPanel._panel.webview.postMessage({
          command: 'openWorkspaceModal',
        });
      }
    }, 350);
  }

  /**
   * Set workspace explorer reference (called from extension.ts)
   */
  public static setWorkspaceExplorer(explorer: WorkspaceExplorerProvider) {
    WelcomePanel._workspaceExplorer = explorer;
  }

  /**
   * Called from extension.ts when user selects a project in the sidebar tree view
   */
  public static async updateWithProject(projectPath: string, projectName: string) {
    console.log('[WelcomePanel] updateWithProject called:', projectName, projectPath);

    WelcomePanel._selectedProject = { name: projectName, path: projectPath };

    if (WelcomePanel.currentPanel) {
      const installedModules = await WelcomePanel._readInstalledModules(projectPath);
      console.log('[WelcomePanel] Found', installedModules.length, 'installed modules');

      // Check if server is running and extract port
      let isRunning = false;
      let runningPort: number | undefined;
      const runningTerminal = runningServers.get(projectPath);
      if (runningTerminal) {
        isRunning = true;
        // Extract port from terminal name like "🚀 project [:8001]"
        const match = runningTerminal.name.match(/:([0-9]+)/);
        if (match) {
          runningPort = parseInt(match[1], 10);
          console.log('[WelcomePanel] Server running on port:', runningPort);
        }
      }

      // Detect project type for UI adaptation (e.g., hide modules for Go)
      const projectType = await WelcomePanel._detectProjectTypeStatic(projectPath);

      WelcomePanel.currentPanel._panel.webview.postMessage({
        command: 'updateWorkspaceStatus',
        data: {
          hasWorkspace: true,
          hasProjectSelected: true,
          workspaceName: projectName,
          workspacePath: projectPath,
          projectType: projectType ?? undefined,
          installedModules,
          isRunning,
          runningPort,
        },
      });
      console.log('[WelcomePanel] ✅ Workspace status sent to webview');

      // Refresh modules catalog to get correct versions for the new project
      await WelcomePanel.currentPanel._refreshModulesCatalog();
      console.log('[WelcomePanel] ✅ Modules catalog refreshed for project switch');
    } else {
      console.log('[WelcomePanel] ❌ No currentPanel - stored for later');
    }
  }

  /**
   * Clear selected project
   */
  public static clearSelectedProject() {
    console.log('[WelcomePanel] clearSelectedProject called');
    WelcomePanel._selectedProject = null;

    if (WelcomePanel.currentPanel) {
      const selectedWorkspace = WelcomePanel._workspaceExplorer?.getSelectedWorkspace();
      WelcomePanel.currentPanel._panel.webview.postMessage({
        command: 'updateWorkspaceStatus',
        data: {
          hasWorkspace: Boolean(selectedWorkspace),
          hasProjectSelected: false,
          workspaceName: selectedWorkspace?.name,
          workspacePath: selectedWorkspace?.path,
          installedModules: [],
        },
      });
    }
  }

  /**
   * Refresh recent workspaces list in React panel
   */
  public static refreshRecentWorkspaces() {
    if (WelcomePanel.currentPanel) {
      WelcomePanel.currentPanel._sendRecentWorkspaces();
    }
  }

  /**
   * Refresh workspace status (installed modules) after module installation
   */
  public static async refreshWorkspaceStatus() {
    if (WelcomePanel.currentPanel) {
      await WelcomePanel.currentPanel._sendWorkspaceStatus();
      // Also refresh modules catalog to get latest versions
      await WelcomePanel.currentPanel._refreshModulesCatalog();
    }
  }

  private _getSelectedWorkspaceInfo(): { name: string; path: string } | null {
    const ws = WelcomePanel._workspaceExplorer?.getSelectedWorkspace();
    if (!ws) {
      return null;
    }
    return { name: ws.name, path: ws.path };
  }

  /**
   * Read installed modules from registry.json
   */
  private static async _readInstalledModules(
    projectPath: string
  ): Promise<{ slug: string; version: string; display_name: string }[]> {
    try {
      const primaryRegistryPath = path.join(projectPath, 'registry.json');
      const legacyRegistryPath = path.join(projectPath, '.rapidkit', 'registry.json');

      const primaryExists = await fs.pathExists(primaryRegistryPath);
      const legacyExists = await fs.pathExists(legacyRegistryPath);

      const registryPath = primaryExists ? primaryRegistryPath : legacyRegistryPath;
      const exists = primaryExists || legacyExists;

      if (exists) {
        const content = await fs.readFile(registryPath, 'utf-8');
        const registry = JSON.parse(content);
        return registry.installed_modules || [];
      }
    } catch (error) {
      console.error('[WelcomePanel] Error reading registry.json:', error);
    }
    return [];
  }

  private _context: vscode.ExtensionContext;

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this._panel = panel;
    this._context = context;

    // Set webview content
    this._panel.webview.html = this._getHtmlContent(context);

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'ready':
            // Send initial data to webview
            this._sendInitialData();
            // If a modal was queued (e.g. triggered from sidebar), open it now
            if (WelcomePanel._pendingModal) {
              const pending = WelcomePanel._pendingModal;
              WelcomePanel._pendingModal = null;
              setTimeout(() => {
                if (pending === '__workspace__') {
                  this._panel.webview.postMessage({ command: 'openWorkspaceModal' });
                } else {
                  this._panel.webview.postMessage({
                    command: 'openProjectModal',
                    data: { framework: pending },
                  });
                }
              }, 300);
            }
            break;
          case 'createWorkspace':
            // Send loading state to webview
            this._panel.webview.postMessage({
              command: 'setCreatingWorkspace',
              data: { isLoading: true },
            });
            try {
              // Pass full config from modal; fall back to no-arg (launches wizard)
              if (message.data?.name) {
                await vscode.commands.executeCommand('rapidkit.createWorkspace', message.data);
              } else {
                await vscode.commands.executeCommand('rapidkit.createWorkspace');
              }
            } finally {
              // Reset loading state
              this._panel.webview.postMessage({
                command: 'setCreatingWorkspace',
                data: { isLoading: false },
              });
            }
            break;
          case 'createFastAPIProject':
            if (message.data?.name) {
              // Modal provided name, pass to command
              await vscode.commands.executeCommand(
                'rapidkit.createFastAPIProject',
                message.data.name
              );
            } else {
              await vscode.commands.executeCommand('rapidkit.createFastAPIProject');
            }
            break;
          case 'createNestJSProject':
            if (message.data?.name) {
              // Modal provided name, pass to command
              await vscode.commands.executeCommand(
                'rapidkit.createNestJSProject',
                message.data.name
              );
            } else {
              await vscode.commands.executeCommand('rapidkit.createNestJSProject');
            }
            break;
          case 'createProjectWithKit':
            // New handler for kit-aware project creation from modal
            if (message.data?.name && message.data?.framework && message.data?.kit) {
              console.log('[WelcomePanel] Creating project with kit:', message.data);

              // Get selected workspace path
              let workspacePath: string | undefined;
              if (WelcomePanel._workspaceExplorer) {
                const selectedWorkspace = WelcomePanel._workspaceExplorer.getSelectedWorkspace();
                workspacePath = selectedWorkspace?.path;
              }

              // Import createProjectCommand
              const { createProjectCommand } = await import('../../commands/createProject.js');
              await createProjectCommand(
                workspacePath, // Use selected workspace path
                message.data.framework, // preselectedFramework
                message.data.name, // projectName
                message.data.kit // kitName
              );
            }
            break;
          case 'openSetup':
            await vscode.commands.executeCommand('rapidkit.openSetup');
            break;
          case 'refreshWorkspaces':
            CoreVersionService.getInstance().clearCache();
            this._sendRecentWorkspaces();
            break;
          case 'getUiPreferences':
            this._sendUiPreferences();
            break;
          case 'setUiPreference':
            if (message.data?.key) {
              await this._setUiPreference(String(message.data.key), message.data.value);
            }
            break;
          case 'cloneExample':
            if (message.data) {
              await this._cloneExample(message.data);
            }
            break;
          case 'updateExample':
            if (message.data) {
              await this._updateExample(message.data);
            }
            break;
          case 'openWorkspaceFolder':
            if (message.data?.path) {
              const wsBaseName = path.basename(message.data.path);
              type OpenPick = vscode.QuickPickItem & { value: string };
              const openPick = await vscode.window.showQuickPick<OpenPick>(
                [
                  {
                    label: '$(folder-active) Select in Current Window',
                    description: 'Activate workspace here (updates sidebar + Projects tree)',
                    detail:
                      'Selects the workspace in the sidebar. Projects and modules update immediately.',
                    value: 'select',
                  },
                  {
                    label: '$(empty-window) Open in New Window',
                    description: 'Open workspace folder in a separate VS Code window',
                    detail: 'Current window stays unchanged.',
                    value: 'new',
                  },
                ],
                {
                  placeHolder: `What would you like to do with \u201c${wsBaseName}\u201d?`,
                  title: 'Open Workspace',
                  ignoreFocusOut: true,
                }
              );
              if (!openPick) {
                break;
              }
              if (openPick.value === 'select') {
                await vscode.commands.executeCommand('rapidkit.selectWorkspace', message.data.path);
              } else {
                const uri = vscode.Uri.file(message.data.path);
                await vscode.commands.executeCommand('vscode.openFolder', uri, {
                  forceNewWindow: true,
                });
              }
            }
            break;
          case 'selectWorkspace':
            if (message.data) {
              await vscode.commands.executeCommand('rapidkit.selectWorkspace', message.data);
              // Send updated workspace status
              await this._sendWorkspaceStatus();
            }
            break;
          case 'removeWorkspace':
            if (message.data) {
              await vscode.commands.executeCommand('rapidkit.removeWorkspace', message.data);
            }
            break;
          case 'refreshModules':
            this._sendModulesCatalog();
            break;
          case 'installModule': {
            if (message.data) {
              // Construct full module object like stable welcomePanel does
              const moduleData = message.data;
              const moduleObj = {
                id: moduleData.id,
                displayName: moduleData.display_name || moduleData.name,
                description: moduleData.description || '',
                category: moduleData.category || 'unknown',
                status: moduleData.status || 'stable',
                tags: moduleData.tags || [],
                dependencies: moduleData.dependencies || [],
                installed: false,
                slug: moduleData.slug || `unknown/${moduleData.id}`,
              };
              await vscode.commands.executeCommand('rapidkit.addModule', moduleObj);
            }
            break;
          }
          case 'showModuleDetails':
            if (message.data) {
              const moduleId = message.data;
              const moduleData = MODULES.find((m) => m.id === moduleId || m.slug === moduleId);
              if (moduleData) {
                await this._showModuleDetails(moduleData);
              } else {
                console.error('Module not found:', moduleId);
              }
            }
            break;
          case 'openDocs':
            await vscode.env.openExternal(vscode.Uri.parse('https://getrapidkit.com/docs'));
            break;
          case 'openGitHub':
            await vscode.env.openExternal(vscode.Uri.parse('https://github.com/rapidkit/rapidkit'));
            break;
          case 'openMarketplace':
            await vscode.env.openExternal(
              vscode.Uri.parse(
                'https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit'
              )
            );
            break;
          case 'openUrl':
            if (message.data?.url) {
              await vscode.env.openExternal(vscode.Uri.parse(message.data.url));
            }
            break;
          case 'upgradeCore':
            if (message.data?.path) {
              const workspacePath = message.data.path;
              const targetVersion = message.data.version;
              const terminal = vscode.window.createTerminal({
                name: `Upgrade RapidKit Core`,
                cwd: workspacePath,
              });
              terminal.show();

              // Detect if workspace has venv
              const venvPath = path.join(workspacePath, '.venv');
              const hasVenv = await fs.pathExists(venvPath);

              if (hasVenv) {
                terminal.sendText('poetry update rapidkit-core');
              } else {
                terminal.sendText('pipx upgrade rapidkit-core');
              }

              vscode.window.showInformationMessage(
                `Upgrading RapidKit Core${targetVersion ? ` to v${targetVersion}` : ''}...`,
                'OK'
              );
            }
            break;

          case 'checkWorkspaceHealth':
            console.log('[WelcomePanel] Check Workspace Health requested for:', message.data?.path);
            if (message.data?.path) {
              vscode.commands.executeCommand('rapidkit.checkWorkspaceHealth', {
                path: message.data.path,
              });
            }
            break;

          case 'exportWorkspace':
            console.log('[WelcomePanel] Export Workspace requested for:', message.data?.path);
            if (message.data?.path) {
              vscode.commands.executeCommand('rapidkit.exportWorkspace', {
                path: message.data.path,
              });
            }
            break;
          case 'projectTerminal':
            if (WelcomePanel._selectedProject) {
              await vscode.commands.executeCommand('rapidkit.projectTerminal', {
                projectPath: WelcomePanel._selectedProject.path,
              });
            }
            break;
          case 'projectInit':
            if (WelcomePanel._selectedProject) {
              await vscode.commands.executeCommand('rapidkit.projectInit', {
                projectPath: WelcomePanel._selectedProject.path,
              });
            }
            break;
          case 'projectDev':
            if (WelcomePanel._selectedProject) {
              await vscode.commands.executeCommand('rapidkit.projectDev', {
                projectPath: WelcomePanel._selectedProject.path,
              });
            }
            break;
          case 'projectStop':
            if (WelcomePanel._selectedProject) {
              await vscode.commands.executeCommand('rapidkit.projectStop', {
                projectPath: WelcomePanel._selectedProject.path,
              });
            }
            break;
          case 'projectTest':
            if (WelcomePanel._selectedProject) {
              await vscode.commands.executeCommand('rapidkit.projectTest', {
                projectPath: WelcomePanel._selectedProject.path,
              });
            }
            break;
          case 'projectBrowser':
            if (WelcomePanel._selectedProject) {
              await vscode.commands.executeCommand('rapidkit.projectBrowser', {
                projectPath: WelcomePanel._selectedProject.path,
              });
            }
            break;
          case 'projectBuild':
            if (WelcomePanel._selectedProject) {
              const terminal = vscode.window.createTerminal({
                name: `Build ${WelcomePanel._selectedProject.name}`,
                cwd: WelcomePanel._selectedProject.path,
              });
              terminal.show();
              terminal.sendText('npx rapidkit build');
              vscode.window.showInformationMessage(
                `Building ${WelcomePanel._selectedProject.name}...`,
                'OK'
              );
            }
            break;
        }
      },
      null,
      this._disposables
    );

    // Clean up when panel is closed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public static createOrShow(context: vscode.ExtensionContext) {
    // If panel exists, show it
    if (WelcomePanel.currentPanel) {
      WelcomePanel.currentPanel._panel.reveal();
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'rapidkitWelcomeReact',
      '🚀 Welcome to RapidKit',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [
          vscode.Uri.joinPath(context.extensionUri, 'dist'),
          vscode.Uri.joinPath(context.extensionUri, 'media'),
        ],
      }
    );

    WelcomePanel.currentPanel = new WelcomePanel(panel, context);
  }

  private _sendInitialData() {
    this._sendVersion();
    this._sendRecentWorkspaces();
    this._sendExampleWorkspaces();
    this._sendAvailableKits();
    this._sendModulesCatalog();
    this._sendWorkspaceStatus();
    this._sendUiPreferences();
  }

  private _getUiPreferences(): { setupStatusCardHidden: boolean } {
    const prefs = this._context.globalState.get<Record<string, unknown>>(
      WelcomePanel.UI_PREFS_KEY,
      {}
    );
    return {
      setupStatusCardHidden: prefs?.setupStatusCardHidden === true,
    };
  }

  private _sendUiPreferences() {
    this._panel.webview.postMessage({
      command: 'uiPreferences',
      data: this._getUiPreferences(),
    });
  }

  private async _setUiPreference(key: string, value: unknown) {
    const current = this._context.globalState.get<Record<string, unknown>>(
      WelcomePanel.UI_PREFS_KEY,
      {}
    );
    const next = {
      ...current,
      [key]: value,
    };
    await this._context.globalState.update(WelcomePanel.UI_PREFS_KEY, next);
    this._sendUiPreferences();
  }

  private _sendVersion() {
    const version = this._context.extension.packageJSON.version || '0.0.0';
    this._panel.webview.postMessage({
      command: 'updateVersion',
      data: version,
    });
  }

  private async _sendRecentWorkspaces() {
    const workspaces = await this._getRecentWorkspaces();
    this._panel.webview.postMessage({
      command: 'updateRecentWorkspaces',
      data: workspaces,
    });
  }

  private async _sendExampleWorkspaces() {
    try {
      const examplesService = ExamplesService.getInstance();
      const examples = await examplesService.getExamples();

      // Enrich each example with clone status
      const enrichedExamples = await Promise.all(
        examples.map(async (example) => {
          const isCloned = await examplesService.isExampleCloned(example.id);
          let cloneStatus: 'not-cloned' | 'cloned' | 'update-available' = 'not-cloned';

          if (isCloned) {
            cloneStatus = 'cloned';

            // Check for updates
            const updateInfo = await examplesService.checkForUpdates(example.id);
            if (updateInfo.hasUpdate) {
              cloneStatus = 'update-available';
            }
          }

          // repoUrl: URL used by the UI "Open on GitHub" button (workspace subfolder when available).
          // cloneUrl: URL used by `git clone` and must always be repository root.
          const repoUrl = example.path
            ? `https://github.com/getrapidkit/rapidkit-examples/tree/main/${example.path}`
            : 'https://github.com/getrapidkit/rapidkit-examples';
          const cloneUrl = 'https://github.com/getrapidkit/rapidkit-examples';

          return {
            ...example,
            repoUrl,
            cloneUrl,
            cloneStatus,
          };
        })
      );

      this._panel.webview.postMessage({
        command: 'updateExampleWorkspaces',
        data: enrichedExamples,
      });
    } catch (error) {
      console.error('[WelcomePanel] Failed to send example workspaces:', error);
    }
  }

  private async _sendAvailableKits() {
    try {
      const kitsService = KitsService.getInstance();
      const kits = await kitsService.getKits();

      this._panel.webview.postMessage({
        command: 'updateAvailableKits',
        data: kits,
      });

      console.log('[WelcomePanel] ✅ Available kits sent to webview:', kits.length);
    } catch (error) {
      console.error('[WelcomePanel] Failed to send available kits:', error);
      // Send empty array on error
      this._panel.webview.postMessage({
        command: 'updateAvailableKits',
        data: [],
      });
    }
  }

  private async _cloneExample(example: any) {
    try {
      // Notify webview we're cloning
      this._panel.webview.postMessage({
        command: 'setCloning',
        data: { exampleName: example.name },
      });

      // Ask user where to clone
      const result = await vscode.window.showOpenDialog({
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: 'Select Clone Location',
        title: `Clone ${example.title}`,
      });

      if (!result || result.length === 0) {
        // User cancelled
        this._panel.webview.postMessage({
          command: 'setCloning',
          data: { exampleName: null },
        });
        return;
      }

      const parentFolder = result[0].fsPath;
      const targetPath = path.join(parentFolder, example.name);

      // Check if already exists
      if (await fs.pathExists(targetPath)) {
        const overwrite = await vscode.window.showWarningMessage(
          `Folder "${example.name}" already exists at this location.`,
          'Cancel',
          'Open Existing'
        );

        if (overwrite === 'Open Existing') {
          // Import existing workspace
          const workspaceManager = WorkspaceManager.getInstance();
          await workspaceManager.addWorkspace(targetPath);
          await this._sendRecentWorkspaces();
          vscode.window.showInformationMessage(`✅ Imported existing workspace: ${example.name}`);
        }

        this._panel.webview.postMessage({
          command: 'setCloning',
          data: { exampleName: null },
        });
        return;
      }

      // Clone the repository
      vscode.window.showInformationMessage(`🔄 Cloning ${example.title}...`);

      const terminal = vscode.window.createTerminal({
        name: `Clone ${example.name}`,
        cwd: parentFolder,
        isTransient: false,
      });

      terminal.show();

      // Clone the entire repository (never use /tree/main/... URLs for git clone)
      const cloneSource = example.cloneUrl || 'https://github.com/getrapidkit/rapidkit-examples';
      terminal.sendText(`git clone ${cloneSource} rapidkit-examples-temp`);

      // Wait for clone to complete
      await new Promise((resolve) => setTimeout(resolve, 8000));

      // Move the specific workspace out
      const tempRepoPath = path.join(parentFolder, 'rapidkit-examples-temp');
      const sourceWorkspacePath = path.join(tempRepoPath, example.name);

      // Check if workspace exists in cloned repo
      if (await fs.pathExists(sourceWorkspacePath)) {
        // Move workspace to target location
        await fs.move(sourceWorkspacePath, targetPath);

        // Clean up temp repo
        await fs.remove(tempRepoPath);

        // Get commit hash for tracking
        const examplesService = ExamplesService.getInstance();
        const commitHash = await examplesService.getRepoCommitHash(targetPath);

        // Track the cloned example
        await examplesService.trackClonedExample(
          example.id || example.name,
          example.name,
          targetPath,
          commitHash || undefined
        );

        // Import to workspace list
        const workspaceManager = WorkspaceManager.getInstance();
        await workspaceManager.addWorkspace(targetPath);
        await this._sendRecentWorkspaces();

        // Refresh examples list to show new clone status
        await this._sendExampleWorkspaces();

        vscode.window
          .showInformationMessage(
            `✅ Successfully cloned and imported: ${example.name}`,
            'Open Workspace'
          )
          .then((selection) => {
            if (selection === 'Open Workspace') {
              const uri = vscode.Uri.file(targetPath);
              vscode.commands.executeCommand('vscode.openFolder', uri, { forceNewWindow: true });
            }
          });

        terminal.dispose();
      } else {
        // Cleanup on failure
        if (await fs.pathExists(tempRepoPath)) {
          await fs.remove(tempRepoPath);
        }
        vscode.window.showWarningMessage(
          `Clone completed but workspace "${example.name}" not found in repository. Check the terminal for details.`,
          'OK'
        );
      }
    } catch (error: any) {
      console.error('[WelcomePanel] Error cloning example:', error);
      vscode.window.showErrorMessage(`Failed to clone example: ${error.message}`);
    } finally {
      // Reset cloning state
      this._panel.webview.postMessage({
        command: 'setCloning',
        data: { exampleName: null },
      });
    }
  }

  private async _updateExample(example: any) {
    try {
      const examplesService = ExamplesService.getInstance();
      const info = await examplesService.getClonedExampleInfo(example.id || example.name);

      if (!info || !info.clonedPath) {
        vscode.window.showWarningMessage('Example is not cloned yet.');
        return;
      }

      // Check if path exists
      if (!(await fs.pathExists(info.clonedPath))) {
        vscode.window
          .showWarningMessage(`Cloned example not found at: ${info.clonedPath}`, 'Untrack')
          .then(async (action) => {
            if (action === 'Untrack') {
              await examplesService.untrackExample(example.id || example.name);
              await this._sendExampleWorkspaces();
            }
          });
        return;
      }

      // Notify user
      this._panel.webview.postMessage({
        command: 'setUpdating',
        data: { exampleName: example.name },
      });

      // Check if workspace has uncommitted changes
      const hasChanges = await this._checkGitStatus(info.clonedPath);

      if (hasChanges) {
        const action = await vscode.window.showWarningMessage(
          `The workspace "${example.name}" has uncommitted changes. Updating may cause conflicts.`,
          'Continue Anyway',
          'Cancel'
        );

        if (action !== 'Continue Anyway') {
          this._panel.webview.postMessage({
            command: 'setUpdating',
            data: { exampleName: null },
          });
          return;
        }
      }

      // Create terminal and run git pull
      const terminal = vscode.window.createTerminal({
        name: `Update ${example.name}`,
        cwd: info.clonedPath,
      });

      terminal.show();
      terminal.sendText('git fetch origin main && git pull origin main');

      vscode.window.showInformationMessage(
        `🔄 Updating ${example.name}... Check terminal for details.`,
        'OK'
      );

      // Wait for update to complete
      await new Promise((resolve) => setTimeout(resolve, 5000));

      // Update tracking with new commit hash
      const newCommitHash = await examplesService.getRepoCommitHash(info.clonedPath);
      if (newCommitHash) {
        await examplesService.trackClonedExample(
          example.id || example.name,
          example.name,
          info.clonedPath,
          newCommitHash
        );
      }

      // Refresh examples list
      await this._sendExampleWorkspaces();

      vscode.window.showInformationMessage(`✅ ${example.name} updated successfully!`);
    } catch (error: any) {
      console.error('[WelcomePanel] Error updating example:', error);
      vscode.window.showErrorMessage(`Failed to update example: ${error.message}`);
    } finally {
      this._panel.webview.postMessage({
        command: 'setUpdating',
        data: { exampleName: null },
      });
    }
  }

  private async _checkGitStatus(repoPath: string): Promise<boolean> {
    try {
      // Check if git status is clean
      const { exec } = require('child_process');
      return new Promise((resolve) => {
        exec('git status --porcelain', { cwd: repoPath }, (error: any, stdout: string) => {
          if (error) {
            resolve(false); // Assume clean if git command fails
          } else {
            resolve(stdout.trim().length > 0); // Has changes if output is not empty
          }
        });
      });
    } catch {
      return false;
    }
  }

  private async _sendModulesCatalog() {
    await this._refreshModulesCatalog();
  }

  private async _refreshModulesCatalog(): Promise<void> {
    try {
      const service = ModulesCatalogService.getInstance();
      // Get workspace path - use selected project's workspace or VS Code workspace folders
      let workspacePath: string | undefined;
      if (WelcomePanel._selectedProject) {
        // Extract workspace path from project path (project is inside workspace)
        const projectPath = WelcomePanel._selectedProject.path;
        // Workspace is parent of project (e.g., /path/to/my-wsps)
        workspacePath = path.dirname(projectPath);
      } else if (
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0
      ) {
        workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
      }

      const result = await service.getModulesCatalog(workspacePath);
      if (result.modules.length) {
        this._modulesCatalog = result.modules;
      } else {
        this._modulesCatalog = MODULES;
      }

      this._panel.webview.postMessage({
        command: 'updateModulesCatalog',
        data: this._modulesCatalog,
      });
    } catch (error) {
      console.error('[WelcomePanel] Failed to load modules catalog:', error);
      this._modulesCatalog = MODULES;
    }
  }

  private async _sendWorkspaceStatus() {
    const selectedWorkspace = this._getSelectedWorkspaceInfo();
    const hasWorkspace = selectedWorkspace !== null;
    let hasProjectSelected = false;
    let installedModules: { slug: string; version: string; display_name: string }[] = [];
    let projectType: 'fastapi' | 'nestjs' | 'go' | undefined;

    // Keep project-scoped details only when selected project belongs to selected workspace.
    if (
      WelcomePanel._selectedProject &&
      selectedWorkspace &&
      WelcomePanel._selectedProject.path.startsWith(`${selectedWorkspace.path}${path.sep}`)
    ) {
      hasProjectSelected = true;
      installedModules = await WelcomePanel._readInstalledModules(
        WelcomePanel._selectedProject.path
      );
      projectType =
        (await WelcomePanel._detectProjectTypeStatic(WelcomePanel._selectedProject.path)) ??
        undefined;
    }

    // If project selection is stale (from another workspace), clear project-scoped state.
    if (
      WelcomePanel._selectedProject &&
      selectedWorkspace &&
      !WelcomePanel._selectedProject.path.startsWith(`${selectedWorkspace.path}${path.sep}`)
    ) {
      WelcomePanel._selectedProject = null;
    }

    this._panel.webview.postMessage({
      command: 'updateWorkspaceStatus',
      data: {
        hasWorkspace,
        hasProjectSelected,
        workspaceName: selectedWorkspace?.name,
        workspacePath: selectedWorkspace?.path,
        projectType,
        installedModules,
      },
    });
  }

  private _getRecentWorkspaces(): Promise<
    Array<{
      name: string;
      path: string;
      lastAccessed?: number;
      coreVersion?: string;
      coreStatus?:
        | 'ok'
        | 'outdated'
        | 'not-installed'
        | 'update-available'
        | 'up-to-date'
        | 'error'
        | 'deprecated';
      coreLocation?: 'workspace' | 'global' | 'pipx';
      lastModified?: number;
      projectCount?: number;
      projectStats?: {
        fastapi?: number;
        nestjs?: number;
      };
      bootstrapProfile?:
        | 'minimal'
        | 'python-only'
        | 'node-only'
        | 'go-only'
        | 'polyglot'
        | 'enterprise';
      dependencySharingMode?: 'isolated' | 'shared-runtime-caches' | 'shared-node-deps';
      policyMode?: 'warn' | 'strict';
      complianceStatus?: 'passing' | 'failing' | 'unknown';
      mirrorStatus?: 'synced' | 'stale' | 'not-configured';
    }>
  > {
    try {
      const workspaceManager = WorkspaceManager.getInstance();
      const versionService = CoreVersionService.getInstance();
      const workspaces = workspaceManager.getWorkspaces();

      // Enrich workspaces with version info, last modified, and project info
      const enrichedWorkspaces = Promise.all(
        workspaces.map(async (ws) => {
          try {
            const versionInfo = await versionService.getVersionInfo(ws.path);

            // Get last modified time and project info
            let lastModified: number | undefined;
            let projectCount: number | undefined;
            let projectStats: { fastapi?: number; nestjs?: number } | undefined;
            try {
              const stats = await fs.stat(ws.path);
              lastModified = stats.mtimeMs;

              // Detect projects in workspace root (not projects/ subfolder!)
              const entries = await fs.readdir(ws.path, { withFileTypes: true });
              const stats_counter = { fastapi: 0, nestjs: 0 };
              let count = 0;

              for (const entry of entries) {
                if (entry.isDirectory() && !entry.name.startsWith('.')) {
                  const projectPath = path.join(ws.path, entry.name);

                  // Check for RapidKit project markers
                  const hasRapidKitMarker =
                    (await fs.pathExists(path.join(projectPath, '.rapidkit', 'project.json'))) ||
                    (await fs.pathExists(path.join(projectPath, '.rapidkit', 'context.json')));

                  if (hasRapidKitMarker) {
                    count++;
                    // Detect project type
                    const type = await this._detectProjectType(projectPath);
                    if (type === 'fastapi') {
                      stats_counter.fastapi++;
                    } else if (type === 'nestjs') {
                      stats_counter.nestjs++;
                    }
                  }
                  // Fallback: Check for FastAPI project
                  else if (await fs.pathExists(path.join(projectPath, 'pyproject.toml'))) {
                    count++;
                    stats_counter.fastapi++;
                  }
                  // Fallback: Check for NestJS project
                  else if (await fs.pathExists(path.join(projectPath, 'package.json'))) {
                    try {
                      const pkg = await fs.readJSON(path.join(projectPath, 'package.json'));
                      if (pkg.dependencies?.['@nestjs/core']) {
                        count++;
                        stats_counter.nestjs++;
                      }
                    } catch {
                      // Ignore invalid package.json
                    }
                  }
                }
              }

              projectCount = count;
              projectStats =
                count > 0
                  ? {
                      fastapi: stats_counter.fastapi > 0 ? stats_counter.fastapi : undefined,
                      nestjs: stats_counter.nestjs > 0 ? stats_counter.nestjs : undefined,
                    }
                  : undefined;
            } catch (err) {
              console.error(`Failed to get stats for ${ws.path}:`, err);
            }

            // --- Phase 4 enrichment ---
            let bootstrapProfile:
              | 'minimal'
              | 'python-only'
              | 'node-only'
              | 'go-only'
              | 'polyglot'
              | 'enterprise'
              | undefined;
            let dependencySharingMode:
              | 'isolated'
              | 'shared-runtime-caches'
              | 'shared-node-deps'
              | undefined;
            let policyMode: 'warn' | 'strict' | undefined;
            let complianceStatus: 'passing' | 'failing' | 'unknown' | undefined;
            let mirrorStatus: 'synced' | 'stale' | 'not-configured' | undefined;
            try {
              const manifestPath = path.join(ws.path, '.rapidkit', 'workspace.json');
              if (await fs.pathExists(manifestPath)) {
                const manifest = await fs.readJSON(manifestPath).catch(() => null);
                if (manifest) {
                  bootstrapProfile = manifest.profile;
                }
              }

              const policiesPath = path.join(ws.path, '.rapidkit', 'policies.yml');
              if (await fs.pathExists(policiesPath)) {
                const policyContent = await fs.readFile(policiesPath, 'utf-8');

                const modeMatch = policyContent.match(/^\s*mode:\s*(warn|strict)\s*$/m);
                if (modeMatch && (modeMatch[1] === 'warn' || modeMatch[1] === 'strict')) {
                  policyMode = modeMatch[1];
                }

                const depModeMatch = policyContent.match(
                  /^\s*dependency_sharing_mode:\s*(isolated|shared-runtime-caches|shared-node-deps)\s*$/m
                );
                if (
                  depModeMatch &&
                  (depModeMatch[1] === 'isolated' ||
                    depModeMatch[1] === 'shared-runtime-caches' ||
                    depModeMatch[1] === 'shared-node-deps')
                ) {
                  dependencySharingMode = depModeMatch[1];
                }
              }

              const reportsDir = path.join(ws.path, '.rapidkit', 'reports');
              if (await fs.pathExists(reportsDir)) {
                const reportFiles = await fs.readdir(reportsDir);
                const latestCompliance = reportFiles
                  .filter((f) => f.startsWith('bootstrap-compliance'))
                  .sort()
                  .reverse()[0];
                if (latestCompliance) {
                  const report = await fs
                    .readJSON(path.join(reportsDir, latestCompliance))
                    .catch(() => null);
                  // result field: 'ok' | 'ok_with_warnings' | 'failed'
                  const rawResult = report?.result || report?.status;
                  complianceStatus =
                    rawResult === 'ok' || rawResult === 'ok_with_warnings'
                      ? 'passing'
                      : rawResult === 'failed'
                        ? 'failing'
                        : 'unknown';
                }
                const latestMirror = reportFiles
                  .filter((f) => f.startsWith('mirror-ops'))
                  .sort()
                  .reverse()[0];
                mirrorStatus = latestMirror
                  ? ((await fs.readJSON(path.join(reportsDir, latestMirror)).catch(() => null))
                      ?.status ?? 'not-configured')
                  : 'not-configured';
              }
            } catch {
              // Phase 4 data unavailable — leave as undefined
            }
            // --- End Phase 4 enrichment ---

            return {
              ...ws,
              coreVersion: versionInfo.installed,
              coreLatestVersion: versionInfo.latest,
              coreStatus: versionInfo.status,
              coreLocation: versionInfo.location as 'workspace' | 'global' | 'pipx' | undefined,
              lastModified,
              projectCount,
              projectStats,
              bootstrapProfile,
              dependencySharingMode,
              policyMode,
              complianceStatus,
              mirrorStatus,
            };
          } catch (error) {
            console.error(`Failed to get version info for ${ws.path}:`, error);
            return {
              ...ws,
              coreVersion: undefined,
              coreStatus: 'error' as const,
              coreLocation: undefined,
              bootstrapProfile: undefined,
              dependencySharingMode: undefined,
              policyMode: undefined,
              complianceStatus: undefined,
              mirrorStatus: undefined,
            };
          }
        })
      );

      return enrichedWorkspaces;
    } catch (error) {
      console.error('Failed to get recent workspaces:', error);
      return Promise.resolve([]);
    }
  }

  private async _detectProjectType(
    projectPath: string
  ): Promise<'fastapi' | 'nestjs' | 'go' | null> {
    return WelcomePanel._detectProjectTypeStatic(projectPath);
  }

  static async _detectProjectTypeStatic(
    projectPath: string
  ): Promise<'fastapi' | 'nestjs' | 'go' | null> {
    try {
      // Check for Go indicators
      const goModPath = path.join(projectPath, 'go.mod');
      if (await fs.pathExists(goModPath)) {
        return 'go';
      }

      // Check for FastAPI indicators
      const pyprojectPath = path.join(projectPath, 'pyproject.toml');
      if (await fs.pathExists(pyprojectPath)) {
        const content = await fs.readFile(pyprojectPath, 'utf8');
        if (content.includes('fastapi') || content.includes('uvicorn')) {
          return 'fastapi';
        }
      }

      // Check for NestJS indicators
      const packageJsonPath = path.join(projectPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        const content = await fs.readFile(packageJsonPath, 'utf8');
        if (content.includes('@nestjs/core') || content.includes('@nestjs/common')) {
          return 'nestjs';
        }
      }

      return null;
    } catch {
      return null;
    }
  }

  private _getHtmlContent(context: vscode.ExtensionContext): string {
    // Get URIs for webview resources
    const scriptUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview.js')
    );
    const cssUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'dist', 'webview.css')
    );
    const iconUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'icons', 'rapidkit.svg')
    );
    const fontUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'fonts', 'MuseoModerno-Bold.ttf')
    );
    const fastapiIconUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'icons', 'fastapi.svg')
    );
    const nestjsIconUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'icons', 'nestjs.svg')
    );
    const goIconUri = this._panel.webview.asWebviewUri(
      vscode.Uri.joinPath(context.extensionUri, 'media', 'icons', 'go.svg')
    );

    // Generate nonce for CSP
    const nonce = this._getNonce();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource} 'unsafe-inline'; font-src ${this._panel.webview.cspSource}; img-src ${this._panel.webview.cspSource} https:; script-src 'nonce-${nonce}';">
    <title>Welcome to RapidKit</title>
    <link rel="stylesheet" type="text/css" href="${cssUri}">
    <style>
        @font-face {
            font-family: 'MuseoModerno';
            src: url('${fontUri}') format('truetype');
            font-weight: bold;
            font-style: normal;
        }
        
        /* Inject icon URIs as CSS variables */
        :root {
            --icon-uri: url('${iconUri}');
            --fastapi-icon-uri: url('${fastapiIconUri}');
            --nestjs-icon-uri: url('${nestjsIconUri}');
            --go-icon-uri: url('${goIconUri}');
        }
    </style>
</head>
<body>
    <div id="root"></div>
    <script nonce="${nonce}">
        // Inject URIs for React components to use
        window.ICON_URI = '${iconUri}';
        window.FASTAPI_ICON_URI = '${fastapiIconUri}';
        window.NESTJS_ICON_URI = '${nestjsIconUri}';
        window.GO_ICON_URI = '${goIconUri}';
    </script>
    <script nonce="${nonce}" src="${scriptUri}"></script>
</body>
</html>`;
  }

  private _getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  private async _showModuleDetails(moduleData: any): Promise<void> {
    try {
      let workspacePath: string | undefined;
      if (WelcomePanel._selectedProject) {
        workspacePath = WelcomePanel._selectedProject.path;
      } else if (
        vscode.workspace.workspaceFolders &&
        vscode.workspace.workspaceFolders.length > 0
      ) {
        workspacePath = vscode.workspace.workspaceFolders[0].uri.fsPath;
      }

      const { run } = await import('../../utils/exec.js');

      const rapidkitPath = workspacePath
        ? path.join(workspacePath, '.venv', 'bin', 'rapidkit')
        : 'rapidkit';

      const useWorkspaceRapidkit = workspacePath && (await fs.pathExists(rapidkitPath));
      const command = useWorkspaceRapidkit ? rapidkitPath : 'rapidkit';

      const candidates = [
        moduleData.slug,
        moduleData.id,
        moduleData.slug?.split('/').filter(Boolean).pop(),
      ].filter((value, index, self) => value && self.indexOf(value) === index) as string[];

      console.log('[WelcomePanel] Fetching module info for:', candidates);

      let moduleInfo: any = null;
      let foundMatch = false;

      for (const candidate of candidates) {
        try {
          // Try to get JSON output first
          const jsonResult = await run(command, ['modules', 'info', candidate, '--json'], {
            cwd: workspacePath,
            shell: true,
          });
          if (jsonResult.exitCode === 0 && jsonResult.stdout) {
            try {
              const parsed = JSON.parse(jsonResult.stdout);
              // Merge with moduleData but prefer fresh CLI data
              moduleInfo = { ...moduleData, ...parsed };
              foundMatch = true;
              console.log(
                '[WelcomePanel] Found module info (JSON) for:',
                candidate,
                'version:',
                parsed.version
              );
              console.log('[WelcomePanel] moduleInfo after merge:', {
                name: moduleInfo.display_name,
                version: moduleInfo.version,
                slug: moduleInfo.slug,
              });
              break;
            } catch {
              console.log('[WelcomePanel] Failed to parse JSON for:', candidate);
            }
          }
        } catch {
          console.log('[WelcomePanel] Failed to fetch JSON info for:', candidate);
        }
      }

      if (!foundMatch || !moduleInfo) {
        console.log('[WelcomePanel] Could not fetch module info from CLI, using card data');
        moduleInfo = { ...moduleData };
      }

      // Send module details to React webview for modal display
      console.log('[WelcomePanel] Sending showModuleDetailsModal message:', moduleInfo);
      WelcomePanel.currentPanel?._panel.webview.postMessage({
        command: 'showModuleDetailsModal',
        data: moduleInfo,
      });
    } catch (error) {
      console.error('[WelcomePanel] Error showing module details:', error);
      vscode.window.showErrorMessage('Failed to load module details');
    }
  }

  public dispose() {
    WelcomePanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
