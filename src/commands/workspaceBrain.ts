/**
 * Workspace Brain Command
 * AI-powered Q&A panel that understands your project structure.
 * Indexes the current workspace and answers developer questions in context.
 */

import * as vscode from 'vscode';
import * as path from 'path';
import { streamAIResponse } from '../core/aiService';
import { Logger } from '../utils/logger';
import { WelcomePanel } from '../ui/panels/welcomePanel';

// ──────────────────────────────────────────────
// Workspace context builder
// ──────────────────────────────────────────────

interface ProjectSnapshot {
  rootPath: string;
  name: string;
  framework: string;
  fileTree: string;
  packageInfo: string;
}

async function buildProjectSnapshot(): Promise<ProjectSnapshot | null> {
  const folders = vscode.workspace.workspaceFolders;
  if (!folders || folders.length === 0) {
    return null;
  }

  const root = folders[0].uri.fsPath;
  const name = path.basename(root);

  // Detect framework
  let framework = 'Unknown';
  try {
    const pyprojectUri = vscode.Uri.file(path.join(root, 'pyproject.toml'));
    const pyprojectDoc = await vscode.workspace.openTextDocument(pyprojectUri);
    const text = pyprojectDoc.getText();
    if (text.includes('fastapi')) {
      framework = 'FastAPI';
    } else if (text.includes('flask')) {
      framework = 'Flask';
    } else if (text.includes('django')) {
      framework = 'Django';
    }
  } catch {
    // not a Python project
  }
  if (framework === 'Unknown') {
    try {
      const pkgUri = vscode.Uri.file(path.join(root, 'package.json'));
      const pkgDoc = await vscode.workspace.openTextDocument(pkgUri);
      const pkg = JSON.parse(pkgDoc.getText());
      if (pkg.dependencies?.['@nestjs/core']) {
        framework = 'NestJS';
      } else if (pkg.dependencies?.express) {
        framework = 'Express';
      } else if (pkg.dependencies?.fastify) {
        framework = 'Fastify';
      }
    } catch {
      // not a Node project
    }
  }
  if (framework === 'Unknown') {
    try {
      const goModUri = vscode.Uri.file(path.join(root, 'go.mod'));
      await vscode.workspace.openTextDocument(goModUri);
      framework = 'Go';
    } catch {
      // not a Go project
    }
  }

  // Build a compact file tree (2 levels, exclude node_modules / .venv / dist / .git)
  const EXCLUDE = new Set([
    'node_modules',
    '.git',
    '.venv',
    'venv',
    '__pycache__',
    'dist',
    '.next',
    'build',
    'coverage',
    '.mypy_cache',
    '.pytest_cache',
  ]);

  async function getTree(dirUri: vscode.Uri, depth: number, prefix = ''): Promise<string[]> {
    if (depth === 0) {
      return [];
    }
    let entries: [string, vscode.FileType][];
    try {
      entries = await vscode.workspace.fs.readDirectory(dirUri);
    } catch {
      return [];
    }
    entries.sort(([a, ta], [b, tb]) => {
      if (ta === vscode.FileType.Directory && tb !== vscode.FileType.Directory) {
        return -1;
      }
      if (tb === vscode.FileType.Directory && ta !== vscode.FileType.Directory) {
        return 1;
      }
      return a.localeCompare(b);
    });
    const lines: string[] = [];
    for (const [name, type] of entries) {
      if (EXCLUDE.has(name) || name.startsWith('.')) {
        continue;
      }
      if (type === vscode.FileType.Directory) {
        lines.push(`${prefix}${name}/`);
        if (depth > 1) {
          const sub = await getTree(vscode.Uri.joinPath(dirUri, name), depth - 1, prefix + '  ');
          lines.push(...sub);
        }
      } else {
        lines.push(`${prefix}${name}`);
      }
    }
    return lines;
  }

  const treeLines = await getTree(vscode.Uri.file(root), 3);
  const fileTree = treeLines.slice(0, 120).join('\n');

  // Package/dependency summary
  let packageInfo = '';
  try {
    const pkgUri = vscode.Uri.file(path.join(root, 'package.json'));
    const pkgDoc = await vscode.workspace.openTextDocument(pkgUri);
    const pkg = JSON.parse(pkgDoc.getText());
    const deps = Object.keys(pkg.dependencies ?? {})
      .slice(0, 20)
      .join(', ');
    const devDeps = Object.keys(pkg.devDependencies ?? {})
      .slice(0, 10)
      .join(', ');
    packageInfo = `package.json deps: ${deps}\ndevDeps: ${devDeps}`;
  } catch {
    /* ignore */
  }
  if (!packageInfo) {
    try {
      const pyUri = vscode.Uri.file(path.join(root, 'pyproject.toml'));
      const pyDoc = await vscode.workspace.openTextDocument(pyUri);
      packageInfo = pyDoc.getText().slice(0, 600);
    } catch {
      /* ignore */
    }
  }

  return { rootPath: root, name, framework, fileTree, packageInfo };
}

