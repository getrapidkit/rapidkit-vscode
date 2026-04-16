/**
 * AI Debugger Command
 * Opens a Workspai Debug panel, collects context (terminal selection, active editor errors,
 * or selected text), then streams a root-cause analysis + fix suggestions via vscode.lm.
 */

import * as vscode from 'vscode';
import { streamAIResponse } from '../core/aiService';
import { Logger } from '../utils/logger';
import { WelcomePanel } from '../ui/panels/welcomePanel';

// ──────────────────────────────────────────────
// Context collection helpers
// ──────────────────────────────────────────────

/** Returns the user's text selection in the active editor, or undefined. */
function getEditorSelection(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }
  const sel = editor.selection;
  if (sel.isEmpty) {
    return undefined;
  }
  return editor.document.getText(sel);
}

/** Returns diagnostics (errors/warnings) from the active file as a formatted string. */
function getActiveDiagnostics(): string | undefined {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return undefined;
  }
  const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);
  if (diagnostics.length === 0) {
    return undefined;
  }

  return diagnostics
    .slice(0, 20)
    .map((d) => {
      const sev = d.severity === vscode.DiagnosticSeverity.Error ? 'ERROR' : 'WARN';
      return `[${sev}] Line ${d.range.start.line + 1}: ${d.message}`;
    })
    .join('\n');
}

// ──────────────────────────────────────────────
// HTML panel
// ──────────────────────────────────────────────

