/**
 * Welcome Panel
 * Webview panel showing welcome page with quick actions
 */

import * as vscode from 'vscode';
import { WorkspaceManager } from '../../core/workspaceManager';

export class WelcomePanel {
  public static currentPanel: WelcomePanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

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
          case 'installNpmGlobal': {
            const terminal = vscode.window.createTerminal('Install RapidKit CLI');
            terminal.show();
            terminal.sendText('npm install -g rapidkit');
            break;
          }
          case 'upgradeNpmGlobal': {
            const terminal = vscode.window.createTerminal('Upgrade RapidKit CLI');
            terminal.show();
            terminal.sendText('npm install -g rapidkit@latest');
            break;
          }
          case 'installPipCore': {
            const terminalPip = vscode.window.createTerminal('Install RapidKit Core');
            terminalPip.show();
            terminalPip.sendText('pip install rapidkit-core');
            break;
          }
          case 'upgradePipCore': {
            const terminalPip = vscode.window.createTerminal('Upgrade RapidKit Core');
            terminalPip.show();
            terminalPip.sendText('pip install --upgrade rapidkit-core');
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

  public static refresh(context: vscode.ExtensionContext) {
    if (WelcomePanel.currentPanel) {
      WelcomePanel.currentPanel._panel.webview.html =
        WelcomePanel.currentPanel._getHtmlContent(context);
    }
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

        /* Ecosystem Section */
        .ecosystem {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 16px;
            margin-bottom: 30px;
        }
        .ecosystem-card {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 2px solid var(--vscode-panel-border);
            border-radius: 10px;
            padding: 18px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }
        .ecosystem-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: var(--card-accent, #00cfc1);
            opacity: 0;
            transition: opacity 0.3s;
        }
        .ecosystem-card:hover {
            border-color: var(--card-accent, #00cfc1);
            transform: translateY(-2px);
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .ecosystem-card:hover::before {
            opacity: 1;
        }
        .ecosystem-card.npm { --card-accent: #CB3837; }
        .ecosystem-card.pypi { --card-accent: #3775A9; }
        .ecosystem-card.vscode { --card-accent: #007ACC; }
        
        .ecosystem-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 10px;
        }
        .ecosystem-icon {
            font-size: 22px;
            line-height: 1;
        }
        .ecosystem-title {
            font-family: 'MuseoModerno', var(--vscode-font-family);
            font-size: 15px;
            font-weight: 700;
            flex: 1;
        }
        .ecosystem-badge {
            background: var(--card-accent, #00cfc1);
            color: white;
            font-size: 9px;
            padding: 3px 7px;
            border-radius: 10px;
            font-weight: 700;
            letter-spacing: 0.5px;
        }
        .ecosystem-desc {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 14px;
            line-height: 1.5;
            min-height: 36px;
        }
        .ecosystem-buttons {
            display: flex;
            flex-direction: column;
            gap: 6px;
        }
        .ecosystem-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-panel-border);
            padding: 7px 12px;
            border-radius: 6px;
            font-size: 11px;
            cursor: pointer;
            transition: all 0.2s;
            text-align: center;
            font-weight: 500;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        .ecosystem-btn:hover {
            background: var(--card-accent, #00cfc1);
            color: white;
            border-color: var(--card-accent, #00cfc1);
            transform: scale(1.02);
        }
        .ecosystem-btn.primary {
            background: var(--card-accent, #00cfc1);
            color: white;
            border-color: var(--card-accent, #00cfc1);
            font-weight: 600;
        }
        .ecosystem-btn.primary:hover {
            opacity: 0.85;
            transform: scale(1.02);
        }
        .btn-icon {
            font-size: 13px;
        }

        /* Setup Wizard Styles */
        .setup-wizard {
            background: linear-gradient(135deg, rgba(0,207,193,0.05), rgba(0,150,136,0.05));
            border: 2px solid var(--vscode-panel-border);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 24px;
        }
        .setup-wizard.hidden {
            display: none;
        }
        .wizard-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
        }
        .wizard-title {
            font-size: 15px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .wizard-subtitle {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
        }
        .wizard-steps {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 12px;
        }
        .wizard-step {
            background: var(--vscode-editor-background);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 12px;
            position: relative;
        }
        .wizard-step.installed {
            border-color: #4CAF50;
            background: rgba(76, 175, 80, 0.05);
        }
        .wizard-step.not-installed {
            border-color: #FF9800;
            background: rgba(255, 152, 0, 0.05);
        }
        .step-header {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 8px;
        }
        .step-icon {
            font-size: 20px;
        }
        .step-title {
            font-size: 13px;
            font-weight: 700;
            flex: 1;
        }
        .step-status {
            font-size: 16px;
        }
        .step-status.loading {
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .step-details {
            font-size: 11px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
            line-height: 1.4;
        }
        .step-version {
            font-weight: 600;
            color: #4CAF50;
            font-size: 12px;
        }
        .step-actions {
            display: flex;
            gap: 6px;
        }
        .step-btn {
            flex: 1;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 6px 10px;
            border-radius: 4px;
            font-size: 10px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 600;
        }
        .step-btn:hover {
            background: var(--vscode-button-hoverBackground);
            transform: scale(1.02);
        }
        .step-btn.secondary {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
        }
        .step-btn.secondary:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .wizard-footer {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding-top: 12px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        .wizard-progress {
            font-size: 12px;
            color: var(--vscode-descriptionForeground);
        }
        .wizard-actions {
            display: flex;
            gap: 8px;
        }
        .wizard-btn {
            background: var(--vscode-button-secondaryBackground);
            color: var(--vscode-button-secondaryForeground);
            border: 1px solid var(--vscode-panel-border);
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s;
            font-weight: 500;
        }
        .wizard-btn:hover {
            background: var(--vscode-button-secondaryHoverBackground);
        }
        .wizard-btn.primary {
            background: linear-gradient(135deg, #00cfc1, #009688);
            color: white;
            border: none;
        }
        .wizard-btn.primary:hover {
            opacity: 0.9;
        }
        .wizard-btn.primary:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }

        @media (max-width: 600px) {
            .actions { grid-template-columns: 1fr; }
            .features { grid-template-columns: 1fr; }
            .ecosystem { grid-template-columns: 1fr; }
            .wizard-steps { grid-template-columns: 1fr; }
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
            <span class="version">v${version}</span>
        </div>

        <!-- Setup Wizard -->
        <div class="setup-wizard" id="setupWizard">
            <div class="wizard-header">
                <div>
                    <div class="wizard-title">🚀 Setup Status</div>
                    <div class="wizard-subtitle">Extension v${version} • <span id="versionInfo">Checking...</span></div>
                </div>
                <button class="wizard-btn" onclick="hideWizard()" style="border: none; background: transparent; cursor: pointer; font-size: 16px;">✕</button>
            </div>
            
            <div class="wizard-steps">
                <!-- RapidKit CLI Step -->
                <div class="wizard-step" id="npmStep">
                    <div class="step-header">
                        <span class="step-icon">📦</span>
                        <span class="step-title">RapidKit CLI</span>
                        <span class="step-status loading" id="npmStatus">⏳</span>
                    </div>
                    <div class="step-details" id="npmDetails">
                        Checking...
                    </div>
                    <div class="step-actions" id="npmActions" style="display: none;">
                        <button class="step-btn" onclick="installNpmCLI()">⚡ Install</button>
                        <button class="step-btn secondary" onclick="openNpmPackage()">📄 Docs</button>
                    </div>
                    <div class="step-actions" id="npmUpgrade" style="display: none;">
                        <button class="step-btn" onclick="upgradeNpm()" style="background: linear-gradient(135deg, #00BFA5, #00CFC1); border: none;">⬆ Upgrade</button>
                        <button class="step-btn secondary" onclick="openNpmPackage()">📄 Docs</button>
                    </div>
                </div>

                <!-- RapidKit Core Step -->
                <div class="wizard-step" id="coreStep">
                    <div class="step-header">
                        <span class="step-icon">🐍</span>
                        <span class="step-title">RapidKit Core</span>
                        <span class="step-status loading" id="coreStatus">⏳</span>
                    </div>
                    <div class="step-details" id="coreDetails">
                        Checking...
                    </div>
                    <div class="step-actions" id="coreActions" style="display: none;">
                        <button class="step-btn" onclick="installPythonCore()">🔧 Install</button>
                        <button class="step-btn secondary" onclick="openPyPI()">🐍 PyPI</button>
                    </div>
                    <div class="step-actions" id="coreUpgrade" style="display: none;">
                        <button class="step-btn" onclick="upgradeCore()" style="background: linear-gradient(135deg, #00BFA5, #00CFC1); border: none;">⬆ Upgrade</button>
                        <button class="step-btn secondary" onclick="openPyPI()">🐍 PyPI</button>
                    </div>
                </div>
            </div>

            <div class="wizard-footer">
                <div class="wizard-progress" id="wizardProgress">Checking...</div>
                <div class="wizard-actions">
                    <button class="wizard-btn" onclick="refreshWizard()">↻</button>
                    <button class="wizard-btn primary" onclick="finishSetup()" id="finishBtn" disabled>
                        ✓ Run Doctor
                    </button>
                </div>
            </div>
        </div>

        <!-- Recent Workspaces Section -->
        <div class="section recent-workspaces" id="recentWorkspaces">
            <div class="section-title" style="display: flex; align-items: center; justify-content: space-between;">
                <span>📂 Recent Workspaces</span>
                <button class="wizard-btn" onclick="refreshWorkspaces()" style="font-size: 14px; padding: 6px 12px; margin: 0;" title="Refresh workspaces">↻</button>
            </div>
            <div class="workspace-list" id="workspaceList">
                <!-- Will be populated by JavaScript -->
            </div>
        </div>

        <div class="actions">
            <!-- Hero Action: Primary CTA -->
            <div class="hero-action" onclick="createWorkspace()">
                <div class="hero-icon">🚀</div>
                <div class="hero-title">Create Your First Workspace</div>
                <div class="hero-description">
                    Organize multiple microservices in one environment
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

                <div class="quick-link modules" onclick="browseModules()">
                    <span class="quick-link-icon">🧩</span>
                    <div class="quick-link-title">Modules</div>
                    <div class="quick-link-subtitle">Auth, DB, Cache...</div>
                    <span class="quick-link-badge">27+ Free</span>
                </div>

                <div class="quick-link doctor" onclick="runDoctor()">
                    <span class="quick-link-icon">🔍</span>
                    <div class="quick-link-title">System Check</div>
                    <div class="quick-link-subtitle">Verify setup</div>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">🌐 RapidKit Ecosystem</div>
            <div class="ecosystem">
                <div class="ecosystem-card vscode">
                    <div class="ecosystem-header">
                        <span class="ecosystem-icon">💻</span>
                        <span class="ecosystem-title">VS Code Extension</span>
                        <span class="ecosystem-badge">THIS</span>
                    </div>
                    <div class="ecosystem-desc">
                        Visual interface with one-click setup, sidebar navigation & system diagnostics
                    </div>
                    <div class="ecosystem-buttons">
                        <button class="ecosystem-btn" onclick="openMarketplace()">
                            <span class="btn-icon">⭐</span> Marketplace
                        </button>
                    </div>
                </div>

                <div class="ecosystem-card npm">
                    <div class="ecosystem-header">
                        <span class="ecosystem-icon">📦</span>
                        <span class="ecosystem-title">NPM Package</span>
                        <span class="ecosystem-badge">CLI</span>
                    </div>
                    <div class="ecosystem-desc">
                        Command-line tool for advanced workflows, automation & CI/CD pipelines
                    </div>
                    <div class="ecosystem-buttons">
                        <button class="ecosystem-btn primary" onclick="installNpmGlobal()">
                            <span class="btn-icon">⚡</span> Install CLI
                        </button>
                        <button class="ecosystem-btn" onclick="openNpmPackage()">
                            <span class="btn-icon">📄</span> View Docs
                        </button>
                    </div>
                </div>

                <div class="ecosystem-card pypi">
                    <div class="ecosystem-header">
                        <span class="ecosystem-icon">🐍</span>
                        <span class="ecosystem-title">RapidKit Core</span>
                        <span class="ecosystem-badge">ENGINE</span>
                    </div>
                    <div class="ecosystem-desc">
                        Generation engine with 27+ modules (auto-installed by Extension & npm)
                    </div>
                    <div class="ecosystem-buttons">
                        <button class="ecosystem-btn" onclick="openPyPI()">
                            <span class="btn-icon">🐍</span> PyPI Page
                        </button>
                        <button class="ecosystem-btn" onclick="installPipCore()">
                            <span class="btn-icon">🔧</span> Manual Install
                        </button>
                    </div>
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

        // Handle messages from extension
        window.addEventListener('message', event => {
            const message = event.data;
            if (message.command === 'installStatusUpdate') {
                updateWizardUI(message.data);
            } else if (message.command === 'workspacesUpdate') {
                recentWorkspaces = message.data;
                populateRecentWorkspaces();
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
                versionInfo.innerHTML = \`<span style="color: #FF9800;">⚠ Update available (v\${latestExtVersion})</span> <a href="#" onclick="openMarketplace()" style="color: #00cfc1; text-decoration: none;">Update</a>\`;
            } else {
                versionInfo.textContent = 'Up to date';
            }

            // Update npm step
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
                    console.log('[RapidKit] npm update available:', status.npmVersion, '→', status.latestNpmVersion);
                    npmDisplay += \` <span style="color: #FF9800; margin-left: 8px;">→ v\${status.latestNpmVersion} available</span>\`;
                    npmActions.style.display = 'none';
                    npmUpgrade.style.display = 'flex';
                } else if (status.latestNpmVersion) {
                    console.log('[RapidKit] npm latest:', status.latestNpmVersion, 'current:', status.npmVersion, 'is newer:', isNewerVersion(status.npmVersion, status.latestNpmVersion));
                    npmActions.style.display = 'none';
                    npmUpgrade.style.display = 'none';
                } else {
                    npmActions.style.display = 'none';
                    npmUpgrade.style.display = 'none';
                }
                npmDetails.innerHTML = npmDisplay;
            } else {
                npmStep.classList.remove('installed');
                npmStep.classList.add('not-installed');
                npmStatus.textContent = '⚠';
                npmStatus.classList.remove('loading');
                npmDetails.innerHTML = 'Not installed';
                npmActions.style.display = 'flex';
                npmUpgrade.style.display = 'none';
            }

            // Update core step
            const coreStep = document.getElementById('coreStep');
            const coreStatus = document.getElementById('coreStatus');
            const coreDetails = document.getElementById('coreDetails');
            const coreActions = document.getElementById('coreActions');
            const coreUpgrade = document.getElementById('coreUpgrade');

            if (status.coreInstalled) {
                coreStep.classList.remove('not-installed');
                coreStep.classList.add('installed');
                coreStatus.textContent = '✓';
                coreStatus.classList.remove('loading');
                
                let coreDisplay = \`<span class="step-version">v\${status.coreVersion}</span>\`;
                if (status.latestCoreVersion && isNewerVersion(status.coreVersion, status.latestCoreVersion)) {
                    console.log('[RapidKit] core update available:', status.coreVersion, '→', status.latestCoreVersion);
                    coreDisplay += \` <span style="color: #FF9800; margin-left: 8px;">→ v\${status.latestCoreVersion} available</span>\`;
                    coreActions.style.display = 'none';
                    coreUpgrade.style.display = 'flex';
                } else if (status.latestCoreVersion) {
                    console.log('[RapidKit] core latest:', status.latestCoreVersion, 'current:', status.coreVersion, 'is newer:', isNewerVersion(status.coreVersion, status.latestCoreVersion));
                    coreActions.style.display = 'none';
                    coreUpgrade.style.display = 'none';
                } else {
                    coreActions.style.display = 'none';
                    coreUpgrade.style.display = 'none';
                }
                coreDetails.innerHTML = coreDisplay;
            } else {
                coreStep.classList.remove('installed');
                coreStep.classList.add('not-installed');
                coreStatus.textContent = '⚠';
                coreStatus.classList.remove('loading');
                coreDetails.innerHTML = 'Not installed';
                coreActions.style.display = 'flex';
                coreUpgrade.style.display = 'none';
            }

            // Update progress
            const progress = document.getElementById('wizardProgress');
            const installedCount = (status.npmInstalled ? 1 : 0) + (status.coreInstalled ? 1 : 0);
            
            if (installedCount === 2) {
                progress.textContent = '✅ Ready to create workspaces';
                document.getElementById('finishBtn').disabled = false;
            } else if (installedCount === 1) {
                progress.textContent = \`⚡ \${installedCount}/2 installed\`;
                document.getElementById('finishBtn').disabled = true;
            } else {
                progress.textContent = '⚠ Components not installed';
                document.getElementById('finishBtn').disabled = true;
            }
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
            document.getElementById('npmStatus').textContent = '⏳';
            document.getElementById('npmStatus').classList.add('loading');
            document.getElementById('coreStatus').textContent = '⏳';
            document.getElementById('coreStatus').classList.add('loading');
            
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
      pipInstalled: false,
      pipVersion: null as string | null,
      poetryInstalled: false,
      poetryVersion: null as string | null,

      // RapidKit packages
      coreInstalled: false,
      coreVersion: null as string | null,
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

    // Check npm package - must be globally installed
    try {
      const result = await execa('npm', ['list', '-g', 'rapidkit', '--depth=0'], {
        shell: status.isWindows,
        timeout: 5000,
      });

      if (result.stdout.includes('rapidkit')) {
        try {
          const versionResult = await execa('rapidkit', ['--version'], {
            shell: status.isWindows,
            timeout: 2000,
          });
          status.npmVersion = versionResult.stdout.trim();
          status.npmInstalled = true;
          status.npmLocation = 'npm global';
        } catch {
          status.npmVersion = 'unknown';
          status.npmInstalled = true;
          status.npmLocation = 'npm global';
        }
      }
    } catch {
      status.npmInstalled = false;
    }

    // Check Python - try multiple commands (python3, python, python.exe on Windows)
    const pythonCommands = status.isWindows
      ? ['python', 'python3', 'py']
      : ['python3', 'python', 'python3.10', 'python3.11', 'python3.12'];

    for (const cmd of pythonCommands) {
      try {
        const result = await execa(cmd, ['--version'], {
          shell: status.isWindows,
          timeout: 2000,
        });
        status.pythonInstalled = true;
        status.pythonVersion = result.stdout.trim().replace('Python ', '');
        break;
      } catch {
        continue;
      }
    }

    // Check pip (only if Python is installed)
    if (status.pythonInstalled) {
      const pipCommands = status.isWindows ? ['pip', 'pip3', 'py -m pip'] : ['pip3', 'pip'];

      for (const cmd of pipCommands) {
        try {
          const args = cmd.includes(' ')
            ? cmd.split(' ').slice(1).concat(['--version'])
            : ['--version'];
          const executable = cmd.includes(' ') ? cmd.split(' ')[0] : cmd;

          const result = await execa(executable, args, {
            shell: status.isWindows,
            timeout: 2000,
          });
          status.pipInstalled = true;
          status.pipVersion = result.stdout.match(/pip ([\d.]+)/)?.[1] || 'unknown';
          break;
        } catch {
          continue;
        }
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

    // Comprehensive rapidkit-core detection
    const detectionMethods = [
      // Method 1: Try Python import
      async () => {
        for (const cmd of pythonCommands) {
          try {
            const result = await execa(
              cmd,
              ['-c', 'import rapidkit_core; print(rapidkit_core.__version__)'],
              {
                shell: status.isWindows,
                timeout: 3000,
              }
            );
            return result.stdout.trim();
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

      // Method 5: pipx
      async () => {
        try {
          const result = await execa('pipx', ['list'], {
            shell: status.isWindows,
            timeout: 3000,
          });
          if (result.stdout.includes('rapidkit-core')) {
            const versionMatch = result.stdout.match(/rapidkit-core\s+(\S+)/);
            if (versionMatch) {
              return versionMatch[1];
            }
            return 'installed';
          }
        } catch {
          // pipx not available
        }
        return null;
      },

      // Method 6: poetry show
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

      // Method 7: conda
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
    for (const method of detectionMethods) {
      try {
        const version = await method();
        if (version) {
          status.coreInstalled = true;
          status.coreVersion = version;
          break;
        }
      } catch {
        continue;
      }
    }

    // Helper function to fetch JSON from HTTPS URL (using Node.js https module for extension compatibility)
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
