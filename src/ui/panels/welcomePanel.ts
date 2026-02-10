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
import { MODULES, ModuleData } from '../../data/modules';

export class WelcomePanel {
  public static currentPanel: WelcomePanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private static _selectedProject: { name: string; path: string } | null = null;
  private _modulesCatalog: ModuleData[] = MODULES;

  /**
   * Called from extension.ts when user selects a project in the sidebar tree view
   */
  public static async updateWithProject(projectPath: string, projectName: string) {
    console.log('[WelcomePanel] updateWithProject called:', projectName, projectPath);

    WelcomePanel._selectedProject = { name: projectName, path: projectPath };

    if (WelcomePanel.currentPanel) {
      const installedModules = await WelcomePanel._readInstalledModules(projectPath);
      console.log('[WelcomePanel] Found', installedModules.length, 'installed modules');

      WelcomePanel.currentPanel._panel.webview.postMessage({
        command: 'updateWorkspaceStatus',
        data: {
          hasWorkspace: true,
          workspaceName: projectName,
          workspacePath: projectPath,
          installedModules,
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
      WelcomePanel.currentPanel._panel.webview.postMessage({
        command: 'updateWorkspaceStatus',
        data: {
          hasWorkspace: false,
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
            break;
          case 'createWorkspace':
            // Send loading state to webview
            this._panel.webview.postMessage({
              command: 'setCreatingWorkspace',
              data: { isLoading: true },
            });
            try {
              // If workspace name provided from modal, pass it directly
              if (message.data?.name) {
                await vscode.commands.executeCommand('rapidkit.createWorkspace', message.data.name);
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
          case 'openSetup':
            await vscode.commands.executeCommand('rapidkit.openSetup');
            break;
          case 'refreshWorkspaces':
            this._sendRecentWorkspaces();
            break;
          case 'openWorkspaceFolder':
            if (message.data?.path) {
              // Open folder in new window (workspace selection, not project activation)
              const uri = vscode.Uri.file(message.data.path);
              await vscode.commands.executeCommand('vscode.openFolder', uri, {
                forceNewWindow: true,
              });
            }
            break;
          case 'selectWorkspace':
            if (message.data) {
              WelcomePanel._selectedProject = message.data;
              await vscode.commands.executeCommand('rapidkit.selectWorkspace', message.data);
              // Send updated workspace status
              this._sendWorkspaceStatus();
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
    this._sendModulesCatalog();
    this._sendWorkspaceStatus();
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
    const hasWorkspace = WelcomePanel._selectedProject !== null;
    let installedModules: { slug: string; version: string; display_name: string }[] = [];

    if (hasWorkspace && WelcomePanel._selectedProject) {
      installedModules = await WelcomePanel._readInstalledModules(
        WelcomePanel._selectedProject.path
      );
    }

    this._panel.webview.postMessage({
      command: 'updateWorkspaceStatus',
      data: {
        hasWorkspace,
        workspaceName: WelcomePanel._selectedProject?.name,
        workspacePath: WelcomePanel._selectedProject?.path,
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

            return {
              ...ws,
              coreVersion: versionInfo.installed,
              coreStatus: versionInfo.status,
              coreLocation: versionInfo.location as 'workspace' | 'global' | 'pipx' | undefined,
              lastModified,
              projectCount,
              projectStats,
            };
          } catch (error) {
            console.error(`Failed to get version info for ${ws.path}:`, error);
            return {
              ...ws,
              coreVersion: undefined,
              coreStatus: 'error' as const,
              coreLocation: undefined,
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

  private async _detectProjectType(projectPath: string): Promise<'fastapi' | 'nestjs' | null> {
    try {
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

      const moduleInfo: any = { ...moduleData };
      let foundMatch = false;

      for (const candidate of candidates) {
        try {
          const result = await run(command, ['modules', 'info', candidate], {
            cwd: workspacePath,
            shell: true,
          });
          if (result.exitCode === 0 && result.stdout) {
            const match = result.stdout.match(/Module Information[\s\S]*/);
            if (match) {
              moduleInfo.detailedInfo = match[0];
              foundMatch = true;
              console.log('[WelcomePanel] Found module info for:', candidate);
              break;
            }
          }
        } catch {
          console.log('[WelcomePanel] Failed to fetch info for:', candidate);
        }
      }

      if (!foundMatch) {
        console.log('[WelcomePanel] Could not fetch module info from CLI');
      }

      const panel = vscode.window.createWebviewPanel(
        'moduleDetails',
        `${moduleData.display_name || moduleData.name}`,
        vscode.ViewColumn.Beside,
        { enableScripts: true }
      );

      panel.webview.html = this._getModuleDetailsHtml(moduleInfo);
    } catch (error) {
      console.error('[WelcomePanel] Error showing module details:', error);
      vscode.window.showErrorMessage('Failed to load module details');
    }
  }

  private _getModuleDetailsHtml(moduleInfo: any): string {
    const name = moduleInfo.display_name || moduleInfo.name;
    const version = moduleInfo.version || 'N/A';
    const category = moduleInfo.category || 'unknown';
    const description = moduleInfo.description || 'No description available';
    const status = moduleInfo.status || 'stable';
    const dependencies = moduleInfo.dependencies || [];
    const tags = moduleInfo.tags || [];
    const slug = moduleInfo.slug || moduleInfo.id;
    const detailedInfo = moduleInfo.detailedInfo || '';

    // Category icon mapping (same as React ModuleBrowser)
    const categoryIconSvgs: Record<string, string> = {
      ai: '<path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M6 21a3 3 0 0 0 3-3v-1a3 3 0 0 0-6 0v1a3 3 0 0 0 3 3Z"></path><path d="M18 21a3 3 0 0 0 3-3v-1a3 3 0 0 0-6 0v1a3 3 0 0 0 3 3Z"></path>',
      database:
        '<ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>',
      cache: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>',
      auth: '<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path>',
      observability:
        '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>',
      security: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>',
      essentials:
        '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline>',
      billing:
        '<rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line>',
      communication:
        '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>',
      users:
        '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path>',
      tasks:
        '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line>',
      business:
        '<line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line>',
    };

    const iconSvgPath = categoryIconSvgs[category] || categoryIconSvgs['business'];
    const iconSvg = `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#00cfc1" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${iconSvgPath}</svg>`;

    // Parse detailed CLI info if available
    const parsedDetails: any = {};
    if (detailedInfo) {
      // Extract sections from CLI output
      parsedDetails.profiles = this._extractSection(detailedInfo, '🎯 Profiles');
      parsedDetails.features = this._extractSection(detailedInfo, '✨ Features');
      parsedDetails.capabilities = this._extractSection(detailedInfo, '⚡ Capabilities');
      parsedDetails.runtimeDeps = this._extractSection(detailedInfo, '📦 Runtime Dependencies');
      parsedDetails.configuration = this._extractSection(
        detailedInfo,
        '⚙️ Configuration Variables'
      );
      parsedDetails.compatibility = this._extractSection(detailedInfo, '🔄 Compatibility');
      parsedDetails.documentation = this._extractSection(detailedInfo, '📚 Documentation');
      parsedDetails.support = this._extractSection(detailedInfo, '💬 Support');
      parsedDetails.changelog = this._extractSection(detailedInfo, '📝 Changelog');
    }

    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            padding: 0;
            line-height: 1.6;
            overflow-x: hidden;
        }
        .header {
            position: sticky;
            top: 0;
            z-index: 100;
            background: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            padding: 20px;
        }
        .header-content {
            display: flex;
            align-items: center;
            gap: 16px;
        }
        .icon { font-size: 48px; }
        .header-info { flex: 1; }
        .title {
            font-size: 24px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        .meta {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }
        .version {
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }
        .badge {
            display: inline-block;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        .badge.stable { background: #4CAF50; color: white; }
        .badge.beta { background: #FF9800; color: white; }
        .badge.experimental { background: #F44336; color: white; }
        .badge.category {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        
        .tabs {
            display: flex;
            gap: 4px;
            padding: 0 20px;
            background: var(--vscode-editor-background);
            border-bottom: 1px solid var(--vscode-panel-border);
            overflow-x: auto;
            position: sticky;
            top: 89px;
            z-index: 99;
        }
        .tab {
            padding: 12px 20px;
            cursor: pointer;
            border: none;
            background: transparent;
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
            font-weight: 500;
            transition: all 0.2s;
            border-bottom: 2px solid transparent;
            white-space: nowrap;
        }
        .tab:hover {
            color: var(--vscode-foreground);
            background: var(--vscode-list-hoverBackground);
        }
        .tab.active {
            color: #00cfc1;
            border-bottom-color: #00cfc1;
        }
        
        .content {
            padding: 20px;
        }
        .tab-panel {
            display: none;
            animation: fadeIn 0.3s;
        }
        .tab-panel.active {
            display: block;
        }
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .section {
            margin-bottom: 24px;
        }
        .section-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 12px;
            color: #00cfc1;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .description {
            font-size: 14px;
            line-height: 1.6;
            margin-bottom: 16px;
        }
        
        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            margin-top: 12px;
        }
        .tag {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            padding: 6px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .list-item {
            padding: 12px;
            margin-bottom: 8px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            font-size: 13px;
        }
        .list-item-title {
            font-weight: 600;
            margin-bottom: 4px;
        }
        .list-item-desc {
            color: var(--vscode-descriptionForeground);
            font-size: 12px;
        }
        
        .install-command {
            background: var(--vscode-textCodeBlock-background);
            border: 1px solid var(--vscode-panel-border);
            padding: 16px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .copy-btn {
            background: #00cfc1;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12px;
            font-weight: 600;
        }
        .copy-btn:hover { opacity: 0.85; }
        
        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 12px;
        }
        
        .empty-state {
            text-align: center;
            padding: 40px 20px;
            color: var(--vscode-descriptionForeground);
            font-size: 14px;
        }
        
        pre {
            background: var(--vscode-textCodeBlock-background);
            padding: 12px;
            border-radius: 6px;
            overflow-x: auto;
            border: 1px solid var(--vscode-panel-border);
            font-size: 12px;
            white-space: pre-wrap;
            word-wrap: break-word;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="header-content">
            <div class="icon">${iconSvg}</div>
            <div class="header-info">
                <div class="title">${name}</div>
                <div class="meta">
                    <span class="version">v${version}</span>
                    <span class="badge ${status}">${status}</span>
                    <span class="badge category">${category}</span>
                    <span class="badge category">${slug}</span>
                </div>
            </div>
        </div>
    </div>
    
    <div class="tabs">
        <button class="tab active" onclick="switchTab(event, 'overview')">Overview</button>
        <button class="tab" onclick="switchTab(event, 'dependencies')">Dependencies</button>
        <button class="tab" onclick="switchTab(event, 'configuration')">Configuration</button>
        <button class="tab" onclick="switchTab(event, 'profiles')">Profiles</button>
        <button class="tab" onclick="switchTab(event, 'features')">Features</button>
        <button class="tab" onclick="switchTab(event, 'docs')">Documentation</button>
    </div>
    
    <div class="content">
        <!-- Overview Tab -->
        <div id="overview" class="tab-panel active">
            <div class="section">
                <div class="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:6px;">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                    </svg>
                    Description
                </div>
                <div class="description">${description}</div>
            </div>
            
            ${
              tags.length > 0
                ? `
            <div class="section">
                <div class="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:6px;">
                        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                        <line x1="7" y1="7" x2="7.01" y2="7"></line>
                    </svg>
                    Tags
                </div>
                <div class="tags">
                    ${tags.map((tag: string) => `<span class="tag">${tag}</span>`).join('')}
                </div>
            </div>
            `
                : ''
            }
            
            ${
              parsedDetails.capabilities
                ? `
            <div class="section">
                <div class="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:6px;">
                        <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                    Capabilities
                </div>
                <pre>${parsedDetails.capabilities}</pre>
            </div>
            `
                : ''
            }
            
            ${
              parsedDetails.compatibility
                ? `
            <div class="section">
                <div class="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:6px;">
                        <polyline points="23 4 23 10 17 10"></polyline>
                        <polyline points="1 20 1 14 7 14"></polyline>
                        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    Compatibility
                </div>
                <pre>${parsedDetails.compatibility}</pre>
            </div>
            `
                : ''
            }
            
            <div class="section">
                <div class="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:6px;">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Installation
                </div>
                <div class="install-command">
                    <code>rapidkit add module ${slug}</code>
                    <button class="copy-btn" onclick="copyCommand()">Copy</button>
                </div>
            </div>
        </div>
        
        <!-- Dependencies Tab -->
        <div id="dependencies" class="tab-panel">
            ${
              dependencies.length > 0
                ? `
            <div class="section">
                <div class="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:6px;">
                        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                    </svg>
                    Module Dependencies
                </div>
                <div class="tags">
                    ${dependencies.map((dep: string) => `<span class="tag">${dep}</span>`).join('')}
                </div>
            </div>
            `
                : ''
            }
            
            ${
              parsedDetails.runtimeDeps
                ? `
            <div class="section">
                <div class="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:6px;">
                        <line x1="16.5" y1="9.4" x2="7.5" y2="4.21"></line>
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                        <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                        <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                    Runtime Dependencies
                </div>
                <pre>${parsedDetails.runtimeDeps}</pre>
            </div>
            `
                : `<div class="empty-state">No dependencies information available</div>`
            }
        </div>
        
        <!-- Configuration Tab -->
        <div id="configuration" class="tab-panel">
            ${
              parsedDetails.configuration
                ? `
            <div class="section">
                <div class="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:6px;">
                        <circle cx="12" cy="12" r="3"></circle>
                        <path d="M12 1v6m0 6v6m5.196-11.196l-4.242 4.242m-4.242 0L4.804 4.804M1 12h6m6 0h6m-11.196 5.196l4.242-4.242m4.242 0l4.242 4.242"></path>
                    </svg>
                    Environment Variables
                </div>
                <pre>${parsedDetails.configuration}</pre>
            </div>
            `
                : `<div class="empty-state">No configuration variables available</div>`
            }
        </div>
        
        <!-- Profiles Tab -->
        <div id="profiles" class="tab-panel">
            ${
              parsedDetails.profiles
                ? `
            <div class="section">
                <div class="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:6px;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <circle cx="12" cy="12" r="6"></circle>
                        <circle cx="12" cy="12" r="2"></circle>
                    </svg>
                    Installation Profiles
                </div>
                <pre>${parsedDetails.profiles}</pre>
            </div>
            `
                : `<div class="empty-state">No profiles information available</div>`
            }
        </div>
        
        <!-- Features Tab -->
        <div id="features" class="tab-panel">
            ${
              parsedDetails.features
                ? `
            <div class="section">
                <div class="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:6px;">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"></path>
                        <path d="M5 3v4"></path>
                        <path d="M19 17v4"></path>
                        <path d="M3 5h4"></path>
                        <path d="M17 19h4"></path>
                    </svg>
                    Module Features
                </div>
                <pre>${parsedDetails.features}</pre>
            </div>
            `
                : `<div class="empty-state">No features information available</div>`
            }
        </div>
        
        <!-- Documentation Tab -->
        <div id="docs" class="tab-panel">
            ${
              parsedDetails.documentation
                ? `
            <div class="section">
                <div class="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:6px;">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                    </svg>
                    Documentation
                </div>
                <pre>${parsedDetails.documentation}</pre>
            </div>
            `
                : ''
            }
            
            ${
              parsedDetails.support
                ? `
            <div class="section">
                <div class="section-title">💬 Support</div>
                <pre>${parsedDetails.support}</pre>
            </div>
            `
                : ''
            }
            
            ${
              parsedDetails.changelog
                ? `
            <div class="section">
                <div class="section-title">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block; vertical-align:middle; margin-right:6px;">
                        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                    Changelog
                </div>
                <pre>${parsedDetails.changelog}</pre>
            </div>
            `
                : ''
            }
            
            ${
              !parsedDetails.documentation && !parsedDetails.support && !parsedDetails.changelog
                ? `<div class="empty-state">No documentation available</div>`
                : ''
            }
        </div>
    </div>
    
    <script>
        function switchTab(event, tabId) {
            // Hide all panels
            document.querySelectorAll('.tab-panel').forEach(panel => {
                panel.classList.remove('active');
            });
            
            // Deactivate all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected panel
            document.getElementById(tabId).classList.add('active');
            
            // Activate clicked tab
            event.target.classList.add('active');
        }
        
        function copyCommand() {
            const command = 'rapidkit add module ${slug}';
            navigator.clipboard.writeText(command).then(() => {
                const btn = event.target;
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = 'Copy', 2000);
            });
        }
    </script>
</body>
</html>`;
  }

  private _extractSection(text: string, sectionHeader: string): string {
    const lines = text.split('\n');
    const startIndex = lines.findIndex((line) => line.includes(sectionHeader));
    if (startIndex === -1) {
      return '';
    }

    // Check if line starts with emoji followed by space
    const nextSectionIndex = lines.findIndex((line, idx) => {
      if (idx <= startIndex) {
        return false;
      }
      // Check if line starts with emoji marker (common Unicode ranges for emoji)
      const trimmed = line.trimStart();
      return trimmed.length > 0 && /^[\p{Emoji}\p{Emoji_Component}]\s/u.test(trimmed);
    });

    const endIndex = nextSectionIndex === -1 ? lines.length : nextSectionIndex;
    return lines
      .slice(startIndex + 1, endIndex)
      .join('\n')
      .trim();
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