function buildSystemPrompt(
  snapshot: ProjectSnapshot | null,
  history: Array<{ role: string; text: string }>
): string {
  const ctx = snapshot
    ? `Project: ${snapshot.name} | Framework: ${snapshot.framework} | Root: ${snapshot.rootPath}\n\nFile tree:\n${snapshot.fileTree}\n\n${snapshot.packageInfo ? `Dependencies:\n${snapshot.packageInfo}` : ''}`
    : 'No workspace open.';

  const historyBlock = history
    .slice(-8)
    .map((m) => `${m.role === 'user' ? 'Developer' : 'Workspai'}: ${m.text}`)
    .join('\n');

  return `You are Workspai Workspace Brain — an AI assistant deeply integrated into the developer's backend workspace.

You have full knowledge of the project structure and can answer questions about:
- architecture and module relationships
- what will break if something changes
- where specific logic lives
- how to add features correctly given the existing patterns
- code conventions, naming patterns, and project idioms

Rules:
- Always ground answers in the actual project structure shown below.
- Be direct and specific — reference actual file paths and module names.
- When you don't know something from the context, say so clearly.
- Recommend structured Workspai actions (Generate Module, Debugger) when appropriate.
- Keep answers focused. No generic advice that ignores the workspace.

Workspace context:
${ctx}

${historyBlock ? `Conversation so far:\n${historyBlock}` : ''}`;
}

// ──────────────────────────────────────────────
// HTML panel
// ──────────────────────────────────────────────

