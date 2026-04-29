/**
 * Code Actions Provider
 * Provides quick fixes and refactorings for Workspai files
 */

import * as vscode from 'vscode';
import {
  buildMissingFrameworkDocumentText,
  isWorkspaiConfigurationFile,
} from './workspaiConfigFiles';

export class WorkspaiCodeActionsProvider implements vscode.CodeActionProvider {
  public static readonly providedCodeActionKinds = [
    vscode.CodeActionKind.QuickFix,
    vscode.CodeActionKind.Refactor,
  ];
  private static readonly AI_DEBUG_LANGUAGES = new Set([
    'python',
    'typescript',
    'javascript',
    'go',
    'java',
    'csharp',
    'php',
    'ruby',
    'rust',
    'kotlin',
    'scala',
    'sql',
    'yaml',
    'json',
    'jsonc',
    'toml',
    'shellscript',
    'dockerfile',
    'typescriptreact',
    'javascriptreact',
  ]);

  private getRangeSnippet(document: vscode.TextDocument, range: vscode.Range): string | undefined {
    const text = document.getText(document.validateRange(range)).trim();
    if (!text) {
      return undefined;
    }
    if (text.length <= 800) {
      return text;
    }
    return `${text.slice(0, 800)}\n... [truncated]`;
  }

  provideCodeActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext,
    _token: vscode.CancellationToken
  ): vscode.CodeAction[] | undefined {
    const actions: vscode.CodeAction[] = [];

    // Quick fixes for configuration files
    if (isWorkspaiConfigurationFile(document.fileName)) {
      actions.push(...this.getConfigurationQuickFixes(document, range, context));
    }

    // Quick fixes for module.yaml files
    if (document.fileName.endsWith('module.yaml')) {
      actions.push(...this.getModuleQuickFixes(document, range, context));
    }

    // AI debug actions are available for any editable document that has diagnostics or selection.
    actions.push(...this.getAIDebugActions(document, range, context));

    return actions.length > 0 ? actions : undefined;
  }

  /** "Debug with AI" action shown when there are diagnostics or a selection. */
  private getAIDebugActions(
    document: vscode.TextDocument,
    range: vscode.Range,
    context: vscode.CodeActionContext
  ): vscode.CodeAction[] {
    if (!WorkspaiCodeActionsProvider.AI_DEBUG_LANGUAGES.has(document.languageId)) {
      return [];
    }

    const actions: vscode.CodeAction[] = [];

    const hasErrors = context.diagnostics.some(
      (d) => d.severity === vscode.DiagnosticSeverity.Error
    );
    const selectionSnippet = this.getRangeSnippet(document, range);
    const hasSelection = Boolean(selectionSnippet);

    if (hasErrors || hasSelection) {
      const action = new vscode.CodeAction(
        '✦ Debug with Workspai AI',
        vscode.CodeActionKind.QuickFix
      );
      action.command = {
        command: 'workspai.debugWithAI',
        title: 'Debug with Workspai AI',
      };
      action.isPreferred = false;
      actions.push(action);

      const fixPreviewAction = new vscode.CodeAction(
        '✦ Preview fix with Workspai AI',
        vscode.CodeActionKind.QuickFix
      );
      fixPreviewAction.command = {
        command: 'workspai.aiFixPreviewLite',
        title: 'Preview fix with Workspai AI',
        arguments: [selectionSnippet],
      };
      actions.push(fixPreviewAction);
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
        command: 'workspai.explainErrorWithAI',
        title: 'Explain error with AI',
        arguments: [errorMessages],
      };
      actions.push(explainAction);
    }

    if (hasSelection) {
      const impactAction = new vscode.CodeAction(
        '✦ Analyze change impact with AI',
        vscode.CodeActionKind.Refactor
      );
      impactAction.command = {
        command: 'workspai.aiChangeImpactLite',
        title: 'Analyze change impact with AI',
        arguments: [selectionSnippet],
      };
      actions.push(impactAction);
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
      action.edit.replace(
        document.uri,
        new vscode.Range(document.positionAt(0), document.positionAt(text.length)),
        buildMissingFrameworkDocumentText(text)
      );
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
