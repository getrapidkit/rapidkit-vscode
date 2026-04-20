/**
 * Workspace Brain Command
 * Routes to the shared Workspai AI modal via the WelcomePanel.
 * The old dedicated Brain panel was duplicating shared AI prep logic and is removed.
 */

import * as vscode from 'vscode';
import { WelcomePanel } from '../ui/panels/welcomePanel';

// ──────────────────────────────────────────────
// Command registration
// ──────────────────────────────────────────────

export function registerWorkspaceBrainCommand(context: vscode.ExtensionContext): vscode.Disposable {
  return vscode.commands.registerCommand('workspai.workspaceBrain', async () => {
    const selectedWorkspace = (await vscode.commands.executeCommand(
      'workspai.getSelectedWorkspace'
    )) as { name?: string; path?: string } | null;

    if (selectedWorkspace?.path) {
      WelcomePanel.showAIModal(context, {
        type: 'workspace',
        name: selectedWorkspace.name ?? 'Workspace',
        path: selectedWorkspace.path,
        prefillMode: 'ask',
      });
      return;
    }

    const fallbackWorkspace = vscode.workspace.workspaceFolders?.[0];
    if (fallbackWorkspace) {
      WelcomePanel.showAIModal(context, {
        type: 'workspace',
        name: fallbackWorkspace.name,
        path: fallbackWorkspace.uri.fsPath,
        prefillMode: 'ask',
      });
      return;
    }

    WelcomePanel.createOrShow(context);
  });
}