function buildHtml(_webview: vscode.Webview, nonce: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Workspai Debugger</title>
  <style nonce="${nonce}">
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      padding: 20px 24px;
    }
    h2 { font-size: 15px; font-weight: 600; margin-bottom: 4px; }
    .subtitle { font-size: 12px; opacity: 0.5; margin-bottom: 20px; }
    .context-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; opacity: 0.4; margin-bottom: 6px; }
    textarea {
      width: 100%;
      min-height: 120px;
      padding: 10px 12px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.1));
      border-radius: 6px;
      font-family: var(--vscode-editor-font-family);
      font-size: 12px;
      resize: vertical;
      outline: none;
      margin-bottom: 12px;
    }
    textarea:focus { border-color: var(--vscode-focusBorder); }
    .hint { font-size: 11px; opacity: 0.35; margin-bottom: 18px; }
    button {
      padding: 7px 18px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      border-radius: 5px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button:disabled { opacity: 0.45; cursor: not-allowed; }
    .divider { height: 1px; background: rgba(255,255,255,0.07); margin: 20px 0; }
    #output-area { display: none; }
    .status-line {
      font-size: 11px;
      opacity: 0.45;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: #00CFC1; animation: pulse 1.2s ease-in-out infinite; }
    @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
    #output {
      white-space: pre-wrap;
      font-family: var(--vscode-editor-font-family);
      font-size: 12.5px;
      line-height: 1.65;
      background: var(--vscode-textBlockQuote-background, rgba(255,255,255,0.03));
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 6px;
      padding: 14px 16px;
      max-height: 60vh;
      overflow-y: auto;
    }
    .copy-btn { margin-top: 10px; background: transparent; border: 1px solid rgba(255,255,255,0.15); color: var(--vscode-foreground); font-size: 11px; padding: 4px 12px; }
    .copy-btn:hover { background: rgba(255,255,255,0.06); }
  </style>
</head>
<body>
  <h2>🔍 Workspai AI Debugger</h2>
  <p class="subtitle">Paste a log, stack trace, error message, or test failure. Get a root-cause analysis and fix path.</p>

  <p class="context-label">Error / Log / Stack Trace</p>
  <textarea id="failure-input" placeholder="Paste your error, stack trace, log output, or test failure here..."></textarea>
  <p class="hint">Hint: select an error in your editor before opening this panel — it will be pre-filled.</p>

  <button id="analyze-btn" onclick="analyze()">Analyze with Workspai AI</button>

  <div class="divider"></div>

  <div id="output-area">
    <div class="status-line" id="status-line">
      <div class="dot"></div>
      <span id="status-text">Analyzing...</span>
    </div>
    <div id="output"></div>
    <button class="copy-btn" onclick="copyOutput()">Copy</button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();

    function analyze() {
      const input = document.getElementById('failure-input').value.trim();
      if (!input) { alert('Please paste an error or log to analyze.'); return; }
      document.getElementById('analyze-btn').disabled = true;
      document.getElementById('output-area').style.display = 'block';
      document.getElementById('output').textContent = '';
      document.getElementById('status-line').style.display = 'flex';
      document.getElementById('status-text').textContent = 'Analyzing...';
      vscode.postMessage({ command: 'analyze', input });
    }

    function copyOutput() {
      const text = document.getElementById('output').textContent;
      navigator.clipboard.writeText(text);
    }

    window.addEventListener('message', e => {
      const msg = e.data;
      if (msg.command === 'chunk') {
        document.getElementById('output').textContent += msg.text;
      }
      if (msg.command === 'done') {
        document.getElementById('status-line').style.display = 'none';
        document.getElementById('analyze-btn').disabled = false;
      }
      if (msg.command === 'error') {
        document.getElementById('status-text').textContent = '⚠ ' + msg.message;
        document.getElementById('analyze-btn').disabled = false;
      }
      if (msg.command === 'prefill') {
        document.getElementById('failure-input').value = msg.text;
      }
    });
  </script>
</body>
</html>`;
}

// ──────────────────────────────────────────────
// System prompt
// ──────────────────────────────────────────────

function buildSystemPrompt(projectContext: string): string {
  return `You are Workspai AI Debugger — a backend debugging assistant embedded in VS Code.

Your job:
1. Identify the root cause of the given error, log, or failure.
2. Name the exact file(s) and line(s) involved if determinable.
3. Propose the clearest, shortest fix path — concrete code when possible.
4. Flag any secondary issues worth knowing about.

Rules:
- Be direct and concise. No fluff.
- Format: use "Root Cause:", "Fix:", "Related:" sections.
- If the input is ambiguous, state your best inference and ask one targeted clarifying question.
- Focus on backend: FastAPI, NestJS, Go, databases, queues, HTTP clients.
${projectContext ? `\nProject context:\n${projectContext}` : ''}`;
}

// ──────────────────────────────────────────────
// Panel class
// ──────────────────────────────────────────────

export class AIDebuggerPanel {
  public static currentPanel: AIDebuggerPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _cancelTokenSource?: vscode.CancellationTokenSource;

  private constructor(panel: vscode.WebviewPanel, prefill?: string) {
    this._panel = panel;
    const nonce = getNonce();
    this._panel.webview.html = buildHtml(this._panel.webview, nonce);

    if (prefill) {
      // Delay so the webview has time to initialize
      setTimeout(() => {
        this._panel.webview.postMessage({ command: 'prefill', text: prefill });
      }, 300);
    }

    this._panel.webview.onDidReceiveMessage(
      async (msg) => {
        if (msg.command === 'analyze') {
          await this._handleAnalyze(msg.input as string);
        }
      },
      null,
      this._disposables
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public static createOrShow(context: vscode.ExtensionContext, prefill?: string): void {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (AIDebuggerPanel.currentPanel) {
      AIDebuggerPanel.currentPanel._panel.reveal(column);
      if (prefill) {
        AIDebuggerPanel.currentPanel._panel.webview.postMessage({
          command: 'prefill',
          text: prefill,
        });
      }
      return;
    }

    const panel = vscode.window.createWebviewPanel(
      'workspaiDebugger',
      'Workspai AI Debugger',
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      }
    );

    AIDebuggerPanel.currentPanel = new AIDebuggerPanel(panel, prefill);
  }

  private async _handleAnalyze(input: string): Promise<void> {
    const logger = Logger.getInstance();
    this._cancelTokenSource?.cancel();
    this._cancelTokenSource = new vscode.CancellationTokenSource();
    const token = this._cancelTokenSource.token;

    // Collect light project context (active file path + a few lines)
    let projectContext = '';
    const editor = vscode.window.activeTextEditor;
    if (editor) {
      const filePath = vscode.workspace.asRelativePath(editor.document.uri);
      const lang = editor.document.languageId;
      // Take up to 60 lines centred around the cursor
      const line = editor.selection.active.line;
      const start = Math.max(0, line - 30);
      const end = Math.min(editor.document.lineCount - 1, line + 30);
      const snippet = editor.document.getText(
        new vscode.Range(
          new vscode.Position(start, 0),
          new vscode.Position(end, Number.MAX_SAFE_INTEGER)
        )
      );
      projectContext = `Active file: ${filePath} (${lang})\nRelevant lines (${start + 1}-${end + 1}):\n\`\`\`\n${snippet}\n\`\`\``;
    }

    const messages = [
      { role: 'user' as const, content: buildSystemPrompt(projectContext) + '\n\n---\n\n' + input },
    ];

    try {
      await streamAIResponse(
        messages,
        (chunk) => {
          if (chunk.done) {
            this._panel.webview.postMessage({ command: 'done' });
          } else {
            this._panel.webview.postMessage({ command: 'chunk', text: chunk.text });
          }
        },
        token
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('[AIDebugger] Error:', msg);
      this._panel.webview.postMessage({ command: 'error', message: msg });
    }
  }

  public dispose(): void {
    AIDebuggerPanel.currentPanel = undefined;
    this._cancelTokenSource?.cancel();
    this._panel.dispose();
    while (this._disposables.length) {
      this._disposables.pop()?.dispose();
    }
  }
}

// ──────────────────────────────────────────────
// Command registration
// ──────────────────────────────────────────────

export function registerAIDebuggerCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand('rapidkit.debugWithAI', () => {
    const prefillQuestion = getEditorSelection() ?? getActiveDiagnostics();
    const folder = vscode.workspace.workspaceFolders?.[0];
    WelcomePanel.showAIModal(context, {
      type: 'workspace',
      name: folder?.name ?? 'Workspace',
      path: folder?.uri.fsPath,
      prefillQuestion,
    });
  });
}

// ──────────────────────────────────────────────
// Utility
// ──────────────────────────────────────────────

function getNonce(): string {
  let text = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  for (let i = 0; i < 32; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}
