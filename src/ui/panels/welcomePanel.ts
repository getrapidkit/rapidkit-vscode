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

  private _getHtmlContent(_context: vscode.ExtensionContext): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to RapidKit</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
        }
        .header {
            text-align: center;
            margin-bottom: 40px;
        }
        .logo {
            font-size: 64px;
            margin-bottom: 20px;
        }
        h1 {
            color: var(--vscode-textLink-foreground);
            margin: 0;
        }
        .subtitle {
            color: var(--vscode-descriptionForeground);
            margin-top: 10px;
        }
        .actions {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 40px 0;
        }
        .action-card {
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border);
            border-radius: 8px;
            padding: 20px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .action-card:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: var(--vscode-textLink-foreground);
            transform: translateY(-2px);
        }
        .action-icon {
            font-size: 32px;
            margin-bottom: 10px;
        }
        .action-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--vscode-textLink-foreground);
        }
        .action-description {
            font-size: 14px;
            color: var(--vscode-descriptionForeground);
        }
        .features {
            margin: 40px 0;
        }
        .feature-list {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
        }
        .feature-item {
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .feature-icon {
            font-size: 20px;
        }
        .links {
            margin-top: 40px;
            text-align: center;
        }
        .link {
            color: var(--vscode-textLink-foreground);
            text-decoration: none;
            margin: 0 15px;
        }
        .link:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🚀</div>
        <h1>Welcome to RapidKit</h1>
        <p class="subtitle">
            Create production-ready FastAPI & NestJS projects instantly<br/>
            <small style="opacity: 0.7;">Powered by rapidkit npm package</small>
        </p>
    </div>

    <div class="actions">
        <div class="action-card" onclick="createWorkspace()">
            <div class="action-icon">📂</div>
            <div class="action-title">Create Workspace</div>
            <div class="action-description">
                Set up a new RapidKit workspace to organize multiple projects
            </div>
        </div>

        <div class="action-card" onclick="createFastAPIProject()">
            <div class="action-icon">🐍</div>
            <div class="action-title">FastAPI Project</div>
            <div class="action-description">
                Create a new FastAPI project with modern Python architecture
            </div>
        </div>

        <div class="action-card" onclick="createNestJSProject()">
            <div class="action-icon">⚡</div>
            <div class="action-title">NestJS Project</div>
            <div class="action-description">
                Create a new NestJS project with TypeScript best practices
            </div>
        </div>

        <div class="action-card" onclick="runDoctor()">
            <div class="action-icon">🩺</div>
            <div class="action-title">System Check</div>
            <div class="action-description">
                Verify Node.js and system requirements
            </div>
        </div>
    </div>

    <div class="features">
        <h2>✨ What's New in v0.4.x</h2>
        <div class="feature-list">
            <div class="feature-item">
                <span class="feature-icon">📦</span>
                <span>npm package integration (no Python required)</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">⚡</span>
                <span>5-6x faster project creation</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">🎯</span>
                <span>Simplified workflow - just enter name</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">🔧</span>
                <span>Auto-configured workspaces</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">📚</span>
                <span>FastAPI & NestJS templates</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">🚀</span>
                <span>Production-ready from day one</span>
            </div>
        </div>
    </div>

    <div class="links">
        <a href="#" class="link" onclick="openDocs()">📖 Documentation</a>
        <a href="#" class="link" onclick="openDocs()">💡 Get Started</a>
        <a href="#" class="link" onclick="openDocs()">💬 GitHub</a>
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
