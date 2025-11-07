/**
 * Code Actions Provider
 * Provides quick fixes and refactorings for RapidKit files
 */

import * as vscode from 'vscode';

export class RapidKitCodeActionsProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.Refactor,
  ];

  provideCodeActions(
    document: vscode.TextDocument,
    _range: vscode.Range,
    _context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] | undefined {
    const actions: vscode.CodeAction[] = [];

    // Quick fixes for configuration files
    if (document.fileName.endsWith('.rapidkitrc.json') || document.fileName.endsWith('rapidkit.json')) {
      actions.push(...this.getConfigurationQuickFixes(document, _range, _context));
    }

    // Quick fixes for module.yaml files
    if (document.fileName.endsWith('module.yaml')) {
      actions.push(...this.getModuleQuickFixes(document, _range, _context));
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
      const action = new vscode.CodeAction('Add missing framework field', vscode.CodeActionKind.QuickFix);
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
