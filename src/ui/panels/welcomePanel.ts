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
          case 'createProject':
            vscode.commands.executeCommand('rapidkit.createProject');
            break;
          case 'generateDemo':
            vscode.commands.executeCommand('rapidkit.generateDemo');
            break;
          case 'doctor':
            vscode.commands.executeCommand('rapidkit.doctor');
            break;
          case 'openDocs':
            vscode.env.openExternal(vscode.Uri.parse('https://rapidkit.dev'));
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
            Create production-ready FastAPI & NestJS projects with ease
        </p>
    </div>

    <div class="actions">
        <div class="action-card" onclick="createWorkspace()">
            <div class="action-icon">📂</div>
            <div class="action-title">Create Workspace</div>
            <div class="action-description">
                Set up a new RapidKit workspace with demo or full mode
            </div>
        </div>

        <div class="action-card" onclick="createProject()">
            <div class="action-icon">🎯</div>
            <div class="action-title">Create Project</div>
            <div class="action-description">
                Generate a new FastAPI or NestJS project in your workspace
            </div>
        </div>

        <div class="action-card" onclick="generateDemo()">
            <div class="action-icon">⚡</div>
            <div class="action-title">Generate Demo</div>
            <div class="action-description">
                Quickly create a demo project with bundled templates
            </div>
        </div>

        <div class="action-card" onclick="runDoctor()">
            <div class="action-icon">🩺</div>
            <div class="action-title">System Check</div>
            <div class="action-description">
                Verify system requirements and dependencies
            </div>
        </div>
    </div>

    <div class="features">
        <h2>✨ Features</h2>
        <div class="feature-list">
            <div class="feature-item">
                <span class="feature-icon">⚡</span>
                <span>Fast project scaffolding</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">🧩</span>
                <span>Modular architecture</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">🎨</span>
                <span>Beautiful templates</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">🔧</span>
                <span>Easy configuration</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">📚</span>
                <span>Comprehensive docs</span>
            </div>
            <div class="feature-item">
                <span class="feature-icon">🚀</span>
                <span>Production ready</span>
            </div>
        </div>
    </div>

    <div class="links">
        <a href="#" class="link" onclick="openDocs()">📖 Documentation</a>
        <a href="#" class="link" onclick="openDocs()">💡 Examples</a>
        <a href="#" class="link" onclick="openDocs()">💬 Community</a>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function createWorkspace() {
            vscode.postMessage({ command: 'createWorkspace' });
        }

        function createProject() {
            vscode.postMessage({ command: 'createProject' });
        }

        function generateDemo() {
            vscode.postMessage({ command: 'generateDemo' });
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