function buildHtml(nonce: string, projectName: string, framework: string): string {
  return /* html */ `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta http-equiv="Content-Security-Policy"
    content="default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Workspace Brain</title>
  <style nonce="${nonce}">
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
      color: var(--vscode-foreground);
      background: var(--vscode-editor-background);
      display: flex; flex-direction: column; height: 100vh;
    }
    .header {
      padding: 14px 20px 12px;
      border-bottom: 1px solid rgba(255,255,255,0.07);
      flex-shrink: 0;
    }
    .header h2 { font-size: 14px; font-weight: 600; margin-bottom: 2px; }
    .header .meta { font-size: 11px; opacity: 0.4; }
    .project-badge {
      display: inline-block; font-size: 11px; padding: 1px 8px;
      border: 1px solid rgba(108,92,231,0.4); border-radius: 10px;
      color: rgba(108,92,231,0.9); margin-right: 6px;
    }
    .messages {
      flex: 1; overflow-y: auto; padding: 16px 20px;
      display: flex; flex-direction: column; gap: 14px;
    }
    .msg { display: flex; gap: 10px; }
    .msg.user { flex-direction: row-reverse; }
    .avatar {
      width: 22px; height: 22px; border-radius: 50%; flex-shrink: 0;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; font-weight: 700;
      background: rgba(108,92,231,0.25); color: rgba(108,92,231,0.9);
    }
    .msg.user .avatar { background: rgba(0,207,193,0.18); color: rgba(0,207,193,0.9); }
    .bubble {
      max-width: 85%; padding: 9px 13px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(255,255,255,0.07);
      border-radius: 8px;
      font-size: 12.5px; line-height: 1.65;
      white-space: pre-wrap; word-break: break-word;
    }
    .msg.user .bubble { background: rgba(108,92,231,0.08); border-color: rgba(108,92,231,0.2); }
    .typing .bubble { opacity: 0.55; }
    .dot-anim::after { content: '▋'; animation: blink 0.9s steps(1) infinite; }
    @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
    .input-row {
      padding: 12px 20px 16px;
      border-top: 1px solid rgba(255,255,255,0.07);
      display: flex; gap: 8px; flex-shrink: 0;
    }
    input {
      flex: 1; padding: 8px 12px;
      background: var(--vscode-input-background);
      color: var(--vscode-input-foreground);
      border: 1px solid var(--vscode-input-border, rgba(255,255,255,0.1));
      border-radius: 6px; font-size: 13px; outline: none;
    }
    input:focus { border-color: var(--vscode-focusBorder); }
    button {
      padding: 8px 16px;
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none; border-radius: 6px;
      font-size: 13px; font-weight: 500; cursor: pointer;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button:disabled { opacity: 0.4; cursor: not-allowed; }
    .welcome {
      text-align: center; padding: 32px 20px;
      opacity: 0.5; font-size: 12px; line-height: 1.8;
    }
    .welcome .icon { font-size: 28px; margin-bottom: 10px; }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 0 20px 12px; }
    .chip {
      font-size: 11px; padding: 4px 10px;
      border: 1px solid rgba(255,255,255,0.12); border-radius: 12px;
      cursor: pointer; color: rgba(255,255,255,0.55);
      background: transparent; transition: all 0.15s;
    }
    .chip:hover { border-color: rgba(108,92,231,0.5); color: rgba(108,92,231,0.9); background: rgba(108,92,231,0.07); }
  </style>
</head>
<body>
  <div class="header">
    <h2>🧠 Workspai Workspace Brain</h2>
    <div class="meta">
      <span class="project-badge">${projectName}</span>
      <span>${framework}</span>
    </div>
  </div>

  <div class="messages" id="messages">
    <div class="welcome">
      <div class="icon">🧠</div>
      <div>Ask anything about your workspace.<br/>Module structure, impact analysis, conventions, architecture decisions.</div>
    </div>
  </div>

  <div class="chips" id="chips">
    <button class="chip" onclick="sendChip(this)">What modules does this project have?</button>
    <button class="chip" onclick="sendChip(this)">What will break if I change this service?</button>
    <button class="chip" onclick="sendChip(this)">Which files have no tests?</button>
    <button class="chip" onclick="sendChip(this)">Explain the architecture of this project</button>
  </div>

  <div class="input-row">
    <input id="q" type="text" placeholder="Ask about your workspace..." onkeydown="if(event.key==='Enter')send()" />
    <button id="send-btn" onclick="send()">Ask</button>
  </div>

  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    let streaming = false;

    function send() {
      const q = document.getElementById('q').value.trim();
      if (!q || streaming) return;
      document.getElementById('q').value = '';
      document.getElementById('chips').style.display = 'none';
      addMessage('user', q);
      startStreaming(q);
      vscode.postMessage({ command: 'ask', question: q });
    }

    function sendChip(el) {
      document.getElementById('q').value = el.textContent;
      send();
    }

    function addMessage(role, text) {
      const msgs = document.getElementById('messages');
      // Remove welcome banner
      const welcome = msgs.querySelector('.welcome');
      if (welcome) welcome.remove();

      const div = document.createElement('div');
      div.className = 'msg ' + role;
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = role === 'user' ? 'You' : 'AI';
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      bubble.textContent = text;
      div.appendChild(avatar);
      div.appendChild(bubble);
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      return bubble;
    }

    let activeBubble = null;

    function startStreaming(q) {
      streaming = true;
      document.getElementById('send-btn').disabled = true;
      const msgs = document.getElementById('messages');
      const div = document.createElement('div');
      div.className = 'msg assistant typing';
      const avatar = document.createElement('div');
      avatar.className = 'avatar';
      avatar.textContent = 'AI';
      const bubble = document.createElement('div');
      bubble.className = 'bubble dot-anim';
      bubble.textContent = '';
      div.appendChild(avatar);
      div.appendChild(bubble);
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
      activeBubble = bubble;
      div._wrapDiv = div;
    }

    window.addEventListener('message', e => {
      const msg = e.data;
      if (msg.command === 'chunk' && activeBubble) {
        activeBubble.classList.remove('dot-anim');
        activeBubble.textContent += msg.text;
        document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
      }
      if (msg.command === 'done') {
        if (activeBubble) {
          activeBubble.classList.remove('dot-anim');
          activeBubble.closest('.typing')?.classList.remove('typing');
        }
        activeBubble = null;
        streaming = false;
        document.getElementById('send-btn').disabled = false;
      }
      if (msg.command === 'error') {
        if (activeBubble) {
          activeBubble.classList.remove('dot-anim');
          activeBubble.textContent = '⚠ ' + msg.message;
          activeBubble.closest('.typing')?.classList.remove('typing');
        }
        activeBubble = null;
        streaming = false;
        document.getElementById('send-btn').disabled = false;
      }
    });
  </script>
</body>
</html>`;
}

