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
            padding: 6px;
        }
        
        .section {
            margin-bottom: 4px;
        }
        
        .section-title {
            font-size: 10px;
            font-weight: 600;
            color: var(--vscode-descriptionForeground);
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 8px 6px 4px;
            opacity: 0.7;
        }
        
        .btn {
            display: flex;
            align-items: center;
            gap: 8px;
            width: 100%;
            padding: 5px 6px;
            background: transparent;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            transition: background 0.1s;
            text-align: left;
        }
        
        .btn:hover {
            background: var(--vscode-list-hoverBackground);
        }
        
        .btn:hover .icon { color: var(--c); }
        
        .btn:active { opacity: 0.8; }
        
        .icon {
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--vscode-foreground);
            opacity: 0.7;
            transition: color 0.1s;
        }
        
        .icon svg { fill: currentColor; }
        .icon img { width: 14px; height: 14px; }
        
        .label {
            font-size: 12px;
            color: var(--vscode-foreground);
            flex: 1;
        }
        
        .badge {
            font-size: 9px;
            background: var(--c);
            color: white;
            padding: 1px 5px;
            border-radius: 6px;
            font-weight: 500;
        }
        
        .divider {
            height: 1px;
            background: var(--vscode-panel-border);
            margin: 6px 0;
            opacity: 0.4;
        }
        
        /* Colors */
        .workspace { --c: #00cfc1; }
        .fastapi { --c: #009688; }
        .nestjs { --c: #E0234E; }
        .doctor { --c: #FF9800; }
        .logs { --c: #9C27B0; }
        .docs { --c: #2196F3; }
        .welcome { --c: #00cfc1; }
    </style>
</head>
<body>
    <div class="section">
        <div class="section-title">Create</div>
        <button class="btn workspace" onclick="send('createWorkspace')">
            <span class="icon">${icons.workspace}</span>
            <span class="label">New Workspace</span>
        </button>
        <button class="btn fastapi" onclick="send('createFastAPIProject')">
            <span class="icon"><img src="${fastapiIconUri}" alt=""></span>
            <span class="label">FastAPI Project</span>
            <span class="badge">PY</span>
        </button>
        <button class="btn nestjs" onclick="send('createNestJSProject')">
            <span class="icon"><img src="${nestjsIconUri}" alt=""></span>
            <span class="label">NestJS Project</span>
            <span class="badge">TS</span>
        </button>
    </div>
    
    <div class="divider"></div>
    
    <div class="section">
        <div class="section-title">Tools</div>
        <button class="btn doctor" onclick="send('doctor')">
            <span class="icon">${icons.doctor}</span>
            <span class="label">System Check</span>
        </button>
        <button class="btn logs" onclick="send('showLogs')">
            <span class="icon">${icons.logs}</span>
            <span class="label">View Logs</span>
        </button>
    </div>
    
    <div class="divider"></div>
    
    <div class="section">
        <div class="section-title">Resources</div>
        <button class="btn docs" onclick="send('openDocs')">
            <span class="icon">${icons.docs}</span>
            <span class="label">Documentation</span>
        </button>
        <button class="btn welcome" onclick="send('openWelcome')">
            <span class="icon">${icons.home}</span>
            <span class="label">Welcome</span>
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
