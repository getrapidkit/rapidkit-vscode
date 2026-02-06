/**
 * Welcome Panel
 * Webview panel showing welcome page with quick actions
 */

import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';
import { WorkspaceManager } from '../../core/workspaceManager';
import { MODULES, CATEGORY_INFO, getTotalModuleCount } from '../../data/modules';

export class WelcomePanel {
  public static currentPanel: WelcomePanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private static _selectedProject: { name: string; path: string } | null = null;
  private static _workspaceStatusSeq = 0;

  private static _getNextWorkspaceStatusSeq(): number {
    WelcomePanel._workspaceStatusSeq += 1;
    return WelcomePanel._workspaceStatusSeq;
  }

  private constructor(panel: vscode.WebviewPanel, context: vscode.ExtensionContext) {
    this._panel = panel;

    // Set webview content
    this._panel.webview.html = this._getHtmlContent(context);

    // Handle messages from webview
    this._panel.webview.onDidReceiveMessage(
      async (message) => {
        switch (message.command) {
          case 'createWorkspace':
            vscode.commands.executeCommand('rapidkit.createWorkspace');
            break;
          case 'createFastAPIProject':
            vscode.commands.executeCommand('rapidkit.createFastAPIProject');
            break;
          case 'createNestJSProject':
            vscode.commands.executeCommand('rapidkit.createNestJSProject');
            break;
          case 'doctor':
            vscode.commands.executeCommand('rapidkit.doctor');
            break;
          case 'browseModules':
            vscode.commands.executeCommand('rapidkitModules.focus');
            break;
          case 'openDocs':
            vscode.env.openExternal(vscode.Uri.parse('https://getrapidkit.com/docs'));
            break;
          case 'openGitHub':
            vscode.env.openExternal(
              vscode.Uri.parse('https://github.com/getrapidkit/rapidkit-vscode')
            );
            break;
          case 'openMarketplace':
            vscode.env.openExternal(
              vscode.Uri.parse(
                'https://marketplace.visualstudio.com/items?itemName=rapidkit.rapidkit-vscode'
              )
            );
            break;
          case 'openNpmPackage':
            vscode.env.openExternal(vscode.Uri.parse('https://www.npmjs.com/package/rapidkit'));
            break;
          case 'openPyPI':
            vscode.env.openExternal(vscode.Uri.parse('https://pypi.org/project/rapidkit-core/'));
            break;
          case 'openSetup':
            vscode.commands.executeCommand('rapidkit.openSetup');
            break;
          case 'installNpmGlobal': {
            const terminal = vscode.window.createTerminal('Install RapidKit CLI');
            terminal.show();
            terminal.sendText('npm install -g rapidkit');
            // Auto-refresh after 8 seconds
            setTimeout(async () => {
              const newStatus = await this._checkInstallationStatus();
              this._panel.webview.postMessage({
                command: 'statusUpdate',
                status: newStatus,
              });
            }, 8000);
            break;
          }
          case 'upgradeNpmGlobal': {
            const terminal = vscode.window.createTerminal('Upgrade RapidKit CLI');
            terminal.show();
            terminal.sendText('npm install -g rapidkit@latest');
            // Auto-refresh after 8 seconds
            setTimeout(async () => {
              const newStatus = await this._checkInstallationStatus();
              this._panel.webview.postMessage({
                command: 'statusUpdate',
                status: newStatus,
              });
            }, 8000);
            break;
          }
          case 'installPipCore': {
            const terminalPip = vscode.window.createTerminal('Install RapidKit Core');
            terminalPip.show();
            terminalPip.sendText('pipx install --force rapidkit-core');
            // Auto-refresh after 10 seconds
            setTimeout(async () => {
              const newStatus = await this._checkInstallationStatus();
              this._panel.webview.postMessage({
                command: 'statusUpdate',
                status: newStatus,
              });
            }, 10000);
            break;
          }
          case 'upgradePipCore': {
            const terminalPip = vscode.window.createTerminal('Upgrade RapidKit Core');
            terminalPip.show();
            terminalPip.sendText('pipx upgrade rapidkit-core');
            // Auto-refresh after 10 seconds
            setTimeout(async () => {
              const newStatus = await this._checkInstallationStatus();
              this._panel.webview.postMessage({
                command: 'statusUpdate',
                status: newStatus,
              });
            }, 10000);
            break;
          }
          case 'installPoetry': {
            const terminalPoetry = vscode.window.createTerminal('Install Poetry');
            terminalPoetry.show();
            if (process.platform === 'win32') {
              terminalPoetry.sendText(
                '(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -'
              );
            } else {
              terminalPoetry.sendText('curl -sSL https://install.python-poetry.org | python3 -');
            }
            // Auto-refresh after 12 seconds
            setTimeout(async () => {
              const newStatus = await this._checkInstallationStatus();
              this._panel.webview.postMessage({
                command: 'statusUpdate',
                status: newStatus,
              });
            }, 12000);
            break;
          }
          case 'installPipx': {
            const terminalPipx = vscode.window.createTerminal('Install pipx');
            terminalPipx.show();
            if (process.platform === 'win32') {
              terminalPipx.sendText(
                'python -m pip install --user pipx && python -m pipx ensurepath'
              );
            } else {
              terminalPipx.sendText(
                'python3 -m pip install --user pipx && python3 -m pipx ensurepath'
              );
            }
            vscode.window.showInformationMessage(
              'pipx installed. Please restart your terminal or VS Code for PATH changes to take effect.'
            );
            // Auto-refresh after 8 seconds
            setTimeout(async () => {
              const newStatus = await this._checkInstallationStatus();
              this._panel.webview.postMessage({
                command: 'statusUpdate',
                status: newStatus,
              });
            }, 8000);
            break;
          }
          case 'installPipxThenCore': {
            const terminal = vscode.window.createTerminal('Setup RapidKit Toolchain');
            terminal.show();
            if (process.platform === 'win32') {
              terminal.sendText(
                'python -m pip install --user pipx && python -m pipx ensurepath && pipx install --force rapidkit-core'
              );
            } else {
              terminal.sendText(
                'python3 -m pip install --user pipx && python3 -m pipx ensurepath && pipx install --force rapidkit-core'
              );
            }
            vscode.window.showInformationMessage(
              'Installing pipx and RapidKit Core. Please wait...'
            );
            // Auto-refresh after 15 seconds (longer chain command)
            setTimeout(async () => {
              const newStatus = await this._checkInstallationStatus();
              this._panel.webview.postMessage({
                command: 'statusUpdate',
                status: newStatus,
              });
            }, 15000);
            break;
          }
          case 'installCoreFallback': {
            const answer = await vscode.window.showWarningMessage(
              'pipx not found. Install RapidKit Core with pip --user instead? (fallback mode)',
              'Install with pip',
              'Cancel'
            );
            if (answer === 'Install with pip') {
              const terminal = vscode.window.createTerminal('Install RapidKit Core (fallback)');
              terminal.show();
              if (process.platform === 'win32') {
                terminal.sendText('python -m pip install --user rapidkit-core');
              } else {
                terminal.sendText('python3 -m pip install --user rapidkit-core');
              }
              vscode.window.showWarningMessage(
                'RapidKit Core installed via pip. This may conflict with virtualenvs. Consider installing pipx later.'
              );
              // Auto-refresh after 10 seconds
              setTimeout(async () => {
                const newStatus = await this._checkInstallationStatus();
                this._panel.webview.postMessage({
                  command: 'statusUpdate',
                  status: newStatus,
                });
              }, 10000);
            }
            break;
          }
          case 'installBoth': {
            const terminalBoth = vscode.window.createTerminal('Install RapidKit');
            terminalBoth.show();
            terminalBoth.sendText('npm install -g rapidkit && pipx install rapidkit-core');
            // Auto-refresh after 15 seconds
            setTimeout(async () => {
              const newStatus = await this._checkInstallationStatus();
              this._panel.webview.postMessage({
                command: 'statusUpdate',
                status: newStatus,
              });
            }, 15000);
            break;
          }
          case 'upgradeBoth': {
            const terminalBoth = vscode.window.createTerminal('Upgrade RapidKit');
            terminalBoth.show();
            terminalBoth.sendText('npm install -g rapidkit@latest && pipx upgrade rapidkit-core');
            // Auto-refresh after 15 seconds
            setTimeout(async () => {
              const newStatus = await this._checkInstallationStatus();
              this._panel.webview.postMessage({
                command: 'statusUpdate',
                status: newStatus,
              });
            }, 15000);
            break;
          }
          case 'showInfo': {
            vscode.window.showInformationMessage(message.message);
            break;
          }
          case 'openUrl': {
            vscode.env.openExternal(vscode.Uri.parse(message.url));
            break;
          }
          case 'checkInstallStatus': {
            const status = await this._checkInstallationStatus();
            this._panel.webview.postMessage({ command: 'installStatusUpdate', data: status });
            break;
          }
          case 'openWorkspace': {
            const workspacePath = message.path;
            if (workspacePath) {
              const uri = vscode.Uri.file(workspacePath);
              await vscode.commands.executeCommand('vscode.openFolder', uri, {
                forceNewWindow: false,
              });
            }
            break;
          }
          case 'refreshWorkspaces': {
            const workspaces = this._getRecentWorkspaces();
            this._panel.webview.postMessage({ command: 'workspacesUpdate', data: workspaces });
            break;
          }
          case 'showWelcome':
            WelcomePanel.createOrShow(context);
            break;
          case 'installModuleFromWelcome': {
            const moduleId = message.moduleId;
            const moduleName = message.moduleName;

            console.log('[Backend] Install module request:', moduleId, moduleName);

            // Find module from MODULES data to get correct slug
            const moduleData = MODULES.find((m) => m.id === moduleId);

            // Create module object with slug for addModule command
            const moduleObj: any = {
              id: moduleId,
              name: moduleId,
              displayName: moduleName,
              version: moduleData?.version || '0.1.0',
              description: moduleData?.description || '',
              category: moduleData?.category || 'unknown',
              status: moduleData?.status || 'stable',
              tags: moduleData?.tags || [],
              dependencies: moduleData?.dependencies || [],
              installed: false,
              slug: moduleData?.slug || `unknown/${moduleId}`, // Use slug from module data
            };

            // Use the addModule command which handles everything properly
            vscode.commands.executeCommand('rapidkit.addModule', moduleObj);
            break;
          }
          case 'checkWorkspace': {
            // Check and update workspace status
            await this._checkAndUpdateWorkspace();
            break;
          }
          case 'refreshModules': {
            console.log('[Backend] Refresh modules requested');
            // Re-check workspace and send updated installed modules
            await this._checkAndUpdateWorkspace();
            break;
          }
          case 'installModule': {
            const moduleName = message.moduleName;
            const workspacePath = message.workspacePath;

            // Validate workspace path exists
            if (!workspacePath) {
              vscode.window.showErrorMessage('Please open a RapidKit workspace first!');
              break;
            }

            // Open terminal and run install command
            const terminal = vscode.window.createTerminal(`Install ${moduleName}`);
            terminal.show();
            terminal.sendText(`cd "${workspacePath}" && rapidkit add module ${moduleName}`);
            break;
          }
        }
      },
      null,
      this._disposables
    );

    // Listen for workspace folder changes (when user switches projects)
    vscode.workspace.onDidChangeWorkspaceFolders(
      async () => {
        console.log('[WelcomePanel] Workspace folders changed - clearing selected project');
        // Clear manually selected project when workspace changes
        WelcomePanel._selectedProject = null;
        // Immediately check workspace when folders change
        await this._checkAndUpdateWorkspace();
      },
      null,
      this._disposables
    );

    // Initial workspace check (fire and forget, but without awaiting in constructor)
    // Use setImmediate to run after constructor completes
    setImmediate(() => this._checkAndUpdateWorkspace());

    // Initial installation status check - send to webview immediately after panel is ready
    setImmediate(async () => {
      const status = await this._checkInstallationStatus();
      this._panel.webview.postMessage({ command: 'installStatusUpdate', data: status });
    });

    // Clean up when panel is closed
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public static createOrShow(context: vscode.ExtensionContext) {
    // If panel exists, show it and update workspace status
    if (WelcomePanel.currentPanel) {
      WelcomePanel.currentPanel._panel.reveal();
      // Refresh workspace status when panel is shown (don't await, but it will update UI when ready)
      WelcomePanel.currentPanel
        ._checkAndUpdateWorkspace()
        .catch((err) => console.error('[Backend] Error checking workspace:', err));
      return;
    }

    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'rapidkitWelcome',
      '🚀 Welcome to RapidKit',
      vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    WelcomePanel.currentPanel = new WelcomePanel(panel, context);
  }

  /**
   * Update Welcome Panel with selected project info
   */
  public static async updateWithProject(projectPath: string, projectName: string) {
    console.log('[WelcomePanel] ========== updateWithProject CALLED ==========');
    console.log('[WelcomePanel] Project:', projectName);
    console.log('[WelcomePanel] Path:', projectPath);
    const seq = WelcomePanel._getNextWorkspaceStatusSeq();

    // Store selected project
    WelcomePanel._selectedProject = { name: projectName, path: projectPath };
    console.log('[WelcomePanel] Stored in _selectedProject:', WelcomePanel._selectedProject);

    if (WelcomePanel.currentPanel) {
      console.log('[WelcomePanel] ✅ currentPanel exists, reading installed modules...');

      // Read installed modules from registry.json
      const installedModules = await WelcomePanel.currentPanel._getInstalledModules(projectPath);
      console.log('[WelcomePanel] Found', installedModules.length, 'installed modules');

      if (
        seq !== WelcomePanel._workspaceStatusSeq ||
        !WelcomePanel._selectedProject ||
        WelcomePanel._selectedProject.path !== projectPath
      ) {
        console.log('[WelcomePanel] ⏭️ Skipping stale workspaceStatus for:', projectPath);
        return;
      }

      // Send project info to frontend
      WelcomePanel.currentPanel._panel.webview.postMessage({
        command: 'workspaceStatus',
        workspace: {
          name: projectName,
          path: projectPath,
        },
        installedModules: installedModules,
        seq,
      });
      console.log('[WelcomePanel] ✅ Message sent to webview');
    } else {
      console.log('[WelcomePanel] ❌ No currentPanel - message not sent');
    }
    console.log('[WelcomePanel] ========== updateWithProject END ==========');
  }

  /**
   * Clear selected project and update UI to show "No Project Selected"
   */
  public static clearSelectedProject() {
    console.log('[WelcomePanel] ========== clearSelectedProject CALLED ==========');

    // Clear selected project
    WelcomePanel._selectedProject = null;
    console.log('[WelcomePanel] Cleared _selectedProject');

    if (WelcomePanel.currentPanel) {
      console.log('[WelcomePanel] ✅ currentPanel exists, sending null workspace...');
      // Send null workspace to frontend
      WelcomePanel.currentPanel._panel.webview.postMessage({
        command: 'workspaceStatus',
        workspace: null,
      });
      console.log('[WelcomePanel] ✅ Null message sent to webview');
    } else {
      console.log('[WelcomePanel] ❌ No currentPanel - message not sent');
    }
    console.log('[WelcomePanel] ========== clearSelectedProject END ==========');
  }

  /**
   * Read installed modules from registry.json
   */
  private async _getInstalledModules(
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
      console.error('[Backend] ❌ Error reading registry.json:', error);
    }
    return [];
  }

