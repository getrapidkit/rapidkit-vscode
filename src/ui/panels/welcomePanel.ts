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
          case 'installPipCore': {
            const terminalPip = vscode.window.createTerminal('Install RapidKit Core');
            terminalPip.show();
            terminalPip.sendText('pip install rapidkit-core');
            break;
          }
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
            margin-bottom: 32px;
        }
        .logo {
            width: 64px;
            height: 64px;
            margin-bottom: 12px;
            animation: float 3s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-10px); }
        }
        h1 {
            font-family: 'MuseoModerno', var(--vscode-font-family);
            font-size: 2rem;
            font-weight: 700;
            margin-bottom: 8px;
        }
        h1 .rapid {
            color: #00cfc1;
        }
        h1 .kit {
            color: var(--vscode-foreground);
        }
        .tagline {
            font-size: 0.95rem;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 8px;
            line-height: 1.4;
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
            margin-bottom: 40px;
        }
        
        /* Hero Action */
        .hero-action {
            background: linear-gradient(135deg, rgba(0,207,193,0.1), rgba(0,150,136,0.1));
            border: 2px solid var(--vscode-panel-border);
            border-radius: 16px;
            padding: 28px 32px;
            text-align: center;
            margin-bottom: 20px;
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
            font-size: 36px;
            margin-bottom: 12px;
            display: inline-block;
            animation: float 3s ease-in-out infinite;
        }
        .hero-title {
            font-family: 'MuseoModerno', var(--vscode-font-family);
            font-size: 20px;
            font-weight: 700;
            margin-bottom: 6px;
        }
        .hero-description {
            font-size: 13px;
            color: var(--vscode-descriptionForeground);
            margin-bottom: 16px;
            line-height: 1.4;
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
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
        }
        .quick-link {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 10px;
            padding: 20px;
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
        
        .quick-link-icon {
            font-size: 28px;
            margin-bottom: 10px;
            display: block;
        }
        .quick-link-icon img {
            width: 28px;
            height: 28px;
        }
        .quick-link-title {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 4px;
        }
        .quick-link-subtitle {
            font-size: 11px;
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

        @media (max-width: 600px) {
            .actions { grid-template-columns: 1fr; }
            .features { grid-template-columns: 1fr; }
            .ecosystem { grid-template-columns: 1fr; }
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
                    <span class="quick-link-icon">🩺</span>
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
                        <span class="ecosystem-icon">🎨</span>
                        <span class="ecosystem-title">VS Code</span>
                        <span class="ecosystem-badge">THIS</span>
                    </div>
                    <div class="ecosystem-desc">
                        Visual interface with one-click setup, sidebar navigation & system diagnostics
                    </div>
                    <div class="ecosystem-buttons">
                        <button class="ecosystem-btn" onclick="openMarketplace()">
                            <span class="btn-icon">📦</span> Marketplace
                        </button>
                    </div>
                </div>

                <div class="ecosystem-card npm">
                    <div class="ecosystem-header">
                        <span class="ecosystem-icon">📦</span>
                        <span class="ecosystem-title">npm Package</span>
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
                        <span class="ecosystem-title">Python Core</span>
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
