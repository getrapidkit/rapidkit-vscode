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
        case 'createWithAI':
          vscode.commands.executeCommand('workspai.openAICreateWorkspace');
          break;
        case 'openWorkspaceModal':
          vscode.commands.executeCommand('workspai.openWorkspaceModal');
          break;
        case 'doctor':
          vscode.commands.executeCommand('workspai.doctor');
          break;
        case 'showLogs':
          vscode.commands.executeCommand('workspai.showLogs');
          break;
        case 'openDocs':
          vscode.env.openExternal(vscode.Uri.parse('https://getrapidkit.com/docs'));
          break;
        case 'openWelcome':
          vscode.commands.executeCommand('workspai.showWelcome');
          break;
      }
    });
  }

  public refresh() {
    if (this._view) {
      this._view.webview.html = this._getHtmlContent(this._view.webview);
    }
  }

  private _getHtmlContent(_webview: vscode.Webview): string {
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
            gap: 8px;
        }

        .doctor  { --c: var(--vscode-editorWarning-foreground, #FF9800); }
        .welcome { --c: var(--vscode-textLink-foreground,  #00cfc1); }
        .docs    { --c: var(--vscode-terminal-ansiBlue,    #2196F3); }
        .manual  { --c: var(--vscode-descriptionForeground, #888); }

        /* ── Primary AI CTA ─────────────────────────────── */
        .cta-ai {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            padding: 11px 12px;
            background: linear-gradient(135deg,
                color-mix(in srgb, #00cfc1 18%, var(--vscode-editor-background) 82%),
                color-mix(in srgb, #7c3aed 12%, var(--vscode-editor-background) 88%)
            );
            border: 1px solid color-mix(in srgb, #00cfc1 45%, transparent 55%);
            border-radius: 9px;
            transition: all 0.2s ease;
            position: relative;
            overflow: hidden;
        }
        .cta-ai::before {
            content: '';
            position: absolute;
            inset: 0;
            background: linear-gradient(135deg,
                color-mix(in srgb, #00cfc1 30%, transparent 70%),
                color-mix(in srgb, #7c3aed 20%, transparent 80%)
            );
            opacity: 0;
            transition: opacity 0.2s ease;
        }
        .cta-ai:hover::before { opacity: 1; }
        .cta-ai:hover { transform: translateY(-1px); box-shadow: 0 3px 12px color-mix(in srgb, #00cfc1 25%, transparent 75%); }
        .cta-ai:active { transform: scale(0.98); }
        .cta-ai-icon {
            font-size: 14px;
            color: #00cfc1;
            position: relative;
            z-index: 1;
            filter: drop-shadow(0 0 4px color-mix(in srgb, #00cfc1 60%, transparent 40%));
        }
        .cta-ai-label {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            align-items: flex-start;
            gap: 1px;
        }
        .cta-ai-title {
            font-size: 12px;
            font-weight: 700;
            background: linear-gradient(90deg, #00cfc1, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            letter-spacing: 0.02em;
        }
        .cta-ai-sub {
            font-size: 9.5px;
            color: var(--vscode-descriptionForeground);
            opacity: 0.75;
            -webkit-text-fill-color: var(--vscode-descriptionForeground);
        }

        /* ── Manual / secondary CTA ─────────────────────── */
        .cta-manual {
            width: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 7px 10px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid var(--vscode-panel-border, transparent);
            border-radius: 7px;
            transition: all 0.15s ease;
            color: var(--vscode-descriptionForeground);
        }
        .cta-manual:hover {
            background: var(--vscode-list-hoverBackground);
            border-color: color-mix(in srgb, var(--vscode-descriptionForeground) 40%, transparent 60%);
            color: var(--vscode-foreground);
        }
        .cta-manual:active { transform: scale(0.98); }
        .cta-manual-icon { font-size: 13px; opacity: 0.7; }
        .cta-manual-text { font-size: 11px; font-weight: 600; }

        /* ── Section label ──────────────────────────────── */
        .section-label {
            font-size: 9.5px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: var(--vscode-descriptionForeground);
            opacity: 0.55;
            padding: 0 1px;
            margin-bottom: -2px;
        }

        /* ── Tool grid (3 cols) ──────────────────────────── */
        .tool-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 5px;
        }
        .tool-btn {
            display: flex;
            align-items: center;
            gap: 7px;
            padding: 8px 9px;
            background: var(--vscode-editor-inactiveSelectionBackground);
            border: 1px solid transparent;
            border-radius: 7px;
            transition: all 0.15s ease;
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
            width: 16px;
            height: 16px;
            flex-shrink: 0;
        }
        .tool-btn .t-icon svg {
            width: 14px;
            height: 14px;
            fill: var(--vscode-descriptionForeground);
            transition: fill 0.15s;
        }
        .tool-btn:hover .t-icon svg { fill: var(--c); }
        .tool-btn .t-text {
            font-size: 10.5px;
            font-weight: 600;
            color: var(--vscode-foreground);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }
        .tool-btn:hover .t-text { color: var(--c); }

        .hairline {
            height: 1px;
            background: var(--vscode-panel-border);
            opacity: 0.2;
        }
    </style>
</head>
<body>

    <!-- ① Primary: Create with AI -->
    <button class="cta-ai" onclick="send('createWithAI')" title="Describe what you want to build — AI creates your workspace">
        <span class="cta-ai-icon">✦</span>
        <span class="cta-ai-label">
            <span class="cta-ai-title">Create with AI</span>
            <span class="cta-ai-sub">Describe → AI plans → You confirm</span>
        </span>
    </button>

    <!-- ② Secondary: manual workspace -->
    <button class="cta-manual" onclick="send('openWorkspaceModal')" title="Create workspace manually">
        <span class="cta-manual-icon">＋</span>
        <span class="cta-manual-text">New Workspace (manual)</span>
    </button>

    <div class="hairline"></div>

    <!-- ③ Quick tools -->
    <div class="section-label">Quick Actions</div>
    <div class="tool-grid">
        <button class="tool-btn welcome" onclick="send('openWelcome')" title="Open Workspai dashboard">
            <span class="t-icon">${icons.home}</span>
            <span class="t-text">Dashboard</span>
        </button>
        <button class="tool-btn doctor" onclick="send('doctor')" title="Run workspace health check">
            <span class="t-icon">${icons.doctor}</span>
            <span class="t-text">Health</span>
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
