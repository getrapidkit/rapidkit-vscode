/**
 * AI Debugger Command
 * Routes all debug entry points through the shared Workspai AI modal.
 * The old dedicated debugger panel was duplicating prompt/context logic and is intentionally removed.
 */

import * as vscode from 'vscode';
import { WelcomePanel } from '../ui/panels/welcomePanel';

// ──────────────────────────────────────────────
// Context collection helpers
// ──────────────────────────────────────────────

/** Returns the user's text selection in the active editor, or undefined. */
export function getEditorSelection(editor = vscode.window.activeTextEditor): string | undefined {
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
export function formatDiagnostics(diagnostics: readonly vscode.Diagnostic[]): string | undefined {
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

export function getActiveDiagnostics(
  editor = vscode.window.activeTextEditor,
  diagnostics = editor ? vscode.languages.getDiagnostics(editor.document.uri) : []
): string | undefined {
  if (!editor) {
    return undefined;
  }

  return formatDiagnostics(diagnostics);
}

export function collectDebugPrefillQuestion(
  editor = vscode.window.activeTextEditor,
  diagnostics = editor ? vscode.languages.getDiagnostics(editor.document.uri) : []
): string | undefined {
  return getEditorSelection(editor) ?? getActiveDiagnostics(editor, diagnostics);
}

// ──────────────────────────────────────────────
// Command registration
// ──────────────────────────────────────────────

export function registerAIDebuggerCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand('rapidkit.debugWithAI', () => {
    const prefillQuestion = collectDebugPrefillQuestion();
    const folder = vscode.workspace.workspaceFolders?.[0];
    WelcomePanel.showAIModal(context, {
      type: 'workspace',
      name: folder?.name ?? 'Workspace',
      path: folder?.uri.fsPath,
      prefillQuestion,
    });
  });
}
