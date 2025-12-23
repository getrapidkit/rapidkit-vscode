/**
 * Welcome Panel
 * Webview panel showing welcome page with quick actions
 */

import * as vscode from 'vscode';

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
      (message) => {
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
          case 'openDocs':
            vscode.env.openExternal(vscode.Uri.parse('https://getrapidkit.com/docs'));
            break;
          case 'openGitHub':
            vscode.env.openExternal(vscode.Uri.parse('https://github.com/rapidkit/rapidkit'));
            break;
          case 'openMarketplace':
            vscode.env.openExternal(
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
            padding: 40px 20px;
        }
        .container {
            max-width: 900px;
            margin: 0 auto;
        }
        .header {
            text-align: center;
            margin-bottom: 50px;
        }
        .logo {
            width: 96px;
            height: 96px;
            margin-bottom: 16px;
            animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        h1 {
            font-family: 'MuseoModerno', var(--vscode-font-family);
            font-size: 2.8rem;
            font-weight: 700;
            margin-bottom: 12px;
        }
        h1 .rapid {
            color: #00cfc1;
        }
        h1 .kit {
            color: var(--vscode-foreground);
        }
        .tagline {
            font-size: 1.1rem;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 12px;
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
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            margin-bottom: 50px;
        }
        .action-card {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 12px;
            padding: 24px;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }
        .action-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, var(--card-color, #00cfc1), transparent);
            opacity: 0;
            transition: opacity 0.3s;
        }
        .action-card:hover {
            transform: translateY(-4px);
            border-color: var(--card-color, #00cfc1);
            box-shadow: 0 8px 25px rgba(0,207,193,0.15);
        }
        .action-card:hover::before {
            opacity: 1;
        }
        .action-card.fastapi { --card-color: #009688; }
        .action-card.nestjs { --card-color: #E0234E; }
        .action-card.workspace { --card-color: #00cfc1; }
        .action-card.doctor { --card-color: #FF9800; }
        
        .action-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 12px;
        }
        .action-icon {
            font-size: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .action-icon img {
            width: 28px;
            height: 28px;
        }
        .action-title {
            font-family: 'MuseoModerno', var(--vscode-font-family);
            font-size: 18px;
            font-weight: 700;
        }
        .action-description {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            line-height: 1.5;
        }
        .action-badge {
            position: absolute;
            top: 12px;
            right: 12px;
            background: var(--card-color, #00cfc1);
            color: white;
            font-size: 10px;
            padding: 2px 8px;
            border-radius: 10px;
            font-weight: 600;
        }

        .section {
            margin-bottom: 40px;
        }
        .section-title {
            font-family: 'MuseoModerno', var(--vscode-font-family);
            font-size: 1.2rem;
            font-weight: 700;
            margin-bottom: 20px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        
        .features {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
        }
        .feature {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 12px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 8px;
            font-size: 13px;
            border: 1px solid transparent;
            transition: all 0.2s;
        }
        .feature:hover {
            border-color: #00cfc1;
        }
        .feature-icon {
            font-size: 18px;
        }
        
        .shortcuts {
            display: flex;
            justify-content: center;
            gap: 30px;
            flex-wrap: wrap;
        }
        .shortcut {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
        }
        .kbd {
            background: var(--vscode-button-secondaryBackground);
            padding: 4px 8px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 11px;
            border: 1px solid var(--vscode-panel-border);
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

        @media (max-width: 600px) {
            .actions { grid-template-columns: 1fr; }
            .features { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img class="logo" src="${iconUri}" alt="RapidKit Logo" />
            <h1><span class="rapid">Rapid</span><span class="kit">Kit</span></h1>
            <p class="tagline">Scaffold production-ready APIs with clean architecture</p>
            <span class="version">v${version}</span>
        </div>

        <div class="actions">
            <div class="action-card workspace" onclick="createWorkspace()">
                <span class="action-badge">Start Here</span>
                <div class="action-header">
                    <span class="action-icon">📂</span>
                    <span class="action-title">Create Workspace</span>
                </div>
                <div class="action-description">
                    Set up a workspace to organize your projects
                </div>
            </div>

            <div class="action-card fastapi" onclick="createFastAPIProject()">
                <div class="action-header">
                    <span class="action-icon"><img src="${fastapiIconUri}" alt="FastAPI" /></span>
                    <span class="action-title">FastAPI Project</span>
                </div>
                <div class="action-description">
                    Python backend with async support, auto docs & type hints
                </div>
            </div>

            <div class="action-card nestjs" onclick="createNestJSProject()">
                <div class="action-header">
                    <span class="action-icon"><img src="${nestjsIconUri}" alt="NestJS" /></span>
                    <span class="action-title">NestJS Project</span>
                </div>
                <div class="action-description">
                    TypeScript backend with decorators, DI & modules
                </div>
            </div>

            <div class="action-card doctor" onclick="runDoctor()">
                <div class="action-header">
                    <span class="action-icon">🩺</span>
                    <span class="action-title">System Check</span>
                </div>
                <div class="action-description">
                    Verify Node.js and dependencies are ready
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">✨ Features</div>
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
        function openDocs() {
            vscode.postMessage({ command: 'openDocs' });
        }
        function openGitHub() {
            vscode.postMessage({ command: 'openGitHub' });
        }
        function openMarketplace() {
            vscode.postMessage({ command: 'openMarketplace' });
        }
    </script>
</body>
</html>`;
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
