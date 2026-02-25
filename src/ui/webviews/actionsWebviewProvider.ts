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
        case 'openWorkspaceModal':
          vscode.commands.executeCommand('rapidkit.openWorkspaceModal');
          break;
        case 'createFastAPIProject':
          vscode.commands.executeCommand('rapidkit.openProjectModal', 'fastapi');
          break;
        case 'createNestJSProject':
          vscode.commands.executeCommand('rapidkit.openProjectModal', 'nestjs');
          break;
        case 'createGoProject':
          vscode.commands.executeCommand('rapidkit.openProjectModal', 'go');
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
    const goIconUri = webview.asWebviewUri(
      vscode.Uri.joinPath(this._extensionUri, 'media', 'icons', 'go.svg')
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
        *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }

        /* ── Button reset: prevent UA stylesheet from forcing black text ── */
        button {
            appearance: none;
            font: inherit;
            color: var(--vscode-foreground);
            background: none;
            border: none;
            cursor: pointer;
        }
        button:focus-visible {
            outline: 1px solid var(--vscode-focusBorder);
            outline-offset: 1px;
        }

        body {
            font-family: var(--vscode-font-family);
            font-size: var(--vscode-font-size, 13px);
            color: var(--vscode-foreground);
            background: transparent;
            padding: 10px 8px 14px;
            display: flex;
            flex-direction: column;
            gap: 10px;
        }

        /* ── Theme-adaptive color variables ───────────────
           Each uses a VS Code design-system token with a
           brand-color fallback for light/unknown themes.   */
        .fastapi { --c: var(--vscode-testing-iconPassed,   #009688); }
        .nestjs  { --c: var(--vscode-testing-iconFailed,   #E0234E); }
        .go      { --c: var(--vscode-terminal-ansiCyan,    #00ADD8); }
        .modules { --c: var(--vscode-terminal-ansiMagenta, #9C27B0); }
        .doctor  { --c: var(--vscode-editorWarning-foreground, #FF9800); }
        .welcome { --c: var(--vscode-textLink-foreground,  #00cfc1); }
        .docs    { --c: var(--vscode-terminal-ansiBlue,    #2196F3); }

        /* ── CTA: New Workspace ─────────────────────────── */
        .cta-btn {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 10px 12px;
            background: color-mix(in srgb, var(--vscode-textLink-foreground, #00cfc1) 12%, var(--vscode-editor-background) 88%);
            border: 1px solid color-mix(in srgb, var(--vscode-textLink-foreground, #00cfc1) 40%, transparent 60%);
            border-radius: 8px;
            transition: all 0.2s ease;
            color: var(--vscode-foreground);
        }
        .cta-btn:hover {
            background: color-mix(in srgb, var(--vscode-textLink-foreground, #00cfc1) 22%, var(--vscode-list-hoverBackground) 78%);
            border-color: var(--vscode-textLink-foreground, #00cfc1);
            transform: translateY(-1px);
        }
        .cta-btn:active { transform: scale(0.98); }
        .cta-btn .cta-icon { font-size: 16px; }
        .cta-btn .cta-text {
            font-size: 12px;
            font-weight: 700;
            color: var(--vscode-textLink-foreground, #00cfc1);
            letter-spacing: 0.02em;
        }

        /* ── Section label ──────────────────────────────── */
        .section-label {
            font-size: 9.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--vscode-descriptionForeground);
            opacity: 0.65;
            padding: 0 1px;
            margin-bottom: -4px;
        }

        /* ── Framework grid (3 cols) ─────────────────────── */
        .fw-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 5px;
        }
        .fw-btn {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            padding: 7px 4px;
            color: var(--vscode-foreground);
            background: color-mix(in srgb, var(--c, #00cfc1) 8%, var(--vscode-editor-inactiveSelectionBackground) 92%);
            border: 1px solid color-mix(in srgb, var(--c, #00cfc1) 20%, var(--vscode-panel-border) 80%);
            border-radius: 7px;
            transition: all 0.15s ease;
        }
        .fw-btn:hover {
            background: color-mix(in srgb, var(--c, #00cfc1) 18%, var(--vscode-list-hoverBackground) 82%);
            border-color: var(--c);
            transform: translateY(-1px);
        }
        .fw-btn:active { transform: scale(0.96); }
        .fw-btn img { width: 18px; height: 18px; }
        .fw-btn .fw-label {
            font-size: 10px;
            font-weight: 600;
            color: var(--vscode-foreground);
            opacity: 0.85;
        }
        .fw-btn:hover .fw-label {
            opacity: 1;
            color: var(--c);
        }

        /* ── Tool grid (2 cols) ──────────────────────────── */
        .tool-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 5px;
        }
        .tool-btn {
            display: flex;
            align-items: center;
            gap: 7px;
            padding: 8px 9px;
            color: var(--vscode-foreground);
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid transparent;
            border-radius: 7px;
            transition: all 0.15s ease;
            position: relative;
        }
        .tool-btn:hover {
            background: color-mix(in srgb, var(--c, #00cfc1) 10%, var(--vscode-list-hoverBackground) 90%);
            border-color: color-mix(in srgb, var(--c, #00cfc1) 55%, transparent 45%);
        }
        .tool-btn:active { transform: scale(0.97); }
        .tool-btn .t-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 18px;
            height: 18px;
            flex-shrink: 0;
        }
        .tool-btn .t-icon svg {
            width: 15px;
            height: 15px;
            fill: var(--vscode-descriptionForeground);
            transition: fill 0.15s;
        }
        .tool-btn:hover .t-icon svg { fill: var(--c); }
        .tool-btn .t-text {
            font-size: 11px;
            font-weight: 600;
            color: var(--vscode-foreground);
            flex: 1;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .tool-btn:hover .t-text { color: var(--c); }
        .tool-btn .t-badge {
            font-size: 8.5px;
            font-weight: 700;
            background: var(--c);
            color: #fff;
            padding: 1px 5px;
            border-radius: 6px;
        }

        /* ── Subtle divider ──────────────────────────────── */
        .hairline {
            height: 1px;
            background: var(--vscode-panel-border);
            opacity: 0.25;
            margin: 0 1px;
        }
    </style>
</head>
<body>

    <!-- ① New Workspace — primary CTA -->
    <button class="cta-btn" onclick="send('openWorkspaceModal')" title="Create a new RapidKit workspace">
        <span class="cta-icon">＋</span>
        <span class="cta-text">New Workspace</span>
    </button>

    <!-- ② New Project -->
    <span class="section-label">New Project</span>
    <div class="fw-grid">
        <button class="fw-btn fastapi" onclick="send('createFastAPIProject')" title="New FastAPI project">
            <img src="${fastapiIconUri}" alt="FastAPI">
            <span class="fw-label">FastAPI</span>
        </button>
        <button class="fw-btn nestjs" onclick="send('createNestJSProject')" title="New NestJS project">
            <img src="${nestjsIconUri}" alt="NestJS">
            <span class="fw-label">NestJS</span>
        </button>
        <button class="fw-btn go" onclick="send('createGoProject')" title="New Go project">
            <img src="${goIconUri}" alt="Go">
            <span class="fw-label">Go</span>
        </button>
    </div>

    <!-- ③ Explore & Health -->
    <span class="section-label">Explore</span>
    <div class="tool-grid">
        <button class="tool-btn modules" onclick="send('browseModules')" title="Browse 27+ modules">
            <span class="t-icon">${icons.modules}</span>
            <span class="t-text">Modules</span>
            <span class="t-badge" style="--c:#9C27B0">27</span>
        </button>
        <button class="tool-btn doctor" onclick="send('doctor')" title="Run health check">
            <span class="t-icon">${icons.doctor}</span>
            <span class="t-text">Check</span>
        </button>
    </div>

    <div class="hairline"></div>

    <div class="tool-grid">
        <button class="tool-btn welcome" onclick="send('openWelcome')" title="Open welcome panel">
            <span class="t-icon">${icons.home}</span>
            <span class="t-text">Welcome</span>
        </button>
        <button class="tool-btn docs" onclick="send('openDocs')" title="Open documentation">
            <span class="t-icon">${icons.docs}</span>
            <span class="t-text">Docs</span>
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
