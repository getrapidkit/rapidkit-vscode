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
  return vscode.commands.registerCommand('rapidkit.workspaceBrain', () => {
    WelcomePanel.createOrShow(context);
  });
}