  /**
   * Check if a folder is a RapidKit workspace/project (user projects only, not the core engine)
   */
  private async _isRapidKitProject(folderPath: string): Promise<boolean> {
    try {
      console.log('[Backend] Checking folder:', folderPath);

      // Check for .rapidkit-workspace marker (workspace created by CLI)
      const markerPath = path.join(folderPath, '.rapidkit-workspace');
      if (await fs.pathExists(markerPath)) {
        console.log('[Backend] ✓ Found .rapidkit-workspace marker');
        return true;
      }

      // Check for .rapidkit directory (project with modules installed)
      const rapidkitDir = path.join(folderPath, '.rapidkit');
      if (await fs.pathExists(rapidkitDir)) {
        console.log('[Backend] ✓ Found .rapidkit directory');
        return true;
      }

      // Check for pyproject.toml
      const pyprojectPath = path.join(folderPath, 'pyproject.toml');
      if (await fs.pathExists(pyprojectPath)) {
        console.log('[Backend] Found pyproject.toml, checking content...');
        const content = await fs.readFile(pyprojectPath, 'utf-8');

        // Exclude the rapidkit-core engine itself
        if (content.includes('name = "rapidkit-core"')) {
          console.log('[Backend] ✗ This is rapidkit-core engine, excluding it');
          return false;
        }

        // Accept projects that depend on rapidkit
        if (content.includes('rapidkit-core') || content.includes('rapidkit-')) {
          console.log('[Backend] ✓ Found rapidkit dependency in pyproject.toml');
          return true;
        }

        // Check if it has any Python dependencies at all (fallback for basic projects)
        if (content.includes('[tool.poetry.dependencies]') || content.includes('[project]')) {
          console.log('[Backend] ✓ Found poetry/project config (assuming RapidKit project)');
          return true;
        }
      }

      // Check for package.json (for JS/TS projects)
      const packageJsonPath = path.join(folderPath, 'package.json');
      if (await fs.pathExists(packageJsonPath)) {
        console.log('[Backend] Found package.json, checking content...');
        const content = await fs.readFile(packageJsonPath, 'utf-8');
        if (content.includes('rapidkit') || content.includes('@rapidkit')) {
          console.log('[Backend] ✓ Found rapidkit dependency in package.json');
          return true;
        }
      }

      console.log('[Backend] ✗ No RapidKit markers found in:', folderPath);
      return false;
    } catch (error) {
      console.error('[Backend] Error checking RapidKit project:', error);
      return false;
    }
  }

  /**
   * Check current workspace and update webview
   */
  private async _checkAndUpdateWorkspace(): Promise<void> {
    const seq = WelcomePanel._getNextWorkspaceStatusSeq();
    // If user has manually selected a project, use that
    if (WelcomePanel._selectedProject) {
      console.log('[Backend] Using manually selected project:', WelcomePanel._selectedProject);

      // Read installed modules
      const installedModules = await this._getInstalledModules(WelcomePanel._selectedProject.path);
      console.log(
        '[Backend] 📦 Found',
        installedModules.length,
        'installed modules in selected project'
      );
      console.log('[Backend] 📋 installedModules data:', JSON.stringify(installedModules, null, 2));

      if (seq !== WelcomePanel._workspaceStatusSeq || !WelcomePanel._selectedProject) {
        console.log('[Backend] ⏭️ Skipping stale workspaceStatus for selected project');
        return;
      }

      console.log('[Backend] 📤 Sending workspaceStatus message to frontend');
      this._panel.webview.postMessage({
        command: 'workspaceStatus',
        workspace: WelcomePanel._selectedProject,
        installedModules: installedModules,
        seq,
      });
      console.log('[Backend] ✅ Message sent successfully');
      return;
    }

    // Otherwise check VS Code workspace folders
    const workspaceFolders = vscode.workspace.workspaceFolders;
    console.log(
      '[Backend] Checking workspace. Folders:',
      workspaceFolders?.map((f) => f.uri.fsPath)
    );

    if (workspaceFolders && workspaceFolders.length > 0) {
      const folder = workspaceFolders[0];
      const folderPath = folder.uri.fsPath;

      console.log('[Backend] Checking if RapidKit project:', folderPath);
      // Validate if this is a RapidKit workspace/project
      const isRapidKit = await this._isRapidKitProject(folderPath);
      console.log('[Backend] Is RapidKit project:', isRapidKit);

      if (isRapidKit) {
        console.log('[Backend] Sending valid workspace to frontend');

        // Read installed modules
        const installedModules = await this._getInstalledModules(folderPath);
        console.log('[Backend] Found', installedModules.length, 'installed modules');

        this._panel.webview.postMessage({
          command: 'workspaceStatus',
          workspace: {
            name: folder.name,
            path: folderPath,
          },
          installedModules: installedModules,
          seq,
        });
      } else {
        // Not a RapidKit project - show as no workspace
        console.log('[Backend] Not a RapidKit project, sending null');
        this._panel.webview.postMessage({
          command: 'workspaceStatus',
          workspace: null,
          seq,
        });
      }
    } else {
      console.log('[Backend] No workspace folders found');
      this._panel.webview.postMessage({
        command: 'workspaceStatus',
        workspace: null,
        seq,
      });
    }
  }

  public static refresh(context: vscode.ExtensionContext) {
    if (WelcomePanel.currentPanel) {
      WelcomePanel.currentPanel._panel.webview.html =
        WelcomePanel.currentPanel._getHtmlContent(context);
    }
  }

  /**
   * Generate filter buttons from available categories
   */
  private _generateFilterButtons(): string {
    const categories = Array.from(new Set(MODULES.map((m) => m.category)));

    const buttons = [
      '<button class="filter-btn active" onclick="filterByCategory(\'all\')">All</button>',
    ];

    categories.forEach((cat) => {
      const info = CATEGORY_INFO[cat as keyof typeof CATEGORY_INFO];
      if (info) {
        buttons.push(
          `<button class="filter-btn" onclick="filterByCategory('${cat}')">${info.name}</button>`
        );
      }
    });

    return buttons.join('\n                    ');
  }

  /**
   * Generate HTML for module cards from data
   */
  private _generateModulesHTML(): string {
    return MODULES.map((module) => {
      const categoryInfo = CATEGORY_INFO[module.category as keyof typeof CATEGORY_INFO];
      const badgeLabel = categoryInfo?.name || module.category;

      return `
                <div class="module-card" data-category="${module.category}" data-name="${module.name}" data-module-slug="${module.slug}">
                    <div class="module-header">
                        <span class="module-icon">${module.icon}</span>
                        <div class="module-info">
                            <div class="module-name">${module.name}</div>
                            <div class="module-version">v${module.version}</div>
                        </div>
                        <span class="module-badge ${module.category}">${badgeLabel}</span>
                    </div>
                    <div class="module-desc">${module.description}</div>
                    <div class="module-actions">
                      <button class="module-install-btn" data-module-id="${module.id}" data-module-slug="${module.slug}" data-module-name="${module.name}" disabled>
                        <span>⚡</span> Install
                      </button>
                        <button class="module-copy-btn" onclick="copyCommand(this, 'rapidkit add module ${module.slug}')">🖥️ Manual install</button>
                    </div>
                </div>`;
    }).join('\n');
  }

