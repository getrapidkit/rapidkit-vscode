/**
 * Actions Webview Provider
 * Minimal sidebar webview for quick actions
 */

import * as vscode from 'vscode';

export class ActionsWebviewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = 'rapidkitActionsWebview';
  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    _context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getHtmlContent(webviewView.webview);

    // Handle messages from webview
    webviewView.webview.onDidReceiveMessage((message) => {
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
        case 'browseModules':
          vscode.commands.executeCommand('rapidkitModules.focus');
          break;
        case 'doctor':
          vscode.commands.executeCommand('rapidkit.doctor');
          break;
        case 'showLogs':
          vscode.commands.executeCommand('rapidkit.showLogs');
          break;
        case 'openDocs':
          vscode.env.openExternal(vscode.Uri.parse('https://getrapidkit.com/docs'));
          break;
        case 'openWelcome':
          vscode.commands.executeCommand('rapidkit.showWelcome');
          break;
      }
    });
  }

  public refresh() {
    if (this._view) {
      this._view.webview.html = this._getHtmlContent(this._view.webview);
    }
  }

  private _getHtmlContent(webview: vscode.Webview): string {
    const fastapiIconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'icons', 'fastapi.svg')
    );
    const nestjsIconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'icons', 'nestjs.svg')
    );

    // SVG icons (inline since codicons don't work in webviews)
    const icons = {
      workspace:
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M14.5 3H7.71l-.85-.85L6.51 2h-5l-.5.5v11l.5.5h13l.5-.5v-10L14.5 3zm-.51 8.49V13h-12V7h4.49l.35-.15.86-.86H14v5.5h-.01zM6.51 6l-.35.15-.86.86h-2.79V3h4.29l.85.85.36.15H14v2H6.51z"/></svg>',
      modules:
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M3.5 2L1 3.5v9L3.5 14h3L9 12.5v-9L6.5 2h-3zM3 12V4h3v8H3zm4 0V4h3v8H7zm6-8h-3l-.5.5v9l.5.5h3l.5-.5v-9L13.5 4z"/></svg>',
      doctor:
        '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M14 2H8L7 3v2H2.5l-.5.5v9l.5.5h11l.5-.5v-9L13.5 5H9V3.5l.5-.5H14V2zM7 5h6v1H7V5zm6 9H3V7h5v1.5l.5.5H13v5zm0-6H9V7h4v1z"/><path d="M5 9H4v1h1V9zm0 2H4v1h1v-1zm2-2H6v1h1V9zm0 2H6v1h1v-1z"/></svg>',
      logs: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M2 2h12v12H2V2zm1 1v10h10V3H3zm1 2h8v1H4V5zm0 2h8v1H4V7zm0 2h5v1H4V9z"/></svg>',
      docs: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M5 1H4v14h1V1zm7 0h-1v14h1V1zM3 3H1v10h2V3zm12 0h-2v10h2V3zM7 4H6v8h1V4zm3 0H9v8h1V4z"/></svg>',
      home: '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8.354 1.146a.5.5 0 0 0-.708 0l-6 6A.5.5 0 0 0 1.5 7.5v7a.5.5 0 0 0 .5.5h4.5a.5.5 0 0 0 .5-.5v-4h2v4a.5.5 0 0 0 .5.5H14a.5.5 0 0 0 .5-.5v-7a.5.5 0 0 0-.146-.354L13 5.793V2.5a.5.5 0 0 0-.5-.5h-1a.5.5 0 0 0-.5.5v1.293L8.354 1.146zM2.5 14V7.707l5.5-5.5 5.5 5.5V14H10v-4a.5.5 0 0 0-.5-.5h-3a.5.5 0 0 0-.5.5v4H2.5z"/></svg>',
    };

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background: transparent;
            padding: 12px 8px;
        }
        
        /* Grid Layout */
        .grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
            margin-bottom: 12px;
        }
        
        /* Icon Button */
        .icon-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 14px 8px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid transparent;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            min-height: 70px;
        }
        
        .icon-btn:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: var(--c);
            transform: translateY(-2px);
        }
        
        .icon-btn:active {
            transform: scale(0.95);
        }
        
        .icon-btn .icon {
            font-size: 24px;
            margin-bottom: 6px;
            filter: grayscale(0.3);
            transition: all 0.2s ease;
        }
        
        .icon-btn:hover .icon {
            filter: grayscale(0);
            transform: scale(1.1);
        }
        
        .icon-btn .icon svg {
            width: 24px;
            height: 24px;
            fill: var(--vscode-descriptionForeground);
        }
        
        .icon-btn:hover .icon svg {
            fill: var(--c);
        }
        
        .icon-btn .icon img {
            width: 24px;
            height: 24px;
        }
        
        .icon-btn .label {
            font-size: 10px;
            font-weight: 700;
            color: var(--vscode-foreground);
            text-align: center;
            line-height: 1.2;
            opacity: 0.85;
        }
        
        .icon-btn:hover .label {
            opacity: 1;
        }
        
        .icon-btn .badge {
            position: absolute;
            top: 6px;
            right: 6px;
            font-size: 8px;
            background: var(--c);
            color: white;
            padding: 2px 5px;
            border-radius: 8px;
            font-weight: 700;
        }
        
        /* Divider */
        .divider {
            height: 1px;
            background: var(--vscode-panel-border);
            margin: 12px 0;
            opacity: 0.3;
        }
        
        /* Single Row */
        .single-row {
            display: grid;
            grid-template-columns: 1fr;
            gap: 6px;
        }
        
        .compact-btn {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 8px 10px;
            background: transparent;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.15s ease;
        }
        
        .compact-btn:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: var(--c);
        }
        
        .compact-btn .icon {
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        .compact-btn .icon svg {
            width: 16px;
            height: 16px;
            fill: var(--vscode-descriptionForeground);
        }
        
        .compact-btn:hover .icon svg {
            fill: var(--c);
        }
        
        .compact-btn .label {
            font-size: 11px;
            font-weight: 600;
            flex: 1;
            color: var(--vscode-foreground);
        }
        
        /* Colors */
        .workspace { --c: #00cfc1; }
        .fastapi { --c: #009688; }
        .nestjs { --c: #E0234E; }
        .modules { --c: #9C27B0; }
        .doctor { --c: #FF9800; }
        .docs { --c: #2196F3; }
    </style>
</head>
<body>
    <!-- Primary Actions: 2x2 Grid -->
    <div class="grid">
        <button class="icon-btn workspace" onclick="send('createWorkspace')">
            <span class="icon">${icons.workspace}</span>
            <span class="label">Workspace</span>
        </button>
        
        <button class="icon-btn modules" onclick="send('browseModules')">
            <span class="icon">${icons.modules}</span>
            <span class="label">Modules</span>
            <span class="badge">27</span>
        </button>
        
        <button class="icon-btn fastapi" onclick="send('createFastAPIProject')">
            <span class="icon"><img src="${fastapiIconUri}" alt=""></span>
            <span class="label">FastAPI</span>
        </button>
        
        <button class="icon-btn nestjs" onclick="send('createNestJSProject')">
            <span class="icon"><img src="${nestjsIconUri}" alt=""></span>
            <span class="label">NestJS</span>
        </button>
    </div>
    
    <div class="divider"></div>
    
    <!-- Secondary Actions: Compact List -->
    <div class="single-row">
        <button class="compact-btn doctor" onclick="send('doctor')">
            <span class="icon">${icons.doctor}</span>
            <span class="label">System Check</span>
        </button>
        
        <button class="compact-btn docs" onclick="send('openDocs')">
            <span class="icon">${icons.docs}</span>
            <span class="label">Documentation</span>
        </button>
    </div>
    
    <script>
        const vscode = acquireVsCodeApi();
        function send(cmd) { vscode.postMessage({ command: cmd }); }
    </script>
</body>
</html>`;
  }

  dispose() {}
}
