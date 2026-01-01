/**
 * Template Preview Panel
 * Shows template preview with syntax highlighting
 */

import * as vscode from 'vscode';
import { RapidKitTemplate } from '../../types';

export class TemplatePreviewPanel {
  public static currentPanel: TemplatePreviewPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];

  private constructor(panel: vscode.WebviewPanel, template: RapidKitTemplate) {
    this._panel = panel;
    this._panel.webview.html = this._getHtmlContent(template);

    // Handle messages
    this._panel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.command) {
          case 'useTemplate':
            vscode.commands.executeCommand('rapidkit.createProject');
            break;
        }
      },
      null,
      this._disposables
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public static createOrShow(template: RapidKitTemplate) {
    // Create new panel
    const panel = vscode.window.createWebviewPanel(
      'rapidkitTemplatePreview',
      `📄 ${template.displayName}`,
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );

    TemplatePreviewPanel.currentPanel = new TemplatePreviewPanel(panel, template);
  }

  private _getHtmlContent(template: RapidKitTemplate): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${template.displayName}</title>
    <style>
        body {
            font-family: var(--vscode-font-family);
            padding: 20px;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-background);
        }
        .header {
            border-bottom: 1px solid var(--vscode-panel-border);
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        h1 {
            color: var(--vscode-textLink-foreground);
            margin: 0 0 10px 0;
        }
        .badge {
            display: inline-block;
            padding: 4px 8px;
            background: var(--vscode-badge-background);
            color: var(--vscode-badge-foreground);
            border-radius: 4px;
            font-size: 12px;
            margin-right: 8px;
        }
        .description {
            margin: 20px 0;
            color: var(--vscode-descriptionForeground);
        }
        .section {
            margin: 30px 0;
        }
        .section-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 15px;
        }
        .file-tree {
            background: var(--vscode-editor-inactiveSelectionBackground);
            padding: 15px;
            border-radius: 4px;
            font-family: monospace;
            font-size: 13px;
        }
        .file-item {
            margin: 4px 0;
        }
        .file-icon {
            color: var(--vscode-icon-foreground);
            margin-right: 8px;
        }
        .features {
            display: grid;
            gap: 10px;
        }
        .feature {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border-radius: 4px;
        }
        .actions {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid var(--vscode-panel-border);
        }
        .button {
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        .button:hover {
            background: var(--vscode-button-hoverBackground);
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${template.displayName}</h1>
        <div>
            <span class="badge">${template.framework.toUpperCase()}</span>
            <span class="badge">${template.category}</span>
        </div>
    </div>

    <div class="description">
        ${template.description}
    </div>

    <div class="section">
        <div class="section-title">📁 Project Structure</div>
        <div class="file-tree">
            <div class="file-item">
                <span class="file-icon">📂</span> ${template.name}/
            </div>
            <div class="file-item" style="margin-left: 20px;">
                <span class="file-icon">📂</span> src/
            </div>
            <div class="file-item" style="margin-left: 40px;">
                <span class="file-icon">📄</span> main.py
            </div>
            <div class="file-item" style="margin-left: 40px;">
                <span class="file-icon">📄</span> cli.py
            </div>
            <div class="file-item" style="margin-left: 40px;">
                <span class="file-icon">📂</span> core/
            </div>
            <div class="file-item" style="margin-left: 40px;">
                <span class="file-icon">📂</span> routing/
            </div>
            <div class="file-item" style="margin-left: 20px;">
                <span class="file-icon">📂</span> tests/
            </div>
            <div class="file-item" style="margin-left: 20px;">
                <span class="file-icon">📄</span> pyproject.toml
            </div>
            <div class="file-item" style="margin-left: 20px;">
                <span class="file-icon">📄</span> README.md
            </div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">✨ Features</div>
        <div class="features">
            <div class="feature">
                <span>⚡</span>
                <span>Fast development with hot reload</span>
            </div>
            <div class="feature">
                <span>🔧</span>
                <span>Production-ready configuration</span>
            </div>
            <div class="feature">
                <span>🧪</span>
                <span>Test suite included</span>
            </div>
            <div class="feature">
                <span>📚</span>
                <span>Comprehensive documentation</span>
            </div>
            <div class="feature">
                <span>🐳</span>
                <span>Docker support</span>
            </div>
        </div>
    </div>

    <div class="actions">
        <button class="button" onclick="useTemplate()">
            Use This Template
        </button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        function useTemplate() {
            vscode.postMessage({ command: 'useTemplate' });
        }
    </script>
</body>
</html>`;
  }

  public dispose() {
    TemplatePreviewPanel.currentPanel = undefined;
    this._panel.dispose();

    while (this._disposables.length) {
      const disposable = this._disposables.pop();
      if (disposable) {
        disposable.dispose();
      }
    }
  }
}