// ──────────────────────────────────────────────
// Panel class
// ──────────────────────────────────────────────

export class WorkspaceBrainPanel {
  public static currentPanel: WorkspaceBrainPanel | undefined;
  private readonly _panel: vscode.WebviewPanel;
  private _disposables: vscode.Disposable[] = [];
  private _snapshot: ProjectSnapshot | null = null;
  private _history: Array<{ role: 'user' | 'ai'; text: string }> = [];
  private _cancelTokenSource?: vscode.CancellationTokenSource;

  private constructor(panel: vscode.WebviewPanel, snapshot: ProjectSnapshot | null) {
    this._panel = panel;
    this._snapshot = snapshot;
    const nonce = getNonce();
    this._panel.webview.html = buildHtml(
      nonce,
      snapshot?.name ?? 'No workspace',
      snapshot?.framework ?? '—'
    );

    this._panel.webview.onDidReceiveMessage(
      async (msg) => {
        if (msg.command === 'ask') {
          await this._handleQuestion(msg.question as string);
        }
      },
      null,
      this._disposables
    );

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public static async createOrShow(context: vscode.ExtensionContext): Promise<void> {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    if (WorkspaceBrainPanel.currentPanel) {
      WorkspaceBrainPanel.currentPanel._panel.reveal(column);
      return;
    }

    const snapshot = await buildProjectSnapshot();

    const panel = vscode.window.createWebviewPanel(
      'workspaiWorkspaceBrain',
      'Workspai Workspace Brain',
      column ?? vscode.ViewColumn.One,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [vscode.Uri.joinPath(context.extensionUri, 'media')],
      }
    );

    WorkspaceBrainPanel.currentPanel = new WorkspaceBrainPanel(panel, snapshot);
  }

  private async _handleQuestion(question: string): Promise<void> {
    const logger = Logger.getInstance();
    this._cancelTokenSource?.cancel();
    this._cancelTokenSource = new vscode.CancellationTokenSource();
    const token = this._cancelTokenSource.token;

    this._history.push({ role: 'user', text: question });

    const systemPrompt = buildSystemPrompt(this._snapshot, this._history);
    const messages = [
      { role: 'user' as const, content: systemPrompt + '\n\n---\n\nDeveloper: ' + question },
    ];

    let answer = '';
    try {
      await streamAIResponse(
        messages,
        (chunk) => {
          if (chunk.done) {
            this._panel.webview.postMessage({ command: 'done' });
            this._history.push({ role: 'ai', text: answer });
          } else {
            answer += chunk.text;
            this._panel.webview.postMessage({ command: 'chunk', text: chunk.text });
          }
        },
        token
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.warn('[WorkspaceBrain] Error:', msg);
      this._panel.webview.postMessage({ command: 'error', message: msg });
    }
  }

  public dispose(): void {
    WorkspaceBrainPanel.currentPanel = undefined;
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

export function registerWorkspaceBrainCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand('rapidkit.workspaceBrain', () => {
    WelcomePanel.createOrShow(context);
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
