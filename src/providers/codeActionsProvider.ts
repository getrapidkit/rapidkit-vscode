/**
 * Code Actions Provider
 * Provides quick fixes and refactorings for Workspai files
 */

import * as vscode from 'vscode';

export class WorkspaiCodeActionsProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.Refactor,
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] | undefined {
    const actions: vscode.CodeAction[] = [];

    // Quick fixes for configuration files
    if (
      document.fileName.endsWith('.rapidkitrc.json') ||
      document.fileName.endsWith('rapidkit.json')
    ) {
      actions.push(...this.getConfigurationQuickFixes(document, range, context));
    }

    // Quick fixes for module.yaml files
    if (document.fileName.endsWith('module.yaml')) {
      actions.push(...this.getModuleQuickFixes(document, range, context));
    }

    // AI debug action for Python / TypeScript / Go source files with errors or selection
    const ext = document.fileName.split('.').pop()?.toLowerCase();
    if (ext && ['py', 'ts', 'go', 'js'].includes(ext)) {
      actions.push(...this.getAIDebugActions(document, range, context));
    }

    return actions.length > 0 ? actions : undefined;
  }

  /** "Debug with AI" action shown when there are diagnostics or a selection. */
  private getAIDebugActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    const hasErrors = context.diagnostics.some(
      (d) => d.severity === vscode.DiagnosticSeverity.Error
    );
    const hasSelection = !document.validateRange(range).isEmpty;

    if (hasErrors || hasSelection) {
      const action = new vscode.CodeAction(
        '✦ Debug with Workspai AI',
        vscode.CodeActionKind.QuickFix
      );
      action.command = {
        command: 'rapidkit.debugWithAI',
        title: 'Debug with Workspai AI',
      };
      action.isPreferred = false;
      actions.push(action);
    }

    if (hasErrors) {
      const errorMessages = context.diagnostics
        .filter((d) => d.severity === vscode.DiagnosticSeverity.Error)
        .map((d) => d.message)
        .join('; ');

      const explainAction = new vscode.CodeAction(
        `✦ Explain error with AI: "${errorMessages.slice(0, 60)}${errorMessages.length > 60 ? '…' : ''}"`,
        vscode.CodeActionKind.QuickFix
      );
      explainAction.command = {
        command: 'rapidkit.debugWithAI',
        title: 'Explain error with AI',
      };
      actions.push(explainAction);
    }

    return actions;
  }

  private getConfigurationQuickFixes(
    document: vscode.TextDocument,
    _range: vscode.Range,
    _context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Add missing fields
    const text = document.getText();
    if (!text.includes('"framework"')) {
      const action = new vscode.CodeAction(
        'Add missing framework field',
        vscode.CodeActionKind.QuickFix
      );
      action.edit = new vscode.WorkspaceEdit();
      action.edit.insert(document.uri, new vscode.Position(1, 0), '  "framework": "fastapi",\n');
      actions.push(action);
    }

    return actions;
  }

  private getModuleQuickFixes(
    document: vscode.TextDocument,
    _range: vscode.Range,
    _context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    const actions: vscode.CodeAction[] = [];

    // Add missing metadata
    const text = document.getText();
    if (!text.includes('version:')) {
      const action = new vscode.CodeAction('Add version field', vscode.CodeActionKind.QuickFix);
      action.edit = new vscode.WorkspaceEdit();
      action.edit.insert(document.uri, new vscode.Position(1, 0), 'version: "1.0.0"\n');
      actions.push(action);
    }

    return actions;
  }
}