  private _getHtmlContent(context: vscode.ExtensionContext): string {
    // Get URIs for webview
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

    // Get version from package.json
    const extension = vscode.extensions.getExtension('rapidkit.rapidkit-vscode');
    const version = extension?.packageJSON?.version || '0.4.5';

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to RapidKit</title>
    <style>
        @font-face {
            font-family: 'MuseoModerno';
            src: url('${fontUri}') format('truetype');
            font-weight: 700;
            font-style: normal;
        }
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
            min-height: 100vh;
            padding: 20px 16px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 20px;
        }
        .logo {
            width: 48px;
            height: 48px;
            margin-bottom: 8px;
            animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        h1 {
            font-family: 'MuseoModerno', var(--vscode-font-family);
            font-size: 1.4rem;
            font-weight: 700;
            margin-bottom: 4px;
            letter-spacing: -0.5px;
        }
        h1 .rapid {
            background: linear-gradient(135deg, #00cfc1, #009688);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        h1 .kit {
            color: var(--vscode-foreground);
        }
        .tagline {
            font-size: 0.85rem;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 6px;
            line-height: 1.3;
        }
        .version {
            display: inline-block;
            background: linear-gradient(135deg, #00cfc1, #009688);
            color: white;
            padding: 4px 14px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
        }
        
        .actions {
            margin-bottom: 24px;
        }
        
        /* Hero Action */
        .hero-action {
            background: linear-gradient(135deg, rgba(0,207,193,0.08), rgba(0,150,136,0.08));
            border: 1px solid var(--vscode-panel-border);
            border-radius: 12px;
            padding: 20px 24px;
            text-align: center;
            margin-bottom: 16px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            cursor: pointer;
            position: relative;
            overflow: hidden;
        }
        .hero-action::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, #00cfc1, #009688);
            opacity: 0;
            transition: opacity 0.3s;
        }
        .hero-action:hover {
            border-color: #00cfc1;
            transform: translateY(-2px);
            box-shadow: 0 8px 24px rgba(0,207,193,0.2);
        }
        .hero-action:hover::before {
            opacity: 1;
        }
        .hero-icon {
            font-size: 28px;
            margin-bottom: 8px;
            display: inline-block;
            animation: float 3s ease-in-out infinite;
        }
        .hero-title {
            font-family: 'MuseoModerno', var(--vscode-font-family);
            font-size: 16px;
            font-weight: 700;
            margin-bottom: 4px;
        }
        .hero-description {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 12px;
            line-height: 1.3;
        }
        .hero-badge {
            display: inline-block;
            background: linear-gradient(135deg, #00cfc1, #009688);
            color: white;
            padding: 6px 16px;
            border-radius: 20px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        
        /* Quick Links Grid */
        .quick-links {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
            gap: 10px;
        }
        .quick-link {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 16px 12px;
            cursor: pointer;
            transition: all 0.2s ease;
            text-align: center;
        }
        .quick-link:hover {
            border-color: var(--link-color, #00cfc1);
            background: var(--vscode-list-hoverBackground);
            transform: translateY(-2px);
        }
        .quick-link.fastapi { --link-color: #009688; }
        .quick-link.nestjs { --link-color: #E0234E; }
        .quick-link.modules { --link-color: #9C27B0; }
        .quick-link.doctor { --link-color: #FF9800; }
        .quick-link.welcome { --link-color: #00cfc1; }
        
        .quick-link-icon {
            font-size: 24px;
            margin-bottom: 8px;
            display: block;
        }
        .quick-link-icon img {
            width: 24px;
            height: 24px;
        }
        .quick-link-title {
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 3px;
        }
        .quick-link-subtitle {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
        }
        .quick-link-badge {
            display: inline-block;
            background: var(--link-color, #00cfc1);
            color: white;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 9px;
            font-weight: 700;
            margin-top: 6px;
        }

        .section {
            margin-bottom: 28px;
        }
        .section-title {
            font-family: 'MuseoModerno', var(--vscode-font-family);
            font-size: 1rem;
            font-weight: 700;
            margin-bottom: 14px;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
        }
        .feature {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 10px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 8px;
            font-size: 12px;
            border: 1px solid transparent;
            transition: all 0.2s;
        }
        .feature:hover {
            border-color: #00cfc1;
            background: rgba(0, 207, 193, 0.05);
        }
        .feature-icon {
            font-size: 16px;
            flex-shrink: 0;
        }
        
        .shortcuts {
            display: flex;
            justify-content: center;
            gap: 24px;
            flex-wrap: wrap;
            margin-top: 16px;
        }
        .shortcut {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .kbd {
            background: var(--vscode-button-secondaryBackground);
            padding: 3px 6px;
            border-radius: 3px;
            font-family: monospace;
            font-size: 10px;
            border: 1px solid var(--vscode-panel-border);
        }

        /* Command Reference Styles */
        .command-reference {
            margin-bottom: 30px;
        }

        /* Recent Workspaces Styles */
        .recent-workspaces {
            margin-bottom: 30px;
        }
        .workspace-list {
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .workspace-item {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 14px 16px;
            cursor: pointer;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 14px;
        }
        .workspace-item:hover {
            border-color: #00cfc1;
            background: var(--vscode-list-hoverBackground);
            transform: translateX(4px);
        }
        .workspace-icon {
            font-size: 24px;
            line-height: 1;
            flex-shrink: 0;
        }
        .workspace-info {
            flex: 1;
            min-width: 0;
        }
        .workspace-name {
            font-weight: 600;
            font-size: 13px;
            margin-bottom: 4px;
            color: var(--vscode-foreground);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        .workspace-meta {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            display: flex;
            align-items: center;
            gap: 12px;
        }
        .workspace-path {
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            opacity: 0.7;
        }
        .workspace-badge {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 600;
        }
        .workspace-empty {
            text-align: center;
            padding: 32px;
            color: var(--vscode-descriptionForeground);
            font-size: 13px;
        }
        .workspace-empty-icon {
            font-size: 48px;
            margin-bottom: 12px;
            opacity: 0.3;
        }

        .command-reference {
            margin-bottom: 30px;
        }
        .command-category {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            margin-bottom: 12px;
            overflow: hidden;
        }
        .category-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 14px 16px;
            cursor: pointer;
            transition: all 0.2s;
            user-select: none;
        }
        .category-header:hover {
            background: var(--vscode-list-hoverBackground);
        }
        .category-title {
            display: flex;
            align-items: center;
            gap: 10px;
            font-weight: 600;
            font-size: 13px;
        }
        .category-icon {
            font-size: 18px;
        }
        .category-count {
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 11px;
            font-weight: 700;
        }
        .category-toggle {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            transition: transform 0.3s;
        }
        .category-header.expanded .category-toggle {
            transform: rotate(180deg);
        }
        .category-content {
            max-height: 0;
            overflow: hidden;
            transition: max-height 0.3s ease-out;
        }
        .category-content.expanded {
            max-height: 2000px;
        }
        .command-list {
            padding: 0 16px 16px 16px;
        }
        .command-item {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            padding: 12px;
            margin-bottom: 8px;
            transition: all 0.2s;
        }
        .command-item:hover {
            border-color: #00cfc1;
            box-shadow: 0 2px 8px rgba(0,207,193,0.15);
        }
        .command-header {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 12px;
            margin-bottom: 6px;
        }
        .command-code {
            flex: 1;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            background: var(--vscode-textCodeBlock-background);
            padding: 8px 10px;
            border-radius: 4px;
            color: #00cfc1;
            word-break: break-all;
            line-height: 1.4;
        }
        .command-copy {
            background: var(--vscode-button-secondaryBackground);
            border: 1px solid var(--vscode-panel-border);
            color: var(--vscode-button-secondaryForeground);
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
            white-space: nowrap;
            font-weight: 500;
        }
        .command-copy:hover {
            background: #00cfc1;
            color: white;
            border-color: #00cfc1;
        }
        .command-copy.copied {
            background: #4CAF50;
            color: white;
            border-color: #4CAF50;
        }
        .command-desc {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.4;
        }

        .footer {
            text-align: center;
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        .footer-links {
            display: flex;
            justify-content: center;
            gap: 24px;
            margin-bottom: 16px;
        }
        .footer-link {
            color: #00cfc1;
            text-decoration: none;
            font-size: 13px;
            display: flex;
            align-items: center;
            gap: 6px;
            cursor: pointer;
            transition: opacity 0.2s;
        }
        .footer-link:hover {
            opacity: 0.8;
        }
        .copyright {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .copyright .heart {
            color: #E0234E;
        }

        /* Module Browser Styles */
        .module-browser {
            margin-bottom: 30px;
        }
        .module-stats {
            display: flex;
            gap: 12px;
            align-items: center;
        }
        .module-count {
            font-size: 12px;
            background: rgba(0,207,193,0.1);
            padding: 4px 12px;
            border-radius: 12px;
            font-weight: 600;
            color: #00cfc1;
        }
        
        /* Workspace Warning & Info */
        .workspace-warning {
            background: linear-gradient(135deg, rgba(255,152,0,0.1), rgba(251,140,0,0.1));
            border: 2px solid #FF9800;
            border-radius: 10px;
            padding: 16px;
            margin-bottom: 16px;
            display: flex;
            gap: 14px;
            align-items: flex-start;
        }
        .workspace-warning.hidden {
            display: none;
        }
        .warning-icon {
            font-size: 32px;
            line-height: 1;
        }
        .warning-content {
            flex: 1;
        }
        .warning-title {
            font-size: 15px;
            font-weight: 700;
            color: #FF9800;
            margin-bottom: 4px;
        }
        .warning-desc {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 10px;
            line-height: 1.4;
        }
        .warning-btn {
            background: #FF9800;
            color: white;
            border: none;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s;
        }
        .warning-btn:hover {
            opacity: 0.85;
        }
        
        .workspace-info {
            background: linear-gradient(135deg, rgba(0,207,193,0.08), rgba(0,150,136,0.08));
            border: 2px solid #00cfc1;
            border-radius: 10px;
            padding: 12px 16px;
            margin-bottom: 16px;
            display: flex;
            gap: 12px;
            align-items: center;
        }
        .workspace-info.hidden {
            display: none;
        }
        .workspace-icon {
            font-size: 24px;
            line-height: 1;
        }
        .workspace-details {
            flex: 1;
        }
        .workspace-name {
            font-size: 14px;
            font-weight: 700;
            color: #00cfc1;
            margin-bottom: 2px;
        }
        .workspace-path {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            font-family: monospace;
        }
        
        .module-controls {
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-bottom: 16px;
        }
        .module-search {
            width: 100%;
            padding: 10px 14px;
            background: var(--vscode-input-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            color: var(--vscode-input-foreground);
            font-size: 13px;
            transition: all 0.2s;
        }
        .module-search:focus {
            outline: none;
            border-color: #00cfc1;
            box-shadow: 0 0 0 2px rgba(0,207,193,0.1);
        }
        .module-filters {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
        }
        .filter-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-panel-border);
            padding: 6px 14px;
            border-radius: 16px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
        }
        .filter-btn:hover {
            background: rgba(0,207,193,0.1);
            border-color: #00cfc1;
            color: #00cfc1;
        }
        .filter-btn.active {
            background: #00cfc1;
            color: white;
            border-color: #00cfc1;
        }
        .modules-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 14px;
        }
        .module-card {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 2px solid var(--vscode-panel-border);
            border-radius: 10px;
            padding: 14px;
            transition: all 0.3s;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }
        .module-card:hover {
            border-color: #00cfc1;
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,207,193,0.15);
        }
        .module-card.hidden {
            display: none;
        }
        .module-header {
            display: flex;
            align-items: flex-start;
            gap: 10px;
        }
        .module-icon {
            font-size: 28px;
            line-height: 1;
        }
        .module-info {
            flex: 1;
        }
        .module-name {
            font-size: 14px;
            font-weight: 700;
            color: var(--vscode-foreground);
            margin-bottom: 2px;
        }
        .module-version {
            font-size: 10px;
            color: var(--vscode-descriptionForeground);
            font-family: monospace;
        }
        .module-badge {
            font-size: 9px;
            padding: 3px 8px;
            border-radius: 10px;
            font-weight: 700;
            letter-spacing: 0.3px;
            text-transform: uppercase;
        }
        .module-badge.ai { background: #9B59B6; color: white; }
        .module-badge.essentials { background: #2196F3; color: white; }
        .module-badge.database { background: #3775A9; color: white; }
        .module-badge.cache { background: #CB3837; color: white; }
        .module-badge.auth { background: #F59E0B; color: white; }
        .module-badge.observability { background: #10B981; color: white; }
        .module-badge.business { background: #FF6B6B; color: white; }
        .module-badge.billing { background: #E91E63; color: white; }
        .module-badge.communication { background: #4ECDC4; color: white; }
        .module-badge.security { background: #F59E0B; color: white; }
        .module-badge.tasks { background: #8E44AD; color: white; }
        .module-badge.users { background: #3498DB; color: white; }
        .module-desc {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.4;
            flex: 1;
        }
        .module-actions {
          display: flex;
          gap: 8px;
          align-items: center;
        }
        .module-install-btn {
          flex: 1;
          background: linear-gradient(135deg, #00cfc1, #009688);
          color: white;
          border: none;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
        }
        .module-copy-btn {
          background: var(--vscode-button-secondaryBackground);
          color: var(--vscode-button-secondaryForeground);
          border: 1px solid var(--vscode-panel-border);
          padding: 8px 10px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }
        .module-copy-btn:hover {
          background: #00cfc1;
          color: white;
          border-color: #00cfc1;
        }
        .module-copy-btn.copied {
          background: #4CAF50;
          color: white;
          border-color: #4CAF50;
        }
        .module-install-btn:hover:not(:disabled) {
            opacity: 0.85;
            transform: scale(1.02);
        }
        .module-install-btn:disabled {
            background: linear-gradient(135deg, #555, #666);
            color: #BDBDBD;
            cursor: not-allowed;
            opacity: 0.7;
        }
        .module-install-btn.installed:disabled {
            background: linear-gradient(135deg, #4CAF50, #45a049);
            color: #ffffff;
            cursor: default;
            opacity: 1;
        }
        .module-install-btn.update {
            color: #ffffff;
        }

        /* Installation Progress Modal */
        .progress-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            backdrop-filter: blur(4px);
        }
        .progress-modal.hidden {
            display: none;
        }
        .progress-container {
            background: var(--vscode-editor-background);
            border: 2px solid var(--vscode-panel-border);
            border-radius: 12px;
            padding: 24px;
            min-width: 450px;
            max-width: 500px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        }
        .progress-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 16px;
        }
        .progress-header h3 {
            font-size: 18px;
            font-weight: 700;
            color: var(--vscode-foreground);
        }
        .progress-close {
            background: none;
            border: none;
            color: var(--vscode-descriptionForeground);
            font-size: 20px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .progress-close:hover {
            color: var(--vscode-foreground);
            transform: rotate(90deg);
        }
        .progress-module-name {
            font-size: 14px;
            font-weight: 600;
            color: #00cfc1;
            margin-bottom: 16px;
            text-align: center;
        }
        .progress-bar-container {
            width: 100%;
            height: 8px;
            background: var(--vscode-input-background);
            border-radius: 8px;
            overflow: hidden;
            margin-bottom: 8px;
        }
        .progress-bar {
            height: 100%;
            background: linear-gradient(90deg, #00cfc1, #009688);
            border-radius: 8px;
            transition: width 0.3s ease;
        }
        .progress-percentage {
            text-align: center;
            font-size: 24px;
            font-weight: 700;
            color: #00cfc1;
            margin-bottom: 20px;
        }
        .progress-steps {
            display: flex;
            flex-direction: column;
            gap: 10px;
            margin-bottom: 16px;
        }
        .progress-step {
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
        }
        .step-icon {
            font-size: 16px;
            width: 20px;
            height: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .step-icon.pending { color: var(--vscode-descriptionForeground); }
        .step-icon.active { color: #00cfc1; animation: pulse 1s infinite; }
        .step-icon.completed { color: #10B981; }
        .progress-step.active .step-label {
            color: var(--vscode-foreground);
            font-weight: 600;
        }
        .progress-step.completed .step-label {
            color: var(--vscode-descriptionForeground);
            text-decoration: line-through;
        }
        .progress-status {
            text-align: center;
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            font-style: italic;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.4; }
        }
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        /* Setup Card - Compact Minimal Professional Design */
        .setup-card {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: rgba(102,126,234,0.06);
            border: 1px solid rgba(102,126,234,0.2);
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 20px;
            cursor: pointer;
            transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .setup-card:hover {
            background: rgba(102,126,234,0.1);
            border-color: rgba(102,126,234,0.4);
            transform: translateX(4px);
        }

        .setup-card-content {
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
        }

        .setup-card-icon {
            font-size: 20px;
            width: 36px;
            height: 36px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea, #764ba2);
            border-radius: 6px;
            color: white;
            flex-shrink: 0;
        }

        .setup-card-info {
            display: flex;
            flex-direction: column;
            gap: 2px;
        }

        .setup-card-title {
            font-size: 13px;
            font-weight: 600;
            color: var(--vscode-foreground);
            line-height: 1.3;
        }

        .setup-card-subtitle {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.3;
        }

        .setup-card-arrow {
            font-size: 18px;
            color: var(--vscode-descriptionForeground);
            transition: all 0.25s;
            opacity: 0.6;
        }

        .setup-card:hover .setup-card-arrow {
            opacity: 1;
            color: #667eea;
            transform: translateX(4px);
        }

        @media (max-width: 900px) {
            .modules-grid { 
                grid-template-columns: repeat(2, 1fr); 
            }
        }
        @media (max-width: 600px) {
            .actions { 
                grid-template-columns: 1fr; 
            }
            .features { 
                grid-template-columns: 1fr; 
            }
            .modules-grid { 
                grid-template-columns: 1fr; 
            }
            .progress-container { 
                min-width: 90vw; 
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img class="logo" src="${iconUri}" alt="RapidKit Logo" />
            <h1><span class="rapid">Rapid</span><span class="kit">Kit</span></h1>
            <p class="tagline">Build production-ready APIs at warp speed</p>
            <p class="tagline" style="font-size: 0.85rem; margin-top: 4px;">FastAPI & NestJS scaffolding with clean architecture, 27+ modules, and automation-first workflows</p>
            <span class="version" id="versionInfo">v${version}</span>
        </div>

        <!-- Setup Card - Compact Minimal Design -->
        <div class="setup-card" onclick="openSetup()">
            <div class="setup-card-content">
                <div class="setup-card-icon">⚙</div>
                <div class="setup-card-info">
                    <div class="setup-card-title">Setup & Installation</div>
                    <div class="setup-card-subtitle">Configure toolchain & verify status</div>
                </div>
            </div>
            <div class="setup-card-arrow">→</div>
        </div>


        <div class="actions">
            <!-- Hero Action: Primary CTA -->
            <div class="hero-action" onclick="createWorkspace()">
                <div class="hero-icon">🚀</div>
                <div class="hero-title">Create Your First Workspace</div>
                <div class="hero-description">
                    Choose your framework: FastAPI or NestJS, then create a complete project
                </div>
                <span class="hero-badge">GET STARTED</span>
            </div>

            <!-- Quick Links: Secondary Actions -->
            <div class="quick-links">
                <div class="quick-link fastapi" onclick="createFastAPIProject()">
                    <span class="quick-link-icon"><img src="${fastapiIconUri}" alt="FastAPI" /></span>
                    <div class="quick-link-title">FastAPI</div>
                    <div class="quick-link-subtitle">Python + Async</div>
                </div>

                <div class="quick-link nestjs" onclick="createNestJSProject()">
                    <span class="quick-link-icon"><img src="${nestjsIconUri}" alt="NestJS" /></span>
                    <div class="quick-link-title">NestJS</div>
                    <div class="quick-link-subtitle">TypeScript + DI</div>
                </div>   
            </div>
        </div>

        <div class="section">
            <div class="section-title">⚡ Key Features</div>
            <div class="features">
                <div class="feature">
                    <span class="feature-icon">⚡</span>
                    <span>5x faster project setup</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">🎯</span>
                    <span>Clean Architecture</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">🔧</span>
                    <span>Auto dev server</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">📚</span>
                    <span>Swagger docs built-in</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">🧪</span>
                    <span>Test ready</span>
                </div>
                <div class="feature">
                    <span class="feature-icon">📦</span>
                    <span>Modular design</span>
                </div>
            </div>
        </div>
        <!-- Recent Workspaces Section -->
        <div class="section recent-workspaces" id="recentWorkspaces">
            <div class="section-title" style="display: flex; align-items: center; justify-content: space-between;">
                <span>📂 Recent Workspaces</span>
                <button class="wizard-btn" onclick="refreshWorkspaces()" style="padding: 8px; border: none; background: transparent; color: var(--vscode-foreground);" title="Refresh workspaces">
                    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px;">
                        <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        <path d="M20 4v6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </button>
            </div>
            <div class="workspace-list" id="workspaceList">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>
        <!-- Module Browser Section -->
        <div class="section module-browser">
            <div class="section-title" style="display: flex; align-items: center; justify-content: space-between;">
                <div>
                    <span>🧩 Module Browser</span>
                    <div style="font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 4px;">Selected Project</div>
                </div>
                <div style="display: flex; align-items: center; gap: 12px;">
                    <span class="module-count" id="moduleCount">${getTotalModuleCount()} free modules</span>
                    <button class="wizard-btn" onclick="refreshModules()" style="padding: 8px; border: none; background: transparent; color: var(--vscode-foreground);" title="Refresh module status">
                        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px;">
                            <path d="M20 12a8 8 0 1 1-2.34-5.66" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            <path d="M20 4v6h-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </button>
                </div>
            </div>
            
            <!-- Workspace Warning -->
            <div class="workspace-warning hidden" id="workspaceWarning">
                <div class="warning-icon">⚠️</div>
                <div class="warning-content">
                    <div class="warning-title">No Project Selected</div>
                    <div class="warning-desc">Select a project from the sidebar to install modules, or create a new project.</div>
                    <button class="warning-btn" onclick="createWorkspace()">Create Workspace</button>
                </div>
            </div>

            <!-- Current Workspace Info -->
            <div class="workspace-info hidden" id="workspaceInfo">
                <div class="workspace-icon">📁</div>
                <div class="workspace-details">
                    <div class="workspace-name" id="workspaceName"></div>
                    <div class="workspace-path" id="workspacePath"></div>
                </div>
            </div>
            
            <!-- Search and Filter Bar -->
            <div class="module-controls">
                <input type="text" class="module-search" id="moduleSearch" placeholder="🔍 Search modules..." oninput="filterModules()" />
                <div class="module-filters" id="moduleFilters">
                    ${this._generateFilterButtons()}
                </div>
            </div>

            <!-- Modules Grid -->
            <div class="modules-grid" id="modulesGrid">
                ${this._generateModulesHTML()}
            </div>
        </div>

        <!-- Installation Progress Modal -->
        <div class="progress-modal hidden" id="progressModal">
            <div class="progress-container">
                <div class="progress-header">
                    <h3>Installing Module</h3>
                    <button class="progress-close" onclick="closeProgressModal()">✕</button>
                </div>
                <div class="progress-module-name" id="progressModuleName">redis</div>
                <div class="progress-bar-container">
                    <div class="progress-bar" id="progressBar" style="width: 0%"></div>
                </div>
                <div class="progress-percentage" id="progressPercentage">0%</div>
                <div class="progress-steps" id="progressSteps">
                    <div class="progress-step" id="step1">
                        <span class="step-icon pending">○</span>
                        <span class="step-label">Downloading package...</span>
                    </div>
                    <div class="progress-step" id="step2">
                        <span class="step-icon pending">○</span>
                        <span class="step-label">Installing dependencies...</span>
                    </div>
                    <div class="progress-step" id="step3">
                        <span class="step-icon pending">○</span>
                        <span class="step-label">Generating files...</span>
                    </div>
                    <div class="progress-step" id="step4">
                        <span class="step-icon pending">○</span>
                        <span class="step-label">Verifying installation...</span>
                    </div>
                </div>
                <div class="progress-status" id="progressStatus">Preparing...</div>
            </div>
        </div>

        <div class="section command-reference">
            <div class="section-title">📋 Command Reference</div>
            
            <!-- Workspace Commands -->
            <div class="command-category">
                <div class="category-header" onclick="toggleCategory('workspace')">
                    <div class="category-title">
                        <span class="category-icon">🗂️</span>
                        <span>Workspace Commands</span>
                        <span class="category-count">2</span>
                    </div>
                    <span class="category-toggle">▼</span>
                </div>
                <div class="category-content" id="workspace-content">
                    <div class="command-list">
                        <div class="command-item">
                            <div class="command-header">
                                <div class="command-code">npx rapidkit my-workspace</div>
                                <button class="command-copy" onclick="copyCommand(this, 'npx rapidkit my-workspace')">📋 Copy</button>
                            </div>
                            <div class="command-desc">Create a new workspace with interactive setup</div>
                        </div>
                        <div class="command-item">
                            <div class="command-header">
                                <div class="command-code">npx rapidkit my-workspace --yes --skip-git</div>
                                <button class="command-copy" onclick="copyCommand(this, 'npx rapidkit my-workspace --yes --skip-git')">📋 Copy</button>
                            </div>
                            <div class="command-desc">Create workspace with defaults, skip git initialization</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Project Commands -->
            <div class="command-category">
                <div class="category-header" onclick="toggleCategory('project')">
                    <div class="category-title">
                        <span class="category-icon">🚀</span>
                        <span>Project Commands</span>
                        <span class="category-count">4</span>
                    </div>
                    <span class="category-toggle">▼</span>
                </div>
                <div class="category-content" id="project-content">
                    <div class="command-list">
                        <div class="command-item">
                            <div class="command-header">
                                <div class="command-code">npx rapidkit create project fastapi.standard my-api --output .</div>
                                <button class="command-copy" onclick="copyCommand(this, 'npx rapidkit create project fastapi.standard my-api --output .')">📋 Copy</button>
                            </div>
                            <div class="command-desc">Create FastAPI project in current workspace</div>
                        </div>
                        <div class="command-item">
                            <div class="command-header">
                                <div class="command-code">npx rapidkit create project nestjs.standard my-service --output .</div>
                                <button class="command-copy" onclick="copyCommand(this, 'npx rapidkit create project nestjs.standard my-service --output .')">📋 Copy</button>
                            </div>
                            <div class="command-desc">Create NestJS project in current workspace</div>
                        </div>
                        <div class="command-item">
                            <div class="command-header">
                                <div class="command-code">npx rapidkit create project fastapi.standard my-api --output ~/projects</div>
                                <button class="command-copy" onclick="copyCommand(this, 'npx rapidkit create project fastapi.standard my-api --output ~/projects')">📋 Copy</button>
                            </div>
                            <div class="command-desc">Create standalone FastAPI project at custom location</div>
                        </div>
                        <div class="command-item">
                            <div class="command-header">
                                <div class="command-code">npx rapidkit init && npx rapidkit dev</div>
                                <button class="command-copy" onclick="copyCommand(this, 'npx rapidkit init && npx rapidkit dev')">📋 Copy</button>
                            </div>
                            <div class="command-desc">Initialize dependencies and start development server</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Module Commands -->
            <div class="command-category">
                <div class="category-header" onclick="toggleCategory('module')">
                    <div class="category-title">
                        <span class="category-icon">🧩</span>
                        <span>Module Commands</span>
                        <span class="category-count">5</span>
                    </div>
                    <span class="category-toggle">▼</span>
                </div>
                <div class="category-content" id="module-content">
                    <div class="command-list">
                        <div class="command-item">
                            <div class="command-header">
                                <div class="command-code">npx rapidkit add module auth_core</div>
                                <button class="command-copy" onclick="copyCommand(this, 'npx rapidkit add module auth_core')">📋 Copy</button>
                            </div>
                            <div class="command-desc">Password hashing, token signing, and runtime auth</div>
                        </div>
                        <div class="command-item">
                            <div class="command-header">
                                <div class="command-code">npx rapidkit add module db_postgres</div>
                                <button class="command-copy" onclick="copyCommand(this, 'npx rapidkit add module db_postgres')">📋 Copy</button>
                            </div>
                            <div class="command-desc">SQLAlchemy async Postgres with DI and health checks</div>
                        </div>
                        <div class="command-item">
                            <div class="command-header">
                                <div class="command-code">npx rapidkit add module redis</div>
                                <button class="command-copy" onclick="copyCommand(this, 'npx rapidkit add module redis')">📋 Copy</button>
                            </div>
                            <div class="command-desc">Redis runtime with async and sync client</div>
                        </div>
                        <div class="command-item">
                            <div class="command-header">
                                <div class="command-code">npx rapidkit add module email</div>
                                <button class="command-copy" onclick="copyCommand(this, 'npx rapidkit add module email')">📋 Copy</button>
                            </div>
                            <div class="command-desc">Email delivery with SMTP support</div>
                        </div>
                        <div class="command-item">
                            <div class="command-header">
                                <div class="command-code">npx rapidkit add module storage</div>
                                <button class="command-copy" onclick="copyCommand(this, 'npx rapidkit add module storage')">📋 Copy</button>
                            </div>
                            <div class="command-desc">File storage and media management</div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Development Commands -->
            <div class="command-category">
                <div class="category-header" onclick="toggleCategory('dev')">
                    <div class="category-title">
                        <span class="category-icon">⚙️</span>
                        <span>Development & Utilities</span>
                        <span class="category-count">3</span>
                    </div>
                    <span class="category-toggle">▼</span>
                </div>
                <div class="category-content" id="dev-content">
                    <div class="command-list">
                        <div class="command-item">
                            <div class="command-header">
                                <div class="command-code">npx rapidkit doctor</div>
                                <button class="command-copy" onclick="copyCommand(this, 'npx rapidkit doctor')">📋 Copy</button>
                            </div>
                            <div class="command-desc">Check system requirements and dependencies</div>
                        </div>
                        <div class="command-item">
                            <div class="command-header">
                                <div class="command-code">npx rapidkit --version</div>
                                <button class="command-copy" onclick="copyCommand(this, 'npx rapidkit --version')">📋 Copy</button>
                            </div>
                            <div class="command-desc">Show RapidKit CLI version</div>
                        </div>
                        <div class="command-item">
                            <div class="command-header">
                                <div class="command-code">npx rapidkit --help</div>
                                <button class="command-copy" onclick="copyCommand(this, 'npx rapidkit --help')">📋 Copy</button>
                            </div>
                            <div class="command-desc">Display all available commands and options</div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">⌨️ Keyboard Shortcuts</div>
            <div class="shortcuts">
                <div class="shortcut">
                    <span class="kbd">Ctrl+Shift+R</span>
                    <span class="kbd">W</span>
                    <span>New Workspace</span>
                </div>
                <div class="shortcut">
                    <span class="kbd">Ctrl+Shift+R</span>
                    <span class="kbd">P</span>
                    <span>New Project</span>
                </div>
                <div class="shortcut">
                    <span class="kbd">Ctrl+Shift+R</span>
                    <span class="kbd">M</span>
                    <span>Add Module</span>
                </div>
            </div>
        </div>

        <div class="footer">
            <div class="footer-links">
                <a class="footer-link" onclick="openDocs()">📖 Documentation</a>
                <a class="footer-link" onclick="openGitHub()">💻 GitHub</a>
                <a class="footer-link" onclick="openMarketplace()">⭐ Rate Extension</a>
            </div>
            <div class="copyright">
                Made with <span class="heart">❤️</span> by RapidKit Team
            </div>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // Recent Workspaces Data (injected from extension)
        let recentWorkspaces = ${JSON.stringify(this._getRecentWorkspaces())};
        let lastWorkspaceStatusSeq = 0;
        
        // Debouncing for installation status updates
        let installStatusDebounceTimer = null;
        let pendingInstallStatus = null;

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            console.log('[WelcomePanel] Received message:', message.command, message);
            
            if (message.command === 'installStatusUpdate') {
                // Debounce installation status updates to prevent flickering
                pendingInstallStatus = message.data;
                if (installStatusDebounceTimer) {
                    clearTimeout(installStatusDebounceTimer);
                }
                installStatusDebounceTimer = setTimeout(() => {
                    if (pendingInstallStatus) {
                        updateWizardUI(pendingInstallStatus);
                        pendingInstallStatus = null;
                    }
                }, 500); // 500ms debounce
            } else if (message.command === 'statusUpdate') {
                // Auto-refresh after installation
                console.log('[WelcomePanel] 🔄 Auto-refreshing status after installation');
                updateWizardUI(message.status);
            } else if (message.command === 'workspacesUpdate') {
                recentWorkspaces = message.data;
                populateRecentWorkspaces();
            } else if (message.command === 'workspaceStatus') {
                const incomingSeq = typeof message.seq === 'number' ? message.seq : 0;
                if (incomingSeq && incomingSeq < lastWorkspaceStatusSeq) {
                    console.log('[WelcomePanel] ⏭️ Ignoring stale workspaceStatus:', incomingSeq, 'last:', lastWorkspaceStatusSeq);
                    return;
                }
                if (incomingSeq) {
                    lastWorkspaceStatusSeq = incomingSeq;
                }
                console.log('[WelcomePanel] 🔍 Received workspaceStatus message');
                console.log('[WelcomePanel] 📦 workspace:', message.workspace);
                console.log('[WelcomePanel] 📋 installedModules:', message.installedModules);
                console.log('[WelcomePanel] 🔢 installedModules type:', typeof message.installedModules);
                console.log('[WelcomePanel] ✅ Is Array?', Array.isArray(message.installedModules));
                console.log('[WelcomePanel] 📊 installedModules length:', message.installedModules ? message.installedModules.length : 'N/A');
                updateWorkspaceStatus(message.workspace, message.installedModules);
            }
        });

        // Populate recent workspaces
        function populateRecentWorkspaces() {
            const workspaceList = document.getElementById('workspaceList');
            
            if (!recentWorkspaces || recentWorkspaces.length === 0) {
                workspaceList.innerHTML = \`
                    <div class="workspace-empty">
                        <div class="workspace-empty-icon">📦</div>
                        <div>No recent workspaces</div>
                        <div style="margin-top: 8px; font-size: 12px;">Create your first workspace to get started!</div>
                    </div>
                \`;
                return;
            }

            workspaceList.innerHTML = recentWorkspaces.slice(0, 5).map(ws => \`
                <div class="workspace-item" onclick="openWorkspace('\${ws.path}')">
                    <div class="workspace-icon">🗂️</div>
                    <div class="workspace-info">
                        <div class="workspace-name">\${ws.name}</div>
                        <div class="workspace-meta">
                            <span class="workspace-badge">\${ws.projectCount || 0} project\${ws.projectCount === 1 ? '' : 's'}</span>
                            <span class="workspace-path" title="\${ws.path}">\${ws.path}</span>
                        </div>
                    </div>
                </div>
            \`).join('');
        }

        function openWorkspace(path) {
            vscode.postMessage({ command: 'openWorkspace', path: path });
        }

        function refreshWorkspaces() {
            const refreshBtn = event.target.closest('button');
            if (refreshBtn) {
                const svg = refreshBtn.querySelector('svg');
                if (svg) {
                    svg.style.animation = 'spin 1s linear infinite';
                    setTimeout(() => {
                        svg.style.animation = '';
                    }, 2000);
                }
            }
            vscode.postMessage({ command: 'refreshWorkspaces' });
        }

        // Initialize
        populateRecentWorkspaces();

        // Wizard state
        let wizardState = {
          npmInstalled: false,
          coreInstalled: false,
          dismissed: false
        };
        let isWindowsEnv = false;

        // Check if wizard was dismissed
        const state = vscode.getState() || {};
        if (state.wizardDismissed) {
            document.getElementById('setupWizard').classList.add('hidden');
        }

        // Initialize wizard
        checkInstallationStatus();

        function checkInstallationStatus() {
            vscode.postMessage({ command: 'checkInstallStatus' });
        }



        function updateWizardUI(status) {
          isWindowsEnv = !!status.isWindows;
            wizardState.npmInstalled = status.npmInstalled;
            wizardState.coreInstalled = status.coreInstalled;

            // Helper to parse version parts (handles rc, alpha, beta)
            function parseVersion(version) {
                if (!version) return null;
                const match = version.match(/^(\\d+)\\.(\\d+)\\.(\\d+)((?:rc|alpha|beta)\\d*)?$/);
                if (!match) return null;
                return {
                    major: parseInt(match[1]),
                    minor: parseInt(match[2]),
                    patch: parseInt(match[3]),
                    prerelease: match[4] || null,
                };
            }

            // Helper to compare semantic versions
            function isNewerVersion(current, latest) {
                if (!current || !latest) return false;
                try {
                    const curr = parseVersion(current);
                    const last = parseVersion(latest);
                    
                    if (!curr || !last) return false;
                    
                    // Compare major.minor.patch
                    if (last.major > curr.major) return true;
                    if (last.major < curr.major) return false;
                    
                    if (last.minor > curr.minor) return true;
                    if (last.minor < curr.minor) return false;
                    
                    if (last.patch > curr.patch) return true;
                    if (last.patch < curr.patch) return false;
                    
                    // Same version, check prerelease
                    // 0.2.1rc1 vs 0.2.1 - actual release is newer
                    // 0.2.1 vs 0.2.1rc1 - actual release is newer
                    if (!curr.prerelease && last.prerelease) return false; // current is stable, latest is rc
                    if (curr.prerelease && !last.prerelease) return true; // current is rc, latest is stable
                    
                    return false;
                } catch {
                    return false;
                }
            }

            // Update version info in header
            const versionInfo = document.getElementById('versionInfo');
            const currentExtVersion = '${version}';
            const latestExtVersion = status.latestExtensionVersion || currentExtVersion;
            
            if (latestExtVersion && latestExtVersion !== currentExtVersion) {
              versionInfo.innerHTML = \`v\${currentExtVersion} <span style="color: #FF9800; margin-left: 6px;">⚠ Update available (v\${latestExtVersion})</span> <a href="#" onclick="openMarketplace()" style="color: #00cfc1; text-decoration: none; margin-left: 6px;">Update</a>\`;
            } else {
              versionInfo.textContent = \`v\${currentExtVersion} — Up to date\`;
            }

            // Update Python step
            const pythonStep = document.getElementById('pythonStep');
            const pythonStatus = document.getElementById('pythonStatus');
            const pythonDetails = document.getElementById('pythonDetails');
            const pythonActions = document.getElementById('pythonActions');
            const pythonUpgrade = document.getElementById('pythonUpgrade');

            if (status.pythonInstalled) {
                pythonStep.classList.remove('not-installed');
                pythonStep.classList.add('installed');
                pythonStatus.classList.remove('loading');
                
                let pythonDisplay = \`<span class="step-version">v\${status.pythonVersion}</span>\`;
                
                // Only suggest upgrade if Python < 3.10 (minimum for rapidkit-core)
                if (status.pythonNeedsUpgrade) {
                    pythonStatus.textContent = '⚠';
                    pythonStep.classList.add('needs-upgrade');
                    pythonDisplay = \`<span style="color: #FF5722; font-weight: 600;">v\${status.pythonVersion}</span> <span style="color: #FF5722; margin-left: 8px; font-size: 10px;">⚠ Upgrade required</span>\`;
                    if (pythonUpgrade) pythonUpgrade.style.display = 'flex';
                } else {
                    pythonStatus.textContent = '✓';
                    pythonStep.classList.remove('needs-upgrade');
                    pythonDisplay += \` <span style="color: #4CAF50; margin-left: 8px; font-size: 10px;">✓ System ready</span>\`;
                    pythonActions.style.display = 'none';
                    if (pythonUpgrade) pythonUpgrade.style.display = 'none';
                }
                
                pythonDetails.innerHTML = pythonDisplay;
            } else {
                pythonStep.classList.remove('installed');
                pythonStep.classList.add('not-installed');
                pythonStatus.textContent = '⚠';
                pythonStatus.classList.remove('loading');
                pythonDetails.innerHTML = '<span style="color: #FF5722;">Not installed - Required</span>';
                pythonActions.style.display = 'flex';
                if (pythonUpgrade) pythonUpgrade.style.display = 'none';
            }

            // Update pip step
            const pipStep = document.getElementById('pipStep');
            const pipStatus = document.getElementById('pipStatus');
            const pipDetails = document.getElementById('pipDetails');
            const pipActions = document.getElementById('pipActions');

            if (status.pipInstalled) {
                pipStep.classList.remove('not-installed');
                pipStep.classList.add('installed');
                pipStatus.textContent = '✓';
                pipStatus.classList.remove('loading');
                pipDetails.innerHTML = \`<span class="step-version">v\${status.pipVersion}</span>\`;
                pipActions.style.display = 'none';
            } else {
                pipStep.classList.remove('installed');
                pipStep.classList.add('not-installed');
                pipStatus.textContent = '⚠';
                pipStatus.classList.remove('loading');
                pipDetails.innerHTML = 'Optional (per-project dependencies)';
                pipActions.style.display = 'flex';
            }

            // Update Poetry step
            const poetryStep = document.getElementById('poetryStep');
            const poetryStatus = document.getElementById('poetryStatus');
            const poetryDetails = document.getElementById('poetryDetails');
            const poetryActions = document.getElementById('poetryActions');

            if (status.poetryInstalled) {
                poetryStep.classList.remove('not-installed');
                poetryStep.classList.add('installed');
                poetryStatus.textContent = '✓';
                poetryStatus.classList.remove('loading');
                poetryDetails.innerHTML = \`<span class="step-version">v\${status.poetryVersion}</span>\`;
                poetryActions.style.display = 'none';
            } else {
                poetryStep.classList.remove('installed');
                poetryStep.classList.add('not-installed');
                poetryStatus.textContent = '⚠';
                poetryStatus.classList.remove('loading');
                poetryDetails.innerHTML = 'Recommended for FastAPI projects';
                poetryActions.style.display = 'flex';
            }

            // Update pipx step
            const pipxStep = document.getElementById('pipxStep');
            const pipxStatus = document.getElementById('pipxStatus');
            const pipxDetails = document.getElementById('pipxDetails');
            const pipxActions = document.getElementById('pipxActions');

            if (status.pipxInstalled) {
                pipxStep.classList.remove('not-installed');
                pipxStep.classList.add('installed');
                pipxStatus.textContent = '✓';
                pipxStatus.classList.remove('loading');
                pipxDetails.innerHTML = \`<span class="step-version">v\${status.pipxVersion}</span> <span style="color: #4CAF50; margin-left: 8px; font-size: 10px;">✓ Ready for global tools</span>\`;
                pipxActions.style.display = 'none';
            } else {
                pipxStep.classList.remove('installed');
                pipxStep.classList.add('not-installed');
                pipxStatus.textContent = '⚠';
                pipxStatus.classList.remove('loading');
                pipxDetails.innerHTML = '<span style="color: #FF9800; font-weight: 600;">Recommended</span> <span style="font-size: 10px; display: block; margin-top: 4px;">Speeds up workspace creation</span>';
                pipxActions.style.display = 'flex';
            }

            // Update npm CLI step
            const npmStep = document.getElementById('npmStep');
            const npmStatus = document.getElementById('npmStatus');
            const npmDetails = document.getElementById('npmDetails');
            const npmActions = document.getElementById('npmActions');
            const npmUpgrade = document.getElementById('npmUpgrade');

            if (status.npmInstalled) {
                npmStep.classList.remove('not-installed');
                npmStep.classList.add('installed');
                npmStatus.textContent = '✓';
                npmStatus.classList.remove('loading');
                
                let npmDisplay = \`<span class="step-version">v\${status.npmVersion}</span>\`;
                if (status.latestNpmVersion && isNewerVersion(status.npmVersion, status.latestNpmVersion)) {
                    npmDisplay += \` <span style="color: #FF9800; margin-left: 8px;">→ v\${status.latestNpmVersion}</span>\`;
                    npmActions.style.display = 'none';
                    npmUpgrade.style.display = 'flex';
                } else {
                    npmDisplay += \` <span style="color: #4CAF50; margin-left: 8px; font-size: 10px;">✓ Workspace manager ready</span>\`;
                    npmActions.style.display = 'none';
                    npmUpgrade.style.display = 'none';
                }
                npmDetails.innerHTML = npmDisplay;
            } else {
                npmStep.classList.remove('installed');
                npmStep.classList.add('not-installed');
                npmStatus.textContent = '⚠';
                npmStatus.classList.remove('loading');
                npmDetails.innerHTML = '<span style="color: #FF5722; font-weight: 600;">Not installed</span> <span style="font-size: 10px; display: block; margin-top: 4px;">Workspace & project manager</span>';
                npmActions.style.display = 'flex';
                npmUpgrade.style.display = 'none';
            }

            // Update Python Core step
            const coreStep = document.getElementById('coreStep');
            const coreStatus = document.getElementById('coreStatus');
            const coreDetails = document.getElementById('coreDetails');
            const coreActions = document.getElementById('coreActions');
            const coreUpgrade = document.getElementById('coreUpgrade');
            const coreActionsNoPipx = document.getElementById('coreActionsNoPipx');
            
            if (status.coreInstalled) {
                coreStep.classList.remove('not-installed');
                
                let coreDisplay = \`<span class="step-version">v\${status.coreVersion}</span>\`;
                
                // Determine status based on install type
                if (status.coreInstallType === 'global') {
                    // Global install (pipx) - fully ready
                    coreStep.classList.add('installed');
                    coreStatus.textContent = '✓';
                    coreStatus.classList.remove('loading');
                    
                    if (status.latestCoreVersion && isNewerVersion(status.coreVersion, status.latestCoreVersion)) {
                        coreDisplay += \` <span style="color: #FF9800; margin-left: 8px;">→ v\${status.latestCoreVersion}</span>\`;
                        coreActions.style.display = 'none';
                        if (coreActionsNoPipx) coreActionsNoPipx.style.display = 'none';
                        coreUpgrade.style.display = 'flex';
                    } else {
                        coreDisplay += \` <span style="color: #4CAF50; margin-left: 8px; font-size: 10px;">✓ Ready (Global)</span>\`;
                        coreActions.style.display = 'none';
                        if (coreActionsNoPipx) coreActionsNoPipx.style.display = 'none';
                        coreUpgrade.style.display = 'none';
                    }
                } else if (status.coreInstallType === 'workspace') {
                    // Workspace-only install - works but recommend global for speed
                    coreStep.classList.add('installed');
                    coreStep.style.borderLeft = '3px solid #FF9800'; // Orange border
                    coreStatus.textContent = '⚠️';
                    coreStatus.classList.remove('loading');
                    
                    coreDisplay += \` <span style="color: #FF9800; margin-left: 8px; font-size: 10px;">⚠️ In workspace only</span>\`;
                    coreDisplay += \`<div style="font-size: 9px; color: #999; margin-top: 4px; line-height: 1.4;">
                        💡 Install globally with pipx for faster workspace creation<br/>
                        <code style="font-size: 8px; background: rgba(255,255,255,0.05); padding: 2px 4px; border-radius: 2px;">pipx install rapidkit-core</code>
                    </div>\`;
                    
                    // Show install button to upgrade to global
                    coreActions.style.display = 'flex';
                    if (coreActionsNoPipx) coreActionsNoPipx.style.display = 'none';
                    coreUpgrade.style.display = 'none';
                } else {
                    // Unknown install type - treat as installed but unclear
                    coreStep.classList.add('installed');
                    coreStatus.textContent = '✓';
                    coreStatus.classList.remove('loading');
                    coreDisplay += \` <span style="color: #4CAF50; margin-left: 8px; font-size: 10px;">✓ Ready</span>\`;
                    coreActions.style.display = 'none';
                    if (coreActionsNoPipx) coreActionsNoPipx.style.display = 'none';
                    coreUpgrade.style.display = 'none';
                }
                
                coreDetails.innerHTML = coreDisplay;
            } else {
                coreStep.classList.remove('installed');
                coreStep.classList.add('not-installed');
                coreStep.style.borderLeft = ''; // Reset border
                coreStatus.textContent = '⚠';
                coreStatus.classList.remove('loading');
                
                // Check if pipx is available
                if (status.pipxInstalled) {
                    coreDetails.innerHTML = '<span style="color: #FF5722; font-weight: 600;">Not installed</span> <span style="font-size: 10px; display: block; margin-top: 4px;">Python Framework (40+ commands)</span>';
                    coreActions.style.display = 'flex';
                    if (coreActionsNoPipx) coreActionsNoPipx.style.display = 'none';
                } else {
                    coreDetails.innerHTML = '<span style="color: #FF5722; font-weight: 600;">pipx required</span> <span style="font-size: 10px; display: block; margin-top: 4px;">Install pipx first, or use fallback</span>';
                    coreActions.style.display = 'none';
                    if (coreActionsNoPipx) coreActionsNoPipx.style.display = 'flex';
                }
                coreUpgrade.style.display = 'none';
            }

            // Update progress
            const progress = document.getElementById('wizardProgress');
            const pythonOk = status.pythonInstalled && !status.pythonNeedsUpgrade ? 1 : 0;
            const npmOk = status.npmInstalled ? 1 : 0;
            const pipxOk = status.pipxInstalled ? 1 : 0;
            const coreOk = status.coreInstalled ? 1 : 0;
            const requiredInstalled = pythonOk + npmOk + pipxOk + coreOk;
            const requiredTotal = 4;

            if (requiredInstalled === requiredTotal) {
              progress.textContent = '✅ Toolchain ready';
              document.getElementById('finishBtn').disabled = false;
            } else {
              progress.textContent = \`⚠ \${requiredInstalled}/\${requiredTotal} required installed\`;
              document.getElementById('finishBtn').disabled = true;
            }
        }

        function openPythonDownload() {
            vscode.postMessage({ command: 'openUrl', url: 'https://www.python.org/downloads/' });
        }

        function showPipInstall() {
            vscode.postMessage({ command: 'showInfo', message: 'pip is usually included with Python. If missing, reinstall Python or run: python -m ensurepip' });
        }

        function installPoetry() {
            vscode.postMessage({ command: 'installPoetry' });
            setTimeout(checkInstallationStatus, 5000);
        }

        function installPipx() {
            vscode.postMessage({ command: 'installPipx' });
            setTimeout(checkInstallationStatus, 8000); // More time for PATH update
        }

        function installPipxThenCore() {
            vscode.postMessage({ command: 'installPipxThenCore' });
            setTimeout(checkInstallationStatus, 15000); // More time for both installations
        }

        function installCoreFallback() {
            vscode.postMessage({ command: 'installCoreFallback' });
            setTimeout(checkInstallationStatus, 8000);
        }

        function installNpmCLI() {
            vscode.postMessage({ command: 'installNpmGlobal' });
            setTimeout(checkInstallationStatus, 5000);
        }

        function upgradeNpm() {
            vscode.postMessage({ command: 'upgradeNpmGlobal' });
            setTimeout(checkInstallationStatus, 5000);
        }

        function installPythonCore() {
            vscode.postMessage({ command: 'installPipCore' });
            setTimeout(checkInstallationStatus, 5000);
        }

        function upgradeCore() {
            vscode.postMessage({ command: 'upgradePipCore' });
            setTimeout(checkInstallationStatus, 5000);
        }

        function refreshWizard() {
            // Reset UI to loading
            const statuses = ['pythonStatus', 'pipStatus', 'poetryStatus', 'npmStatus', 'coreStatus'];
            statuses.forEach(id => {
                const el = document.getElementById(id);
                if (el) {
                    el.textContent = '';
                    el.classList.add('loading');
                }
            });
            
            checkInstallationStatus();
        }

        function hideWizard() {
            document.getElementById('setupWizard').classList.add('hidden');
            vscode.setState({ wizardDismissed: true });
        }

        function finishSetup() {
            vscode.postMessage({ command: 'doctor' });
            // Don't hide wizard - let user close it manually
        }

        function createWorkspace() {
            vscode.postMessage({ command: 'createWorkspace' });
        }
        function createFastAPIProject() {
            vscode.postMessage({ command: 'createFastAPIProject' });
        }
        function createNestJSProject() {
            vscode.postMessage({ command: 'createNestJSProject' });
        }
        function runDoctor() {
            vscode.postMessage({ command: 'doctor' });
        }
        function browseModules() {
            vscode.postMessage({ command: 'browseModules' });
        }
        function openDocs() {
            vscode.postMessage({ command: 'openDocs' });
        }
        function openSetup() {
            vscode.postMessage({ command: 'openSetup' });
        }
        function openGitHub() {
            vscode.postMessage({ command: 'openGitHub' });
        }
        function openMarketplace() {
            vscode.postMessage({ command: 'openMarketplace' });
        }
        function openNpmPackage() {
            vscode.postMessage({ command: 'openNpmPackage' });
        }
        function openPyPI() {
            vscode.postMessage({ command: 'openPyPI' });
        }
        function installNpmGlobal() {
            vscode.postMessage({ command: 'installNpmGlobal' });
        }
        function installPipCore() {
            vscode.postMessage({ command: 'installPipCore' });
        }
        function showWelcome() {
            vscode.postMessage({ command: 'showWelcome' });
        }

        function getPoetryInstallCommand() {
          if (isWindowsEnv) {
            return '(Invoke-WebRequest -Uri https://install.python-poetry.org -UseBasicParsing).Content | python -';
          }
          return 'curl -sSL https://install.python-poetry.org | python3 -';
        }

        function getPipxInstallCommand() {
          if (isWindowsEnv) {
            return 'python -m pip install --user pipx';
          }
          return 'python3 -m pip install --user pipx';
        }

        // Module Browser Functions
        let currentCategory = 'all';
        let hasWorkspace = false;
        let currentWorkspace = { name: '', path: '' };

        // Check if workspace is open on load (when DOM is ready)
        window.addEventListener('DOMContentLoaded', () => {
            console.log('[Module Browser] DOM loaded, checking workspace status...');
            checkWorkspace();
            // Trigger installation check once on load
            vscode.postMessage({ command: 'checkInstallStatus' });
        });
        
        // Also check immediately (in case DOM is already loaded)
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            console.log('[Module Browser] Document already loaded, checking workspace...');
            setTimeout(() => {
                checkWorkspace();
                vscode.postMessage({ command: 'checkInstallStatus' });
            }, 100);
        }

        function checkWorkspace() {
            vscode.postMessage({ command: 'checkWorkspace' });
        }
        
        function refreshModules() {
            const refreshBtn = event.target.closest('button');
            if (refreshBtn) {
                const svg = refreshBtn.querySelector('svg');
                if (svg) {
                    svg.style.animation = 'spin 1s linear infinite';
                    setTimeout(() => {
                        svg.style.animation = '';
                    }, 2000);
                }
            }
            console.log('[Module Browser] Manual refresh requested');
            vscode.postMessage({ command: 'refreshModules' });
        }
        
        // Compare versions (e.g., "0.1.7" vs "0.1.5")
        function isNewerVersion(availableVersion, installedVersion) {
            if (!installedVersion) return false;
            
            const available = availableVersion.split('.').map(Number);
            const installed = installedVersion.split('.').map(Number);
            
            for (let i = 0; i < Math.max(available.length, installed.length); i++) {
                const a = available[i] || 0;
                const b = installed[i] || 0;
                if (a > b) return true;
                if (a < b) return false;
            }
            return false;
        }

        // Handle workspace status from backend
        function updateWorkspaceStatus(workspace, installedModules) {
            console.log('[Module Browser] ========== updateWorkspaceStatus START ==========');
            console.log('[Module Browser] Received workspace:', workspace);
            console.log('[Module Browser] Installed modules:', installedModules);
            hasWorkspace = !!workspace;
            const warningEl = document.getElementById('workspaceWarning');
            const infoEl = document.getElementById('workspaceInfo');
            const installBtns = document.querySelectorAll('.module-install-btn');
            
            console.log('[Module Browser] Elements found:', {
                warningEl: !!warningEl,
                infoEl: !!infoEl,
                installBtnsCount: installBtns.length,
                hasWorkspace: hasWorkspace
            });
            
            if (hasWorkspace && workspace) {
                currentWorkspace = workspace;
                
                console.log('[Module Browser] ✅ HAS WORKSPACE - Enabling buttons');
                // Show workspace info
                if (warningEl) warningEl.classList.add('hidden');
                if (infoEl) infoEl.classList.remove('hidden');
                if (document.getElementById('workspaceName')) {
                    document.getElementById('workspaceName').textContent = workspace.name;
                }
                if (document.getElementById('workspacePath')) {
                    document.getElementById('workspacePath').textContent = workspace.path;
                }
                
                // Create a map of installed modules by slug
                const installedMap = {};
                console.log('[Module Browser] Raw installedModules:', installedModules);
                console.log('[Module Browser] Is array?', Array.isArray(installedModules));
                
                if (installedModules && Array.isArray(installedModules)) {
                    console.log('[Module Browser] Processing', installedModules.length, 'installed modules');
                    installedModules.forEach(mod => {
                        console.log('[Module Browser] Processing module:', mod);
                        // Use slug as key directly (e.g., "free/auth/oauth")
                        console.log('[Module Browser] Added slug "' + mod.slug + '" to installed map');
                        installedMap[mod.slug] = mod;
                    });
                } else {
                    console.log('[Module Browser] ❌ installedModules is not valid:', typeof installedModules);
                }
                console.log('[Module Browser] Final installed map:', installedMap);
                console.log('[Module Browser] Map keys:', Object.keys(installedMap));
                
                // Update button states based on installation
                console.log('[Module Browser] Updating', installBtns.length, 'buttons');
                installBtns.forEach((btn, index) => {
                    const moduleId = btn.getAttribute('data-module-id');
                    const moduleSlug = btn.getAttribute('data-module-slug');
                    const moduleCard = btn.closest('.module-card');
                    const versionEl = moduleCard ? moduleCard.querySelector('.module-version') : null;
                    const availableVersion = versionEl ? versionEl.textContent.replace('v', '').trim() : null;
                    // Check by slug first (more reliable), fallback to moduleId
                    const installed = installedMap[moduleSlug] || installedMap[moduleId];
                    
                    console.log('[Module Browser] Button #' + (index + 1) + ':', {
                        moduleId: moduleId,
                        moduleSlug: moduleSlug,
                        availableVersion: availableVersion,
                        installed: installed,
                        hasMatch: !!installed
                    });
                    
                    if (installed) {
                        // Check if update is available
                        const hasUpdate = availableVersion && isNewerVersion(availableVersion, installed.version);
                        
                        console.log('[Module Browser] Module installed:', moduleId, 'hasUpdate:', hasUpdate);
                        
                        if (hasUpdate) {
                            // Update available - enable with update button
                            btn.disabled = false;
                            btn.innerHTML = '<span>⬆</span> Update';
                            btn.style.background = 'linear-gradient(135deg, #FF9800, #F57C00)';
                            btn.setAttribute('data-update-mode', 'true');
                            btn.classList.add('update');
                            btn.classList.remove('installed');
                            console.log('[Module Browser] Button ' + (index + 1) + ' - Update available:', moduleId, 'from', installed.version, 'to', availableVersion);
                        } else {
                            // Module is installed and up-to-date
                            btn.disabled = true;
                            btn.innerHTML = '<span>✓</span> Installed v' + installed.version;
                            btn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
                            btn.removeAttribute('data-update-mode');
                            btn.classList.add('installed');
                            btn.classList.remove('update');
                            console.log('[Module Browser] Button ' + (index + 1) + ' marked as installed:', moduleId, 'v' + installed.version);
                        }
                    } else {
                        // Module not installed - enable
                        btn.disabled = false;
                        btn.innerHTML = '<span>⚡</span> Install';
                        btn.style.background = 'linear-gradient(135deg, #00cfc1, #009688)';
                        btn.removeAttribute('data-update-mode');
                        btn.classList.remove('installed');
                        btn.classList.remove('update');
                        console.log('[Module Browser] Button ' + (index + 1) + ' enabled for install:', moduleId);
                    }
                });
                
                // Attach click handlers to enabled buttons
                attachInstallButtonHandlers();
            } else {
                console.log('[Module Browser] ❌ NO WORKSPACE - Disabling buttons');
                // Show warning
                if (warningEl) warningEl.classList.remove('hidden');
                if (infoEl) infoEl.classList.add('hidden');
                
                // Disable install buttons
                console.log('[Module Browser] Disabling', installBtns.length, 'install buttons');
                installBtns.forEach((btn, index) => {
                    btn.disabled = true;
                    btn.innerHTML = '<span>⚡</span> Install';
                    btn.style.background = 'linear-gradient(135deg, #00cfc1, #009688)';
                    console.log('[Module Browser] Button ' + (index + 1) + ' disabled:', btn.disabled);
                });
            }
            console.log('[Module Browser] ========== updateWorkspaceStatus END ==========');
        }

        // Attach click event handlers to install buttons
        function attachInstallButtonHandlers() {
            const installBtns = document.querySelectorAll('.module-install-btn');
            console.log('[Module Browser] Attaching handlers to', installBtns.length, 'buttons');
            
            installBtns.forEach((btn) => {
                // Remove existing listener first (if any)
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                
                // Add new listener
                newBtn.addEventListener('click', function() {
                    if (this.disabled) {
                        console.log('[Module Browser] Button is disabled, ignoring click');
                        return;
                    }
                    
                    const moduleId = this.getAttribute('data-module-id');
                    const moduleName = this.getAttribute('data-module-name');
                    console.log('[Module Browser] Button clicked for module:', moduleId, moduleName);
                    
                    if (moduleId && moduleName) {
                        // Use VS Code command for installation (like sidebar)
                        vscode.postMessage({ 
                            command: 'installModuleFromWelcome',
                            moduleId: moduleId,
                            moduleName: moduleName
                        });
                    }
                });
            });
        }

        function filterByCategory(category) {
            currentCategory = category;
            
            // Update active button
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            event.target.classList.add('active');
            
            applyFilters();
        }

        function filterModules() {
            applyFilters();
        }

        function applyFilters() {
            const searchTerm = document.getElementById('moduleSearch').value.toLowerCase();
            const cards = document.querySelectorAll('.module-card');
            let visibleCount = 0;
            
            cards.forEach(card => {
                const category = card.getAttribute('data-category');
                const name = card.getAttribute('data-name').toLowerCase();
                const desc = card.querySelector('.module-desc').textContent.toLowerCase();
                
                const matchesCategory = currentCategory === 'all' || category === currentCategory;
                const matchesSearch = searchTerm === '' || name.includes(searchTerm) || desc.includes(searchTerm);
                
                if (matchesCategory && matchesSearch) {
                    card.classList.remove('hidden');
                    visibleCount++;
                } else {
                    card.classList.add('hidden');
                }
            });
            
            // Update count
            const countElement = document.getElementById('moduleCount');
            const totalModules = ${getTotalModuleCount()};
            if (searchTerm || currentCategory !== 'all') {
                countElement.textContent = \`\${visibleCount} module\${visibleCount !== 1 ? 's' : ''}\`;
            } else {
                countElement.textContent = \`\${totalModules} modules\`;
            }
        }

        function installModule(moduleName) {
            console.log('[installModule] Called with:', moduleName);
            console.log('[installModule] hasWorkspace:', hasWorkspace);
            console.log('[installModule] currentWorkspace:', currentWorkspace);
            
            // Check if workspace is open
            if (!hasWorkspace || !currentWorkspace || !currentWorkspace.path) {
                alert('⚠️ Please open or create a RapidKit workspace first!\\n\\nUse "File > Open Folder" to open an existing RapidKit project,\\nor create a new workspace using the Quick Actions above.');
                return;
            }
            
            // Show confirmation with workspace path
            const confirmed = confirm(
                'Install module "' + moduleName + '" to:\\n\\n📁 ' + currentWorkspace.name + '\\n📍 ' + currentWorkspace.path + '\\n\\nThis will run: rapidkit add module ' + moduleName + '\\n\\nContinue?'
            );
            
            if (!confirmed) {
                console.log('[installModule] User cancelled');
                return;
            }
            
            console.log('[installModule] User confirmed - starting installation');
            showProgressModal(moduleName);
            simulateInstallation(moduleName);
            
            // Send actual install command to backend
            vscode.postMessage({ 
                command: 'installModule',
                moduleName: moduleName,
                workspacePath: currentWorkspace.path
            });
        }

        function showProgressModal(moduleName) {
            const modal = document.getElementById('progressModal');
            const moduleNameEl = document.getElementById('progressModuleName');
            modal.classList.remove('hidden');
            moduleNameEl.textContent = moduleName;
            
            // Reset progress
            updateProgress(0, 'Preparing installation...');
            resetSteps();
        }

        function closeProgressModal() {
            document.getElementById('progressModal').classList.add('hidden');
        }

        function resetSteps() {
            for (let i = 1; i <= 4; i++) {
                const step = document.getElementById(\`step\${i}\`);
                const icon = step.querySelector('.step-icon');
                step.classList.remove('active', 'completed');
                icon.classList.remove('active', 'completed');
                icon.classList.add('pending');
                icon.textContent = '○';
            }
        }

        function updateProgress(percentage, status) {
            const bar = document.getElementById('progressBar');
            const percentageEl = document.getElementById('progressPercentage');
            const statusEl = document.getElementById('progressStatus');
            
            bar.style.width = percentage + '%';
            percentageEl.textContent = percentage + '%';
            statusEl.textContent = status;
        }

        function setStepActive(stepNumber) {
            const step = document.getElementById(\`step\${stepNumber}\`);
            const icon = step.querySelector('.step-icon');
            
            step.classList.add('active');
            icon.classList.remove('pending');
            icon.classList.add('active');
            icon.textContent = '●';
        }

        function setStepCompleted(stepNumber) {
            const step = document.getElementById(\`step\${stepNumber}\`);
            const icon = step.querySelector('.step-icon');
            
            step.classList.remove('active');
            step.classList.add('completed');
            icon.classList.remove('active');
            icon.classList.add('completed');
            icon.textContent = '✓';
        }

        function simulateInstallation(moduleName) {
            // Step 1: Downloading (0-25%)
            setTimeout(() => {
                setStepActive(1);
                updateProgress(10, 'Downloading package...');
            }, 500);
            
            setTimeout(() => {
                updateProgress(25, 'Download complete');
                setStepCompleted(1);
            }, 1500);
            
            // Step 2: Installing dependencies (25-50%)
            setTimeout(() => {
                setStepActive(2);
                updateProgress(30, 'Installing dependencies...');
            }, 2000);
            
            setTimeout(() => {
                updateProgress(50, 'Dependencies installed');
                setStepCompleted(2);
            }, 3500);
            
            // Step 3: Generating files (50-75%)
            setTimeout(() => {
                setStepActive(3);
                updateProgress(60, 'Generating module files...');
            }, 4000);
            
            setTimeout(() => {
                updateProgress(75, 'Files generated');
                setStepCompleted(3);
            }, 5500);
            
            // Step 4: Verifying (75-100%)
            setTimeout(() => {
                setStepActive(4);
                updateProgress(85, 'Verifying installation...');
            }, 6000);
            
            setTimeout(() => {
                updateProgress(100, 'Installation complete! ✓');
                setStepCompleted(4);
            }, 7000);
            
            // Close modal after success
            setTimeout(() => {
                closeProgressModal();
                vscode.postMessage({ 
                    command: 'showInfo',
                    message: \`Module "\${moduleName}" installed successfully!\`
                });
            }, 8000);
        }

        // Command Reference Functions
        function toggleCategory(categoryId) {
            const header = document.querySelector(\`#\${categoryId}-content\`).previousElementSibling;
            const content = document.getElementById(\`\${categoryId}-content\`);
            
            if (content.classList.contains('expanded')) {
                content.classList.remove('expanded');
                header.classList.remove('expanded');
            } else {
                content.classList.add('expanded');
                header.classList.add('expanded');
            }
        }

        function copyCommand(button, command) {
            // Copy to clipboard
            navigator.clipboard.writeText(command).then(() => {
                // Update button state
                const originalText = button.textContent;
                button.textContent = '✓ Copied!';
                button.classList.add('copied');
                
                // Reset after 2 seconds
                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
                button.textContent = '✗ Failed';
                setTimeout(() => {
                    button.textContent = '📋 Copy';
                }, 2000);
            });
        }

        // Expand first category by default on load
        document.addEventListener('DOMContentLoaded', () => {
            const firstCategory = document.getElementById('workspace-content');
            if (firstCategory) {
                firstCategory.classList.add('expanded');
                firstCategory.previousElementSibling.classList.add('expanded');
            }
        });
    </script>
</body>
</html>`;
  }

  private _getRecentWorkspaces() {
    try {
      const manager = WorkspaceManager.getInstance();
      const workspaces = manager.getWorkspaces();

      // Sort by last accessed time if available
      const sorted = workspaces.sort((a, b) => {
        const timeA = (a as any).lastAccessed || 0;
        const timeB = (b as any).lastAccessed || 0;
        return timeB - timeA;
      });

      return sorted.map((ws) => ({
        name: ws.name,
        path: ws.path,
        projectCount: ws.projects?.length || 0,
      }));
    } catch (error) {
      return [];
    }
  }

  private async _checkInstallationStatus() {
    const { execa } = await import('execa');
    const os = await import('os');

    const status = {
      // System info
      platform: process.platform, // 'win32', 'darwin', 'linux'
      isWindows: process.platform === 'win32',
      isMac: process.platform === 'darwin',
      isLinux: process.platform === 'linux',

      // Core requirements
      nodeInstalled: false,
      nodeVersion: null as string | null,
      npmInstalled: false,
      npmVersion: null as string | null,
      npmLocation: null as string | null,
      latestNpmVersion: null as string | null,

      // Python ecosystem
      pythonInstalled: false,
      pythonVersion: null as string | null,
      pythonNeedsUpgrade: false, // true if Python < 3.10 (minimum required for rapidkit-core)
      pipInstalled: false,
      pipVersion: null as string | null,
      pipxInstalled: false,
      pipxVersion: null as string | null,
      poetryInstalled: false,
      poetryVersion: null as string | null,

      // RapidKit packages
      coreInstalled: false,
      coreVersion: null as string | null,
      coreInstallType: null as 'global' | 'workspace' | null, // Track where Core is installed
      latestCoreVersion: null as string | null,
    };

    // Check Node.js (should always be available in VS Code)
    try {
      const result = await execa('node', ['--version'], {
        shell: status.isWindows,
        timeout: 2000,
      });
      status.nodeInstalled = true;
      status.nodeVersion = result.stdout.trim().replace('v', '');
    } catch {
      // Node not found (very unlikely in VS Code context)
    }

    // Check npm CLI package - use npx which is more reliable
    try {
      // Try npx first (most reliable for npm packages)
      const npxResult = await execa('npx', ['rapidkit', '--version'], {
        shell: status.isWindows,
        timeout: 3000,
      });
      const output = npxResult.stdout.trim();

      // npm CLI outputs plain version: "0.16.4"
      // pipx/Python outputs: "RapidKit Version v0.2.2rc1"
      if (output.includes('RapidKit Version') || output.includes('rapidkit-core')) {
        status.npmInstalled = false;
      } else if (/^[\d.]+$/.test(output) || output.includes('rapidkit')) {
        status.npmVersion = output.replace('rapidkit', '').trim();
        status.npmInstalled = true;
        status.npmLocation = 'npm global';
      } else {
        status.npmInstalled = false;
      }
    } catch {
      // Fallback: try direct rapidkit command
      try {
        const versionResult = await execa('rapidkit', ['--version'], {
          shell: status.isWindows,
          timeout: 3000,
        });
        const output = versionResult.stdout.trim();

        if (!output.includes('RapidKit Version') && !output.includes('rapidkit-core')) {
          if (/^[\d.]+$/.test(output)) {
            status.npmVersion = output;
            status.npmInstalled = true;
            status.npmLocation = 'npm global';
          }
        }
      } catch {
        status.npmInstalled = false;
      }
    }

    // Check Python - try multiple commands with proper priority
    // Windows: py (Python Launcher) is most reliable, avoid 'python' which might be MS Store stub
    // Linux/Mac: python3 is standard, fallback to python and specific versions
    const pythonCommands = status.isWindows
      ? ['py', 'python3', 'python']
      : ['python3', 'python', 'python3.10', 'python3.11', 'python3.12', 'python3.13'];

    for (const cmd of pythonCommands) {
      try {
        const result = await execa(cmd, ['--version'], {
          shell: status.isWindows,
          timeout: 2000,
        });
        status.pythonInstalled = true;
        const versionString = result.stdout.trim().replace('Python ', '');
        status.pythonVersion = versionString;

        // Check if Python version is below minimum required (3.10)
        // rapidkit-core requires Python >= 3.10
        const versionMatch = versionString.match(/^(\d+)\.(\d+)/);
        if (versionMatch) {
          const major = parseInt(versionMatch[1]);
          const minor = parseInt(versionMatch[2]);
          if (major < 3 || (major === 3 && minor < 10)) {
            status.pythonNeedsUpgrade = true;
          }
        }
        break;
      } catch {
        continue;
      }
    }

    // Check pip (only if Python is installed)
    if (status.pythonInstalled) {
      // Try different pip variants based on platform
      const pipVariants = status.isWindows
        ? [
            { cmd: 'py', args: ['-m', 'pip', '--version'] },
            { cmd: 'pip3', args: ['--version'] },
            { cmd: 'pip', args: ['--version'] },
          ]
        : [
            { cmd: 'pip3', args: ['--version'] },
            { cmd: 'pip', args: ['--version'] },
            { cmd: 'python3', args: ['-m', 'pip', '--version'] },
          ];

      for (const variant of pipVariants) {
        try {
          const result = await execa(variant.cmd, variant.args, {
            shell: status.isWindows,
            timeout: 3000,
          });
          status.pipInstalled = true;
          const versionMatch = result.stdout.match(/pip ([\d.]+)/);
          status.pipVersion = versionMatch ? versionMatch[1] : 'unknown';
          break;
        } catch {
          continue;
        }
      }
    }

    // Check pipx (only if Python and pip are installed)
    if (status.pythonInstalled && status.pipInstalled) {
      try {
        const result = await execa('pipx', ['--version'], {
          shell: status.isWindows,
          timeout: 3000,
        });
        status.pipxInstalled = true;
        status.pipxVersion =
          result.stdout.match(/pipx ([\d.]+)/)?.[1] ||
          result.stdout.match(/([\d.]+)/)?.[1] ||
          'unknown';
      } catch {
        status.pipxInstalled = false;
      }
    }

    // Check Poetry (only if Python and pip are installed)
    if (status.pythonInstalled && status.pipInstalled) {
      try {
        const result = await execa('poetry', ['--version'], {
          shell: status.isWindows,
          timeout: 3000,
        });
        status.poetryInstalled = true;
        status.poetryVersion =
          result.stdout.match(/Poetry .*version ([\d.]+)/)?.[1] ||
          result.stdout.match(/([\d.]+)/)?.[1] ||
          'unknown';
      } catch {
        status.poetryInstalled = false;
      }
    }

    // Comprehensive rapidkit-core detection - MUST verify it's Python package, not npm CLI
    const detectionMethods = [
      // Method 0: CRITICAL - Verify via direct Python import (most reliable)
      async () => {
        for (const cmd of pythonCommands) {
          try {
            const result = await execa(
              cmd,
              ['-c', 'import rapidkit_core; print(rapidkit_core.__version__)'],
              {
                shell: status.isWindows,
                timeout: 3000,
                reject: true, // Must throw if import fails
              }
            );
            const version = result.stdout.trim();
            // Verify it's a valid Python package version (not npm CLI)
            if (version && !version.includes('command not found')) {
              return version;
            }
          } catch {
            continue;
          }
        }
        return null;
      },

      // Method 2: python -m pip show
      async () => {
        for (const cmd of pythonCommands) {
          try {
            const result = await execa(cmd, ['-m', 'pip', 'show', 'rapidkit-core'], {
              shell: status.isWindows,
              timeout: 3000,
            });
            const versionMatch = result.stdout.match(/Version:\s*(\S+)/);
            if (versionMatch) {
              return versionMatch[1];
            }
          } catch {
            continue;
          }
        }
        return null;
      },

      // Method 3: Direct pip commands
      async () => {
        const pipCommands = status.isWindows ? ['pip', 'pip3'] : ['pip3', 'pip'];
        for (const cmd of pipCommands) {
          try {
            const result = await execa(cmd, ['show', 'rapidkit-core'], {
              shell: status.isWindows,
              timeout: 3000,
            });
            const versionMatch = result.stdout.match(/Version:\s*(\S+)/);
            if (versionMatch) {
              return versionMatch[1];
            }
          } catch {
            continue;
          }
        }
        return null;
      },

      // Method 4: pyenv (Unix only)
      async () => {
        if (status.isWindows) {
          return null;
        }
        try {
          const versionsResult = await execa('pyenv', ['versions', '--bare'], { timeout: 3000 });
          const versions = versionsResult.stdout.split('\n').filter((v) => v.trim());

          for (const version of versions) {
            try {
              const pyenvRoot = process.env.PYENV_ROOT || `${os.homedir()}/.pyenv`;
              const pipPath = `${pyenvRoot}/versions/${version.trim()}/bin/pip`;

              const result = await execa(pipPath, ['show', 'rapidkit-core'], { timeout: 2000 });
              const versionMatch = result.stdout.match(/Version:\s*(\S+)/);
              if (versionMatch) {
                return versionMatch[1];
              }
            } catch {
              continue;
            }
          }
        } catch {
          // pyenv not available
        }
        return null;
      },

      // Method 5: pipx - check rapidkit-core package with rapidkit command
      async () => {
        try {
          // First check if pipx has rapidkit-core installed
          const listResult = await execa('pipx', ['list'], {
            shell: status.isWindows,
            timeout: 3000,
            reject: false,
          });

          const listOutput = listResult.stdout + listResult.stderr;

          // pipx list shows: "package rapidkit-core 0.2.2rc1, installed using Python 3.10.19"
          // with exposed command: "- rapidkit"
          if (listOutput.includes('rapidkit-core')) {
            // CRITICAL CHECK: Detect broken symlinks
            // "symlink missing or pointing to unexpected location"
            if (
              listOutput.includes('symlink missing') ||
              listOutput.includes('unexpected location')
            ) {
              // pipx package is installed but symlink is broken
              // Return null to indicate broken installation
              console.log('[RapidKit] pipx symlink broken - needs repair');
              return null;
            }

            // Method 5a: Try the exposed rapidkit command
            try {
              const cmdResult = await execa('rapidkit', ['--version'], {
                shell: status.isWindows,
                timeout: 2000,
                reject: false,
              });
              const cmdOutput = cmdResult.stdout.trim();

              // Python Core outputs: "RapidKit Version v0.2.2rc1"
              // npm CLI outputs: "0.16.4" (plain version number)
              if (cmdOutput.includes('RapidKit') || cmdOutput.includes('Version')) {
                // This is the Python Core package
                const versionMatch = cmdOutput.match(/v?([\d.]+(?:rc\d+)?(?:a\d+)?(?:b\d+)?)/);
                if (versionMatch) {
                  return versionMatch[1];
                }
                return 'installed';
              }
            } catch {
              // Command failed - likely due to broken symlink
              console.log('[RapidKit] rapidkit command failed - checking Python import');
            }

            // Method 5b: Verify via Python import
            for (const cmd of pythonCommands) {
              try {
                const pyResult = await execa(
                  cmd,
                  ['-c', 'import rapidkit_core; print(rapidkit_core.__version__)'],
                  { shell: status.isWindows, timeout: 2000 }
                );
                const importedVersion = pyResult.stdout.trim();

                // Package exists but command doesn't work - broken symlink
                if (importedVersion) {
                  console.log('[RapidKit] Package exists but command broken - marking as broken');
                  // Return null to trigger reinstall
                  return null;
                }
              } catch {
                continue;
              }
            }

            // Found in pipx but can't verify at all - broken installation
            console.log('[RapidKit] pipx shows package but cannot verify - broken');
            return null;
          }
        } catch {
          // pipx not available, try direct command as fallback
        }

        // Fallback: Try rapidkit command even without pipx
        try {
          const cmdResult = await execa('rapidkit', ['--version'], {
            shell: status.isWindows,
            timeout: 2000,
            reject: false,
          });
          const cmdOutput = cmdResult.stdout.trim();

          if (cmdOutput.includes('RapidKit') || cmdOutput.includes('Version')) {
            const versionMatch = cmdOutput.match(/v?([\d.]+(?:rc\d+)?(?:a\d+)?(?:b\d+)?)/);
            if (versionMatch) {
              return versionMatch[1];
            }
            return 'installed';
          }
        } catch {
          // Command not available
        }

        return null;
      },

      // Method 6: Check pipx venv path directly (Linux/Mac)
      async () => {
        if (status.isWindows) {
          return null;
        }
        try {
          const fs = await import('fs-extra');
          const path = await import('path');
          const homedir = os.homedir();
          const venvPath = path.join(homedir, '.local', 'share', 'pipx', 'venvs', 'rapidkit-core');

          if (await fs.pathExists(venvPath)) {
            // Venv exists, try to get version from Python
            const pythonPath = path.join(venvPath, 'bin', 'python');
            if (await fs.pathExists(pythonPath)) {
              try {
                const result = await execa(
                  pythonPath,
                  ['-c', 'import rapidkit_core; print(rapidkit_core.__version__)'],
                  { timeout: 2000 }
                );
                return result.stdout.trim();
              } catch {
                // Venv exists but broken
              }
            }
          }
        } catch {
          // fs-extra not available or error
        }
        return null;
      },

      // Method 7: poetry show
      async () => {
        try {
          const result = await execa('poetry', ['show', 'rapidkit-core'], {
            shell: status.isWindows,
            reject: false,
            timeout: 3000,
          });
          if (result.exitCode === 0) {
            const versionMatch = result.stdout.match(/version\s+:\s+(\S+)/);
            if (versionMatch) {
              return versionMatch[1];
            }
            return 'installed';
          }
        } catch {
          // poetry not available
        }
        return null;
      },

      // Method 7: Check rapidkit CLI command (must distinguish from npm CLI)
      async () => {
        try {
          // Try to run rapidkit command and check output format
          const result = await execa('rapidkit', ['--version'], {
            shell: status.isWindows,
            timeout: 3000,
          });
          const output = result.stdout.trim();

          // Python Core outputs: "RapidKit Version v0.2.2rc1" or similar formatted output
          // npm CLI outputs: "0.16.4" (plain version number)

          if (output.includes('RapidKit Version') || output.includes('rapidkit-core')) {
            // This is Python Core
            const versionMatch = output.match(/v?([\d.]+(?:rc\d+)?(?:a\d+)?(?:b\d+)?)/i);
            if (versionMatch) {
              return versionMatch[1];
            }
          } else if (/^[\d.]+$/.test(output)) {
            // This is npm CLI (plain version), not Python Core
            return null;
          }
        } catch {
          // Command failed
        }
        return null;
      },

      // Method 8: conda
      async () => {
        try {
          const result = await execa('conda', ['list', 'rapidkit-core'], {
            shell: status.isWindows,
            timeout: 3000,
          });
          if (result.stdout.includes('rapidkit-core')) {
            const lines = result.stdout.split('\n');
            for (const line of lines) {
              if (line.includes('rapidkit-core')) {
                const parts = line.split(/\s+/);
                if (parts.length >= 2) {
                  return parts[1];
                }
              }
            }
            return 'installed';
          }
        } catch {
          // conda not available
        }
        return null;
      },
    ];

    // Try all methods until one succeeds
    for (let i = 0; i < detectionMethods.length; i++) {
      try {
        const version = await detectionMethods[i]();
        if (version) {
          // Got a version from one of the detection methods
          status.coreInstalled = true;
          status.coreVersion = version === 'installed' ? 'unknown' : version;

          // Determine install type based on detection method
          if (i === 4 || i === 5) {
            // Method 4-5: pipx or pipx venv path = global install
            status.coreInstallType = 'global';
          } else if (i === 6) {
            // Method 6: poetry show = workspace install
            status.coreInstallType = 'workspace';
          } else if (i === 0 || i === 1 || i === 2) {
            // Method 0-2: Python import/pip show - need to check if it's global or workspace
            // Try to determine by checking if pipx has it
            try {
              const pipxCheck = await execa('pipx', ['list'], {
                shell: status.isWindows,
                timeout: 2000,
                reject: false,
              });
              if (pipxCheck.stdout.includes('rapidkit-core')) {
                status.coreInstallType = 'global';
              } else {
                // Not in pipx, probably workspace or user install
                status.coreInstallType = 'workspace';
              }
            } catch {
              // Can't determine, assume workspace
              status.coreInstallType = 'workspace';
            }
          } else {
            // Other methods - assume global
            status.coreInstallType = 'global';
          }
          break;
        }
      } catch {
        continue;
      }
    }

    // Check npm CLI installation (separate from Core)
    const fetchJson = (url: string): Promise<any> => {
      return new Promise((resolve, reject) => {
        const https = require('https');
        https
          .get(url, (res: any) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
              // Handle redirects
              fetchJson(res.headers.location).then(resolve).catch(reject);
              return;
            }
            if (res.statusCode !== 200) {
              reject(new Error(`HTTP ${res.statusCode}`));
              return;
            }
            let data = '';
            res.on('data', (chunk: string) => {
              data += chunk;
            });
            res.on('end', () => {
              try {
                resolve(JSON.parse(data));
              } catch (e) {
                reject(e);
              }
            });
          })
          .on('error', reject);
      });
    };

    // Fetch latest versions from remote registries
    try {
      // Get latest npm version
      try {
        const npmResult = await execa('npm', ['view', 'rapidkit', 'version'], { timeout: 5000 });
        status.latestNpmVersion = npmResult.stdout.trim();
      } catch {
        // Fallback: try Node.js https module (cross-platform)
        try {
          const data = await fetchJson('https://registry.npmjs.org/rapidkit/latest');
          status.latestNpmVersion = data.version;
        } catch (fetchErr) {
          console.log('[RapidKit] npm https also failed:', fetchErr);
        }
      }

      // Get latest  RapidKit Core version from PyPI (using Node.js https module)
      try {
        const data = await fetchJson('https://pypi.org/pypi/rapidkit-core/json');

        // Get latest version from info field (most reliable)
        if (data.info && data.info.version) {
          status.latestCoreVersion = data.info.version;
        } else {
          // Fallback: try to find latest from releases
          const releases = Object.keys(data.releases || {});
          console.log('[RapidKit] Available releases count:', releases.length);
          if (releases.length > 0) {
            // Sort releases semver-wise (simplified)
            releases.sort((a, b) => {
              const aParts = a.split('.').map((p) => {
                // Handle rc, alpha, beta suffixes
                const num = parseInt(p.match(/\d+/)?.[0] || '0');
                const suffix = p.match(/[a-z]+/)?.[0] || '';
                return { num, suffix };
              });
              const bParts = b.split('.').map((p) => {
                const num = parseInt(p.match(/\d+/)?.[0] || '0');
                const suffix = p.match(/[a-z]+/)?.[0] || '';
                return { num, suffix };
              });

              for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
                const aPart = aParts[i] || { num: 0, suffix: '' };
                const bPart = bParts[i] || { num: 0, suffix: '' };
                if (aPart.num !== bPart.num) {
                  return bPart.num - aPart.num;
                }
                // rc > alpha > beta
                const suffixOrder = { '': 3, rc: 2, alpha: 1, beta: 1 };
                const aOrder = suffixOrder[aPart.suffix as keyof typeof suffixOrder] || 0;
                const bOrder = suffixOrder[bPart.suffix as keyof typeof suffixOrder] || 0;
                if (aOrder !== bOrder) {
                  return bOrder - aOrder;
                }
              }
              return 0;
            });
            status.latestCoreVersion = releases[0];
            console.log('[RapidKit] Latest core from sorted releases:', status.latestCoreVersion);
          }
        }
      } catch (pypiErr) {
        console.log('[RapidKit] PyPI fetch failed:', pypiErr);
      }
    } catch (networkErr) {
      // Network errors, just continue without latest versions
      console.log('[RapidKit] Network error fetching versions:', networkErr);
    }

    // Debug: log final status before returning
    console.log(
      '[RapidKit] Final status:',
      JSON.stringify({
        npmInstalled: status.npmInstalled,
        npmVersion: status.npmVersion,
        latestNpmVersion: status.latestNpmVersion,
        coreInstalled: status.coreInstalled,
        coreVersion: status.coreVersion,
        coreInstallType: status.coreInstallType,
        latestCoreVersion: status.latestCoreVersion,
      })
    );

    return status;
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
